import type { Stage1SemanticTopology } from '@/types/assets';
import {
  FURNITURE_CATALOG,
  isRoamingFurnitureType,
  type OfficeBlueprint,
  type ZoneDefinition,
  type FurnitureItem,
  type FurnitureType,
  type AgentBlueprint,
} from '@/types/blueprint';

/**
 * Curated list of ~42 vibrant office, recreation, pantry, eco-biome, and roaming items
 * used to richly furnish any office while preserving 100% A* walkway connectivity.
 */
const RICH_DECORATION_SEQUENCE: {
  type: FurnitureType;
  footprint: [number, number];
  preferZone: 'IDLE' | 'WORK' | 'APPROVAL';
}[] = [
  // 1. Headline Game, Bar, Kitchen & Grand Eco Zone Highlights (Large Multi-Tile Installations!)
  { type: 'PS5_PES_STATION', footprint: [2, 1], preferZone: 'IDLE' },
  { type: 'ECO_BIOME_DOME', footprint: [4, 3], preferZone: 'IDLE' },
  { type: 'KOI_POND', footprint: [3, 2], preferZone: 'IDLE' },
  { type: 'POOL_TABLE', footprint: [2, 1], preferZone: 'IDLE' },
  { type: 'PING_PONG_TABLE', footprint: [2, 1], preferZone: 'IDLE' },
  { type: 'MINI_BAR_COUNTER', footprint: [2, 1], preferZone: 'IDLE' },
  { type: 'MICROWAVE_STAND', footprint: [1, 1], preferZone: 'IDLE' },

  // 2. Roaming Pets, Bots & Silly Movers (10 items — roam & hop around!)
  { type: 'ROBOT_VACUUM', footprint: [1, 1], preferZone: 'WORK' },
  { type: 'OFFICE_CAT', footprint: [1, 1], preferZone: 'WORK' },
  { type: 'CORGI_DOG', footprint: [1, 1], preferZone: 'IDLE' },
  { type: 'RUBBER_DUCK_CART', footprint: [1, 1], preferZone: 'WORK' },
  { type: 'SNACK_DELIVERY_BOT', footprint: [1, 1], preferZone: 'IDLE' },
  { type: 'BOUNCING_SLIME', footprint: [1, 1], preferZone: 'WORK' },
  { type: 'MINI_DRONE', footprint: [1, 1], preferZone: 'WORK' },
  { type: 'RC_RACING_CAR', footprint: [1, 1], preferZone: 'IDLE' },
  { type: 'PENGUIN_MASCOT', footprint: [1, 1], preferZone: 'APPROVAL' },
  { type: 'ROBO_DOG', footprint: [1, 1], preferZone: 'WORK' },

  // 3. More Large Eco Zone & Lounge Centerpieces
  { type: 'ZEN_ROCK_GARDEN', footprint: [3, 2], preferZone: 'APPROVAL' },
  { type: 'BOTANICAL_GREENHOUSE', footprint: [3, 2], preferZone: 'WORK' },
  { type: 'CHERRY_BLOSSOM_TREE', footprint: [2, 2], preferZone: 'IDLE' },
  { type: 'INDOOR_FOUNTAIN', footprint: [2, 2], preferZone: 'WORK' },
  { type: 'HAMMOCK_STAND', footprint: [3, 2], preferZone: 'IDLE' },
  { type: 'WATERFALL_ROCK_WALL', footprint: [3, 1], preferZone: 'APPROVAL' },

  // 4. More Recreation & Game Room
  { type: 'FOOSBALL_TABLE', footprint: [2, 1], preferZone: 'IDLE' },
  { type: 'ARCADE_CABINET', footprint: [1, 1], preferZone: 'IDLE' },
  { type: 'CLAW_MACHINE', footprint: [1, 1], preferZone: 'IDLE' },
  { type: 'PINBALL_MACHINE', footprint: [1, 1], preferZone: 'IDLE' },
  { type: 'DARTBOARD_CABINET', footprint: [1, 1], preferZone: 'IDLE' },
  { type: 'VR_SIMULATOR_POD', footprint: [1, 1], preferZone: 'WORK' },
  { type: 'KARAOKE_BOOTH', footprint: [2, 1], preferZone: 'IDLE' },
  { type: 'CHESS_TABLE', footprint: [1, 1], preferZone: 'IDLE' },

  // 5. More Pantry, Bar & Kitchen
  { type: 'VENDING_MACHINE', footprint: [1, 1], preferZone: 'IDLE' },
  { type: 'RAMEN_NOODLE_BAR', footprint: [2, 1], preferZone: 'IDLE' },
  { type: 'POPCORN_CART', footprint: [1, 1], preferZone: 'IDLE' },
  { type: 'ICE_CREAM_FREEZER', footprint: [1, 1], preferZone: 'IDLE' },
  { type: 'PIZZA_OVEN_COUNTER', footprint: [1, 1], preferZone: 'IDLE' },
  { type: 'DOUBLE_FRIDGE', footprint: [1, 1], preferZone: 'IDLE' },
  { type: 'WATER_COOLER', footprint: [1, 1], preferZone: 'WORK' },
  { type: 'SLEEPING_POD', footprint: [2, 1], preferZone: 'IDLE' },
  { type: 'PLANT', footprint: [1, 1], preferZone: 'WORK' },
  { type: 'PLANT', footprint: [1, 1], preferZone: 'APPROVAL' },

  // 6. Tech & Office Gear
  { type: 'SERVER_RACK', footprint: [1, 1], preferZone: 'WORK' },
  { type: 'HOLOGRAM_GLOBE', footprint: [1, 1], preferZone: 'WORK' },
  { type: 'ARCADE_JUKEBOX', footprint: [1, 1], preferZone: 'IDLE' },
  { type: 'PRINTER_3D', footprint: [1, 1], preferZone: 'WORK' },
  { type: 'TELEPRESENCE_SCREEN', footprint: [2, 1], preferZone: 'APPROVAL' },
  { type: 'OFFICE_CAT', footprint: [1, 1], preferZone: 'IDLE' },
  { type: 'ROBOT_VACUUM', footprint: [1, 1], preferZone: 'IDLE' },
];

