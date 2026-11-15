export type ZoneType = 'WORK' | 'APPROVAL' | 'IDLE' | 'DIRECTOR';
export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export type FurnitureType =
  // Core & Office / Tech (9)
  | 'DESK_PC'
  | 'DIRECTOR_DESK'
  | 'WHITEBOARD'
  | 'BOOKSHELF'
  | 'SERVER_RACK'
  | 'HOLOGRAM_GLOBE'
  | 'ARCADE_JUKEBOX'
  | 'PRINTER_3D'
  | 'TELEPRESENCE_SCREEN'
  // Game & Recreation (11)
  | 'PS5_PES_STATION'
  | 'POOL_TABLE'
  | 'PING_PONG_TABLE'
  | 'ARCADE_CABINET'
  | 'FOOSBALL_TABLE'
  | 'DARTBOARD_CABINET'
  | 'CLAW_MACHINE'
  | 'PINBALL_MACHINE'
  | 'VR_SIMULATOR_POD'
  | 'KARAOKE_BOOTH'
  | 'CHESS_TABLE'
  // Pantry, Bar & Kitchen (10)
  | 'COFFEE_MACHINE'
  | 'MINI_BAR_COUNTER'
  | 'MICROWAVE_STAND'
  | 'VENDING_MACHINE'
  | 'WATER_COOLER'
  | 'DOUBLE_FRIDGE'
  | 'POPCORN_CART'
  | 'ICE_CREAM_FREEZER'
  | 'RAMEN_NOODLE_BAR'
  | 'PIZZA_OVEN_COUNTER'
  // Eco Zone & Lounge (12 — Large Multi-Tile Installations!)
  | 'ECO_BIOME_DOME'
  | 'KOI_POND'
  | 'ZEN_ROCK_GARDEN'
  | 'BOTANICAL_GREENHOUSE'
  | 'CHERRY_BLOSSOM_TREE'
  | 'INDOOR_FOUNTAIN'
  | 'HAMMOCK_STAND'
  | 'WATERFALL_ROCK_WALL'
  | 'AQUARIUM'
  | 'SOFA'
  | 'SLEEPING_POD'
  | 'PLANT'
  // Roaming Pets, Bots & Silly Movers (10 — can move & hop around!)
  | 'OFFICE_CAT'
  | 'CORGI_DOG'
  | 'ROBOT_VACUUM'
  | 'ROBO_DOG'
  | 'MINI_DRONE'
  | 'RUBBER_DUCK_CART'
  | 'RC_RACING_CAR'
  | 'PENGUIN_MASCOT'
  | 'SNACK_DELIVERY_BOT'
  | 'BOUNCING_SLIME';

export type FurnitureCategory =
  | 'ECO_LOUNGE'
  | 'ROAMING_PETS_BOTS'
  | 'RECREATION'
  | 'PANTRY_BAR'
  | 'TECH_OFFICE';

export interface FurnitureCatalogEntry {
  type: FurnitureType;
  label: string;
  emoji: string;
  category: FurnitureCategory;
  footprint: [number, number];
  isRoaming?: boolean;
}

