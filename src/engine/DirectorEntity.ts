import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type {
  Direction,
  FurnitureItem,
  FurnitureType,
  OfficeBlueprint,
} from '@/types/blueprint';
import type { GridPathfinder, GridPoint } from './GridPathfinder';
import { drawProceduralAgent } from './graphics/ProceduralSprites';
import { BubbleRenderer } from './graphics/BubbleRenderer';

export type DirectorMode = 'AUTONOMOUS' | 'BRIEFING';

export interface DirectorActiveWorkerInfo {
  id: string;
  name: string;
  gridX: number;
  gridY: number;
  statusText: string;
}

export interface DirectorTickContext {
  blueprint: OfficeBlueprint;
  pathfinder: GridPathfinder;
  getActiveWorkers: () => DirectorActiveWorkerInfo[];
  getOccupiedTiles: () => Set<string>;
}

const FURNITURE_BUBBLES: Partial<Record<FurnitureType, string[]>> = {
  PS5_PES_STATION: ['🎮 Làm kèo PES PS5 không anh em?', '⚽ Gặp sếp là thua 3 bàn không gỡ nha!'],
  POOL_TABLE: ['🎱 Làm cơ bida thư giãn tí!', '🎱 Đường bi chuẩn CEO!'],
  PING_PONG_TABLE: ['🏓 Giao lưu bóng bàn không?', '🏓 Phản xạ vẫn đỉnh lắm!'],
  FOOSBALL_TABLE: ['⚽ Chơi một trận bi lắc nào!'],
  MINI_BAR_COUNTER: ['🍹 Nghỉ ngơi làm ly mocktail!', '🥂 Chúc team sprint thành công!'],
  COFFEE_MACHINE: ['☕ Pha ly Espresso đậm đặc...', '☕ Cà phê sáng duyệt tiến độ!'],
  RAMEN_NOODLE_BAR: ['🍜 Làm bát mì Ramen nạp năng lượng!'],
  POPCORN_CART: ['🍿 Bỏng ngô thơm phức cho cả team!'],
  ECO_BIOME_DOME: ['🌳 Khu sinh thái xanh mát quá!', '🍃 Hít thở không khí trong lành...'],
  BOTANICAL_GREENHOUSE: ['🏡 Vườn bách thảo mini mát rượi!'],
  KOI_POND: ['🐟 Ngắm đàn cá Koi thư thái thật!', '🐟 Cá Koi hôm nay bơi khỏe ghê!'],
  ZEN_ROCK_GARDEN: ['🪨 Vườn thiền tĩnh tâm chốt chiến lược...'],
  CHERRY_BLOSSOM_TREE: ['🌸 Cây hoa anh đào nở rộ đẹp quá!'],
  INDOOR_FOUNTAIN: ['⛲ Đài phun nước nghe róc rách thật chill!'],
  MICROWAVE_STAND: ['🍱 Hâm nóng đồ ăn trưa xíu nào!'],
  ARCADE_CABINET: ['🕹️ Phá đảo game thùng 1 ván!'],
  PINBALL_MACHINE: ['⚡ Bắn Pinball xả stress!'],
  VR_SIMULATOR_POD: ['🥽 Đeo kính VR test sản phẩm mới!'],
  KARAOKE_BOOTH: ['🎤 Hát 1 bài cổ vũ tinh thần team!'],
  SLEEPING_POD: ['🛌 Khoang nghỉ trưa VIP cho sếp!'],
  OFFICE_CAT: ['🐱 Boss Mèo hôm nay ngoan ghê!', '🐾 Vuốt ve mèo lấy hên!'],
  CORGI_DOG: ['🐶 Corgi vẫy đuôi đáng yêu quá!'],
  AQUARIUM: ['🐠 Bể cá thủy sinh lung linh thật!'],
  LARGE_AQUARIUM: ['🐠 Ngắm bể cá rồng thủy sinh thư giãn chốt deal nào!'],
  WHITEBOARD: ['📋 Xem lại sơ đồ kiến trúc hệ thống...'],
  BOOKSHELF: ['📚 Đọc tham khảo tài liệu chiến lược...'],
  HOLOGRAM_GLOBE: ['🌐 Theo dõi bản đồ vận hành toàn cầu!'],
  SOFA: ['🛋️ Ngồi sofa suy nghĩ ý tưởng mới...'],
  DIRECTOR_DESK: ['🪑 Về bàn Giám đốc kiểm tra báo cáo!'],
};