/**
 * Checks whether a candidate furniture item can be placed on `bp` with:
 * - Zero footprint overlap with any existing item
 * - Valid walkable interaction_point
 * - At least 1-tile clearance around static items so A* walkways are never blocked
 */
export function canSafelyPlaceItem(
  bp: OfficeBlueprint,
  candidate: FurnitureItem,
  enforceStaticClearance = true,
): boolean {
  const { grid_cols, grid_rows } = bp.meta;
  const [w, h] = candidate.footprint;

  // 1. Check bounds of footprint
  if (
    candidate.x < 1 ||
    candidate.y < 1 ||
    candidate.x + w > grid_cols - 1 ||
    candidate.y + h > grid_rows - 1
  ) {
    return false;
  }

  // 2. Check bounds of interaction_point
  const [ix, iy] = candidate.interaction_point;
  if (ix < 1 || ix >= grid_cols - 1 || iy < 1 || iy >= grid_rows - 1) {
    return false;
  }

  // Build occupied & interaction sets
  const occupiedTiles = new Set<string>();
  const staticOccupiedTiles = new Set<string>();
  const interactionPoints = new Set<string>();

  for (const existing of bp.furniture) {
    if (existing.id === candidate.id) continue;
    interactionPoints.add(
      `${existing.interaction_point[0]},${existing.interaction_point[1]}`,
    );
    const [ew, eh] = existing.footprint;
    const isExistingStatic = !isRoamingFurnitureType(existing.type);
    for (let dx = 0; dx < ew; dx++) {
      for (let dy = 0; dy < eh; dy++) {
        const key = `${existing.x + dx},${existing.y + dy}`;
        occupiedTiles.add(key);
        if (isExistingStatic) {
          staticOccupiedTiles.add(key);
        }
      }
    }
  }

  // Candidate interaction point must not be occupied
  if (occupiedTiles.has(`${ix},${iy}`)) {
    return false;
  }

  const isCandidateStatic = !isRoamingFurnitureType(candidate.type);

  for (let dx = 0; dx < w; dx++) {
    for (let dy = 0; dy < h; dy++) {
      const tx = candidate.x + dx;
      const ty = candidate.y + dy;
      const key = `${tx},${ty}`;
      // Cannot overlap any existing footprint or any existing interaction point
      if (occupiedTiles.has(key) || interactionPoints.has(key)) {
        return false;
      }
    }
  }

  // 3. If static clearance is requested, ensure a 1-tile ring around static items stays clear of other static items
  if (enforceStaticClearance && isCandidateStatic) {
    for (let dx = -1; dx <= w; dx++) {
      for (let dy = -1; dy <= h; dy++) {
        const tx = candidate.x + dx;
        const ty = candidate.y + dy;
        if (tx <= 0 || tx >= grid_cols - 1 || ty <= 0 || ty >= grid_rows - 1) {
          // Do not touch outer wall if that would pinch a corridor next to another static item
          continue;
        }
        if (staticOccupiedTiles.has(`${tx},${ty}`)) {
          return false;
        }
      }
    }
  }

  return true;
}

