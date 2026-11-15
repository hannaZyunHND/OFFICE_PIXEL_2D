export type AgentAvatarCategory =
  | 'ALL'
  | 'HUMAN'
  | 'ROBOT_CYBER'
  | 'ANIMAL'
  | 'ANIME_HERO'
  | 'FUNNY_OBJECT';

export type AvatarSilhouette =
  | 'standard'
  | 'bodybuilder'
  | 'rooster'
  | 'cat_ears'
  | 'dog_ears'
  | 'bunny_ears'
  | 'panda'
  | 'frog'
  | 'penguin'
  | 'trex'
  | 'shark'
  | 'duck'
  | 'fox'
  | 'capybara'
  | 'robot_crt'
  | 'robot_round'
  | 'robot_mech'
  | 'slime'
  | 'cactus'
  | 'boba_cup'
  | 'toilet_paper'
  | 'coffee_cup'
  | 'banana'
  | 'mushroom'
  | 'toast'
  | 'battery';

export type AvatarHairStyle =
  | 'none'
  | 'short'
  | 'glasses_side'
  | 'long'
  | 'hood'
  | 'bun'
  | 'spiky_gold'
  | 'spiky_white'
  | 'spiky_black'
  | 'twin_pink'
  | 'rock_mohawk';

export type AvatarHeadgear =
  | 'none'
  | 'crown'
  | 'headband_red'
  | 'headband_ninja'
  | 'chef_hat'
  | 'astronaut_helmet'
  | 'pirate_hat'
  | 'straw_hat'
  | 'wizard_hat'
  | 'knight_visor'
  | 'detective_cap'
  | 'rooster_comb'
  | 'tangerine'
  | 'antenna'
  | 'ear_muffs';

export type AvatarEyewear =
  | 'none'
  | 'glasses'
  | 'sunglasses'
  | 'blindfold'
  | 'cyber_visor'
  | 'eyepatch'
  | 'beak';

export type AvatarPropBadge =
  | 'none'
  | 'dumbbell'
  | 'coffee'
  | 'bell'
  | 'aura_gold'
  | 'bowtie'
  | 'cape_red'
  | 'apron';

export interface AgentAvatarLookSpec {
  silhouette: AvatarSilhouette;
  skinHex: number;
  suitHex?: number;
  accentHex?: number;
  hairStyle?: AvatarHairStyle;
  hairHex?: number;
  headgear?: AvatarHeadgear;
  eyewear?: AvatarEyewear;
  propBadge?: AvatarPropBadge;
}

export interface AgentAvatarPreset {
  id: string;
  label: string;
  emoji: string;
  category: Exclude<AgentAvatarCategory, 'ALL'>;
  isDirectorOnly?: boolean;
  suggestedHex: string;
  look: AgentAvatarLookSpec;
}

export const AGENT_AVATAR_CATEGORY_META: Array<{
  id: AgentAvatarCategory;
  label: string;
  emoji: string;
}> = [
  { id: 'ALL', label: 'Tất cả', emoji: '✨' },
  { id: 'HUMAN', label: 'Con người', emoji: '🎭' },
  { id: 'ANIMAL', label: 'Động vật', emoji: '🐾' },
  { id: 'ROBOT_CYBER', label: 'Robot', emoji: '🤖' },
  { id: 'ANIME_HERO', label: 'Anime / Hero', emoji: '⚡' },
  { id: 'FUNNY_OBJECT', label: 'Đồ vật hài', emoji: '🧋' },
];