const WORKER_INSPECTION_BUBBLES = [
  (name: string) => `👀 ${name} xử lý đến đâu rồi?`,
  (name: string) => `⚡ Tiến độ ổn chứ ${name}?`,
  (name: string) => `👏 ${name} làm tốt lắm, tiếp tục nhé!`,
  (name: string) => `💡 Cần thêm dữ liệu cứ báo anh nhé ${name}!`,
];

function computeFacingFromDelta(dx: number, dy: number, fallback: Direction = 'DOWN'): Direction {
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx > 0) return 'RIGHT';
    if (dx < 0) return 'LEFT';
  }
  if (dy > 0) return 'DOWN';
  if (dy < 0) return 'UP';
  return fallback;
}

export class DirectorEntity {
  public readonly container: Container;
  public readonly bubble: BubbleRenderer;
  public gridX: number;
  public gridY: number;

  private readonly auraRing: Graphics;
  private readonly bodyGraphics: Graphics;
  private readonly namePillBg: Graphics;
  private readonly nameTag: Text;

  private pixelX: number;
  private pixelY: number;
  private facing: Direction = 'DOWN';
  private walkFrame = 0;
  private walkAnimTimerMs = 0;

  private activePath: GridPoint[] = [];
  private arrivalFacing: Direction = 'DOWN';
  private onArriveCallback: (() => void) | null = null;
  private walkSpeedMultiplier = 1;
  private walkNonce = 0;

  private mode: DirectorMode = 'AUTONOMOUS';
  private dwellTimerMs = 2400;
  private bubbleHideTimerMs = 0;
  private lastVisitedIds: string[] = [];
  private onSpeechEmit?: (text: string, spotType?: FurnitureType | null) => void;

  private readonly deskPoint: { x: number; y: number; facing: Direction };

  constructor(
    startX: number,
    startY: number,
    facing: Direction,
    deskPoint: { x: number; y: number; facing: Direction },
  ) {
    this.gridX = startX;
    this.gridY = startY;
    this.pixelX = startX * 32;
    this.pixelY = startY * 32;
    this.facing = facing;
    this.deskPoint = deskPoint;

    this.container = new Container();
    this.auraRing = new Graphics();
    this.bodyGraphics = new Graphics();
    this.namePillBg = new Graphics();

    const tagStyle = new TextStyle({
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 9,
      fontWeight: '700',
      fill: 0xfde047,
    });
    this.nameTag = new Text({
      text: '👑 Giám đốc (Tôi)',
      style: tagStyle,
      resolution: 2,
    });

    const tagW = typeof document !== 'undefined' ? Math.max(76, this.nameTag.width + 8) : 86;
    const tagH = 14;
    const tagX = Math.round(16 - tagW / 2);
    const tagY = 29;

    this.namePillBg
      .roundRect(tagX, tagY, tagW, tagH, 4)
      .fill({ color: 0x1c1406, alpha: 0.9 })
      .stroke({ width: 1, color: 0xf59e0b, alpha: 0.85 });

    this.nameTag.x = tagX + 4;
    this.nameTag.y = tagY + 1;

    this.bubble = new BubbleRenderer();
    this.bubble.container.x = 16;
    this.bubble.container.y = -6;

    this.drawAuraRing();
    this.redrawCharacter();

    this.container.addChild(this.auraRing);
    this.container.addChild(this.bodyGraphics);
    this.container.addChild(this.namePillBg);
    this.container.addChild(this.nameTag);

    this.syncTransform();
  }

  public getMode(): DirectorMode {
    return this.mode;
  }

  public isMoving(): boolean {
    return this.activePath.length > 0;
  }

  public setOnSpeechEmit(
    cb?: (text: string, spotType?: FurnitureType | null) => void,
  ): void {
    this.onSpeechEmit = cb;
  }

  public showBubble(
    text: string,
    accentColor = '#fbbf24',
    durationMs = 4500,
    spotType?: FurnitureType | null,
    fullLogText?: string,
  ): void {
    this.bubble.showStatusBubble(text, accentColor);
    this.bubbleHideTimerMs = durationMs;
    this.onSpeechEmit?.(fullLogText || text, spotType);
  }

