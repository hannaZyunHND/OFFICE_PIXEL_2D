import EasyStar from 'easystarjs';
import {
  isRoamingFurnitureType,
  type OfficeBlueprint,
  type FurnitureItem,
} from '@/types/blueprint';

export interface GridPoint {
  x: number;
  y: number;
}

export interface ReservedSocialSlot {
  x: number;
  y: number;
  facing: FurnitureItem['facing'];
  furnitureId: string | null;
  furnitureType?: FurnitureItem['type'];
}

/**
 * 2D Tile Grid A* Pathfinder powered by EasyStar.js.
 * - Strictly 4-directional orthogonal movement (UP, DOWN, LEFT, RIGHT).
 * - Automatically blocks outer walls and all static furniture footprints [w, h].
 * - Roaming pets/bots do not block A* walkways so agents never get stuck.
 * - Tracks reserved idle interaction points so idle agents do not stack.
 */
export class GridPathfinder {
  private easystar: EasyStar.js;
  private matrix: number[][] = [];
  private cols = 24;
  private rows = 16;
  private reservedIdlePoints = new Map<string, string>(); // "x,y" -> agentId
  private reservedFurnitureByKey = new Map<string, string>(); // "x,y" -> furnitureId

  constructor(blueprint?: OfficeBlueprint) {
    this.easystar = new EasyStar.js();
    this.easystar.setAcceptableTiles([0]);
    this.easystar.disableDiagonals();
    this.easystar.setIterationsPerCalculation(2000);

    if (blueprint) {
      this.rebuildFromBlueprint(blueprint);
    }
  }