export const AGENT_AVATAR_CATALOG: AgentAvatarPreset[] = [
  // ======================== 6 CLASSIC OFFICE HUMANS ========================
  {
    id: 'default_scientist',
    label: 'Nhà Khoa Học',
    emoji: '🧪',
    category: 'HUMAN',
    suggestedHex: '#38BDF8',
    look: {
      silhouette: 'standard',
      skinHex: 0xffd1b3,
      hairStyle: 'glasses_side',
      hairHex: 0x1e293b,
      eyewear: 'glasses',
      accentHex: 0xe2e8f0,
    },
  },
  {
    id: 'default_coder',
    label: 'Lập Trình Viên Hoodie',
    emoji: '💻',
    category: 'HUMAN',
    suggestedHex: '#10B981',
    look: {
      silhouette: 'standard',
      skinHex: 0xffd1b3,
      hairStyle: 'hood',
      hairHex: 0x0f172a,
      eyewear: 'none',
      accentHex: 0x34d399,
    },
  },
  {
    id: 'default_writer',
    label: 'Biên Tập Viên',
    emoji: '✍️',
    category: 'HUMAN',
    suggestedHex: '#F472B6',
    look: {
      silhouette: 'standard',
      skinHex: 0xffd1b3,
      hairStyle: 'long',
      hairHex: 0x7c2d12,
      accentHex: 0xf472b6,
    },
  },
  {
    id: 'default_manager',
    label: 'Quản Lý Dự Án',
    emoji: '📋',
    category: 'HUMAN',
    suggestedHex: '#F59E0B',
    look: {
      silhouette: 'standard',
      skinHex: 0xffd1b3,
      hairStyle: 'short',
      hairHex: 0x92400e,
      accentHex: 0x1d4ed8,
    },
  },
  {
    id: 'default_reviewer',
    label: 'Chuyên Gia QA',
    emoji: '🔍',
    category: 'HUMAN',
    suggestedHex: '#A855F7',
    look: {
      silhouette: 'standard',
      skinHex: 0xffd1b3,
      hairStyle: 'bun',
      hairHex: 0x451a03,
      eyewear: 'glasses',
      accentHex: 0xc084fc,
    },
  },
  {
    id: 'director_ceo',
    label: 'Giám Đốc VIP',
    emoji: '👑',
    category: 'HUMAN',
    isDirectorOnly: true,
    suggestedHex: '#FBBF24',
    look: {
      silhouette: 'standard',
      skinHex: 0xffd1b3,
      suitHex: 0x1e293b,
      accentHex: 0xfacc15,
      hairStyle: 'short',
      hairHex: 0x0f172a,
      headgear: 'crown',
      eyewear: 'sunglasses',
    },
  },

  // ======================== 12 FUN HUMANS / CAREERS ========================
  {
    id: 'human_gym_bro',
    label: 'Nhân Viên Thể Hình',
    emoji: '💪',
    category: 'HUMAN',
    suggestedHex: '#EF4444',
    look: {
      silhouette: 'bodybuilder',
      skinHex: 0xe6a87c,
      suitHex: 0xdc2626,
      accentHex: 0xfbbf24,
      hairStyle: 'short',
      hairHex: 0x1c1917,
      headgear: 'headband_red',
      propBadge: 'dumbbell',
    },
  },
  {
    id: 'human_chef',
    label: 'Đầu Bếp Văn Phòng',
    emoji: '👨‍🍳',
    category: 'HUMAN',
    suggestedHex: '#F8FAFC',
    look: {
      silhouette: 'standard',
      skinHex: 0xffd1b3,
      suitHex: 0xf8fafc,
      accentHex: 0xef4444,
      hairStyle: 'short',
      hairHex: 0x451a03,
      headgear: 'chef_hat',
      propBadge: 'apron',
    },
  },
  {
    id: 'human_bartender',
    label: 'Bartender Pha Trà',
    emoji: '🍸',
    category: 'HUMAN',
    suggestedHex: '#EC4899',
    look: {
      silhouette: 'standard',
      skinHex: 0xffd1b3,
      suitHex: 0x1e1b4b,
      accentHex: 0xf43f5e,
      hairStyle: 'short',
      hairHex: 0x0f172a,
      propBadge: 'bowtie',
    },
  },
  {
    id: 'human_ninja',
    label: 'Ninja Fix Bug Đêm',
    emoji: '🥷',
    category: 'HUMAN',
    suggestedHex: '#334155',
    look: {
      silhouette: 'standard',
      skinHex: 0xffd1b3,
      suitHex: 0x0f172a,
      accentHex: 0xef4444,
      hairStyle: 'hood',
      hairHex: 0x020617,
      headgear: 'headband_red',
    },
  },
  {
    id: 'human_astronaut',
    label: 'Phi Hành Gia Cloud',
    emoji: '👩‍🚀',
    category: 'HUMAN',
    suggestedHex: '#60A5FA',
    look: {
      silhouette: 'standard',
      skinHex: 0xffd1b3,
      suitHex: 0xf1f5f9,
      accentHex: 0x3b82f6,
      headgear: 'astronaut_helmet',
      eyewear: 'cyber_visor',
    },
  },
  {
    id: 'human_pirate',
    label: 'Thuyền Trưởng Hải Tặc',
    emoji: '🏴‍☠️',
    category: 'HUMAN',
    suggestedHex: '#B91C1C',
    look: {
      silhouette: 'standard',
      skinHex: 0xf3bfa0,
      suitHex: 0x7f1d1d,
      accentHex: 0xfbbf24,
      hairStyle: 'long',
      hairHex: 0x1c1917,
      headgear: 'pirate_hat',
      eyewear: 'eyepatch',
    },
  },
  {
    id: 'human_rockstar',
    label: 'Rockstar Punk Ngầu',
    emoji: '🎸',
    category: 'HUMAN',
    suggestedHex: '#D946EF',
    look: {
      silhouette: 'standard',
      skinHex: 0xffd1b3,
      suitHex: 0x18181b,
      accentHex: 0xe879f9,
      hairStyle: 'rock_mohawk',
      hairHex: 0xf43f5e,
      eyewear: 'sunglasses',
    },
  },
  {
    id: 'human_detective',
    label: 'Thám Tử Tìm Log',
    emoji: '🕵️',
    category: 'HUMAN',
    suggestedHex: '#CA8A04',
    look: {
      silhouette: 'standard',
      skinHex: 0xffd1b3,
      suitHex: 0x78350f,
      accentHex: 0xfde047,
      hairStyle: 'short',
      hairHex: 0x292524,
      headgear: 'detective_cap',
      eyewear: 'glasses',
    },
  },
  {
    id: 'human_knight',
    label: 'Hiệp Sĩ Giáp Sắt',
    emoji: '🛡️',
    category: 'HUMAN',
    suggestedHex: '#94A3B8',
    look: {
      silhouette: 'standard',
      skinHex: 0x94a3b8,
      suitHex: 0x64748b,
      accentHex: 0xef4444,
      headgear: 'knight_visor',
      propBadge: 'cape_red',
    },
  },
  {
    id: 'human_wizard',
    label: 'Pháp Sư Deploy',
    emoji: '🧙',
    category: 'HUMAN',
    suggestedHex: '#7C3AED',
    look: {
      silhouette: 'standard',
      skinHex: 0xffd1b3,
      suitHex: 0x4c1d95,
      accentHex: 0xfbbf24,
      hairStyle: 'long',
      hairHex: 0xe2e8f0,
      headgear: 'wizard_hat',
    },
  },
  {
    id: 'human_barista',
    label: 'Barista Nghiện Cà Phê',
    emoji: '☕',
    category: 'HUMAN',
    suggestedHex: '#92400E',
    look: {
      silhouette: 'standard',
      skinHex: 0xffd1b3,
      suitHex: 0x166534,
      accentHex: 0xfef3c7,
      hairStyle: 'bun',
      hairHex: 0x1c1917,
      propBadge: 'coffee',
    },
  },
  {
    id: 'human_doctor',
    label: 'Bác Sĩ Chữa Crash',
    emoji: '🩺',
    category: 'HUMAN',
    suggestedHex: '#06B6D4',
    look: {
      silhouette: 'standard',
      skinHex: 0xffd1b3,
      suitHex: 0xf8fafc,
      accentHex: 0x06b6d4,
      hairStyle: 'short',
      hairHex: 0x0f172a,
      eyewear: 'glasses',
    },
  },

  // ======================== 8 ROBOT & CYBER ========================
  {
    id: 'robot_retro_crt',
    label: 'Robot Màn Hình CRT',
    emoji: '🖥️',
    category: 'ROBOT_CYBER',
    suggestedHex: '#22D3EE',
    look: {
      silhouette: 'robot_crt',
      skinHex: 0x94a3b8,
      suitHex: 0x475569,
      accentHex: 0x22d3ee,
      headgear: 'antenna',
    },
  },
  {
    id: 'robot_gold_mech',
    label: 'Mecha Vàng Tối Thượng',
    emoji: '🤖',
    category: 'ROBOT_CYBER',
    suggestedHex: '#F59E0B',
    look: {
      silhouette: 'robot_mech',
      skinHex: 0xfbbf24,
      suitHex: 0xb45309,
      accentHex: 0x38bdf8,
      headgear: 'antenna',
      eyewear: 'cyber_visor',
    },
  },
  {
    id: 'robot_cyber_punk',
    label: 'Cyborg Neon 2099',
    emoji: '🦾',
    category: 'ROBOT_CYBER',
    suggestedHex: '#F43F5E',
    look: {
      silhouette: 'robot_mech',
      skinHex: 0xcbd5e1,
      suitHex: 0x0f172a,
      accentHex: 0xf43f5e,
      hairStyle: 'rock_mohawk',
      hairHex: 0x22d3ee,
      eyewear: 'cyber_visor',
    },
  },
  {
    id: 'robot_tiny_bot',
    label: 'Bot Tròn Một Mắt',
    emoji: '🛸',
    category: 'ROBOT_CYBER',
    suggestedHex: '#34D399',
    look: {
      silhouette: 'robot_round',
      skinHex: 0xe2e8f0,
      suitHex: 0x059669,
      accentHex: 0x6ee7b7,
      headgear: 'antenna',
    },
  },
  {
    id: 'robot_maid',
    label: 'Robot Phục Vụ Pantry',
    emoji: '🧹',
    category: 'ROBOT_CYBER',
    suggestedHex: '#F472B6',
    look: {
      silhouette: 'robot_crt',
      skinHex: 0xf8fafc,
      suitHex: 0x1e293b,
      accentHex: 0xf472b6,
      propBadge: 'apron',
    },
  },
  {
    id: 'robot_tv_head',
    label: 'Đầu TV Phát Sóng',
    emoji: '📺',
    category: 'ROBOT_CYBER',
    suggestedHex: '#8B5CF6',
    look: {
      silhouette: 'robot_crt',
      skinHex: 0x5b21b6,
      suitHex: 0x312e81,
      accentHex: 0xfef08a,
      headgear: 'antenna',
    },
  },
  {
    id: 'robot_astro_droid',
    label: 'Droid Vũ Trụ Trắng Cam',
    emoji: '🛰️',
    category: 'ROBOT_CYBER',
    suggestedHex: '#FB923C',
    look: {
      silhouette: 'robot_round',
      skinHex: 0xf8fafc,
      suitHex: 0xf97316,
      accentHex: 0x38bdf8,
      headgear: 'antenna',
    },
  },
  {
    id: 'robot_steampunk',
    label: 'Robot Hơi Nước Đồng',
    emoji: '⚙️',
    category: 'ROBOT_CYBER',
    suggestedHex: '#D97706',
    look: {
      silhouette: 'robot_mech',
      skinHex: 0xb45309,
      suitHex: 0x78350f,
      accentHex: 0xfde047,
      eyewear: 'glasses',
      headgear: 'detective_cap',
    },
  },

  // ======================== 13 FUNNY ANIMALS ========================
  {
    id: 'animal_rooster',
    label: 'Nhân Viên Gà Trống',
    emoji: '🐓',
    category: 'ANIMAL',
    suggestedHex: '#EF4444',
    look: {
      silhouette: 'rooster',
      skinHex: 0xfef3c7,
      suitHex: 0xf8fafc,
      accentHex: 0xef4444,
      headgear: 'rooster_comb',
      eyewear: 'beak',
    },
  },
  {
    id: 'animal_orange_cat',
    label: 'Hoàng Thượng Mèo Cam',
    emoji: '🐱',
    category: 'ANIMAL',
    suggestedHex: '#F97316',
    look: {
      silhouette: 'cat_ears',
      skinHex: 0xfb923c,
      suitHex: 0xea580c,
      accentHex: 0xfef3c7,
      propBadge: 'bell',
    },
  },
  {
    id: 'animal_corgi',
    label: 'Cún Corgi Mông To',
    emoji: '🐕',
    category: 'ANIMAL',
    suggestedHex: '#F59E0B',
    look: {
      silhouette: 'dog_ears',
      skinHex: 0xf59e0b,
      suitHex: 0xd97706,
      accentHex: 0xfef3c7,
      propBadge: 'bowtie',
    },
  },
  {
    id: 'animal_panda',
    label: 'Gấu Trúc Thức Khuya',
    emoji: '🐼',
    category: 'ANIMAL',
    suggestedHex: '#E2E8F0',
    look: {
      silhouette: 'panda',
      skinHex: 0xf8fafc,
      suitHex: 0x1e293b,
      accentHex: 0x22c55e,
    },
  },
  {
    id: 'animal_pepe_frog',
    label: 'Ếch Xanh Pepe Tấu Hài',
    emoji: '🐸',
    category: 'ANIMAL',
    suggestedHex: '#22C55E',
    look: {
      silhouette: 'frog',
      skinHex: 0x4ade80,
      suitHex: 0x1d4ed8,
      accentHex: 0xef4444,
    },
  },
  {
    id: 'animal_penguin',
    label: 'Chim Cánh Cụt Mặc Vest',
    emoji: '🐧',
    category: 'ANIMAL',
    suggestedHex: '#38BDF8',
    look: {
      silhouette: 'penguin',
      skinHex: 0x0f172a,
      suitHex: 0x020617,
      accentHex: 0xfb923c,
      eyewear: 'beak',
      propBadge: 'bowtie',
    },
  },
  {
    id: 'animal_shiba',
    label: 'Chó Shiba Cheems',
    emoji: '🦊',
    category: 'ANIMAL',
    suggestedHex: '#EAB308',
    look: {
      silhouette: 'dog_ears',
      skinHex: 0xfacc15,
      suitHex: 0xb45309,
      accentHex: 0xfef08a,
      eyewear: 'sunglasses',
    },
  },
  {
    id: 'animal_trex',
    label: 'Khủng Long T-Rex Gõ Phím',
    emoji: '🦖',
    category: 'ANIMAL',
    suggestedHex: '#16A34A',
    look: {
      silhouette: 'trex',
      skinHex: 0x22c55e,
      suitHex: 0x15803d,
      accentHex: 0xfde047,
    },
  },
  {
    id: 'animal_shark',
    label: 'Cá Mập Sếp Văn Phòng',
    emoji: '🦈',
    category: 'ANIMAL',
    suggestedHex: '#64748B',
    look: {
      silhouette: 'shark',
      skinHex: 0x64748b,
      suitHex: 0x1e293b,
      accentHex: 0xef4444,
      eyewear: 'sunglasses',
    },
  },
  {
    id: 'animal_duck',
    label: 'Vịt Vàng Mỏ Rộng',
    emoji: '🦆',
    category: 'ANIMAL',
    suggestedHex: '#FACC15',
    look: {
      silhouette: 'duck',
      skinHex: 0xfde047,
      suitHex: 0xeab308,
      accentHex: 0xf97316,
      eyewear: 'beak',
    },
  },
  {
    id: 'animal_fox',
    label: 'Cáo Đỏ Lanh Lợi',
    emoji: '🦊',
    category: 'ANIMAL',
    suggestedHex: '#EA580C',
    look: {
      silhouette: 'fox',
      skinHex: 0xf97316,
      suitHex: 0x9a3412,
      accentHex: 0xfef3c7,
    },
  },
  {
    id: 'animal_bunny',
    label: 'Thỏ Trắng Deadline',
    emoji: '🐰',
    category: 'ANIMAL',
    suggestedHex: '#F472B6',
    look: {
      silhouette: 'bunny_ears',
      skinHex: 0xf8fafc,
      suitHex: 0xf472b6,
      accentHex: 0xfbbf24,
      propBadge: 'bowtie',
    },
  },
  {
    id: 'animal_capybara',
    label: 'Capybara Chill Đội Quýt',
    emoji: '🍊',
    category: 'ANIMAL',
    suggestedHex: '#B45309',
    look: {
      silhouette: 'capybara',
      skinHex: 0x92400e,
      suitHex: 0x78350f,
      accentHex: 0xf97316,
      headgear: 'tangerine',
    },
  },

  // ======================== 9 ANIME & CARTOON HEROES ========================
  {
    id: 'anime_leaf_ninja',
    label: 'Ninja Tóc Vàng Làng Lá',
    emoji: '🍥',
    category: 'ANIME_HERO',
    suggestedHex: '#F97316',
    look: {
      silhouette: 'standard',
      skinHex: 0xffd1b3,
      suitHex: 0xf97316,
      accentHex: 0x1e293b,
      hairStyle: 'spiky_gold',
      hairHex: 0xfacc15,
      headgear: 'headband_ninja',
    },
  },
  {
    id: 'anime_super_saiyan',
    label: 'Chiến Binh Siêu Saiyan',
    emoji: '⚡',
    category: 'ANIME_HERO',
    suggestedHex: '#FACC15',
    look: {
      silhouette: 'bodybuilder',
      skinHex: 0xffd1b3,
      suitHex: 0xea580c,
      accentHex: 0x2563eb,
      hairStyle: 'spiky_gold',
      hairHex: 0xfef08a,
      propBadge: 'aura_gold',
    },
  },
  {
    id: 'anime_strawhat_pirate',
    label: 'Thuyền Trưởng Mũ Rơm',
    emoji: '👒',
    category: 'ANIME_HERO',
    suggestedHex: '#EF4444',
    look: {
      silhouette: 'standard',
      skinHex: 0xffd1b3,
      suitHex: 0xdc2626,
      accentHex: 0xfacc15,
      hairStyle: 'short',
      hairHex: 0x0f172a,
      headgear: 'straw_hat',
    },
  },
  {
    id: 'anime_gojo_vibe',
    label: 'Chú Thuật Sư Bịt Mắt',
    emoji: '🤞',
    category: 'ANIME_HERO',
    suggestedHex: '#818CF8',
    look: {
      silhouette: 'standard',
      skinHex: 0xffedd5,
      suitHex: 0x0f172a,
      accentHex: 0x38bdf8,
      hairStyle: 'spiky_white',
      hairHex: 0xf8fafc,
      eyewear: 'blindfold',
    },
  },
  {
    id: 'anime_magical_girl',
    label: 'Thiếu Nữ Phép Thuật',
    emoji: '🪄',
    category: 'ANIME_HERO',
    suggestedHex: '#EC4899',
    look: {
      silhouette: 'standard',
      skinHex: 0xffd1b3,
      suitHex: 0xec4899,
      accentHex: 0xfde047,
      hairStyle: 'twin_pink',
      hairHex: 0xf472b6,
      headgear: 'crown',
      propBadge: 'bowtie',
    },
  },
  {
    id: 'anime_robo_cat_blue',
    label: 'Mèo Máy Tương Lai',
    emoji: '🔔',
    category: 'ANIME_HERO',
    suggestedHex: '#0EA5E9',
    look: {
      silhouette: 'robot_round',
      skinHex: 0x0ea5e9,
      suitHex: 0x0284c7,
      accentHex: 0xfacc15,
      propBadge: 'bell',
    },
  },
  {
    id: 'anime_electric_mouse',
    label: 'Chuột Điện Má Đỏ',
    emoji: '⚡',
    category: 'ANIME_HERO',
    suggestedHex: '#FACC15',
    look: {
      silhouette: 'bunny_ears',
      skinHex: 0xfacc15,
      suitHex: 0xeab308,
      accentHex: 0xef4444,
    },
  },
  {
    id: 'anime_hero_cape',
    label: 'Siêu Anh Hùng Áo Choàng',
    emoji: '🦸',
    category: 'ANIME_HERO',
    suggestedHex: '#2563EB',
    look: {
      silhouette: 'bodybuilder',
      skinHex: 0xffd1b3,
      suitHex: 0x2563eb,
      accentHex: 0xfacc15,
      hairStyle: 'spiky_black',
      hairHex: 0x0f172a,
      propBadge: 'cape_red',
    },
  },
  {
    id: 'anime_slime_king',
    label: 'Slime Xanh Chuyển Sinh',
    emoji: '💧',
    category: 'ANIME_HERO',
    suggestedHex: '#38BDF8',
    look: {
      silhouette: 'slime',
      skinHex: 0x38bdf8,
      suitHex: 0x0284c7,
      accentHex: 0xfacc15,
      headgear: 'crown',
    },
  },

  // ======================== 8 FUNNY OBJECTS ========================
  {
    id: 'object_cactus',
    label: 'Cây Xương Rồng Đeo Kính',
    emoji: '🌵',
    category: 'FUNNY_OBJECT',
    suggestedHex: '#22C55E',
    look: {
      silhouette: 'cactus',
      skinHex: 0x16a34a,
      suitHex: 0xb45309,
      accentHex: 0xfde047,
      eyewear: 'sunglasses',
    },
  },
  {
    id: 'object_boba_tea',
    label: 'Ly Trà Sữa Trân Châu',
    emoji: '🧋',
    category: 'FUNNY_OBJECT',
    suggestedHex: '#D97706',
    look: {
      silhouette: 'boba_cup',
      skinHex: 0xfde68a,
      suitHex: 0x92400e,
      accentHex: 0xec4899,
    },
  },
  {
    id: 'object_toilet_paper',
    label: 'Cuộn Giấy Vệ Sinh Vui',
    emoji: '🧻',
    category: 'FUNNY_OBJECT',
    suggestedHex: '#E2E8F0',
    look: {
      silhouette: 'toilet_paper',
      skinHex: 0xf8fafc,
      suitHex: 0xcbd5e1,
      accentHex: 0x94a3b8,
    },
  },
  {
    id: 'object_coffee_cup',
    label: 'Cốc Cà Phê Bốc Khói',
    emoji: '☕',
    category: 'FUNNY_OBJECT',
    suggestedHex: '#78350F',
    look: {
      silhouette: 'coffee_cup',
      skinHex: 0xf8fafc,
      suitHex: 0x78350f,
      accentHex: 0xf59e0b,
    },
  },
  {
    id: 'object_banana_man',
    label: 'Quả Chuối Mặc Cà Vạt',
    emoji: '🍌',
    category: 'FUNNY_OBJECT',
    suggestedHex: '#FACC15',
    look: {
      silhouette: 'banana',
      skinHex: 0xfde047,
      suitHex: 0xeab308,
      accentHex: 0xef4444,
      eyewear: 'sunglasses',
    },
  },
  {
    id: 'object_red_mushroom',
    label: 'Nấm Đỏ Tăng Lực',
    emoji: '🍄',
    category: 'FUNNY_OBJECT',
    suggestedHex: '#EF4444',
    look: {
      silhouette: 'mushroom',
      skinHex: 0xfef3c7,
      suitHex: 0xdc2626,
      accentHex: 0xf8fafc,
    },
  },
  {
    id: 'object_toast',
    label: 'Bánh Mì Nướng Bơ',
    emoji: '🍞',
    category: 'FUNNY_OBJECT',
    suggestedHex: '#D97706',
    look: {
      silhouette: 'toast',
      skinHex: 0xf59e0b,
      suitHex: 0x92400e,
      accentHex: 0xfef08a,
    },
  },
  {
    id: 'object_battery',
    label: 'Cục Pin Đầy 100%',
    emoji: '🔋',
    category: 'FUNNY_OBJECT',
    suggestedHex: '#10B981',
    look: {
      silhouette: 'battery',
      skinHex: 0x22c55e,
      suitHex: 0x1e293b,
      accentHex: 0xfacc15,
    },
  },
];

