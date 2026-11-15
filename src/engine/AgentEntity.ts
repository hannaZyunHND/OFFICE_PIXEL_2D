import { Container, Graphics, Sprite, Text, TextStyle, type Texture } from 'pixi.js';
import type {
  AgentBlueprint,
  Direction,
  FurnitureItem,
  FurnitureType,
} from '@/types/blueprint';
import type {
  AgentEvent,
  IdleHobbyIconType,
  ToolIconType,
} from '@/types/events';
import { pickDeskIdleActivity } from '@/data/officeBanterScripts';
import {
  FSM_CONSTANTS,
  type AgentFsmState,
  type QueuedAgentAction,
} from '@/types/fsm';
import type { GridPoint } from './GridPathfinder';
import { drawProceduralAgent, hexToNumber } from './graphics/ProceduralSprites';
import { BubbleRenderer } from './graphics/BubbleRenderer';
import type { DirectionalFrames } from './graphics/SpriteSheetSlicer';

export type AgentIdleSubState = 'NONE' | 'AT_DESK' | 'AT_FURNITURE';

export interface AgentSpeechEmitPayload {
  speakerId: string;
  speakerName: string;
  speakerColor: string;
  category: 'DRAMA' | 'DIRECTOR' | 'WORK';
  text: string;
  furnitureType?: FurnitureType | null;
  icon?: IdleHobbyIconType | ToolIconType | 'director' | 'handoff' | 'return';
}

export interface AgentTransitionCallbacks {
  onCoarseStateChange: (
    agentId: string,
    fsmState: AgentFsmState,
    statusText: string,
    activeToolIcon: ToolIconType | null,
    queueDepth: number,
  ) => void;
  onRequestPath: (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
  ) => Promise<GridPoint[] | null>;
  onRequestIdleSpot: (
    agentId: string,
  ) => {
    x: number;
    y: number;
    facing: Direction;
    furnitureId: string | null;
    furnitureType?: FurnitureType;
  };
  onReleaseIdleSpot?: (agentId: string) => void;
  onRequestSocialHangout?: (agentId: string) => void;
  onSpeechEmit?: (payload: AgentSpeechEmitPayload) => void;
  onLaunchHandoffPacket: (
    fromAgentId: string,
    toAgentId: string,
    colorHex: string,
  ) => void;
  getAgentDesk: (agentId: string) => FurnitureItem | undefined;
}

/**
 * Autonomous simulated Agent entity with:
 * - Finite State Machine (IDLE, MOVING, WORKING, TOOL_CALL, HANDOFF, COMPLETE, ERROR)
 * - Per-Agent Event Queue with min_duration = 1200ms throttling
 * - 8000ms inactivity timer that routes agent to an IDLE zone (coffee machine / sofa)
 * - 60 FPS A* path interpolation and directional procedural/sprite animation
 */
export class AgentEntity {
  public readonly blueprint: AgentBlueprint;
  public readonly container: Container;
  public readonly bubble: BubbleRenderer;

  private readonly bodyGraphics: Graphics;
  private readonly selectionRing: Graphics;
  private readonly nameTag: Text;
  private customSprite: Sprite | null = null;
  private customFrames: DirectionalFrames | null = null;

  public gridX: number;
  public gridY: number;
  public pixelX: number;
  public pixelY: number;
  public facing: Direction = 'UP';
  public fsmState: AgentFsmState = 'IDLE';

  private eventQueue: QueuedAgentAction[] = [];
  private activePath: GridPoint[] = [];
  private pathTargetState: AgentFsmState = 'WORKING';
  private pathTargetFacing: Direction = 'UP';
  private onArrivalCallback: (() => void) | null = null;

  private stateHoldRemainingMs = 0;
  private idleSlackingCountdownMs = 0;
  private walkAnimTimerMs = 0;
  private walkFrame = 0;
  private isSelected = false;
  private isGodViewNodeVisible = false;
  private statusText = 'Sẵn sàng';
  private isBriefingHold = false;
  private briefingSpeedFactor = 1;
  private suppressNextWalkHideBubble = false;
  private activeToolIcon: ToolIconType | null = null;
  private chatTimerMs = 0;
  public lastChatTimestampMs = 0;