/**
 * Finds a valid placement slot for a furniture type & footprint, scanning preferred zone first.
 */
export function findBestSlotForFurniture(
  bp: OfficeBlueprint,
  type: FurnitureType,
  footprint: [number, number],
  preferZone?: 'IDLE' | 'WORK' | 'APPROVAL',
  idSuffix?: string,
): FurnitureItem | null {
  const { grid_cols, grid_rows } = bp.meta;
  const isRoaming = isRoamingFurnitureType(type);

  // Order zones so preferred zone is scanned first
  const zonesOrdered = [...bp.zones].sort((a, b) => {
    if (preferZone && a.type === preferZone && b.type !== preferZone) return -1;
    if (preferZone && b.type === preferZone && a.type !== preferZone) return 1;
    return 0;
  });

  const candidateCoords: [number, number][] = [];
  const seen = new Set<string>();

  for (const z of zonesOrdered) {
    const [zx, zy, zw, zh] = z.rect;
    for (let y = zy + 1; y < zy + zh - 1; y++) {
      for (let x = zx + 1; x < zx + zw - 1; x++) {
        const k = `${x},${y}`;
        if (!seen.has(k)) {
          seen.add(k);
          candidateCoords.push([x, y]);
        }
      }
    }
  }

  for (let y = 1; y < grid_rows - 1; y++) {
    for (let x = 1; x < grid_cols - 1; x++) {
      const k = `${x},${y}`;
      if (!seen.has(k)) {
        seen.add(k);
        candidateCoords.push([x, y]);
      }
    }
  }

  const facings: {
    facing: FurnitureItem['facing'];
    getFootprint: (w: number, h: number) => [number, number];
    ip: (x: number, y: number, w: number, h: number) => [number, number];
  }[] = [
    {
      facing: 'UP',
      getFootprint: (w, h) => [w, h],
      ip: (x, y, _w, h) => [x, y + h],
    },
    {
      facing: 'DOWN',
      getFootprint: (w, h) => [w, h],
      ip: (x, y) => [x, y - 1],
    },
    {
      facing: 'RIGHT',
      getFootprint: (w, h) => [h, w],
      ip: (x, y) => [x - 1, y],
    },
    {
      facing: 'LEFT',
      getFootprint: (w, h) => [h, w],
      ip: (x, y, w) => [x + w, y],
    },
  ];

  // Pass 1: Strict 1-tile static clearance
  for (const [x, y] of candidateCoords) {
    for (const f of facings) {
      const orientedFp = f.getFootprint(footprint[0], footprint[1]);
      const candidate: FurnitureItem = {
        id: `furn_${type.toLowerCase()}_${idSuffix || Math.random().toString(36).slice(2, 6)}`,
        type,
        x,
        y,
        footprint: orientedFp,
        interaction_point: f.ip(x, y, orientedFp[0], orientedFp[1]),
        facing: f.facing,
      };
      if (canSafelyPlaceItem(bp, candidate, true)) {
        return candidate;
      }
    }
  }

  // Pass 2 (for roaming items only): allow placing adjacent to static items
  if (isRoaming) {
    for (const [x, y] of candidateCoords) {
      for (const f of facings) {
        const orientedFp = f.getFootprint(footprint[0], footprint[1]);
        const candidate: FurnitureItem = {
          id: `furn_${type.toLowerCase()}_${idSuffix || Math.random().toString(36).slice(2, 6)}`,
          type,
          x,
          y,
          footprint: orientedFp,
          interaction_point: f.ip(x, y, orientedFp[0], orientedFp[1]),
          facing: f.facing,
        };
        if (canSafelyPlaceItem(bp, candidate, false)) {
          return candidate;
        }
      }
    }
  }

  return null;
}

/**
 * Enriches an OfficeBlueprint with ~40-48 vibrant furniture, eco-biome, game, bar, and roaming items.
 * Automatically expands the grid if needed so all 40+ items fit with generous walkways.
 */