const AVATAR_PRESET_BY_ID = new Map<string, AgentAvatarPreset>(
  AGENT_AVATAR_CATALOG.map((preset) => [preset.id, preset]),
);

export function getAgentAvatarPreset(id?: string): AgentAvatarPreset {
  if (id && AVATAR_PRESET_BY_ID.has(id)) {
    return AVATAR_PRESET_BY_ID.get(id)!;
  }
  return AVATAR_PRESET_BY_ID.get('default_scientist')!;
}

/**
 * Picks a random employee avatar preset from the rich catalog (excluding CEO-only crown).
 */
export function pickRandomAgentAvatarId(options?: {
  excludeIds?: string[];
  preferNonBasic?: boolean;
}): string {
  const exclude = new Set(options?.excludeIds ?? []);
  const candidates = AGENT_AVATAR_CATALOG.filter(
    (preset) => !preset.isDirectorOnly && !exclude.has(preset.id),
  );
  if (candidates.length === 0) {
    return 'default_coder';
  }
  // Slightly bias away from the 5 starter human presets if preferNonBasic is true (default true)
  const preferVariety = options?.preferNonBasic !== false;
  if (preferVariety) {
    const richPool = candidates.filter((preset) => !preset.id.startsWith('default_'));
    if (richPool.length > 0 && Math.random() < 0.88) {
      return richPool[Math.floor(Math.random() * richPool.length)].id;
    }
  }
  return candidates[Math.floor(Math.random() * candidates.length)].id;
}
