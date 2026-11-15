import {
  Application,
  Container,
  Graphics,
  Text,
  TextStyle,
  TextureStyle,
} from 'pixi.js';
import {
  FURNITURE_CATALOG,
  isRoamingFurnitureType,
  type OfficeBlueprint,
  type FurnitureItem,
  type FurnitureType,
  type ZoneType,
  type Direction,
} from '@/types/blueprint';
import type { AgentEvent, IdleHobbyIconType, ToolIconType } from '@/types/events';
import { FSM_CONSTANTS, type AgentFsmState } from '@/types/fsm';
import {
  LOL_DUO_INVITE_SCRIPTS,
  pickGroupBanterScript,
} from '@/data/officeBanterScripts';
import { drawFloorTile, hexToNumber } from './graphics/ProceduralSprites';
import { CameraController } from './CameraController';
import { GridPathfinder } from './GridPathfinder';
import { FurnitureEntity } from './FurnitureEntity';
import {
  AgentEntity,
  type AgentSpeechEmitPayload,
} from './AgentEntity';
import { DirectorEntity } from './DirectorEntity';
import { HandoffAnimator } from './HandoffAnimator';
import { DagOverlayLayer } from './DagOverlayLayer';
import { MapEditorLayer } from './MapEditorLayer';
import {
  sliceDirectionalSpriteSheet,
  sliceSingleFurnitureTexture,
} from './graphics/SpriteSheetSlicer';
import type { CustomSpriteAsset } from '@/types/assets';

export interface OfficeSpeechEvent {
  speakerId: string;
  speakerName: string;
  speakerColor: string;
  category: 'DRAMA' | 'DIRECTOR' | 'WORK';
  text: string;
  spotLabel?: string;
  icon?: IdleHobbyIconType | ToolIconType | 'director' | 'handoff' | 'return';
}

export interface OfficeRendererCallbacks {
  onSelectAgent: (agentId: string | null) => void;
  onSelectFurniture: (furnitureId: string | null) => void;
  onAgentCoarseStateChange: (
    agentId: string,
    fsmState: AgentFsmState,
    statusText: string,
    activeToolIcon: ToolIconType | null,
    queueDepth: number,
  ) => void;
  onFurnitureMovedInEditor: (
    furnitureId: string,
    newX: number,
    newY: number,
  ) => { success: boolean; error?: string };
  onHoverTileChange?: (tile: [number, number] | null) => void;
  onSpeechMessage?: (msg: OfficeSpeechEvent) => void;
}

/**
 * Core 2D Pixel Office Engine (PixiJS v8 + EasyStar.js).
 * Strictly isolated from Vue reactivity to guarantee a locked 60 FPS loop.
 */
export class OfficeRenderer {
  public app: Application | null = null;
  public camera: CameraController | null = null;
  public readonly pathfinder: GridPathfinder;

  private readonly worldContainer = new Container();
  private readonly floorLayer = new Container();
  private readonly floorGraphics = new Graphics();
  private readonly zoneLabelsContainer = new Container();
  private readonly mapEditorLayer = new MapEditorLayer();
  private readonly dagOverlayLayer = new DagOverlayLayer();
  private readonly entityLayer = new Container();
  private readonly handoffAnimator = new HandoffAnimator();
  private readonly bubbleLayer = new Container();

  private furnitureEntities = new Map<string, FurnitureEntity>();
  private agentEntities = new Map<string, AgentEntity>();
  private directorEntity: DirectorEntity | null = null;
  private isBriefingActive = false;
  private briefingBufferedEvents: AgentEvent[] = [];
  private briefingSessionNonce = 0;
  private customAssetCache = new Map<string, CustomSpriteAsset>();

  private currentBlueprint: OfficeBlueprint | null = null;
  private callbacks: OfficeRendererCallbacks;
  private isEditMode = false;
  private isGodView = false;
  private speedMultiplier: 1 | 2 = 1;
  private selectedAgentId: string | null = null;
  private selectedFurnitureId: string | null = null;
  private draggingFurniture: FurnitureEntity | null = null;
  private proximityCheckTimerMs = 0;
  private socialBanterTimeouts = new Set<ReturnType<typeof setTimeout>>();
  private activeGroupBanterKeys = new Set<string>();
  private groupBanterCooldownUntil = new Map<string, number>();

  private boundPointerMove?: (e: PointerEvent) => void;
  private boundPointerUp?: () => void;

  constructor(callbacks: OfficeRendererCallbacks) {
    // Enforce crisp pixel scaling globally
    TextureStyle.defaultOptions.scaleMode = 'nearest';
    this.pathfinder = new GridPathfinder();
    this.callbacks = callbacks;
    this.entityLayer.sortableChildren = true;
  }