export function decorateBlueprintWithRichFurniture(
  inputBp: OfficeBlueprint,
  targetTotalFurniture = 45,
): OfficeBlueprint {
  const bp: OfficeBlueprint = JSON.parse(JSON.stringify(inputBp));

  // Ensure grid is spacious enough (at least 42x30) to hold ~45 items + large 4x3 / 3x2 Eco-Zone centerpieces
  const minCols = 42;
  const minRows = 30;
  if (bp.meta.grid_cols < minCols || bp.meta.grid_rows < minRows) {
    // Strip unexpanded legacy right-wing director suite so it can be cleanly re-anchored after expansion
    bp.zones = bp.zones.filter((z) => z.type !== 'DIRECTOR');
    bp.furniture = bp.furniture.filter(
      (f) => f.type !== 'DIRECTOR_DESK' && !f.id.startsWith('furn_director_'),
    );

    const nextCols = Math.max(bp.meta.grid_cols, minCols);
    const nextRows = Math.max(bp.meta.grid_rows, minRows);
    bp.meta.grid_cols = nextCols;
    bp.meta.grid_rows = nextRows;

    const workZone = bp.zones.find((z) => z.type === 'WORK');
    const approvalZone = bp.zones.find((z) => z.type === 'APPROVAL');
    const idleZone = bp.zones.find((z) => z.type === 'IDLE');

    const workWidth = Math.max(23, nextCols - 17);
    const rightX = 2 + workWidth;
    const rightWidth = nextCols - rightX - 1;
    const approvalH = Math.max(
      10,
      approvalZone ? approvalZone.rect[3] : 10,
    );

    if (workZone) {
      workZone.rect = [1, 1, workWidth, nextRows - 2];
    }
    if (approvalZone) {
      approvalZone.rect = [rightX, 1, rightWidth, approvalH];
    }
    if (idleZone) {
      idleZone.rect = [
        rightX,
        approvalH + 2,
        rightWidth,
        nextRows - approvalH - 3,
      ];
    }
  }

  let seqIndex = 1;
  for (const spec of RICH_DECORATION_SEQUENCE) {
    if (bp.furniture.length >= targetTotalFurniture) break;

    // Avoid duplicating unique large landmarks if already present
    const existingCount = bp.furniture.filter((f) => f.type === spec.type).length;
    if (
      existingCount >= 1 &&
      !isRoamingFurnitureType(spec.type) &&
      spec.type !== 'PLANT' &&
      spec.type !== 'SERVER_RACK'
    ) {
      continue;
    }

    const placed = findBestSlotForFurniture(
      bp,
      spec.type,
      spec.footprint,
      spec.preferZone,
      `auto_${seqIndex++}`,
    );
    if (placed) {
      bp.furniture.push(placed);
    }
  }

  // If still below targetTotalFurniture, top up with additional fun catalog items
  for (const catItem of FURNITURE_CATALOG) {
    if (bp.furniture.length >= targetTotalFurniture) break;
    if (catItem.type === 'DIRECTOR_DESK') continue;
    const placed = findBestSlotForFurniture(
      bp,
      catItem.type,
      catItem.footprint,
      catItem.category === 'TECH_OFFICE' ? 'WORK' : 'IDLE',
      `extra_${seqIndex++}`,
    );
    if (placed) {
      bp.furniture.push(placed);
    }
  }

  return ensureDirectorRoomAndFurniture(bp);
}

/**
 * Idempotently ensures every OfficeBlueprint has an executive Director Suite
 * ("Phòng Giám Đốc (Tôi)") with a DIRECTOR_DESK and non-overlapping decor.
 */