  // Autonomous idle desk <-> social furniture lifecycle
  public idleSubState: AgentIdleSubState = 'AT_DESK';
  public activeIdleFurnitureId: string | null = null;
  public activeIdleFurnitureType: FurnitureType | null = null;
  private idleHobbyTimerMs = 0;
  private idleAtDeskCountdownMs = 0;
  private idlePlayTimeLeftMs = 0;

  private readonly callbacks: AgentTransitionCallbacks;

  constructor(
    blueprint: AgentBlueprint,
    initialTileX: number,
    initialTileY: number,
    initialFacing: Direction,
    callbacks: AgentTransitionCallbacks,
    onClick?: (agentId: string) => void,
  ) {
    this.blueprint = { ...blueprint };
    this.gridX = initialTileX;
    this.gridY = initialTileY;
    this.pixelX = initialTileX * 32;
    this.pixelY = initialTileY * 32;
    this.facing = initialFacing;
    this.callbacks = callbacks;

    this.container = new Container();
    this.container.eventMode = 'static';
    this.container.cursor = 'pointer';

    this.selectionRing = new Graphics();
    this.bodyGraphics = new Graphics();
    this.bubble = new BubbleRenderer();
    this.bubble.container.x = 16;
    this.bubble.container.y = 4;

    const tagStyle = new TextStyle({
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 8.5,
      fontWeight: '600',
      fill: 0xf8fafc,
    });
    const baseLabel = blueprint.name.split(/\s*[—–([|]\s*/)[0].trim();
    const shortName =
      baseLabel.length > 16 ? `${baseLabel.slice(0, 15)}…` : baseLabel;
    this.nameTag = new Text({ text: shortName, style: tagStyle, resolution: 2 });
    const measuredWidth =
      typeof document !== 'undefined' ? this.nameTag.width : shortName.length * 5.5;
    this.nameTag.x = Math.round(16 - measuredWidth / 2);
    this.nameTag.y = 29;

    this.container.addChild(this.selectionRing);
    this.container.addChild(this.bodyGraphics);
    this.container.addChild(this.nameTag);

    if (onClick) {
      this.container.on('pointertap', (e) => {
        e.stopPropagation();
        onClick(this.blueprint.id);
      });
    }

    this.syncTransform();
    this.redrawCharacter();
    this.drawRing();

    // Stagger initial desk hobby & first hangout invitation timers
    this.idleHobbyTimerMs = 1400 + Math.random() * 4200;
    this.idleAtDeskCountdownMs = 4500 + Math.random() * 9000;
  }

  private emitSpeech(
    text: string,
    category: 'DRAMA' | 'DIRECTOR' | 'WORK',
    icon?: IdleHobbyIconType | ToolIconType | 'director' | 'handoff' | 'return',
    furnitureType?: FurnitureType | null,
  ): void {
    this.callbacks.onSpeechEmit?.({
      speakerId: this.blueprint.id,
      speakerName: this.blueprint.name,
      speakerColor: this.blueprint.color,
      category,
      text,
      icon,
      furnitureType:
        furnitureType !== undefined ? furnitureType : this.activeIdleFurnitureType,
    });
  }

  private cancelIdleLifecycle(): void {
    this.idleSubState = 'NONE';
    this.idleHobbyTimerMs = 0;
    this.idleAtDeskCountdownMs = 0;
    this.idlePlayTimeLeftMs = 0;
    this.activeIdleFurnitureId = null;
    this.activeIdleFurnitureType = null;
    this.callbacks.onReleaseIdleSpot?.(this.blueprint.id);
  }

  public enqueueEvent(event: AgentEvent): void {
    this.eventQueue.push({
      event,
      enqueuedAtMs: Date.now(),
    });
    this.idleSlackingCountdownMs = 0;
    this.cancelIdleLifecycle();
    this.emitCoarseState();
  }

  public getQueueDepth(): number {
    return this.eventQueue.length;
  }

  public async walkToDirectorBriefing(
    targetX: number,
    targetY: number,
    facing: Direction,
    walkingBubbleText?: string,
  ): Promise<void> {
    this.isBriefingHold = true;
    this.briefingSpeedFactor = 1.85;
    this.idleSlackingCountdownMs = 0;
    this.stateHoldRemainingMs = 0;
    this.cancelIdleLifecycle();

    if (walkingBubbleText) {
      this.suppressNextWalkHideBubble = true;
      this.bubble.showStatusBubble(walkingBubbleText, '#38bdf8');
      this.emitSpeech(walkingBubbleText, 'DIRECTOR', 'director', null);
    }

    await new Promise<void>((resolve) => {
      let resolved = false;
      const done = () => {
        if (resolved) return;
        resolved = true;
        resolve();
      };
      void this.ensureAtTileAndThen(targetX, targetY, facing, 'WORKING', done);
      setTimeout(done, 8500);
    });
  }

  public showBriefingBubble(
    text: string,
    borderColor = '#fbbf24',
    facing?: Direction,
  ): void {
    if (facing) {
      this.facing = facing;
      this.redrawCharacter();
    }
    this.statusText = text;
    this.bubble.showStatusBubble(text, borderColor);
    this.emitSpeech(text, 'DIRECTOR', 'director', null);
  }

  public endDirectorBriefing(): void {
    this.isBriefingHold = false;
    this.briefingSpeedFactor = 1;
    this.suppressNextWalkHideBubble = false;
  }

  public setSelected(selected: boolean): void {
    if (this.isSelected === selected) return;
    this.isSelected = selected;
    this.drawRing();
  }

  public setGodViewOverlay(active: boolean): void {
    if (this.isGodViewNodeVisible === active) return;
    this.isGodViewNodeVisible = active;
    this.drawRing();
  }

  public setCustomDirectionalFrames(frames: DirectionalFrames | null): void {
    this.customFrames = frames;
    if (!frames) {
      if (this.customSprite) {
        this.container.removeChild(this.customSprite);
        this.customSprite.destroy();
        this.customSprite = null;
      }
      this.bodyGraphics.visible = true;
      this.redrawCharacter();
      return;
    }

    this.bodyGraphics.visible = false;
    if (!this.customSprite) {
      this.customSprite = new Sprite(frames.DOWN[0]);
      this.container.addChildAt(this.customSprite, 1);
    }
    this.updateCustomSpriteFrame();
  }

  public triggerWatercoolerChat(seedIndex?: number): void {
    if (this.fsmState !== 'IDLE' || this.chatTimerMs > 0) return;
    this.chatTimerMs = FSM_CONSTANTS.IDLE_CHAT_DURATION_MS;
    this.lastChatTimestampMs = Date.now();
    const quote = this.bubble.showWatercoolerChat(seedIndex);
    this.emitSpeech(quote, 'DRAMA');
  }

  public isBusyForSocialHangout(): boolean {
    return (
      this.fsmState !== 'IDLE' ||
      this.eventQueue.length > 0 ||
      this.isBriefingHold ||
      this.idleSubState !== 'AT_DESK'
    );
  }

  public showSocialBubble(
    text: string,
    borderColor = '#22c55e',
    hobbyIcon?: IdleHobbyIconType,
    durationMs = 3100,
  ): void {
    if (this.fsmState !== 'IDLE' && this.fsmState !== 'MOVING') return;
    this.chatTimerMs = durationMs;
    this.lastChatTimestampMs = Date.now();
    if (hobbyIcon) {
      this.bubble.showHobbyBadge(hobbyIcon, text, borderColor);
    } else {
      this.bubble.showStatusBubble(text, borderColor);
    }
    this.emitSpeech(
      text,
      'DRAMA',
      hobbyIcon,
      this.idleSubState === 'AT_DESK' ? 'DESK_PC' : this.activeIdleFurnitureType,
    );
  }

  public extendFurniturePlayTime(minRemainingMs: number): void {
    if (this.idleSubState !== 'AT_FURNITURE') return;
    this.idlePlayTimeLeftMs = Math.min(
      19500,
      Math.max(this.idlePlayTimeLeftMs, minRemainingMs),
    );
  }

  public rescheduleDeskStay(delayMs: number): void {
    if (this.idleSubState !== 'AT_DESK') return;
    this.idleAtDeskCountdownMs = Math.max(this.idleAtDeskCountdownMs, delayMs);
    this.idleHobbyTimerMs = Math.max(this.idleHobbyTimerMs, delayMs + 800);
  }

  public async goToSocialFurnitureSlot(
    slot: {
      x: number;
      y: number;
      facing: Direction;
      furnitureId: string | null;
      furnitureType?: FurnitureType;
    },
    walkingBubbleText?: string,
    borderColor = '#38bdf8',
    playDurationMs?: number,
    hobbyIcon?: IdleHobbyIconType,
  ): Promise<void> {
    this.idleSubState = 'NONE';
    this.idleHobbyTimerMs = 0;
    this.idleAtDeskCountdownMs = 0;
    this.activeIdleFurnitureId = slot.furnitureId;
    this.activeIdleFurnitureType = slot.furnitureType ?? null;

    if (walkingBubbleText) {
      this.suppressNextWalkHideBubble = true;
      this.chatTimerMs = 2800;
      if (hobbyIcon) {
        this.bubble.showHobbyBadge(hobbyIcon, walkingBubbleText, borderColor);
      } else {
        this.bubble.showStatusBubble(walkingBubbleText, borderColor);
      }
      this.emitSpeech(walkingBubbleText, 'DRAMA', hobbyIcon, slot.furnitureType ?? null);
    }

    await this.ensureAtTileAndThen(slot.x, slot.y, slot.facing, 'IDLE', () => {
      if (this.eventQueue.length > 0 || this.isBriefingHold) return;
      this.idleSubState = 'AT_FURNITURE';
      this.activeIdleFurnitureId = slot.furnitureId;
      this.activeIdleFurnitureType = slot.furnitureType ?? null;
      this.idlePlayTimeLeftMs =
        playDurationMs ?? 11500 + Math.random() * 4500;
      this.statusText = 'Giải lao cùng đồng nghiệp ☕';
      this.activeToolIcon = null;
      this.bubble.hide();
      this.emitCoarseState();
    });
  }

  public async returnToDeskFromIdle(): Promise<void> {
    this.activeIdleFurnitureId = null;
    this.activeIdleFurnitureType = null;
    this.idlePlayTimeLeftMs = 0;
    this.idleSubState = 'NONE';
    this.callbacks.onReleaseIdleSpot?.(this.blueprint.id);

    const desk = this.callbacks.getAgentDesk(this.blueprint.id);
    const deskIx = desk ? desk.interaction_point[0] : this.gridX;
    const deskIy = desk ? desk.interaction_point[1] : this.gridY;
    const deskFacing = desk ? desk.facing : 'UP';

    this.suppressNextWalkHideBubble = true;
    this.chatTimerMs = 2600;
    const returnMsg = '💼 Về bàn làm việc thôi!';
    this.bubble.showStatusBubble(returnMsg, '#38bdf8');
    this.emitSpeech(returnMsg, 'DRAMA', 'return', null);

    await this.ensureAtTileAndThen(deskIx, deskIy, deskFacing, 'IDLE', () => {
      if (this.eventQueue.length > 0 || this.isBriefingHold) return;
      this.idleSubState = 'AT_DESK';
      this.activeIdleFurnitureId = null;
      this.activeIdleFurnitureType = null;
      this.idlePlayTimeLeftMs = 0;
      this.idleHobbyTimerMs = 1800 + Math.random() * 2400;
      this.idleAtDeskCountdownMs = 10500 + Math.random() * 9000;
      this.statusText = 'Sẵn sàng tại bàn làm việc 💻';
      this.activeToolIcon = null;
      this.bubble.hide();
      this.emitCoarseState();
    });
  }

  /**
   * 60 FPS Ticker Update (called from OfficeRenderer app.ticker).
   * Speed multiplier (1x or 2x) scales movement & timers cleanly.
   */
  public tick(deltaMs: number, speedMultiplier = 1): void {
    const scaledDeltaMs = deltaMs * speedMultiplier;

    // 1. Update walk/typing frame cycle
    this.walkAnimTimerMs += scaledDeltaMs;
    if (this.walkAnimTimerMs >= 140) {
      this.walkAnimTimerMs = 0;
      this.walkFrame = (this.walkFrame + 1) % 4;
      this.redrawCharacter();
    }

    // 2. Social / desk hobby bubble expiry
    if (this.chatTimerMs > 0) {
      this.chatTimerMs -= scaledDeltaMs;
      if (this.chatTimerMs <= 0 && this.fsmState === 'IDLE') {
        this.bubble.hide();
      }
    }

    // 3. Handle continuous A* path movement
    if (this.fsmState === 'MOVING' && this.activePath.length > 0) {
      this.stepAlongPath(scaledDeltaMs * this.briefingSpeedFactor);
      this.syncTransform();
      return;
    }

    if (this.isBriefingHold) {
      return;
    }

    // 4. Decrement active state minimum duration timer (1200ms throttling)
    if (this.stateHoldRemainingMs > 0) {
      this.stateHoldRemainingMs = Math.max(0, this.stateHoldRemainingMs - scaledDeltaMs);
      return;
    }

    // 5. Process next queued event if available
    if (this.eventQueue.length > 0) {
      const nextItem = this.eventQueue.shift()!;
      void this.executeQueuedEvent(nextItem.event);
      return;
    }

    // 6. Handle 8000ms inactivity countdown after COMPLETE -> IDLE / SLACKING
    if (this.fsmState === 'COMPLETE' && this.idleSlackingCountdownMs > 0) {
      this.idleSlackingCountdownMs -= scaledDeltaMs;
      if (this.idleSlackingCountdownMs <= 0) {
        void this.navigateToIdleZone();
      }
      return;
    }

    // 7. Autonomous idle lifestyle: play briefly at furniture -> MUST return to desk -> LoL / sing / yawn!
    if (this.fsmState === 'IDLE') {
      if (this.idleSubState === 'AT_FURNITURE') {
        if (this.idlePlayTimeLeftMs > 0) {
          this.idlePlayTimeLeftMs -= scaledDeltaMs;
          if (this.idlePlayTimeLeftMs <= 0) {
            void this.returnToDeskFromIdle();
          }
        }
      } else if (this.idleSubState === 'AT_DESK') {
        if (this.idleHobbyTimerMs > 0) {
          this.idleHobbyTimerMs -= scaledDeltaMs;
          if (this.idleHobbyTimerMs <= 0) {
            const hobby = pickDeskIdleActivity();
            this.chatTimerMs = 3400;
            this.lastChatTimestampMs = Date.now();
            this.bubble.showHobbyBadge(hobby.icon, hobby.text, hobby.accentColor);
            this.emitSpeech(hobby.text, 'DRAMA', hobby.icon, 'DESK_PC');
            this.idleHobbyTimerMs = 4600 + Math.random() * 3200;
          }
        }
        if (this.idleAtDeskCountdownMs > 0) {
          this.idleAtDeskCountdownMs -= scaledDeltaMs;
          if (this.idleAtDeskCountdownMs <= 0) {
            this.idleAtDeskCountdownMs = 11000 + Math.random() * 8000;
            this.callbacks.onRequestSocialHangout?.(this.blueprint.id);
          }
        }
      }
    }
  }

  private async executeQueuedEvent(event: AgentEvent): Promise<void> {
    const desk = this.callbacks.getAgentDesk(this.blueprint.id);
    const deskIx = desk ? desk.interaction_point[0] : this.gridX;
    const deskIy = desk ? desk.interaction_point[1] : this.gridY;
    const deskFacing = desk ? desk.facing : 'UP';

    switch (event.event_type) {
      case 'AGENT_START': {
        const status = event.metadata?.status_text || 'Đang xử lý tác vụ...';
        await this.ensureAtTileAndThen(deskIx, deskIy, deskFacing, 'WORKING', () => {
          this.statusText = status;
          this.activeToolIcon = null;
          this.bubble.showStatusBubble(status, this.blueprint.color);
          this.emitSpeech(status, 'WORK', undefined, 'DESK_PC');
          this.stateHoldRemainingMs = FSM_CONSTANTS.MIN_ACTIVE_STATE_DURATION_MS;
          this.emitCoarseState();
        });
        break;
      }

      case 'AGENT_TOOL_CALL': {
        const icon: ToolIconType = event.metadata?.icon || 'search';
        const status = event.metadata?.status_text || `Tool: ${icon}`;
        await this.ensureAtTileAndThen(deskIx, deskIy, deskFacing, 'TOOL_CALL', () => {
          this.statusText = status;
          this.activeToolIcon = icon;
          this.bubble.showToolBadge(icon, status);
          this.emitSpeech(status, 'WORK', icon, 'DESK_PC');
          this.stateHoldRemainingMs = FSM_CONSTANTS.MIN_ACTIVE_STATE_DURATION_MS;
          this.emitCoarseState();
        });
        break;
      }

      case 'AGENT_HANDOFF': {
        const targetId = event.target_agent_id;
        const targetDesk = targetId ? this.callbacks.getAgentDesk(targetId) : undefined;
        const status =
          event.metadata?.status_text || `Chuyển giao → ${targetId ?? 'Agent'}`;

        if (targetId && targetDesk) {
          const manhattanDist =
            Math.abs(targetDesk.interaction_point[0] - this.gridX) +
            Math.abs(targetDesk.interaction_point[1] - this.gridY);

          if (manhattanDist > 0 && manhattanDist < FSM_CONSTANTS.WALK_HANDOFF_MAX_TILES) {
            // Walk physically to target agent's desk when distance < 6 tiles
            await this.ensureAtTileAndThen(
              targetDesk.interaction_point[0],
              targetDesk.interaction_point[1],
              targetDesk.facing,
              'HANDOFF',
              () => {
                this.statusText = status;
                this.activeToolIcon = 'message';
                this.bubble.showStatusBubble(`📦 ${status}`, '#f59e0b');
                this.emitSpeech(`📦 ${status}`, 'WORK', 'handoff', 'DESK_PC');
                this.callbacks.onLaunchHandoffPacket(
                  this.blueprint.id,
                  targetId,
                  this.blueprint.color,
                );
                this.stateHoldRemainingMs = 950;
                this.emitCoarseState();
              },
            );
            break;
          }
        }

        // Standard Bézier curve packet launch from desk
        await this.ensureAtTileAndThen(deskIx, deskIy, deskFacing, 'HANDOFF', () => {
          this.statusText = status;
          this.activeToolIcon = 'message';
          this.bubble.showStatusBubble(`📨 ${status}`, '#c084fc');
          this.emitSpeech(`📨 ${status}`, 'WORK', 'handoff', 'DESK_PC');
          if (targetId) {
            this.callbacks.onLaunchHandoffPacket(
              this.blueprint.id,
              targetId,
              this.blueprint.color,
            );
          }
          this.stateHoldRemainingMs = 950;
          this.emitCoarseState();
        });
        break;
      }

      case 'AGENT_COMPLETE': {
        const status = event.metadata?.status_text || 'Hoàn tất nhiệm vụ ✓';
        this.fsmState = 'COMPLETE';
        this.statusText = status;
        this.activeToolIcon = 'check';
        this.bubble.showToolBadge('check', status);
        this.emitSpeech(status, 'WORK', 'check', 'DESK_PC');
        this.stateHoldRemainingMs = 0;
        this.idleSlackingCountdownMs = FSM_CONSTANTS.IDLE_SLACKING_TIMEOUT_MS;
        this.redrawCharacter();
        this.emitCoarseState();
        break;
      }

      case 'AGENT_ERROR': {
        const status = event.metadata?.status_text || 'Lỗi thực thi tác vụ!';
        this.fsmState = 'ERROR';
        this.statusText = status;
        this.activeToolIcon = 'error';
        this.bubble.showToolBadge('error', status);
        this.emitSpeech(status, 'WORK', 'error', 'DESK_PC');
        this.stateHoldRemainingMs = FSM_CONSTANTS.MIN_ACTIVE_STATE_DURATION_MS;
        this.redrawCharacter();
        this.emitCoarseState();
        break;
      }
    }
  }

  private async ensureAtTileAndThen(
    targetX: number,
    targetY: number,
    targetFacing: Direction,
    arrivalState: AgentFsmState,
    onArrive: () => void,
  ): Promise<void> {
    if (this.gridX === targetX && this.gridY === targetY) {
      this.facing = targetFacing;
      this.fsmState = arrivalState;
      this.redrawCharacter();
      onArrive();
      return;
    }

    const path = await this.callbacks.onRequestPath(
      this.gridX,
      this.gridY,
      targetX,
      targetY,
    );

    if (!path || path.length <= 1) {
      // Unreachable tile fallback: show warning indicator at current position
      this.facing = targetFacing;
      this.fsmState = arrivalState;
      this.redrawCharacter();
      onArrive();
      return;
    }

    // Drop the starting tile (index 0)
    this.activePath = path.slice(1);
    this.pathTargetState = arrivalState;
    this.pathTargetFacing = targetFacing;
    this.onArrivalCallback = onArrive;
    this.fsmState = 'MOVING';
    this.statusText = `Di chuyển tới (${targetX}, ${targetY})...`;
    if (this.suppressNextWalkHideBubble) {
      this.suppressNextWalkHideBubble = false;
    } else {
      this.bubble.hide();
    }
    this.emitCoarseState();
  }

  private async navigateToIdleZone(): Promise<void> {
    this.idleSubState = 'NONE';
    const spot = this.callbacks.onRequestIdleSpot(this.blueprint.id);
    await this.ensureAtTileAndThen(spot.x, spot.y, spot.facing, 'IDLE', () => {
      if (this.eventQueue.length > 0 || this.isBriefingHold) return;
      this.idleSubState = 'AT_FURNITURE';
      this.activeIdleFurnitureId = spot.furnitureId;
      this.activeIdleFurnitureType = spot.furnitureType ?? null;
      this.idlePlayTimeLeftMs = 11500 + Math.random() * 4500;
      this.statusText = 'Nghỉ giải lao tại Pantry ☕';
      this.activeToolIcon = null;
      this.bubble.hide();
      this.emitCoarseState();
    });
  }

  public async rerouteActivePathIfNeeded(): Promise<void> {
    if (this.fsmState !== 'MOVING' || this.activePath.length === 0) return;
    const finalDest = this.activePath[this.activePath.length - 1];
    const newPath = await this.callbacks.onRequestPath(
      this.gridX,
      this.gridY,
      finalDest.x,
      finalDest.y,
    );
    if (newPath && newPath.length > 1) {
      this.activePath = newPath.slice(1);
    } else {
      this.activePath = [];
      this.fsmState = 'ERROR';
      this.bubble.showToolBadge('error', 'Lối đi bị chặn!');
      this.emitCoarseState();
    }
  }

  private stepAlongPath(deltaMs: number): void {
    const targetTile = this.activePath[0];
    const targetPxX = targetTile.x * 32;
    const targetPxY = targetTile.y * 32;

    const dx = targetPxX - this.pixelX;
    const dy = targetPxY - this.pixelY;

    if (Math.abs(dx) > Math.abs(dy)) {
      this.facing = dx > 0 ? 'RIGHT' : 'LEFT';
    } else if (Math.abs(dy) > 0) {
      this.facing = dy > 0 ? 'DOWN' : 'UP';
    }

    // 4.5 tiles per second (= 144 pixels/sec)
    const stepPx = (144 * deltaMs) / 1000;
    const dist = Math.hypot(dx, dy);

    if (dist <= stepPx) {
      this.pixelX = targetPxX;
      this.pixelY = targetPxY;
      this.gridX = targetTile.x;
      this.gridY = targetTile.y;
      this.activePath.shift();

      if (this.activePath.length === 0) {
        this.facing = this.pathTargetFacing;
        this.fsmState = this.pathTargetState;
        this.redrawCharacter();
        if (this.onArrivalCallback) {
          const cb = this.onArrivalCallback;
          this.onArrivalCallback = null;
          cb();
        }
      }
    } else {
      this.pixelX += (dx / dist) * stepPx;
      this.pixelY += (dy / dist) * stepPx;
    }
  }

  private syncTransform(): void {
    const rx = Math.round(this.pixelX);
    const ry = Math.round(this.pixelY);
    this.container.x = rx;
    this.container.y = ry;
    this.container.zIndex = ry + 30;
    this.bubble.container.x = rx + 16;
    this.bubble.container.y = ry + 2;
  }

  private redrawCharacter(): void {
    if (this.customFrames && this.customSprite) {
      this.updateCustomSpriteFrame();
      return;
    }
    const isMoving = this.fsmState === 'MOVING';
    const isWorking =
      this.fsmState === 'WORKING' || this.fsmState === 'TOOL_CALL';
    drawProceduralAgent(
      this.bodyGraphics,
      this.blueprint.color,
      this.facing,
      isMoving,
      isWorking,
      this.walkFrame,
      this.blueprint.avatar_sprite,
    );
  }

  private updateCustomSpriteFrame(): void {
    if (!this.customFrames || !this.customSprite) return;
    const dirFrames = this.customFrames[this.facing];
    if (!dirFrames || dirFrames.length === 0) return;
    const idx =
      this.fsmState === 'MOVING' ? this.walkFrame % dirFrames.length : 0;
    this.customSprite.texture = dirFrames[idx];
    this.customSprite.width = 32;
    this.customSprite.height = 32;
  }

  private drawRing(): void {
    this.selectionRing.clear();
    if (!this.isSelected && !this.isGodViewNodeVisible) return;
    const color = hexToNumber(this.blueprint.color);
    this.selectionRing
      .circle(16, 26, this.isSelected ? 11 : 9)
      .stroke({
        width: this.isSelected ? 2 : 1.2,
        color: this.isSelected ? 0xffffff : color,
        alpha: this.isSelected ? 0.95 : 0.65,
      });
  }

  private emitCoarseState(): void {
    this.callbacks.onCoarseStateChange(
      this.blueprint.id,
      this.fsmState,
      this.statusText,
      this.activeToolIcon,
      this.eventQueue.length,
    );
  }

  public updateProfile(patch: {
    name?: string;
    avatar_sprite?: string;
    color?: string;
  }): void {
    if (patch.name !== undefined && patch.name.trim()) {
      this.blueprint.name = patch.name.trim();
      const baseLabel = this.blueprint.name.split(/\s*[—–([|]\s*/)[0].trim();
      const shortName =
        baseLabel.length > 16 ? `${baseLabel.slice(0, 15)}…` : baseLabel;
      this.nameTag.text = shortName;
      const measuredWidth =
        typeof document !== 'undefined' ? this.nameTag.width : shortName.length * 5.5;
      this.nameTag.x = Math.round(16 - measuredWidth / 2);
    }
    if (patch.avatar_sprite !== undefined) {
      this.blueprint.avatar_sprite = patch.avatar_sprite;
    }
    if (patch.color !== undefined) {
      this.blueprint.color = patch.color;
    }
    this.redrawCharacter();
    this.drawRing();
  }

  public destroy(): void {
    this.bubble.destroy();
    this.container.destroy({ children: true });
  }
}