  public rebuildFromBlueprint(blueprint: OfficeBlueprint): void {
    this.cols = blueprint.meta.grid_cols;
    this.rows = blueprint.meta.grid_rows;

    const nextMatrix: number[][] = [];
    for (let y = 0; y < this.rows; y++) {
      const row: number[] = [];
      for (let x = 0; x < this.cols; x++) {
        // Outer perimeter walls are blocked (1)
        const isPerimeterWall =
          x === 0 || y === 0 || x === this.cols - 1 || y === this.rows - 1;
        row.push(isPerimeterWall ? 1 : 0);
      }
      nextMatrix.push(row);
    }

    // Mark static furniture footprints as blocked (1)
    for (const furn of blueprint.furniture) {
      if (isRoamingFurnitureType(furn.type)) {
        continue;
      }
      const [w, h] = furn.footprint;
      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
          const tx = furn.x + dx;
          const ty = furn.y + dy;
          if (ty >= 0 && ty < this.rows && tx >= 0 && tx < this.cols) {
            nextMatrix[ty][tx] = 1;
          }
        }
      }
    }

    this.matrix = nextMatrix;
    this.easystar.setGrid(this.matrix);
  }

  public getCollisionMatrix(): number[][] {
    return this.matrix;
  }

  public isTileWalkable(x: number, y: number): boolean {
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return false;
    return this.matrix[y]?.[x] === 0;
  }

  /**
   * Computes a 4-directional A* path from (startX, startY) to (endX, endY).
   */
  public findPath(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
  ): Promise<GridPoint[] | null> {
    if (!this.isTileWalkable(endX, endY)) {
      return Promise.resolve(null);
    }
    if (startX === endX && startY === endY) {
      return Promise.resolve([{ x: endX, y: endY }]);
    }

    return new Promise((resolve) => {
      this.easystar.findPath(startX, startY, endX, endY, (path) => {
        if (!path || path.length === 0) {
          resolve(null);
        } else {
          resolve(path);
        }
      });
      this.easystar.calculate();
    });
  }

  public stepCalculation(): void {
    this.easystar.calculate();
  }

  /**
   * Computes all walkable perimeter tiles around a furniture footprint,
   * starting with its primary `interaction_point`, facing inward toward the furniture.
   */
  public getWalkableSpotsAroundFurniture(
    furn: FurnitureItem,
  ): Array<{ x: number; y: number; facing: FurnitureItem['facing'] }> {
    const [w, h] = furn.footprint;
    const raw: Array<{ x: number; y: number; facing: FurnitureItem['facing'] }> = [
      {
        x: furn.interaction_point[0],
        y: furn.interaction_point[1],
        facing: furn.facing,
      },
    ];

    // Front / bottom edge (facing UP into furniture)
    for (let dx = 0; dx < w; dx++) {
      raw.push({ x: furn.x + dx, y: furn.y + h, facing: 'UP' });
    }
    // Left & right flanks (great for side-by-side co-op play around wide items)
    for (let dy = 0; dy < h; dy++) {
      raw.push({ x: furn.x - 1, y: furn.y + dy, facing: 'RIGHT' });
      raw.push({ x: furn.x + w, y: furn.y + dy, facing: 'LEFT' });
    }
    // Top edge (facing DOWN into furniture)
    for (let dx = 0; dx < w; dx++) {
      raw.push({ x: furn.x + dx, y: furn.y - 1, facing: 'DOWN' });
    }

    const seen = new Set<string>();
    const result: Array<{ x: number; y: number; facing: FurnitureItem['facing'] }> = [];
    for (const c of raw) {
      const key = `${c.x},${c.y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (this.isTileWalkable(c.x, c.y)) {
        result.push(c);
      }
    }
    return result;
  }

  /**
   * Maximum concurrent social players supported by a furniture piece (2–3 on large items, 2 on 1x1 items).
   */
  public getFurnitureSocialCapacity(furn: FurnitureItem): number {
    const area = furn.footprint[0] * furn.footprint[1];
    if (
      furn.type === 'PS5_PES_STATION' ||
      furn.type === 'POOL_TABLE' ||
      furn.type === 'PING_PONG_TABLE' ||
      furn.type === 'FOOSBALL_TABLE' ||
      furn.type === 'KARAOKE_BOOTH' ||
      furn.type === 'MINI_BAR_COUNTER' ||
      furn.type === 'RAMEN_NOODLE_BAR' ||
      furn.type === 'PIZZA_OVEN_COUNTER' ||
      furn.type === 'ECO_BIOME_DOME' ||
      furn.type === 'KOI_POND' ||
      furn.type === 'ZEN_ROCK_GARDEN' ||
      furn.type === 'CHERRY_BLOSSOM_TREE' ||
      furn.type === 'INDOOR_FOUNTAIN' ||
      furn.type === 'BOTANICAL_GREENHOUSE' ||
      furn.type === 'AQUARIUM' ||
      area >= 2
    ) {
      return 3;
    }
    return 2;
  }

  public getAgentsAtFurnitureCount(furnitureId: string): number {
    let count = 0;
    for (const fid of this.reservedFurnitureByKey.values()) {
      if (fid === furnitureId) count += 1;
    }
    return count;
  }

  /**
   * Reserves an unoccupied perimeter tile around a specific furniture piece
   * if below its multi-player capacity (up to 2–3 concurrent agents).
   */
  public reserveFurnitureSlotForAgent(
    agentId: string,
    furn: FurnitureItem,
    maxPlayers?: number,
  ): ReservedSocialSlot | null {
    this.releaseIdleReservation(agentId);

    const cap = maxPlayers ?? this.getFurnitureSocialCapacity(furn);
    if (this.getAgentsAtFurnitureCount(furn.id) >= cap) {
      return null;
    }

    const spots = this.getWalkableSpotsAroundFurniture(furn);
    for (const spot of spots) {
      const key = `${spot.x},${spot.y}`;
      if (!this.reservedIdlePoints.has(key)) {
        this.reservedIdlePoints.set(key, agentId);
        this.reservedFurnitureByKey.set(key, furn.id);
        return {
          x: spot.x,
          y: spot.y,
          facing: spot.facing,
          furnitureId: furn.id,
          furnitureType: furn.type,
        };
      }
    }
    return null;
  }

  /**
   * Finds and reserves an unoccupied IDLE / social furniture slot (supports 2–3 players
   * per large furniture) or fallback walkable tile in an IDLE zone.
   */
  public reserveIdleDestination(
    agentId: string,
    blueprint: OfficeBlueprint,
  ): ReservedSocialSlot {
    this.releaseIdleReservation(agentId);

    const idleZones = blueprint.zones.filter((z) => z.type === 'IDLE');
    const isInsideIdleZone = (x: number, y: number) =>
      idleZones.some(
        (z) =>
          x >= z.rect[0] &&
          x < z.rect[0] + z.rect[2] &&
          y >= z.rect[1] &&
          y < z.rect[1] + z.rect[3],
      );

    // 1. Gather interactive non-desk static furniture (prefer IDLE zone first, then social decorations elsewhere)
    const leisureFurniture = blueprint.furniture.filter(
      (f) =>
        f.type !== 'DESK_PC' &&
        f.type !== 'DIRECTOR_DESK' &&
        !isRoamingFurnitureType(f.type),
    );
    const inIdleZone = leisureFurniture.filter((f) => isInsideIdleZone(f.x, f.y));
    const elsewhere = leisureFurniture.filter((f) => !isInsideIdleZone(f.x, f.y));

    const shuffle = <T>(arr: T[]): T[] => {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    const candidates = [...shuffle(inIdleZone), ...shuffle(elsewhere)];

    // Prefer items already occupied by 1–2 peers first (organic co-op hangout), else open slots
    const prioritized = [...candidates].sort((a, b) => {
      const ca = this.getAgentsAtFurnitureCount(a.id);
      const cb = this.getAgentsAtFurnitureCount(b.id);
      const aActive = ca > 0 && ca < this.getFurnitureSocialCapacity(a) ? 1 : 0;
      const bActive = cb > 0 && cb < this.getFurnitureSocialCapacity(b) ? 1 : 0;
      return bActive - aActive;
    });

    for (const furn of prioritized) {
      const reserved = this.reserveFurnitureSlotForAgent(agentId, furn);
      if (reserved) {
        return reserved;
      }
    }

    // 2. Fallback: find any unoccupied walkable floor tile in an IDLE zone
    for (const zone of idleZones) {
      const [zx, zy, zw, zh] = zone.rect;
      for (let y = zy + 1; y < zy + zh - 1; y++) {
        for (let x = zx + 1; x < zx + zw - 1; x++) {
          const key = `${x},${y}`;
          if (this.isTileWalkable(x, y) && !this.reservedIdlePoints.has(key)) {
            this.reservedIdlePoints.set(key, agentId);
            return { x, y, facing: 'DOWN', furnitureId: null };
          }
        }
      }
    }

    // 3. Ultimate fallback: center of map
    return {
      x: Math.floor(this.cols / 2),
      y: Math.floor(this.rows / 2),
      facing: 'DOWN',
      furnitureId: null,
    };
  }

  public releaseIdleReservation(agentId: string): void {
    for (const [key, owner] of this.reservedIdlePoints.entries()) {
      if (owner === agentId) {
        this.reservedIdlePoints.delete(key);
        this.reservedFurnitureByKey.delete(key);
      }
    }
  }

  /**
   * Returns orthogonally adjacent walkable tiles around (x, y), optionally excluding a set of occupied "x,y" keys.
   */
  public getWalkableNeighbors(
    x: number,
    y: number,
    avoidKeys?: Set<string>,
  ): Array<{ x: number; y: number; facing: FurnitureItem['facing'] }> {
    const candidates: Array<{ x: number; y: number; facing: FurnitureItem['facing'] }> = [
      { x, y: y + 1, facing: 'UP' },
      { x: x - 1, y, facing: 'RIGHT' },
      { x: x + 1, y, facing: 'LEFT' },
      { x, y: y - 1, facing: 'DOWN' },
    ];
    return candidates.filter((c) => {
      if (!this.isTileWalkable(c.x, c.y)) return false;
      if (avoidKeys && avoidKeys.has(`${c.x},${c.y}`)) return false;
      return true;
    });
  }
}