  public hideBubble(): void {
    this.bubble.hide();
    this.bubbleHideTimerMs = 0;
  }

  public setFacing(dir: Direction): void {
    this.facing = dir;
    this.redrawCharacter();
  }

  public faceTowards(targetX: number, targetY: number): void {
    this.facing = computeFacingFromDelta(targetX - this.gridX, targetY - this.gridY, this.facing);
    this.redrawCharacter();
  }

  public enterBriefingMode(): void {
    this.mode = 'BRIEFING';
    this.walkNonce += 1;
    this.activePath = [];
    this.onArriveCallback = null;
    this.walkSpeedMultiplier = 1.65;
  }

  public exitBriefingMode(): void {
    this.mode = 'AUTONOMOUS';
    this.walkSpeedMultiplier = 1;
    this.dwellTimerMs = 2800;
  }

  public async walkToTile(
    pathfinder: GridPathfinder,
    targetX: number,
    targetY: number,
    targetFacing: Direction,
    speedMultiplier = 1,
  ): Promise<void> {
    const nonce = ++this.walkNonce;
    this.walkSpeedMultiplier = speedMultiplier;

    if (this.gridX === targetX && this.gridY === targetY) {
      this.activePath = [];
      this.facing = targetFacing;
      this.redrawCharacter();
      return;
    }

    const path = await pathfinder.findPath(this.gridX, this.gridY, targetX, targetY);
    if (nonce !== this.walkNonce) return;

    if (!path || path.length <= 1) {
      this.facing = targetFacing;
      this.redrawCharacter();
      return;
    }

    await new Promise<void>((resolve) => {
      if (nonce !== this.walkNonce) {
        resolve();
        return;
      }
      this.activePath = path.slice(1);
      this.arrivalFacing = targetFacing;
      this.onArriveCallback = () => resolve();
    });
  }

  public tick(deltaMs: number, speedMultiplier: number, context: DirectorTickContext): void {
    const scaledDelta = deltaMs * speedMultiplier;

    this.walkAnimTimerMs += scaledDelta;
    if (this.walkAnimTimerMs >= 150) {
      this.walkAnimTimerMs = 0;
      this.walkFrame = (this.walkFrame + 1) % 4;
      this.redrawCharacter();
    }

    if (this.bubbleHideTimerMs > 0) {
      this.bubbleHideTimerMs -= scaledDelta;
      if (this.bubbleHideTimerMs <= 0 && this.mode === 'AUTONOMOUS') {
        this.bubble.hide();
      }
    }

    if (this.activePath.length > 0) {
      this.stepAlongPath(scaledDelta * this.walkSpeedMultiplier);
      this.syncTransform();
      return;
    }

    if (this.mode === 'BRIEFING') {
      return;
    }

    this.dwellTimerMs -= scaledDelta;
    if (this.dwellTimerMs <= 0) {
      this.dwellTimerMs = 3600 + Math.floor(Math.random() * 2800);
      void this.pickAndExecuteAutonomousAction(context);
    }
  }