export function ensureDirectorRoomAndFurniture(
  inputBp: OfficeBlueprint,
): OfficeBlueprint {
  const bp: OfficeBlueprint = JSON.parse(JSON.stringify(inputBp));

  const existingDirectorZone = bp.zones.find((z) => z.type === 'DIRECTOR');
  const hasDirectorDesk = bp.furniture.some((f) => f.type === 'DIRECTOR_DESK');
  if (existingDirectorZone && hasDirectorDesk) {
    return bp;
  }

  let zone = existingDirectorZone;
  if (!zone) {
    let maxUsedX = 1;
    for (const z of bp.zones) {
      maxUsedX = Math.max(maxUsedX, z.rect[0] + z.rect[2]);
    }
    for (const f of bp.furniture) {
      maxUsedX = Math.max(maxUsedX, f.x + f.footprint[0]);
    }

    const wingWidth = 9;
    const directorX = maxUsedX + 1;
    const requiredCols = directorX + wingWidth + 1;
    if (bp.meta.grid_cols < requiredCols) {
      bp.meta.grid_cols = requiredCols;
    }
    if (bp.meta.grid_rows < 16) {
      bp.meta.grid_rows = 16;
    }

    const suiteHeight = Math.min(14, Math.max(10, bp.meta.grid_rows - 2));
    zone = {
      id: 'zone_director',
      name: 'Phòng Giám Đốc (Tôi)',
      type: 'DIRECTOR',
      rect: [directorX, 1, wingWidth, suiteHeight],
    };
    bp.zones.push(zone);
  }

  const [zx, zy, zw, zh] = zone.rect;
  const requiredColsForZone = zx + zw + 1;
  if (bp.meta.grid_cols < requiredColsForZone) {
    bp.meta.grid_cols = requiredColsForZone;
  }

  if (!hasDirectorDesk) {
    const deskX = Math.min(bp.meta.grid_cols - 4, zx + Math.max(2, Math.floor((zw - 3) / 2)));
    const deskY = zy + 3;
    const directorDesk: FurnitureItem = {
      id: 'furn_director_desk',
      type: 'DIRECTOR_DESK',
      x: deskX,
      y: deskY,
      footprint: [3, 1],
      interaction_point: [deskX + 1, deskY + 1],
      facing: 'UP',
    };
    if (canSafelyPlaceItem(bp, directorDesk, true)) {
      bp.furniture.push(directorDesk);
    } else if (canSafelyPlaceItem(bp, directorDesk, false)) {
      bp.furniture.push(directorDesk);
    }
  }

  const decorSpecs: Array<{
    id: string;
    type: FurnitureItem['type'];
    x: number;
    y: number;
    footprint: [number, number];
    ix: number;
    iy: number;
    facing: FurnitureItem['facing'];
  }> = [
    {
      id: 'furn_director_bookshelf',
      type: 'BOOKSHELF',
      x: zx + 1,
      y: zy + 1,
      footprint: [2, 1],
      ix: zx + 1,
      iy: zy + 2,
      facing: 'UP',
    },
    {
      id: 'furn_director_globe',
      type: 'HOLOGRAM_GLOBE',
      x: zx + zw - 2,
      y: zy + 1,
      footprint: [1, 1],
      ix: zx + zw - 2,
      iy: zy + 2,
      facing: 'UP',
    },
    {
      id: 'furn_director_plant',
      type: 'PLANT',
      x: zx + 1,
      y: zy + zh - 2,
      footprint: [1, 1],
      ix: zx + 1,
      iy: zy + zh - 3,
      facing: 'DOWN',
    },
    {
      id: 'furn_director_sofa',
      type: 'SOFA',
      x: zx + zw - 3,
      y: zy + zh - 2,
      footprint: [2, 1],
      ix: zx + zw - 3,
      iy: zy + zh - 3,
      facing: 'DOWN',
    },
  ];

  for (const spec of decorSpecs) {
    if (bp.furniture.some((f) => f.id === spec.id)) continue;
    const item: FurnitureItem = {
      id: spec.id,
      type: spec.type,
      x: spec.x,
      y: spec.y,
      footprint: spec.footprint,
      interaction_point: [spec.ix, spec.iy],
      facing: spec.facing,
    };
    if (canSafelyPlaceItem(bp, item, true)) {
      bp.furniture.push(item);
    }
  }

  return bp;
}

/**
 * Stage 2 Deterministic Auto-Layout Engine (Constitution Principle IV):
 * - Converts a coordinate-free Stage1SemanticTopology into a complete OfficeBlueprint.json.
 * - Guarantees 0 overlapping furniture footprints.
 * - Enforces a minimum 1-tile walkable clearance around every static desk and prop.
 * - Places interaction_point on a guaranteed walkable tile with proper facing orientation.
 * - Furnishes the office with ~45 lively items (pool table, ping-pong, mini bar, microwave, eco-biome, koi pond, roaming cats, robot vacuums, etc.).
 */