export const FURNITURE_CATALOG: FurnitureCatalogEntry[] = [
  // 1. Eco Zone & Lounge (12 items — Đại cảnh Khu Sinh Thái cỡ lớn 4x3, 3x2, 2x2!)
  {
    type: 'ECO_BIOME_DOME',
    label: 'Đại Khu Sinh Thái Rừng & Suối (4x3)',
    emoji: '🌳',
    category: 'ECO_LOUNGE',
    footprint: [4, 3],
  },
  {
    type: 'KOI_POND',
    label: 'Hồ Cá Koi Nhật Bản & Cầu Gỗ (3x2)',
    emoji: '🐟',
    category: 'ECO_LOUNGE',
    footprint: [3, 2],
  },
  {
    type: 'ZEN_ROCK_GARDEN',
    label: 'Vườn Thiền Cát Trắng & Đèn Đá (3x2)',
    emoji: '🪨',
    category: 'ECO_LOUNGE',
    footprint: [3, 2],
  },
  {
    type: 'BOTANICAL_GREENHOUSE',
    label: 'Nhà Kính Thực Vật Nhiệt Đới (3x2)',
    emoji: '🌺',
    category: 'ECO_LOUNGE',
    footprint: [3, 2],
  },
  {
    type: 'HAMMOCK_STAND',
    label: 'Ốc Đảo Võng Nhiệt Đới & Cây Dừa (3x2)',
    emoji: '🏝️',
    category: 'ECO_LOUNGE',
    footprint: [3, 2],
  },
  {
    type: 'CHERRY_BLOSSOM_TREE',
    label: 'Cây Hoa Anh Đào Cổ Thụ Sakura (2x2)',
    emoji: '🌸',
    category: 'ECO_LOUNGE',
    footprint: [2, 2],
  },
  {
    type: 'INDOOR_FOUNTAIN',
    label: 'Đài Phun Nước Quảng Trường (2x2)',
    emoji: '⛲',
    category: 'ECO_LOUNGE',
    footprint: [2, 2],
  },
  {
    type: 'WATERFALL_ROCK_WALL',
    label: 'Tường Thác Nước Đá Tự Nhiên (3x1)',
    emoji: '🌊',
    category: 'ECO_LOUNGE',
    footprint: [3, 1],
  },
  {
    type: 'AQUARIUM',
    label: 'Đại Thủy Cung San Hô Cyber (3x1)',
    emoji: '🐠',
    category: 'ECO_LOUNGE',
    footprint: [3, 1],
  },
  {
    type: 'SOFA',
    label: 'Ghế Sofa Đôi Thư Giãn (2x1)',
    emoji: '🛋️',
    category: 'ECO_LOUNGE',
    footprint: [2, 1],
  },
  {
    type: 'SLEEPING_POD',
    label: 'Kén Ngủ Trưa Sci-Fi (2x1)',
    emoji: '🛌',
    category: 'ECO_LOUNGE',
    footprint: [2, 1],
  },
  {
    type: 'PLANT',
    label: 'Chậu Cây Xanh Pixel (1x1)',
    emoji: '🪴',
    category: 'ECO_LOUNGE',
    footprint: [1, 1],
  },

  // 2. Roaming Pets, Bots & Silly Movers (10 items — chạy nhảy trên bản đồ)
  {
    type: 'ROBOT_VACUUM',
    label: 'Robot Hút Bụi Tự Hành (Roomba)',
    emoji: '🤖',
    category: 'ROAMING_PETS_BOTS',
    footprint: [1, 1],
    isRoaming: true,
  },
  {
    type: 'OFFICE_CAT',
    label: 'Mèo Hoàng Thượng (Chạy nhảy)',
    emoji: '🐱',
    category: 'ROAMING_PETS_BOTS',
    footprint: [1, 1],
    isRoaming: true,
  },
  {
    type: 'CORGI_DOG',
    label: 'Chó Corgi Mông To (Chạy nhảy)',
    emoji: '🐶',
    category: 'ROAMING_PETS_BOTS',
    footprint: [1, 1],
    isRoaming: true,
  },
  {
    type: 'RUBBER_DUCK_CART',
    label: 'Vịt Vàng Debug Có Bánh Xe',
    emoji: '🦆',
    category: 'ROAMING_PETS_BOTS',
    footprint: [1, 1],
    isRoaming: true,
  },
  {
    type: 'SNACK_DELIVERY_BOT',
    label: 'Robot Giao Trà Sữa & Snack',
    emoji: '🧋',
    category: 'ROAMING_PETS_BOTS',
    footprint: [1, 1],
    isRoaming: true,
  },
  {
    type: 'BOUNCING_SLIME',
    label: 'Slime Xanh Nhảy Lò Cò',
    emoji: '🟢',
    category: 'ROAMING_PETS_BOTS',
    footprint: [1, 1],
    isRoaming: true,
  },
  {
    type: 'MINI_DRONE',
    label: 'Drone Bay Tuần Tra Văn Phòng',
    emoji: '🛸',
    category: 'ROAMING_PETS_BOTS',
    footprint: [1, 1],
    isRoaming: true,
  },
  {
    type: 'RC_RACING_CAR',
    label: 'Xe Đua F1 Điều Khiển Từ Xa',
    emoji: '🏎️',
    category: 'ROAMING_PETS_BOTS',
    footprint: [1, 1],
    isRoaming: true,
  },
  {
    type: 'PENGUIN_MASCOT',
    label: 'Chim Cánh Cụt Linux Lạch Bạch',
    emoji: '🐧',
    category: 'ROAMING_PETS_BOTS',
    footprint: [1, 1],
    isRoaming: true,
  },
  {
    type: 'ROBO_DOG',
    label: 'Chó Robot AI CyberDog',
    emoji: '🦿',
    category: 'ROAMING_PETS_BOTS',
    footprint: [1, 1],
    isRoaming: true,
  },

  // 3. Game & Recreation (11 items)
  {
    type: 'PS5_PES_STATION',
    label: 'Máy PS5 & TV Đá PES (2x1)',
    emoji: '🎮',
    category: 'RECREATION',
    footprint: [2, 1],
  },
  {
    type: 'POOL_TABLE',
    label: 'Bàn Bi-a (Pool Table 2x1)',
    emoji: '🎱',
    category: 'RECREATION',
    footprint: [2, 1],
  },
  {
    type: 'PING_PONG_TABLE',
    label: 'Bàn Bóng Bàn (Ping-Pong 2x1)',
    emoji: '🏓',
    category: 'RECREATION',
    footprint: [2, 1],
  },
  {
    type: 'FOOSBALL_TABLE',
    label: 'Bàn Bi Lắc (Foosball 2x1)',
    emoji: '⚽',
    category: 'RECREATION',
    footprint: [2, 1],
  },
  {
    type: 'ARCADE_CABINET',
    label: 'Máy Game Thùng Retro (1x1)',
    emoji: '🕹️',
    category: 'RECREATION',
    footprint: [1, 1],
  },
  {
    type: 'CLAW_MACHINE',
    label: 'Máy Gắp Thú Bông (1x1)',
    emoji: '🧸',
    category: 'RECREATION',
    footprint: [1, 1],
  },
  {
    type: 'DARTBOARD_CABINET',
    label: 'Bảng Phi Tiêu Hồng Tâm (1x1)',
    emoji: '🎯',
    category: 'RECREATION',
    footprint: [1, 1],
  },
  {
    type: 'PINBALL_MACHINE',
    label: 'Máy Bắn Bi Pinball Neon (1x1)',
    emoji: '⚡',
    category: 'RECREATION',
    footprint: [1, 1],
  },
  {
    type: 'VR_SIMULATOR_POD',
    label: 'Ghế Giả Lập Thực Tế Ảo VR (1x1)',
    emoji: '🥽',
    category: 'RECREATION',
    footprint: [1, 1],
  },
  {
    type: 'KARAOKE_BOOTH',
    label: 'Dàn Karaoke & Loa Sub (2x1)',
    emoji: '🎤',
    category: 'RECREATION',
    footprint: [2, 1],
  },
  {
    type: 'CHESS_TABLE',
    label: 'Bàn Cờ Vua Đấu Trí (1x1)',
    emoji: '♟️',
    category: 'RECREATION',
    footprint: [1, 1],
  },

  // 4. Pantry, Bar & Kitchen (10 items)
  {
    type: 'MINI_BAR_COUNTER',
    label: 'Quầy Bar Pha Chế Cocktail (2x1)',
    emoji: '🍸',
    category: 'PANTRY_BAR',
    footprint: [2, 1],
  },
  {
    type: 'MICROWAVE_STAND',
    label: 'Lò Vi Sóng Quay Nóng (1x1)',
    emoji: '🍱',
    category: 'PANTRY_BAR',
    footprint: [1, 1],
  },
  {
    type: 'COFFEE_MACHINE',
    label: 'Máy Pha Cà Phê Espresso (1x1)',
    emoji: '☕',
    category: 'PANTRY_BAR',
    footprint: [1, 1],
  },
  {
    type: 'VENDING_MACHINE',
    label: 'Tủ Bán Nước Tự Động (1x1)',
    emoji: '🥤',
    category: 'PANTRY_BAR',
    footprint: [1, 1],
  },
  {
    type: 'RAMEN_NOODLE_BAR',
    label: 'Quầy Mì Ramen Nhật Bản (2x1)',
    emoji: '🍜',
    category: 'PANTRY_BAR',
    footprint: [2, 1],
  },
  {
    type: 'POPCORN_CART',
    label: 'Xe Bắp Rang Bơ Nổ Lách Tách (1x1)',
    emoji: '🍿',
    category: 'PANTRY_BAR',
    footprint: [1, 1],
  },
  {
    type: 'ICE_CREAM_FREEZER',
    label: 'Tủ Kem Mát Lạnh (1x1)',
    emoji: '🍦',
    category: 'PANTRY_BAR',
    footprint: [1, 1],
  },
  {
    type: 'PIZZA_OVEN_COUNTER',
    label: 'Lò Nướng Pizza Gạch Đỏ (1x1)',
    emoji: '🍕',
    category: 'PANTRY_BAR',
    footprint: [1, 1],
  },
  {
    type: 'DOUBLE_FRIDGE',
    label: 'Tủ Lạnh Side-by-Side (1x1)',
    emoji: '🧊',
    category: 'PANTRY_BAR',
    footprint: [1, 1],
  },
  {
    type: 'WATER_COOLER',
    label: 'Cây Nước Nóng Lạnh (1x1)',
    emoji: '💧',
    category: 'PANTRY_BAR',
    footprint: [1, 1],
  },

  // 5. Tech & Office Gear (7 items)
  {
    type: 'SERVER_RACK',
    label: 'Tủ Server AI GPU (1x1)',
    emoji: '🖥️',
    category: 'TECH_OFFICE',
    footprint: [1, 1],
  },
  {
    type: 'HOLOGRAM_GLOBE',
    label: 'Quả Địa Cầu Hologram 3D (1x1)',
    emoji: '🌐',
    category: 'TECH_OFFICE',
    footprint: [1, 1],
  },
  {
    type: 'ARCADE_JUKEBOX',
    label: 'Máy Phát Nhạc Neon Jukebox (1x1)',
    emoji: '🎵',
    category: 'TECH_OFFICE',
    footprint: [1, 1],
  },
  {
    type: 'PRINTER_3D',
    label: 'Máy In 3D Laser (1x1)',
    emoji: '🖨️',
    category: 'TECH_OFFICE',
    footprint: [1, 1],
  },
  {
    type: 'TELEPRESENCE_SCREEN',
    label: 'Màn Hình Họp Hologram (2x1)',
    emoji: '📺',
    category: 'TECH_OFFICE',
    footprint: [2, 1],
  },
  {
    type: 'WHITEBOARD',
    label: 'Bảng Trắng Kiến Trúc (2x1)',
    emoji: '📋',
    category: 'TECH_OFFICE',
    footprint: [2, 1],
  },
  {
    type: 'BOOKSHELF',
    label: 'Tủ Sách Kỹ Thuật (2x1)',
    emoji: '📚',
    category: 'TECH_OFFICE',
    footprint: [2, 1],
  },
  {
    type: 'DIRECTOR_DESK',
    label: 'Bàn Giám Đốc Điều Hành (3x1)',
    emoji: '👑',
    category: 'TECH_OFFICE',
    footprint: [3, 1],
  },
];