  public async mount(
    hostElement: HTMLElement,
    initialBlueprint: OfficeBlueprint,
  ): Promise<void> {
    const app = new Application();
    await app.init({
      background: '#020617',
      resizeTo: hostElement,
      antialias: false,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    app.canvas.classList.add('pixel-office-canvas');
    hostElement.appendChild(app.canvas);
    this.app = app;

    // Assemble Z-Index Hierarchy inside worldContainer
    this.floorLayer.addChild(this.floorGraphics);
    this.floorLayer.addChild(this.zoneLabelsContainer);

    this.worldContainer.addChild(this.floorLayer);
    this.worldContainer.addChild(this.mapEditorLayer.container);
    this.worldContainer.addChild(this.dagOverlayLayer.container);
    this.worldContainer.addChild(this.entityLayer);
    this.worldContainer.addChild(this.handoffAnimator.container);
    this.worldContainer.addChild(this.bubbleLayer);

    app.stage.addChild(this.worldContainer);

    this.camera = new CameraController(this.worldContainer, app.canvas);
    this.setupEditModePointerHandlers(app.canvas);

    this.loadBlueprint(initialBlueprint, true);

    // 60 FPS Ticker Loop
    app.ticker.add((ticker) => {
      this.onFrameTick(ticker.deltaMS);
    });
  }

  public loadBlueprint(blueprint: OfficeBlueprint, recenterCamera = false): void {
    const topologyChanged =
      !this.currentBlueprint ||
      this.currentBlueprint.meta.project_name !== blueprint.meta.project_name ||
      this.currentBlueprint.meta.grid_cols !== blueprint.meta.grid_cols ||
      this.currentBlueprint.meta.grid_rows !== blueprint.meta.grid_rows;

    this.clearSocialBanterTimers();
    this.currentBlueprint = blueprint;
    this.pathfinder.rebuildFromBlueprint(blueprint);

    // 1. Draw Floor, Walls & Zones
    this.drawFloorAndZones(blueprint);

    // 2. Rebuild Furniture Entities
    for (const f of this.furnitureEntities.values()) {
      f.destroy();
    }
    this.furnitureEntities.clear();

    const agentColorByDesk = new Map<string, string>();
    for (const a of blueprint.agents) {
      agentColorByDesk.set(a.desk_id, a.color);
    }

    for (const item of blueprint.furniture) {
      const deskColor = agentColorByDesk.get(item.id) || '#38bdf8';
      const furnEntity = new FurnitureEntity(
        item,
        deskColor,
        (clickedItem) => {
          this.handleFurnitureClick(clickedItem);
        },
        (gx, gy) => this.pathfinder.isTileWalkable(gx, gy),
      );
      furnEntity.setEditMode(this.isEditMode);
      furnEntity.setSelected(item.id === this.selectedFurnitureId);

      // Enable drag start in Edit Mode
      furnEntity.container.on('pointerdown', (e) => {
        if (!this.isEditMode) return;
        e.stopPropagation();
        this.startDraggingFurniture(furnEntity);
      });

      this.furnitureEntities.set(item.id, furnEntity);
      this.entityLayer.addChild(furnEntity.container);
    }

    // 3. Rebuild Agent Entities
    for (const a of this.agentEntities.values()) {
      this.pathfinder.releaseIdleReservation(a.blueprint.id);
      a.destroy();
    }
    this.agentEntities.clear();
    this.bubbleLayer.removeChildren();

    for (const agentBp of blueprint.agents) {
      const desk = this.furnitureEntities.get(agentBp.desk_id)?.item;
      const startX = desk ? desk.interaction_point[0] : 2;
      const startY = desk ? desk.interaction_point[1] : 2;
      const startFacing = desk ? desk.facing : 'DOWN';

      const agentEntity = new AgentEntity(
        agentBp,
        startX,
        startY,
        startFacing,
        {
          onCoarseStateChange: (
            agentId,
            fsmState,
            statusText,
            activeToolIcon,
            queueDepth,
          ) => {
            this.syncDeskMonitorGlow(agentId, fsmState);
            this.callbacks.onAgentCoarseStateChange(
              agentId,
              fsmState,
              statusText,
              activeToolIcon,
              queueDepth,
            );
          },
          onRequestPath: (sx, sy, ex, ey) =>
            this.pathfinder.findPath(sx, sy, ex, ey),
          onRequestIdleSpot: (agentId) =>
            this.pathfinder.reserveIdleDestination(agentId, blueprint),
          onReleaseIdleSpot: (agentId) =>
            this.pathfinder.releaseIdleReservation(agentId),
          onRequestSocialHangout: (agentId) =>
            this.handleRequestSocialHangout(agentId),
          onSpeechEmit: (payload) =>
            this.forwardAgentSpeech(payload),
          onLaunchHandoffPacket: (fromAgentId, toAgentId, colorHex) => {
            this.launchHandoffVisuals(fromAgentId, toAgentId, colorHex);
          },
          getAgentDesk: (agentId) => {
            const a = blueprint.agents.find((ag) => ag.id === agentId);
            return a ? this.furnitureEntities.get(a.desk_id)?.item : undefined;
          },
        },
        (clickedAgentId) => {
          this.setSelectedAgent(clickedAgentId);
          this.callbacks.onSelectAgent(clickedAgentId);
        },
      );

      agentEntity.setGodViewOverlay(this.isGodView);
      this.agentEntities.set(agentBp.id, agentEntity);
      this.entityLayer.addChild(agentEntity.container);
      this.bubbleLayer.addChild(agentEntity.bubble.container);
    }

    // 3b. Rebuild Director NPC ("Giám đốc (Tôi)") inside Phòng Giám Đốc
    const prevDirectorPos =
      !topologyChanged &&
      this.directorEntity &&
      this.pathfinder.isTileWalkable(
        this.directorEntity.gridX,
        this.directorEntity.gridY,
      )
        ? { x: this.directorEntity.gridX, y: this.directorEntity.gridY }
        : null;

    if (this.directorEntity) {
      this.directorEntity.destroy();
      this.directorEntity = null;
    }

    const directorDesk = blueprint.furniture.find(
      (f) => f.type === 'DIRECTOR_DESK',
    );
    const directorZone = blueprint.zones.find((z) => z.type === 'DIRECTOR');
    const directorDeskPoint: { x: number; y: number; facing: Direction } =
      directorDesk
        ? {
            x: directorDesk.interaction_point[0],
            y: directorDesk.interaction_point[1],
            facing: directorDesk.facing,
          }
        : directorZone
          ? {
              x: directorZone.rect[0] + Math.floor(directorZone.rect[2] / 2),
              y: directorZone.rect[1] + Math.floor(directorZone.rect[3] / 2),
              facing: 'DOWN',
            }
          : { x: 2, y: 2, facing: 'DOWN' };

    const spawnX = prevDirectorPos?.x ?? directorDeskPoint.x;
    const spawnY = prevDirectorPos?.y ?? directorDeskPoint.y;
    this.directorEntity = new DirectorEntity(
      spawnX,
      spawnY,
      directorDeskPoint.facing,
      directorDeskPoint,
    );
    this.directorEntity.setOnSpeechEmit((text, spotType) => {
      this.callbacks.onSpeechMessage?.({
        speakerId: 'director',
        speakerName: '👑 Giám Đốc (Tôi)',
        speakerColor: '#fbbf24',
        category: 'DIRECTOR',
        text,
        spotLabel: this.formatSpotLabel(spotType ?? 'DIRECTOR_DESK'),
        icon: 'director',
      });
    });
    this.entityLayer.addChild(this.directorEntity.container);
    this.bubbleLayer.addChild(this.directorEntity.bubble.container);

    // Cancel stale briefing if blueprint changed topology
    if (topologyChanged) {
      this.briefingSessionNonce += 1;
      this.isBriefingActive = false;
      this.briefingBufferedEvents = [];
    }

    // 4. Rebuild God-View DAG Labels & Map Editor Overlay
    this.dagOverlayLayer.rebuildLabels(blueprint, (agentId) =>
      this.getDeskEntityForAgent(agentId),
    );
    this.mapEditorLayer.redrawOverlay(blueprint, this.pathfinder.getCollisionMatrix());

    // 5. Re-apply any custom sprite sheets from cache
    void this.applyAllCachedCustomAssets();

    if ((recenterCamera || topologyChanged) && this.camera) {
      this.camera.centerOnGrid(
        blueprint.meta.grid_cols,
        blueprint.meta.grid_rows,
        blueprint.meta.tile_size,
        2.0,
      );
    }
  }

  public dispatchEventToEngine(event: AgentEvent): void {
    this.clearSocialBanterTimers();
    if (this.isBriefingActive) {
      this.briefingBufferedEvents.push(event);
      return;
    }
    const agent = this.agentEntities.get(event.agent_id);
    if (!agent) return;
    agent.enqueueEvent(event);
  }

  /**
   * Choreographs the physical briefing between Giám Đốc (Tôi) and the first Crew agent:
   * First agent walks to Director in Phòng Giám Đốc, exchanges speech bubbles for the prompt,
   * and then releases queued Crew execution events to walk back to its desk and start working.
   */
  public async startDirectorBriefing(prompt: string): Promise<void> {
    if (!this.currentBlueprint || !this.directorEntity || this.agentEntities.size === 0) {
      return;
    }
    this.clearSocialBanterTimers();

    // Release any previous unfinished briefing cleanly
    if (this.isBriefingActive) {
      this.briefingSessionNonce += 1;
      for (const a of this.agentEntities.values()) {
        a.endDirectorBriefing();
      }
      const leftover = this.briefingBufferedEvents.splice(0);
      this.isBriefingActive = false;
      for (const ev of leftover) {
        this.agentEntities.get(ev.agent_id)?.enqueueEvent(ev);
      }
    }

    const incomingCounts = new Map<string, number>();
    for (const a of this.currentBlueprint.agents) {
      incomingCounts.set(a.id, 0);
    }
    for (const edge of this.currentBlueprint.edges) {
      if (incomingCounts.has(edge.to)) {
        incomingCounts.set(edge.to, (incomingCounts.get(edge.to) ?? 0) + 1);
      }
    }
    const firstAgentSpec =
      this.currentBlueprint.agents.find((a) => (incomingCounts.get(a.id) ?? 0) === 0) ??
      this.currentBlueprint.agents[0];
    const firstAgent = firstAgentSpec
      ? this.agentEntities.get(firstAgentSpec.id)
      : undefined;
    if (!firstAgent || !firstAgentSpec) return;

    const nonce = ++this.briefingSessionNonce;
    this.isBriefingActive = true;
    this.briefingBufferedEvents = [];

    const director = this.directorEntity;
    director.enterBriefingMode();

    const directorDesk = this.currentBlueprint.furniture.find(
      (f) => f.type === 'DIRECTOR_DESK',
    );
    const directorZone = this.currentBlueprint.zones.find(
      (z) => z.type === 'DIRECTOR',
    );

    const anchorX = directorDesk
      ? directorDesk.interaction_point[0]
      : directorZone
        ? directorZone.rect[0] + Math.floor(directorZone.rect[2] / 2)
        : director.gridX;
    const anchorY = directorDesk
      ? directorDesk.interaction_point[1]
      : directorZone
        ? directorZone.rect[1] + Math.floor(directorZone.rect[3] / 2)
        : director.gridY;

    const avoidSelf = new Set<string>([`${anchorX},${anchorY}`]);
    const meetingNeighbors = this.pathfinder.getWalkableNeighbors(
      anchorX,
      anchorY,
      avoidSelf,
    );
    const meetingSpot = meetingNeighbors[0] ?? {
      x: anchorX,
      y: anchorY,
      facing: 'DOWN' as Direction,
    };

    const shortFirstName = firstAgentSpec.name.split(/\s*[—–([|]\s*/)[0].trim();
    director.showBubble(`📣 Gọi ${shortFirstName} nhận việc!`, '#fbbf24', 5200);

    const waitMs = (ms: number) =>
      new Promise<void>((r) =>
        setTimeout(r, Math.max(180, Math.round(ms / this.speedMultiplier))),
      );

    await Promise.all([
      director.walkToTile(this.pathfinder, anchorX, anchorY, 'DOWN', 1.7),
      firstAgent.walkToDirectorBriefing(
        meetingSpot.x,
        meetingSpot.y,
        meetingSpot.facing,
        '🚶 Qua gặp Giám đốc nhận lệnh!',
      ),
    ]);

    if (nonce !== this.briefingSessionNonce) return;

    director.faceTowards(meetingSpot.x, meetingSpot.y);
    const workerFaceDir: Direction =
      anchorX > meetingSpot.x
        ? 'RIGHT'
        : anchorX < meetingSpot.x
          ? 'LEFT'
          : anchorY < meetingSpot.y
            ? 'UP'
            : 'DOWN';

    const clippedPrompt =
      prompt.length > 22 ? `${prompt.slice(0, 21)}…` : prompt;
    director.showBubble(
      `📋 Giao: "${clippedPrompt}"`,
      '#fbbf24',
      3200,
      'DIRECTOR_DESK',
      `📋 Giao việc: "${prompt}"`,
    );
    await waitMs(1050);
    if (nonce !== this.briefingSessionNonce) return;

    firstAgent.showBriefingBubble('🫡 Rõ sếp! Em bắt đầu ngay!', '#38bdf8', workerFaceDir);
    await waitMs(1050);
    if (nonce !== this.briefingSessionNonce) return;

    director.showBubble('🚀 Triển khai tốt nhé!', '#22c55e', 2500);
    await waitMs(650);
    if (nonce !== this.briefingSessionNonce) return;

    firstAgent.endDirectorBriefing();
    director.exitBriefingMode();
    this.isBriefingActive = false;

    const buffered = this.briefingBufferedEvents.splice(0);
    for (const ev of buffered) {
      this.agentEntities.get(ev.agent_id)?.enqueueEvent(ev);
    }
  }

  public setGodView(enabled: boolean): void {
    this.isGodView = enabled;
    this.dagOverlayLayer.setVisible(enabled);
    this.floorLayer.alpha = enabled ? 0.78 : 1.0;
    for (const agent of this.agentEntities.values()) {
      agent.setGodViewOverlay(enabled);
    }
  }

  public setEditMode(enabled: boolean): void {
    this.isEditMode = enabled;
    this.mapEditorLayer.setVisible(enabled);
    for (const furn of this.furnitureEntities.values()) {
      furn.setEditMode(enabled);
    }
    if (!enabled && this.draggingFurniture) {
      this.draggingFurniture = null;
      if (this.camera) this.camera.isInteractionLocked = false;
      this.mapEditorLayer.clearDragPreview();
    }
  }

  public setSimulationSpeed(speed: 1 | 2): void {
    this.speedMultiplier = speed;
  }

  public setSelectedAgent(agentId: string | null): void {
    this.selectedAgentId = agentId;
    for (const [id, entity] of this.agentEntities.entries()) {
      entity.setSelected(id === agentId);
    }
  }

  public setSelectedFurniture(furnitureId: string | null): void {
    this.selectedFurnitureId = furnitureId;
    for (const [id, entity] of this.furnitureEntities.entries()) {
      entity.setSelected(id === furnitureId);
    }
  }

  public resetCamera(): void {
    if (!this.camera || !this.currentBlueprint) return;
    this.camera.centerOnGrid(
      this.currentBlueprint.meta.grid_cols,
      this.currentBlueprint.meta.grid_rows,
      this.currentBlueprint.meta.tile_size,
      2.0,
    );
  }

  public async registerCustomAssets(assets: CustomSpriteAsset[]): Promise<void> {
    this.customAssetCache.clear();
    for (const asset of assets) {
      this.customAssetCache.set(asset.target_id, asset);
    }
    await this.applyAllCachedCustomAssets();
  }

  private async applyAllCachedCustomAssets(): Promise<void> {
    for (const [agentId, agentEntity] of this.agentEntities.entries()) {
      const asset = this.customAssetCache.get(agentId);
      if (asset && asset.category === 'AGENT') {
        try {
          const frames = await sliceDirectionalSpriteSheet(asset.png_blob);
          agentEntity.setCustomDirectionalFrames(frames);
        } catch (err) {
          console.warn('[OfficeRenderer] Failed to slice agent sprite sheet:', err);
          agentEntity.setCustomDirectionalFrames(null);
        }
      } else {
        agentEntity.setCustomDirectionalFrames(null);
      }
    }

    for (const furnEntity of this.furnitureEntities.values()) {
      const asset =
        this.customAssetCache.get(furnEntity.item.id) ||
        this.customAssetCache.get(furnEntity.item.type);
      if (asset && asset.category === 'FURNITURE') {
        try {
          const tex = await sliceSingleFurnitureTexture(asset.png_blob);
          furnEntity.setCustomTexture(tex);
        } catch {
          furnEntity.setCustomTexture(null);
        }
      } else {
        furnEntity.setCustomTexture(null);
      }
    }
  }

  private onFrameTick(deltaMs: number): void {
    const deltaSeconds = (deltaMs / 1000) * this.speedMultiplier;

    this.pathfinder.stepCalculation();

    for (const furn of this.furnitureEntities.values()) {
      furn.tick(deltaSeconds);
    }

    for (const agent of this.agentEntities.values()) {
      agent.tick(deltaMs, this.speedMultiplier);
    }

    if (this.directorEntity && this.currentBlueprint) {
      this.directorEntity.tick(deltaMs, this.speedMultiplier, {
        blueprint: this.currentBlueprint,
        pathfinder: this.pathfinder,
        getActiveWorkers: () =>
          Array.from(this.agentEntities.values())
            .filter(
              (a) =>
                a.fsmState === 'WORKING' ||
                a.fsmState === 'TOOL_CALL' ||
                a.fsmState === 'HANDOFF',
            )
            .map((a) => ({
              id: a.blueprint.id,
              name: a.blueprint.name,
              gridX: a.gridX,
              gridY: a.gridY,
              statusText: a.blueprint.role,
            })),
        getOccupiedTiles: () => {
          const set = new Set<string>();
          for (const a of this.agentEntities.values()) {
            set.add(`${a.gridX},${a.gridY}`);
          }
          return set;
        },
      });
    }

    this.handoffAnimator.tick(deltaMs * this.speedMultiplier);

    this.dagOverlayLayer.tick(deltaMs * this.speedMultiplier, (agentId) =>
      this.getDeskEntityForAgent(agentId),
    );

    // Check social group / proximity banter every 650ms
    this.proximityCheckTimerMs += deltaMs;
    if (this.proximityCheckTimerMs >= 650) {
      this.proximityCheckTimerMs = 0;
      this.checkIdleAgentsProximityChat();
    }
  }

  private clearSocialBanterTimers(): void {
    for (const tid of this.socialBanterTimeouts) {
      clearTimeout(tid);
    }
    this.socialBanterTimeouts.clear();
    this.activeGroupBanterKeys.clear();
  }

  private scheduleSocialTimeout(fn: () => void, delayMs: number): void {
    const tid = setTimeout(() => {
      this.socialBanterTimeouts.delete(tid);
      fn();
    }, delayMs);
    this.socialBanterTimeouts.add(tid);
  }

  private formatSpotLabel(type?: FurnitureType | null): string | undefined {
    if (!type) return undefined;
    const item = FURNITURE_CATALOG.find((c) => c.type === type);
    if (!item) return undefined;
    const cleanName = item.label.replace(/\s*\([^)]*\)\s*$/, '').trim();
    return `${item.emoji} ${cleanName}`;
  }

  private forwardAgentSpeech(payload: AgentSpeechEmitPayload): void {
    this.callbacks.onSpeechMessage?.({
      speakerId: payload.speakerId,
      speakerName: payload.speakerName,
      speakerColor: payload.speakerColor,
      category: payload.category,
      text: payload.text,
      spotLabel: this.formatSpotLabel(payload.furnitureType),
      icon: payload.icon,
    });
  }

  private shortAgentLabel(name: string): string {
    return name.split(/\s*[—–([|]\s*/)[0].trim().split(/\s+/)[0] || name;
  }

  private getInvitePhraseForFurniture(type: FurnitureType): {
    text: string;
    hobbyIcon?: IdleHobbyIconType;
    color: string;
  } {
    switch (type) {
      case 'PS5_PES_STATION':
        return { text: '🎮 Ai ra làm kèo PES PS5 không?', hobbyIcon: 'ps5_pes', color: '#22c55e' };
      case 'POOL_TABLE':
        return { text: '🎱 Làm cơ bi-a xả hơi đê anh em!', color: '#10b981' };
      case 'PING_PONG_TABLE':
        return { text: '🏓 Ra bàn bóng bàn làm séc ko?', color: '#38bdf8' };
      case 'FOOSBALL_TABLE':
        return { text: '⚽ Chơi bi lắc cho tỉnh ngủ nào!', color: '#f59e0b' };
      case 'KARAOKE_BOOTH':
        return { text: '🎤 Ra hát karaoke giải tỏa đi!', hobbyIcon: 'music_sing', color: '#ec4899' };
      case 'ECO_BIOME_DOME':
      case 'KOI_POND':
      case 'ZEN_ROCK_GARDEN':
      case 'CHERRY_BLOSSOM_TREE':
      case 'INDOOR_FOUNTAIN':
      case 'BOTANICAL_GREENHOUSE':
      case 'AQUARIUM':
        return { text: '🌳 Ra khu sinh thái hít thở tí!', color: '#22c55e' };
      case 'RAMEN_NOODLE_BAR':
      case 'PIZZA_OVEN_COUNTER':
      case 'MINI_BAR_COUNTER':
      case 'COFFEE_MACHINE':
      case 'MICROWAVE_STAND':
      case 'POPCORN_CART':
      case 'ICE_CREAM_FREEZER':
        return { text: '🍜 Ra pantry ăn uống chém gió đê!', color: '#f59e0b' };
      default:
        return { text: '☕ Nghỉ giải lao tí rồi về làm!', color: '#38bdf8' };
    }
  }

  private pickSocialFurnitureTarget(blueprint: OfficeBlueprint): FurnitureItem | null {
    const candidates = blueprint.furniture.filter((f) => {
      if (
        f.type === 'DESK_PC' ||
        f.type === 'DIRECTOR_DESK' ||
        isRoamingFurnitureType(f.type)
      ) {
        return false;
      }
      const cap = this.pathfinder.getFurnitureSocialCapacity(f);
      if (this.pathfinder.getAgentsAtFurnitureCount(f.id) >= cap) return false;
      return this.pathfinder.getWalkableSpotsAroundFurniture(f).length > 0;
    });

    if (candidates.length === 0) return null;

    // Weight large social hubs (PS5, Pool, Eco Biome, Koi, Pantry bars) higher for vivid group scenes
    const headlineSet = new Set<FurnitureType>([
      'PS5_PES_STATION',
      'POOL_TABLE',
      'PING_PONG_TABLE',
      'FOOSBALL_TABLE',
      'ECO_BIOME_DOME',
      'KOI_POND',
      'ZEN_ROCK_GARDEN',
      'CHERRY_BLOSSOM_TREE',
      'INDOOR_FOUNTAIN',
      'RAMEN_NOODLE_BAR',
      'PIZZA_OVEN_COUNTER',
      'MINI_BAR_COUNTER',
      'COFFEE_MACHINE',
      'KARAOKE_BOOTH',
      'SOFA',
    ]);

    const weightedPool: FurnitureItem[] = [];
    for (const c of candidates) {
      weightedPool.push(c);
      if (headlineSet.has(c.type)) weightedPool.push(c);
      if (c.type === 'PS5_PES_STATION') weightedPool.push(c, c);
    }
    return weightedPool[Math.floor(Math.random() * weightedPool.length)];
  }

  private handleRequestSocialHangout(initiatorId: string): void {
    if (this.isBriefingActive || !this.currentBlueprint) return;
    const initiator = this.agentEntities.get(initiatorId);
    if (!initiator || initiator.isBusyForSocialHangout()) return;

    const idlePeers = Array.from(this.agentEntities.values()).filter(
      (a) => a.blueprint.id !== initiatorId && !a.isBusyForSocialHangout(),
    );

    // 1. ~22% chance to invite a colleague to duo-play LoL right from their desks!
    if (idlePeers.length >= 1 && Math.random() < 0.22) {
      const partner = idlePeers[Math.floor(Math.random() * idlePeers.length)];
      const lolScript =
        LOL_DUO_INVITE_SCRIPTS[
          Math.floor(Math.random() * LOL_DUO_INVITE_SCRIPTS.length)
        ];
      const stayMs = 11000 + Math.random() * 4000;
      initiator.rescheduleDeskStay(stayMs);
      partner.rescheduleDeskStay(stayMs);

      const initiatorShort = this.shortAgentLabel(initiator.blueprint.name);
      const partnerShort = this.shortAgentLabel(partner.blueprint.name);

      initiator.showSocialBubble(
        lolScript.inviteLine(partnerShort),
        '#38bdf8',
        'lol_game',
        2600,
      );
      this.scheduleSocialTimeout(() => {
        if (initiator.fsmState !== 'IDLE' || partner.fsmState !== 'IDLE') return;
        partner.showSocialBubble(
          lolScript.acceptLine(initiatorShort),
          '#22c55e',
          'lol_game',
          2600,
        );
      }, 1700);
      lolScript.followupTurns.forEach((turn, idx) => {
        this.scheduleSocialTimeout(() => {
          const speaker = turn.speakerSlot % 2 === 0 ? initiator : partner;
          if (speaker.fsmState !== 'IDLE' || speaker.idleSubState !== 'AT_DESK') return;
          speaker.showSocialBubble(
            turn.text,
            turn.accentColor || '#38bdf8',
            turn.hobbyIcon || 'lol_game',
            2600,
          );
        }, 3700 + idx * 2100);
      });
      return;
    }

    // 2. ~34% chance to join an existing active social furniture hangout with spare slots
    if (Math.random() < 0.34) {
      const activeFurn = this.currentBlueprint.furniture.find((f) => {
        if (
          f.type === 'DESK_PC' ||
          f.type === 'DIRECTOR_DESK' ||
          isRoamingFurnitureType(f.type)
        ) {
          return false;
        }
        const count = this.pathfinder.getAgentsAtFurnitureCount(f.id);
        return count > 0 && count < this.pathfinder.getFurnitureSocialCapacity(f);
      });
      if (activeFurn) {
        const joinSlot = this.pathfinder.reserveFurnitureSlotForAgent(
          initiatorId,
          activeFurn,
        );
        if (joinSlot) {
          void initiator.goToSocialFurnitureSlot(
            joinSlot,
            '🏃 Đợi với, tôi ra chơi cùng!',
            '#38bdf8',
            12000 + Math.random() * 4000,
          );
          return;
        }
      }
    }

    // 3. Pick a large/social furniture target & invite 1–2 colleagues along!
    const targetFurn = this.pickSocialFurnitureTarget(this.currentBlueprint);
    if (targetFurn) {
      const cap = this.pathfinder.getFurnitureSocialCapacity(targetFurn);
      const slot0 = this.pathfinder.reserveFurnitureSlotForAgent(
        initiatorId,
        targetFurn,
        cap,
      );
      if (slot0) {
        const invite = this.getInvitePhraseForFurniture(targetFurn.type);
        const playWindow = 12500 + Math.random() * 4000;
        void initiator.goToSocialFurnitureSlot(
          slot0,
          invite.text,
          invite.color,
          playWindow,
          invite.hobbyIcon,
        );

        // Shuffle available idle peers & invite 1 or 2 teammates (up to furniture cap)
        const shuffledPeers = [...idlePeers].sort(() => Math.random() - 0.5);
        const inviteGoal =
          cap >= 3 && shuffledPeers.length >= 2 && Math.random() < 0.72
            ? 2
            : 1;
        let invitedCount = 0;
        for (const peer of shuffledPeers) {
          if (invitedCount >= inviteGoal) break;
          const peerSlot = this.pathfinder.reserveFurnitureSlotForAgent(
            peer.blueprint.id,
            targetFurn,
            cap,
          );
          if (!peerSlot) break;
          invitedCount += 1;
          const delayIdx = invitedCount;
          this.scheduleSocialTimeout(() => {
            if (peer.fsmState !== 'IDLE') return;
            const replyText =
              delayIdx === 1 ? '🙌 Chơi luôn! Ra ngay!' : '👌 Cho tôi một slot với!';
            void peer.goToSocialFurnitureSlot(
              peerSlot,
              replyText,
              '#f59e0b',
              playWindow,
              invite.hobbyIcon,
            );
          }, delayIdx * 240);
        }
        return;
      }
    }

    // Fallback solo idle spot
    const fallbackSpot = this.pathfinder.reserveIdleDestination(
      initiatorId,
      this.currentBlueprint,
    );
    void initiator.goToSocialFurnitureSlot(
      fallbackSpot,
      '☕ Đi dạo thư giãn một lát...',
      '#38bdf8',
      11000 + Math.random() * 3500,
    );
  }

  private scheduleBanterScript(
    groupKey: string,
    players: AgentEntity[],
    furnId: string | null,
    furnType?: FurnitureType | null,
  ): void {
    const script = pickGroupBanterScript(furnType, players.length);
    const turnIntervalMs = 2050;
    const totalDurationMs = script.turns.length * turnIntervalMs;

    this.activeGroupBanterKeys.add(groupKey);
    // Keep participants at the furniture just long enough to finish this witty exchange (capped < 19.5s)
    for (const p of players) {
      p.extendFurniturePlayTime(totalDurationMs + 1600);
    }

    script.turns.forEach((turn, idx) => {
      this.scheduleSocialTimeout(() => {
        if (this.isBriefingActive) return;
        const speaker = players[turn.speakerSlot % players.length];
        if (!speaker || speaker.fsmState !== 'IDLE' || speaker.idleSubState !== 'AT_FURNITURE') {
          return;
        }
        if (furnId && speaker.activeIdleFurnitureId !== furnId) {
          return;
        }
        speaker.showSocialBubble(
          turn.text,
          turn.accentColor || '#22c55e',
          turn.hobbyIcon,
          2600,
        );
      }, idx * turnIntervalMs);
    });

    this.scheduleSocialTimeout(() => {
      this.activeGroupBanterKeys.delete(groupKey);
      this.groupBanterCooldownUntil.set(groupKey, Date.now() + 7200);
    }, totalDurationMs + 800);
  }

  private checkIdleAgentsProximityChat(): void {
    if (this.isBriefingActive) return;
    const now = Date.now();

    const furniturePlayers = Array.from(this.agentEntities.values()).filter(
      (a) => a.fsmState === 'IDLE' && a.idleSubState === 'AT_FURNITURE',
    );
    if (furniturePlayers.length < 2) return;

    // Pass 1: Co-op multi-player groups gathered around the same furniture item
    const byFurniture = new Map<string, AgentEntity[]>();
    const ungrouped: AgentEntity[] = [];

    for (const a of furniturePlayers) {
      if (a.activeIdleFurnitureId) {
        const list = byFurniture.get(a.activeIdleFurnitureId) || [];
        list.push(a);
        byFurniture.set(a.activeIdleFurnitureId, list);
      } else {
        ungrouped.push(a);
      }
    }

    const handledIds = new Set<string>();
    for (const [furnId, group] of byFurniture.entries()) {
      if (group.length < 2) {
        ungrouped.push(...group);
        continue;
      }
      for (const m of group) handledIds.add(m.blueprint.id);
      if (this.activeGroupBanterKeys.has(furnId)) continue;
      if (now < (this.groupBanterCooldownUntil.get(furnId) ?? 0)) continue;

      this.scheduleBanterScript(
        furnId,
        group,
        furnId,
        group[0].activeIdleFurnitureType,
      );
    }

    // Pass 2: Ad-hoc adjacent IDLE AT_FURNITURE agents on nearby spots (<= 2 tiles)
    for (let i = 0; i < ungrouped.length; i++) {
      const a1 = ungrouped[i];
      if (handledIds.has(a1.blueprint.id)) continue;
      for (let j = i + 1; j < ungrouped.length; j++) {
        const a2 = ungrouped[j];
        if (handledIds.has(a2.blueprint.id)) continue;
        const dist =
          Math.abs(a1.gridX - a2.gridX) + Math.abs(a1.gridY - a2.gridY);
        if (dist <= FSM_CONSTANTS.IDLE_CHAT_MAX_DISTANCE_TILES) {
          const pairKey = [a1.blueprint.id, a2.blueprint.id].sort().join('|');
          if (this.activeGroupBanterKeys.has(pairKey)) continue;
          if (now < (this.groupBanterCooldownUntil.get(pairKey) ?? 0)) continue;
          handledIds.add(a1.blueprint.id);
          handledIds.add(a2.blueprint.id);
          this.scheduleBanterScript(
            pairKey,
            [a1, a2],
            null,
            a1.activeIdleFurnitureType ?? a2.activeIdleFurnitureType,
          );
          break;
        }
      }
    }
  }

  private syncDeskMonitorGlow(agentId: string, fsmState: AgentFsmState): void {
    const deskEntity = this.getDeskEntityForAgent(agentId);
    const agentEntity = this.agentEntities.get(agentId);
    if (!deskEntity || !agentEntity) return;
    const isWorking =
      fsmState === 'WORKING' || fsmState === 'TOOL_CALL' || fsmState === 'HANDOFF';
    deskEntity.setWorkingActive(isWorking, agentEntity.blueprint.color);
  }

  private launchHandoffVisuals(
    fromAgentId: string,
    toAgentId: string,
    colorHex: string,
  ): void {
    const fromDesk = this.getDeskEntityForAgent(fromAgentId);
    const toDesk = this.getDeskEntityForAgent(toAgentId);
    if (!fromDesk || !toDesk) return;

    const [fx, fy] = fromDesk.getCenterPixel();
    const [tx, ty] = toDesk.getCenterPixel();
    this.handoffAnimator.launchPacket(fx, fy - 6, tx, ty - 6, colorHex, 650);
    this.dagOverlayLayer.triggerEdgePulse(fromAgentId, toAgentId, 1400);
  }

  private getDeskEntityForAgent(agentId: string): FurnitureEntity | undefined {
    const agentBp = this.currentBlueprint?.agents.find((a) => a.id === agentId);
    if (!agentBp) return undefined;
    return this.furnitureEntities.get(agentBp.desk_id);
  }

  private handleFurnitureClick(item: FurnitureItem): void {
    if (this.isEditMode) {
      this.setSelectedFurniture(item.id);
      this.callbacks.onSelectFurniture(item.id);
      return;
    }

    // In normal/God-View mode, clicking an agent's desk opens that agent's Inspector Drawer!
    if (item.agent_id && this.agentEntities.has(item.agent_id)) {
      this.setSelectedAgent(item.agent_id);
      this.callbacks.onSelectAgent(item.agent_id);
    }
  }

  private startDraggingFurniture(furnEntity: FurnitureEntity): void {
    this.draggingFurniture = furnEntity;
    this.setSelectedFurniture(furnEntity.item.id);
    this.callbacks.onSelectFurniture(furnEntity.item.id);
    if (this.camera) {
      this.camera.isInteractionLocked = true;
    }
  }

  private setupEditModePointerHandlers(canvas: HTMLCanvasElement): void {
    this.boundPointerMove = (e: PointerEvent) => {
      if (!this.camera || !this.currentBlueprint) return;
      const [gx, gy] = this.camera.screenToGrid(e.clientX, e.clientY, 32);

      if (
        gx >= 0 &&
        gx < this.currentBlueprint.meta.grid_cols &&
        gy >= 0 &&
        gy < this.currentBlueprint.meta.grid_rows
      ) {
        this.callbacks.onHoverTileChange?.([gx, gy]);
      } else {
        this.callbacks.onHoverTileChange?.(null);
      }

      if (!this.isEditMode || !this.draggingFurniture) return;

      const furn = this.draggingFurniture.item;
      const isValid = this.canPlaceFurnitureAt(furn, gx, gy);
      this.mapEditorLayer.showDragPreview(furn, gx, gy, isValid);
      this.draggingFurniture.container.x = gx * 32;
      this.draggingFurniture.container.y = gy * 32;
    };

    this.boundPointerUp = () => {
      if (!this.draggingFurniture || !this.currentBlueprint) return;
      const entity = this.draggingFurniture;
      this.draggingFurniture = null;
      if (this.camera) this.camera.isInteractionLocked = false;
      this.mapEditorLayer.clearDragPreview();

      const candidateX = Math.round(entity.container.x / 32);
      const candidateY = Math.round(entity.container.y / 32);

      if (candidateX === entity.item.x && candidateY === entity.item.y) {
        entity.syncPosition();
        return;
      }

      const result = this.callbacks.onFurnitureMovedInEditor(
        entity.item.id,
        candidateX,
        candidateY,
      );

      if (!result.success) {
        // Snap back to previous valid position
        entity.syncPosition();
      } else {
        // Reroute any moving agents around the newly placed obstacle
        for (const agent of this.agentEntities.values()) {
          void agent.rerouteActivePathIfNeeded();
        }
      }
    };

    canvas.addEventListener('pointermove', this.boundPointerMove);
    window.addEventListener('pointerup', this.boundPointerUp);
  }

  private canPlaceFurnitureAt(
    furn: FurnitureItem,
    candidateX: number,
    candidateY: number,
  ): boolean {
    if (!this.currentBlueprint) return false;
    const cols = this.currentBlueprint.meta.grid_cols;
    const rows = this.currentBlueprint.meta.grid_rows;
    const [w, h] = furn.footprint;

    if (
      candidateX < 1 ||
      candidateY < 1 ||
      candidateX + w > cols - 1 ||
      candidateY + h > rows - 1
    ) {
      return false;
    }

    for (const other of this.currentBlueprint.furniture) {
      if (other.id === furn.id) continue;
      const [ow, oh] = other.footprint;
      const overlaps =
        candidateX < other.x + ow &&
        candidateX + w > other.x &&
        candidateY < other.y + oh &&
        candidateY + h > other.y;
      if (overlaps) return false;
    }

    return true;
  }

  private drawFloorAndZones(blueprint: OfficeBlueprint): void {
    this.floorGraphics.clear();
    this.zoneLabelsContainer.removeChildren();

    const cols = blueprint.meta.grid_cols;
    const rows = blueprint.meta.grid_rows;

    const getZoneAt = (col: number, row: number): ZoneType | null => {
      for (const z of blueprint.zones) {
        const [zx, zy, zw, zh] = z.rect;
        if (col >= zx && col < zx + zw && row >= zy && row < zy + zh) {
          return z.type;
        }
      }
      return null;
    };

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isWall = c === 0 || r === 0 || c === cols - 1 || r === rows - 1;
        const zType = isWall ? null : getZoneAt(c, r);
        drawFloorTile(this.floorGraphics, c, r, isWall, zType);
      }
    }

    // Draw Zone borders & Pixel Zone Titles
    const zoneLabelStyle = new TextStyle({
      fontFamily: 'Silkscreen, JetBrains Mono, monospace',
      fontSize: 9,
      fontWeight: '700',
      fill: 0x94a3b8,
    });

    for (const z of blueprint.zones) {
      const [zx, zy, zw, zh] = z.rect;
      let borderColor = 0x38bdf8;
      if (z.type === 'APPROVAL') borderColor = 0xc084fc;
      else if (z.type === 'IDLE') borderColor = 0x34d399;
      else if (z.type === 'DIRECTOR') borderColor = 0xfbbf24;

      this.floorGraphics
        .rect(zx * 32 + 1, zy * 32 + 1, zw * 32 - 2, zh * 32 - 2)
        .stroke({ width: z.type === 'DIRECTOR' ? 1.8 : 1.2, color: borderColor, alpha: z.type === 'DIRECTOR' ? 0.72 : 0.48 });

      const label = new Text({
        text: `${z.name.toUpperCase()} [${z.type}]`,
        style: new TextStyle({
          ...zoneLabelStyle,
          fill: hexToNumber(
            z.type === 'WORK'
              ? '#7dd3fc'
              : z.type === 'APPROVAL'
                ? '#d8b4fe'
                : z.type === 'DIRECTOR'
                  ? '#fde047'
                  : '#6ee7b7',
          ),
        }),
        resolution: 2,
      });
      label.x = zx * 32 + 6;
      label.y = zy * 32 + 4;
      label.alpha = 0.78;
      this.zoneLabelsContainer.addChild(label);
    }
  }

  public updateAgentAppearance(
    agentId: string,
    patch: { name?: string; avatar_sprite?: string; color?: string },
  ): void {
    const entity = this.agentEntities.get(agentId);
    if (entity) {
      entity.updateProfile(patch);
    }
    if (this.currentBlueprint) {
      const bpAgent = this.currentBlueprint.agents.find((a) => a.id === agentId);
      if (bpAgent) {
        if (patch.name !== undefined && patch.name.trim()) {
          bpAgent.name = patch.name.trim();
        }
        if (patch.avatar_sprite !== undefined) {
          bpAgent.avatar_sprite = patch.avatar_sprite;
        }
        if (patch.color !== undefined) {
          bpAgent.color = patch.color;
        }
      }
    }
  }

  public destroy(): void {
    this.clearSocialBanterTimers();
    if (this.app?.canvas && this.boundPointerMove) {
      this.app.canvas.removeEventListener('pointermove', this.boundPointerMove);
    }
    if (this.boundPointerUp) {
      window.removeEventListener('pointerup', this.boundPointerUp);
    }
    this.camera?.destroy();
    this.handoffAnimator.destroy();
    this.dagOverlayLayer.destroy();
    this.mapEditorLayer.destroy();
    for (const f of this.furnitureEntities.values()) f.destroy();
    for (const a of this.agentEntities.values()) a.destroy();
    this.directorEntity?.destroy();
    this.directorEntity = null;
    this.app?.destroy(true, { children: true });
    this.app = null;
  }
}