  private async pickAndExecuteAutonomousAction(context: DirectorTickContext): Promise<void> {
    if (this.mode === 'BRIEFING') return;

    const { blueprint, pathfinder } = context;
    const occupied = context.getOccupiedTiles();
    const busyWorkers = context.getActiveWorkers();

    // 1. Prioritize checking on working staff (~55% chance when employees are active)
    if (busyWorkers.length > 0 && Math.random() < 0.55) {
      const worker = busyWorkers[Math.floor(Math.random() * busyWorkers.length)];
      const neighbors = pathfinder.getWalkableNeighbors(worker.gridX, worker.gridY, occupied);
      const spot =
        neighbors[0] ??
        pathfinder.getWalkableNeighbors(worker.gridX, worker.gridY)[0];
      if (spot) {
        const shortName = worker.name.split(/\s*[—–([|]\s*/)[0].trim();
        this.showBubble(`🚶 Ra xem ${shortName} làm...`, '#38bdf8', 3500);
        await this.walkToTile(pathfinder, spot.x, spot.y, spot.facing, 1);
        if (this.mode !== 'AUTONOMOUS') return;
        this.faceTowards(worker.gridX, worker.gridY);
        const msgFn =
          WORKER_INSPECTION_BUBBLES[
            Math.floor(Math.random() * WORKER_INSPECTION_BUBBLES.length)
          ];
        this.showBubble(msgFn(shortName), '#fbbf24', 3600);
        return;
      }
    }

    // 2. Occasionally return to executive desk (~20% chance)
    if (Math.random() < 0.2 && (this.gridX !== this.deskPoint.x || this.gridY !== this.deskPoint.y)) {
      await this.walkToTile(
        pathfinder,
        this.deskPoint.x,
        this.deskPoint.y,
        this.deskPoint.facing,
        1,
      );
      if (this.mode !== 'AUTONOMOUS') return;
      this.showBubble('🪑 Kiểm tra bảng điều hành CEO...', '#fbbf24', 3400);
      return;
    }

    // 3. Otherwise visit a random interactive furniture item to relax or inspect office
    const candidates = blueprint.furniture.filter(
      (f) =>
        f.type !== 'DESK_PC' &&
        f.type !== 'DIRECTOR_DESK' &&
        !this.lastVisitedIds.includes(f.id),
    );
    const pool =
      candidates.length > 0
        ? candidates
        : blueprint.furniture.filter((f) => f.type !== 'DESK_PC');
    if (pool.length === 0) return;

    const picked: FurnitureItem = pool[Math.floor(Math.random() * pool.length)];
    this.lastVisitedIds = [...this.lastVisitedIds.slice(-4), picked.id];

    const [ix, iy] = picked.interaction_point;
    let targetX = ix;
    let targetY = iy;
    let targetFacing: Direction = picked.facing;

    if (!pathfinder.isTileWalkable(ix, iy) || occupied.has(`${ix},${iy}`)) {
      const neighbors = pathfinder.getWalkableNeighbors(picked.x, picked.y, occupied);
      if (neighbors.length === 0) return;
      targetX = neighbors[0].x;
      targetY = neighbors[0].y;
      targetFacing = neighbors[0].facing;
    }

    await this.walkToTile(pathfinder, targetX, targetY, targetFacing, 1);
    if (this.mode !== 'AUTONOMOUS') return;
    this.faceTowards(picked.x, picked.y);

    const bubbles = FURNITURE_BUBBLES[picked.type];
    const line =
      bubbles && bubbles.length > 0
        ? bubbles[Math.floor(Math.random() * bubbles.length)]
        : '✨ Dạo quanh kiểm tra văn phòng...';
    this.showBubble(line, '#34d399', 3600, picked.type);
  }

  private stepAlongPath(deltaMs: number): void {
    const targetTile = this.activePath[0];
    const targetPxX = targetTile.x * 32;
    const targetPxY = targetTile.y * 32;

    const dx = targetPxX - this.pixelX;
    const dy = targetPxY - this.pixelY;

    this.facing = computeFacingFromDelta(dx, dy, this.facing);

    const stepPx = (118 * deltaMs) / 1000;
    const dist = Math.hypot(dx, dy);

    if (dist <= stepPx) {
      this.pixelX = targetPxX;
      this.pixelY = targetPxY;
      this.gridX = targetTile.x;
      this.gridY = targetTile.y;
      this.activePath.shift();

      if (this.activePath.length === 0) {
        this.facing = this.arrivalFacing;
        this.redrawCharacter();
        const cb = this.onArriveCallback;
        this.onArriveCallback = null;
        if (cb) cb();
      }
    } else if (dist > 0) {
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

  private drawAuraRing(): void {
    this.auraRing.clear();
    this.auraRing
      .ellipse(16, 26, 12, 6)
      .fill({ color: 0xf59e0b, alpha: 0.22 })
      .stroke({ width: 1.5, color: 0xfbbf24, alpha: 0.9 });
  }

  private redrawCharacter(): void {
    const isMoving = this.activePath.length > 0;
    drawProceduralAgent(
      this.bodyGraphics,
      '#1e293b',
      this.facing,
      isMoving,
      false,
      this.walkFrame,
      'director_ceo',
    );
  }

  public destroy(): void {
    this.walkNonce += 1;
    this.bubble.destroy();
    this.container.destroy({ children: true });
  }
}