const ROAMING_TYPES_SET = new Set<FurnitureType>([
  'OFFICE_CAT',
  'CORGI_DOG',
  'ROBOT_VACUUM',
  'ROBO_DOG',
  'MINI_DRONE',
  'RUBBER_DUCK_CART',
  'RC_RACING_CAR',
  'PENGUIN_MASCOT',
  'SNACK_DELIVERY_BOT',
  'BOUNCING_SLIME',
]);

export function isRoamingFurnitureType(type: FurnitureType): boolean {
  return ROAMING_TYPES_SET.has(type);
}

const CANONICAL_FOOTPRINT_MAP = new Map<FurnitureType, [number, number]>(
  FURNITURE_CATALOG.map((item) => [item.type, item.footprint]),
);
CANONICAL_FOOTPRINT_MAP.set('DESK_PC', [2, 1]);

export function getCanonicalFootprint(type: FurnitureType): [number, number] {
  return CANONICAL_FOOTPRINT_MAP.get(type) || [1, 1];
}

export interface BlueprintMeta {
  project_name: string;
  grid_cols: number;
  grid_rows: number;
  tile_size: 32;
}

export interface ZoneDefinition {
  id: string;
  name: string;
  type: ZoneType;
  /** [x, y, width, height] in grid tiles */
  rect: [number, number, number, number];
}

export interface FurnitureItem {
  id: string;
  type: FurnitureType;
  x: number;
  y: number;
  /** [width_tiles, height_tiles] */
  footprint: [number, number];
  /** [ix, iy] walkable interaction coordinate */
  interaction_point: [number, number];
  facing: Direction;
  /** Proportional scale multiplier (default 1.0, e.g. 0.75, 1, 1.25, 1.5, 2, 2.5, 3) */
  scale?: number;
  agent_id?: string;
  custom_asset_id?: string;
}

export interface AgentBlueprint {
  id: string;
  name: string;
  role: string;
  color: string;
  avatar_sprite: string;
  desk_id: string;
}

export interface WorkflowEdge {
  from: string;
  to: string;
  label?: string;
}

export interface OfficeBlueprint {
  meta: BlueprintMeta;
  zones: ZoneDefinition[];
  furniture: FurnitureItem[];
  agents: AgentBlueprint[];
  edges: WorkflowEdge[];
}

export interface BlueprintValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