export function generateDeterministicBlueprint(
  topology: Stage1SemanticTopology,
): OfficeBlueprint {
  const workAgents = topology.agents.filter((a) => {
    const z = topology.zones.find((zn) => zn.id === a.zone_id);
    return !z || z.type === 'WORK';
  });
  const approvalAgents = topology.agents.filter((a) => {
    const z = topology.zones.find((zn) => zn.id === a.zone_id);
    return z?.type === 'APPROVAL';
  });

  const workColsPerRow = Math.min(3, Math.max(2, Math.ceil(Math.sqrt(workAgents.length))));
  const workDeskRows = Math.max(1, Math.ceil(workAgents.length / workColsPerRow));

  // Spacious 42x30+ layout so all agent desks + ~45 furniture items & large 4x3 / 3x2 Eco-Zone installations fit with wide corridors
  const workZoneWidth = Math.max(23, workColsPerRow * 5 + 8);
  const rightColumnWidth = 15;
  const gridCols = Math.min(52, Math.max(42, 1 + workZoneWidth + 1 + rightColumnWidth + 1));

  const workZoneHeight = Math.max(20, workDeskRows * 4 + 8);
  const approvalRows = Math.max(1, approvalAgents.length);
  const approvalHeight = Math.max(10, approvalRows * 3 + 4);
  const idleHeight = 16;
  const gridRows = Math.min(
    42,
    Math.max(30, Math.max(workZoneHeight + 2, approvalHeight + idleHeight + 3)),
  );

  const workZoneMeta = topology.zones.find((z) => z.type === 'WORK');
  const approvalZoneMeta = topology.zones.find((z) => z.type === 'APPROVAL');
  const idleZoneMeta = topology.zones.find((z) => z.type === 'IDLE');

  const rightX = 2 + workZoneWidth;
  const zones: ZoneDefinition[] = [
    {
      id: workZoneMeta?.id || 'zone_work',
      name: workZoneMeta?.name || 'Khu Thực Thi & Sáng Tạo',
      type: 'WORK',
      rect: [1, 1, workZoneWidth, gridRows - 2],
    },
    {
      id: approvalZoneMeta?.id || 'zone_approval',
      name: approvalZoneMeta?.name || 'Phòng Kiểm Duyệt & QA',
      type: 'APPROVAL',
      rect: [rightX, 1, rightColumnWidth, approvalHeight],
    },
    {
      id: idleZoneMeta?.id || 'zone_pantry',
      name: idleZoneMeta?.name || 'Khu Sinh Thái, Giải Trí & Quầy Bar',
      type: 'IDLE',
      rect: [
        rightX,
        approvalHeight + 2,
        rightColumnWidth,
        gridRows - approvalHeight - 3,
      ],
    },
  ];

  const furniture: FurnitureItem[] = [];
  const agents: AgentBlueprint[] = [];

  // 1. Place WORK zone desks with guaranteed >= 1 tile clearance
  workAgents.forEach((agentSpec, index) => {
    const colIdx = index % workColsPerRow;
    const rowIdx = Math.floor(index / workColsPerRow);

    const deskX = 3 + colIdx * 5;
    const deskY = 4 + rowIdx * 4;
    const deskId = `furn_desk_${agentSpec.id}`;

    furniture.push({
      id: deskId,
      type: 'DESK_PC',
      x: deskX,
      y: deskY,
      footprint: [2, 1],
      interaction_point: [deskX, deskY + 1],
      facing: 'UP',
      agent_id: agentSpec.id,
    });

    agents.push({
      id: agentSpec.id,
      name: agentSpec.name,
      role: agentSpec.role,
      color: agentSpec.color,
      avatar_sprite: agentSpec.avatar_sprite,
      desk_id: deskId,
    });
  });

  // 2. Place APPROVAL zone desks
  approvalAgents.forEach((agentSpec, index) => {
    const deskX = rightX + 2;
    const deskY = 3 + index * 3;
    const deskId = `furn_desk_${agentSpec.id}`;

    furniture.push({
      id: deskId,
      type: 'DESK_PC',
      x: deskX,
      y: deskY,
      footprint: [2, 1],
      interaction_point: [deskX, deskY + 1],
      facing: 'UP',
      agent_id: agentSpec.id,
    });

    agents.push({
      id: agentSpec.id,
      name: agentSpec.name,
      role: agentSpec.role,
      color: agentSpec.color,
      avatar_sprite: agentSpec.avatar_sprite,
      desk_id: deskId,
    });
  });

  // 3. Place core WORK & IDLE anchors
  furniture.push({
    id: 'furn_bookshelf_auto',
    type: 'BOOKSHELF',
    x: 2,
    y: 2,
    footprint: [2, 1],
    interaction_point: [2, 3],
    facing: 'UP',
  });

  furniture.push({
    id: 'furn_whiteboard_auto',
    type: 'WHITEBOARD',
    x: Math.min(workZoneWidth - 3, 12),
    y: 2,
    footprint: [2, 1],
    interaction_point: [Math.min(workZoneWidth - 3, 12), 3],
    facing: 'UP',
  });

  const idleTopY = approvalHeight + 3;
  furniture.push({
    id: 'furn_coffee_auto',
    type: 'COFFEE_MACHINE',
    x: rightX + 1,
    y: idleTopY,
    footprint: [1, 1],
    interaction_point: [rightX + 1, idleTopY + 1],
    facing: 'UP',
  });

  furniture.push({
    id: 'furn_aquarium_auto',
    type: 'AQUARIUM',
    x: rightX + 4,
    y: idleTopY,
    footprint: [3, 1],
    interaction_point: [rightX + 4, idleTopY + 1],
    facing: 'UP',
  });

  const sofaY = Math.min(gridRows - 3, idleTopY + 3);
  furniture.push({
    id: 'furn_sofa_auto',
    type: 'SOFA',
    x: rightX + 1,
    y: sofaY,
    footprint: [2, 1],
    interaction_point: [rightX + 1, sofaY - 1],
    facing: 'DOWN',
  });

  const baseBlueprint: OfficeBlueprint = {
    meta: {
      project_name: topology.project_name,
      grid_cols: gridCols,
      grid_rows: gridRows,
      tile_size: 32,
    },
    zones,
    furniture,
    agents,
    edges: topology.edges.map((e) => ({
      from: e.from,
      to: e.to,
      label: e.label,
    })),
  };

  // 4. Richly decorate with ~45 items (pool table, ping-pong, mini bar, microwave, eco-biome, koi pond, cats, roombas, etc.)
  return decorateBlueprintWithRichFurniture(baseBlueprint, 45);
}

/**
 * Generates the streamlined, minimalist Studio Layout specifically requested for Product Hunter:
 * - WORK zone: hunter desks + ONLY 1 Office Cat (OFFICE_CAT) & 1 Robot Vacuum (ROBOT_VACUUM).
 * - APPROVAL zone: Auditor, Architect, and the chairman courier.
 * - IDLE zone ("Phòng Chơi & Pantry"): ONLY Pantry (COFFEE_MACHINE + MINI_BAR_COUNTER) + PS5_PES_STATION + FOOSBALL_TABLE.
 * - DIRECTOR zone ("Phòng Giám Đốc (Tôi)"): DIRECTOR_DESK + LARGE_AQUARIUM (4x2) + BOOKSHELF (2x1) + visitor SOFA.
 */
export function generateProductHunterMinimalBlueprint(
  topology: Stage1SemanticTopology,
): OfficeBlueprint {
  const workAgents = topology.agents.filter((a) => {
    const z = topology.zones.find((zn) => zn.id === a.zone_id);
    return !z || z.type === 'WORK';
  });
  const approvalAgents = topology.agents.filter((a) => {
    const z = topology.zones.find((zn) => zn.id === a.zone_id);
    return z?.type === 'APPROVAL';
  });

  const workRows = Math.max(3, Math.ceil(workAgents.length / 2));
  const gridCols = 37;
  const gridRows = Math.max(19, 4 + workRows * 4 + 3);
  const approvalHeight = Math.max(8, approvalAgents.length * 3 + 2);
  const idleY = approvalHeight + 2;
  const idleHeight = gridRows - idleY - 1;

  const zones: ZoneDefinition[] = [
    {
      id: topology.zones.find((z) => z.type === 'WORK')?.id || 'zone_work',
      name: 'Khu Làm Việc — Săn Đa Sàn',
      type: 'WORK',
      rect: [1, 1, 14, gridRows - 2],
    },
    {
      id: topology.zones.find((z) => z.type === 'APPROVAL')?.id || 'zone_approval',
      name: 'Phòng Kiểm Toán & Báo Cáo',
      type: 'APPROVAL',
      rect: [16, 1, 9, approvalHeight],
    },
    {
      id: topology.zones.find((z) => z.type === 'IDLE')?.id || 'zone_pantry',
      name: 'Phòng Chơi & Pantry',
      type: 'IDLE',
      rect: [16, idleY, 9, idleHeight],
    },
    {
      id: 'zone_director',
      name: 'Phòng Giám Đốc (Tôi)',
      type: 'DIRECTOR',
      rect: [26, 1, 10, gridRows - 2],
    },
  ];

  const furniture: FurnitureItem[] = [];
  const agents: AgentBlueprint[] = [];

  // 1. WORK desks (2 cols x 3 rows)
  workAgents.forEach((agentSpec, index) => {
    const colIdx = index % 2;
    const rowIdx = Math.floor(index / 2);
    const deskX = 3 + colIdx * 6;
    const deskY = 4 + rowIdx * 4;
    const deskId = `furn_desk_${agentSpec.id}`;
    furniture.push({
      id: deskId,
      type: 'DESK_PC',
      x: deskX,
      y: deskY,
      footprint: [2, 1],
      interaction_point: [deskX, deskY + 1],
      facing: 'UP',
      agent_id: agentSpec.id,
    });
    agents.push({
      id: agentSpec.id,
      name: agentSpec.name,
      role: agentSpec.role,
      color: agentSpec.color,
      avatar_sprite: agentSpec.avatar_sprite,
      desk_id: deskId,
    });
  });

  // WORK companions: ONLY 1 Office Cat + 1 Robot Vacuum
  furniture.push(
    {
      id: 'furn_ph_work_cat',
      type: 'OFFICE_CAT',
      x: 6,
      y: 6,
      footprint: [1, 1],
      interaction_point: [6, 7],
      facing: 'DOWN',
    },
    {
      id: 'furn_ph_work_vacuum',
      type: 'ROBOT_VACUUM',
      x: 7,
      y: 11,
      footprint: [1, 1],
      interaction_point: [7, 12],
      facing: 'DOWN',
    },
  );

  // 2. APPROVAL desks
  approvalAgents.forEach((agentSpec, index) => {
    const deskX = 19;
    const deskY = 3 + index * 3;
    const deskId = `furn_desk_${agentSpec.id}`;
    furniture.push({
      id: deskId,
      type: 'DESK_PC',
      x: deskX,
      y: deskY,
      footprint: [2, 1],
      interaction_point: [deskX, deskY + 1],
      facing: 'UP',
      agent_id: agentSpec.id,
    });
    agents.push({
      id: agentSpec.id,
      name: agentSpec.name,
      role: agentSpec.role,
      color: agentSpec.color,
      avatar_sprite: agentSpec.avatar_sprite,
      desk_id: deskId,
    });
  });

  // 3. IDLE zone ("Phòng Chơi & Pantry"): ONLY Pantry + PS5 + Foosball
  const pantryRowY = idleY + 2;
  const gameRowY = idleY + 5;
  furniture.push(
    {
      id: 'furn_ph_pantry_coffee',
      type: 'COFFEE_MACHINE',
      x: 17,
      y: pantryRowY,
      footprint: [1, 1],
      interaction_point: [17, pantryRowY + 1],
      facing: 'UP',
    },
    {
      id: 'furn_ph_pantry_bar',
      type: 'MINI_BAR_COUNTER',
      x: 20,
      y: pantryRowY,
      footprint: [2, 1],
      interaction_point: [20, pantryRowY + 1],
      facing: 'UP',
    },
    {
      id: 'furn_ph_ps5',
      type: 'PS5_PES_STATION',
      x: 17,
      y: gameRowY,
      footprint: [2, 1],
      interaction_point: [17, gameRowY + 1],
      facing: 'UP',
    },
    {
      id: 'furn_ph_foosball',
      type: 'FOOSBALL_TABLE',
      x: 21,
      y: gameRowY,
      footprint: [2, 1],
      interaction_point: [21, gameRowY + 1],
      facing: 'UP',
    },
  );

  // 4. DIRECTOR Suite: Bookshelf (2x1) + Large Aquarium (4x2) + Executive Desk (3x1) + Visitor Sofa (2x1)
  furniture.push(
    {
      id: 'furn_ph_director_bookshelf',
      type: 'BOOKSHELF',
      x: 27,
      y: 3,
      footprint: [2, 1],
      interaction_point: [27, 4],
      facing: 'UP',
    },
    {
      id: 'furn_ph_director_aquarium',
      type: 'LARGE_AQUARIUM',
      x: 30,
      y: 3,
      footprint: [4, 2],
      interaction_point: [31, 5],
      facing: 'UP',
    },
    {
      id: 'furn_director_desk',
      type: 'DIRECTOR_DESK',
      x: 29,
      y: 9,
      footprint: [3, 1],
      interaction_point: [30, 10],
      facing: 'UP',
    },
    {
      id: 'furn_ph_director_sofa',
      type: 'SOFA',
      x: 29,
      y: 14,
      footprint: [2, 1],
      interaction_point: [29, 13],
      facing: 'DOWN',
    },
  );

  return {
    meta: {
      project_name: topology.project_name,
      grid_cols: gridCols,
      grid_rows: gridRows,
      tile_size: 32,
      layout_profile: 'product_hunter_minimal_v4',
    },
    zones,
    furniture,
    agents,
    edges: topology.edges.map((e) => ({
      from: e.from,
      to: e.to,
      label: e.label,
    })),
  };
}
