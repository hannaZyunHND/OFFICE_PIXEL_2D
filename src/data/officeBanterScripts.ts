import type { FurnitureType } from '@/types/blueprint';
import type { IdleHobbyIconType } from '@/types/events';

export type BanterCategory =
  | 'SPORTS_PES'
  | 'NATURE_PHILOSOPHY'
  | 'FOOD_PANTRY'
  | 'CHITCHAT_LOL';

export interface BanterTurn {
  /** 0-based index into participating players array (wraps via modulo if 2 players) */
  speakerSlot: number;
  text: string;
  /** Optional pixel badge icon rendered alongside text */
  hobbyIcon?: IdleHobbyIconType;
  /** Hex accent color override for speech bubble border */
  accentColor?: string;
}

export interface BanterScript {
  id: string;
  category: BanterCategory;
  furnitureTypes?: FurnitureType[];
  turns: BanterTurn[];
}

export interface DeskIdleActivity {
  icon: IdleHobbyIconType;
  accentColor: string;
  texts: string[];
}

// ============================================================================
// 1. AT-DESK CUTE IDLE ACTIVITIES (LoL, Hát hò, Ngáp ngủ)
// ============================================================================
export const DESK_IDLE_ACTIVITIES: DeskIdleActivity[] = [
  {
    icon: 'lol_game',
    accentColor: '#38bdf8',
    texts: [
      'Rank LoL chuỗi thắng rồi!',
      'Đánh Yasuo 0/10 gánh team...',
      'Làm 1 trận ARAM giải khuây!',
      'Tranh thủ farm lính chờ task',
      'Pentakill hụt tức anh ách!',
      'Ban Teemo không cần hỏi!',
      'Ai rảnh duo bot đánh rank?',
    ],
  },
  {
    icon: 'music_sing',
    accentColor: '#ec4899',
    texts: [
      'Là lá la~ chill phết~',
      'Ngân nga bản hit lo-fi...',
      'Giai điệu nay cuốn thực sự!',
      'Hát khẽ kẻo sếp đi ngang~',
      'Thả hồn theo beat cực cháy',
      'Remix code thành nhạc pop~',
      'Hummm~ đời thật nhẹ nhàng~',
    ],
  },
  {
    icon: 'sleepy_yawn',
    accentColor: '#a78bfa',
    texts: [
      'Ngáp... buồn ngủ quá đi...',
      'Chợp mắt 5 giây lấy sức zZ',
      'Mí mắt díu hết cả rồi...',
      'Ước gì có ly trà sữa ngay!',
      'Gật gù chờ briefing mới...',
      'Mệt rã rời sau sprint dài~',
      'Zzz... mơ thấy hết bug...',
    ],
  },
];

// ============================================================================
// 2. DUO INVITE SCRIPTS WHEN INVITING COLLEAGUE TO PLAY LOL / RELAX
// ============================================================================
export const LOL_DUO_INVITE_SCRIPTS: {
  inviteLine: (targetName: string) => string;
  acceptLine: (initiatorName: string) => string;
  followupTurns: BanterTurn[];
}[] = [
  {
    inviteLine: (n) => `@${n} làm ván LoL không?`,
    acceptLine: (n) => `Ok @${n}, tôi pick Thresh sp!`,
    followupTurns: [
      { speakerSlot: 0, text: 'Gank bot đi bạn ơi!', hobbyIcon: 'lol_game', accentColor: '#38bdf8' },
      { speakerSlot: 1, text: 'Kéo chuẩn như Faker luôn!', hobbyIcon: 'lol_game', accentColor: '#38bdf8' },
    ],
  },
  {
    inviteLine: (n) => `@${n} vào ARAM 10 phút đê!`,
    acceptLine: () => 'Múc luôn! Sợ gì bố con ai!',
    followupTurns: [
      { speakerSlot: 0, text: 'Né chiêu đi đồng đội ơi!', hobbyIcon: 'lol_game', accentColor: '#38bdf8' },
      { speakerSlot: 1, text: 'Ăn penta rồi gáy to lên!', hobbyIcon: 'lol_game', accentColor: '#38bdf8' },
    ],
  },
  {
    inviteLine: (n) => `@${n} kéo rank Kim Cương ko?`,
    acceptLine: (n) => `Chốt đơn @${n}, mid bất bại!`,
    followupTurns: [
      { speakerSlot: 0, text: 'Yasuo thông thạo 7 xuất trận!', hobbyIcon: 'lol_game', accentColor: '#38bdf8' },
      { speakerSlot: 1, text: 'Thôi đừng 0/10 là may rồi!', hobbyIcon: 'lol_game', accentColor: '#38bdf8' },
    ],
  },
  {
    inviteLine: (n) => `@${n} quất kèo ĐTCL nhân phẩm?`,
    acceptLine: () => 'Vào! Nay roll ra 3 sao sớm!',
    followupTurns: [
      { speakerSlot: 0, text: 'Tới công chuyện luôn nhé!', hobbyIcon: 'lol_game', accentColor: '#38bdf8' },
      { speakerSlot: 1, text: 'Trời ơi hết vàng rồi huhu!', hobbyIcon: 'lol_game', accentColor: '#38bdf8' },
    ],
  },
];

// ============================================================================
// 3. GROUP BANTER SCRIPTS (~105 SCENARIOS ACROSS 4 CATEGORIES)
//    Note: Keep each line <= 42 chars for crisp in-game pixel speech bubbles!
// ============================================================================

// --- CATEGORY A: THỂ THAO & ĐÁ PES PS5 ("GÁY BẨN") - 30 SCENARIOS ---
export const SPORTS_GAMING_SCRIPTS: BanterScript[] = [
  {
    id: 'pes_01',
    category: 'SPORTS_PES',
    furnitureTypes: ['PS5_PES_STATION'],
    turns: [
      { speakerSlot: 0, text: 'Cầm tay cầm lên! Chấp 2 trái!', hobbyIcon: 'ps5_pes', accentColor: '#22c55e' },
      { speakerSlot: 1, text: 'Gáy vừa thôi, tý 3-0 lại khóc!', hobbyIcon: 'ps5_pes', accentColor: '#ef4444' },
      { speakerSlot: 2, text: 'Ai thua chầu trà sữa chiều nay!', hobbyIcon: 'ps5_pes', accentColor: '#f59e0b' },
    ],
  },
  {
    id: 'pes_02',
    category: 'SPORTS_PES',
    furnitureTypes: ['PS5_PES_STATION'],
    turns: [
      { speakerSlot: 0, text: 'Siêu phẩm cứa lòng R2! VÀO!!', hobbyIcon: 'ps5_pes', accentColor: '#22c55e' },
      { speakerSlot: 1, text: 'Tay cầm lag nút chuyền rồi ê!', hobbyIcon: 'ps5_pes', accentColor: '#ef4444' },
      { speakerSlot: 2, text: 'Văn mẫu đổ tại tay cầm kinh điển!', hobbyIcon: 'ps5_pes', accentColor: '#f59e0b' },
    ],
  },
  {
    id: 'pes_03',
    category: 'SPORTS_PES',
    furnitureTypes: ['PS5_PES_STATION'],
    turns: [
      { speakerSlot: 0, text: 'Thủ môn bay như Spider-Man luôn!', hobbyIcon: 'ps5_pes', accentColor: '#22c55e' },
      { speakerSlot: 1, text: 'Hack game à sao không vào được?!', hobbyIcon: 'ps5_pes', accentColor: '#ef4444' },
      { speakerSlot: 0, text: 'Đẳng cấp nó nằm ở cổ tay bạn ạ!', hobbyIcon: 'ps5_pes', accentColor: '#22c55e' },
    ],
  },
  {
    id: 'pes_04',
    category: 'SPORTS_PES',
    furnitureTypes: ['PS5_PES_STATION'],
    turns: [
      { speakerSlot: 0, text: 'Mbappe bứt tốc cháy khét lẹt!', hobbyIcon: 'ps5_pes', accentColor: '#22c55e' },
      { speakerSlot: 1, text: 'Hậu vệ tôi chạy bộ theo không kịp!', hobbyIcon: 'ps5_pes', accentColor: '#ef4444' },
      { speakerSlot: 2, text: 'Xoạc bóng thẻ đỏ cho vui đi bạn!', hobbyIcon: 'ps5_pes', accentColor: '#f59e0b' },
    ],
  },
  {
    id: 'pes_05',
    category: 'SPORTS_PES',
    furnitureTypes: ['PS5_PES_STATION'],
    turns: [
      { speakerSlot: 0, text: 'Tiki-taka mượt như code production!', hobbyIcon: 'ps5_pes', accentColor: '#22c55e' },
      { speakerSlot: 1, text: 'Màu mè thế tý ăn phản công giờ!', hobbyIcon: 'ps5_pes', accentColor: '#ef4444' },
      { speakerSlot: 2, text: 'Còi hết giờ! Gỡ bằng niềm tin nhé!', hobbyIcon: 'ps5_pes', accentColor: '#f59e0b' },
    ],
  },
  {
    id: 'pes_06',
    category: 'SPORTS_PES',
    furnitureTypes: ['PS5_PES_STATION'],
    turns: [
      { speakerSlot: 0, text: 'Đá phạt góc xoáy vào gôn luôn!', hobbyIcon: 'ps5_pes', accentColor: '#22c55e' },
      { speakerSlot: 1, text: 'Không tính! Đá lại quả khác đê!', hobbyIcon: 'ps5_pes', accentColor: '#ef4444' },
      { speakerSlot: 2, text: 'Tâm phục khẩu phục đi đồng chí!', hobbyIcon: 'ps5_pes', accentColor: '#f59e0b' },
    ],
  },
  {
    id: 'pes_07',
    category: 'SPORTS_PES',
    furnitureTypes: ['PS5_PES_STATION'],
    turns: [
      { speakerSlot: 0, text: 'Phút 90+4 lội ngược dòng đỉnh cao!', hobbyIcon: 'ps5_pes', accentColor: '#22c55e' },
      { speakerSlot: 1, text: 'Trọng tài chắc fan Real Madrid rồi!', hobbyIcon: 'ps5_pes', accentColor: '#ef4444' },
      { speakerSlot: 0, text: 'Gáy lên anh em! Vô địch văn phòng!', hobbyIcon: 'ps5_pes', accentColor: '#22c55e' },
    ],
  },
  {
    id: 'pes_08',
    category: 'SPORTS_PES',
    furnitureTypes: ['PS5_PES_STATION'],
    turns: [
      { speakerSlot: 0, text: 'Bấm L1 tam giác hơi bị uy tín nhé!', hobbyIcon: 'ps5_pes', accentColor: '#22c55e' },
      { speakerSlot: 1, text: 'Toàn bài chọc khe chạy cánh thế?!', hobbyIcon: 'ps5_pes', accentColor: '#ef4444' },
      { speakerSlot: 2, text: 'Đá thắng là chân lý, cãi làm gì!', hobbyIcon: 'ps5_pes', accentColor: '#f59e0b' },
    ],
  },
  {
    id: 'pes_09',
    category: 'SPORTS_PES',
    furnitureTypes: ['PS5_PES_STATION'],
    turns: [
      { speakerSlot: 0, text: 'Sút pen lừa thủ môn đi uống nước!', hobbyIcon: 'ps5_pes', accentColor: '#22c55e' },
      { speakerSlot: 1, text: 'Panenka láo thật sự luôn á!!', hobbyIcon: 'ps5_pes', accentColor: '#ef4444' },
      { speakerSlot: 2, text: 'Đắng lòng thanh niên bay sai góc!', hobbyIcon: 'ps5_pes', accentColor: '#f59e0b' },
    ],
  },
  {
    id: 'pes_10',
    category: 'SPORTS_PES',
    furnitureTypes: ['PS5_PES_STATION'],
    turns: [
      { speakerSlot: 0, text: 'Trình này chỉ đá với máy Beginner!', hobbyIcon: 'ps5_pes', accentColor: '#22c55e' },
      { speakerSlot: 1, text: 'Ngứa tay quá, đổi đội 5 sao ngay!', hobbyIcon: 'ps5_pes', accentColor: '#ef4444' },
      { speakerSlot: 2, text: 'Hít bụi cả hiệp 2 đi bạn ơi!', hobbyIcon: 'ps5_pes', accentColor: '#f59e0b' },
    ],
  },
  {
    id: 'pes_11',
    category: 'SPORTS_PES',
    furnitureTypes: ['PS5_PES_STATION'],
    turns: [
      { speakerSlot: 0, text: 'Sút xa 35m cháy lưới PS5!!', hobbyIcon: 'ps5_pes', accentColor: '#22c55e' },
      { speakerSlot: 1, text: 'Bóng xé gió như tên lửa vậy?!', hobbyIcon: 'ps5_pes', accentColor: '#ef4444' },
    ],
  },
  {
    id: 'pes_12',
    category: 'SPORTS_PES',
    furnitureTypes: ['PS5_PES_STATION'],
    turns: [
      { speakerSlot: 0, text: 'Cất poster Ronaldo vào tủ đi em!', hobbyIcon: 'ps5_pes', accentColor: '#22c55e' },
      { speakerSlot: 1, text: 'Messi tôi vừa hat-trick xong đó!', hobbyIcon: 'ps5_pes', accentColor: '#ef4444' },
      { speakerSlot: 2, text: 'Cả hai đều thua con AI cấp Superstar!', hobbyIcon: 'ps5_pes', accentColor: '#f59e0b' },
    ],
  },
  {
    id: 'pool_01',
    category: 'SPORTS_PES',
    furnitureTypes: ['POOL_TABLE'],
    turns: [
      { speakerSlot: 0, text: 'Đường bi này chuẩn góc 45 độ luôn!', accentColor: '#10b981' },
      { speakerSlot: 1, text: 'Tý lại đánh trượt bi cái xuống lỗ!', accentColor: '#ef4444' },
      { speakerSlot: 2, text: 'Ôi giời, sượt mép rồi lêu lêu!', accentColor: '#f59e0b' },
    ],
  },
  {
    id: 'pool_02',
    category: 'SPORTS_PES',
    furnitureTypes: ['POOL_TABLE'],
    turns: [
      { speakerSlot: 0, text: 'Cơ thủ số 1 công ty lên tiếng!', accentColor: '#10b981' },
      { speakerSlot: 1, text: 'Cầm gậy ngược kìa ngài cơ thủ!', accentColor: '#ef4444' },
      { speakerSlot: 2, text: 'Cười xỉu với pha múa cơ đỉnh cao!', accentColor: '#f59e0b' },
    ],
  },
  {
    id: 'pool_03',
    category: 'SPORTS_PES',
    furnitureTypes: ['POOL_TABLE'],
    turns: [
      { speakerSlot: 0, text: 'Còn đúng bi số 8, kết thúc gọn!', accentColor: '#10b981' },
      { speakerSlot: 1, text: 'Run tay chưa bạn hiền ơi?!', accentColor: '#ef4444' },
      { speakerSlot: 0, text: 'Lọt lỗ ngọt lịm! Nhận thua đi!', accentColor: '#10b981' },
    ],
  },
  {
    id: 'pool_04',
    category: 'SPORTS_PES',
    furnitureTypes: ['POOL_TABLE'],
    turns: [
      { speakerSlot: 0, text: 'Chấm lơ cho kỹ chuẩn bị siêu phẩm!', accentColor: '#10b981' },
      { speakerSlot: 1, text: 'Chấm nửa tiếng vẫn đánh hụt thôi!', accentColor: '#ef4444' },
    ],
  },
  {
    id: 'pool_05',
    category: 'SPORTS_PES',
    furnitureTypes: ['POOL_TABLE'],
    turns: [
      { speakerSlot: 0, text: 'A băng 2 thành vào lỗ góc kìa!', accentColor: '#10b981' },
      { speakerSlot: 1, text: 'Rùa thôi chứ tính toán gì tầm này!', accentColor: '#ef4444' },
      { speakerSlot: 2, text: 'Đỉnh cao rùa thần công xuất hiện!', accentColor: '#f59e0b' },
    ],
  },
  {
    id: 'pingpong_01',
    category: 'SPORTS_PES',
    furnitureTypes: ['PING_PONG_TABLE'],
    turns: [
      { speakerSlot: 0, text: 'Đỡ quả giật bóng xoáy này xem!', accentColor: '#38bdf8' },
      { speakerSlot: 1, text: 'Úi chao bay ra ngoài cửa sổ rồi!', accentColor: '#ef4444' },
      { speakerSlot: 2, text: 'Đập hụt mà vẫn gáy khét lắm cơ!', accentColor: '#f59e0b' },
    ],
  },
  {
    id: 'pingpong_02',
    category: 'SPORTS_PES',
    furnitureTypes: ['PING_PONG_TABLE'],
    turns: [
      { speakerSlot: 0, text: '10-0 rồi, có cần nhường 1 điểm ko?', accentColor: '#38bdf8' },
      { speakerSlot: 1, text: 'Đừng khinh thường sức mạnh comeback!', accentColor: '#ef4444' },
      { speakerSlot: 0, text: '11-0! Khỏi comeback luôn nhé!', accentColor: '#38bdf8' },
    ],
  },
  {
    id: 'pingpong_03',
    category: 'SPORTS_PES',
    furnitureTypes: ['PING_PONG_TABLE'],
    turns: [
      { speakerSlot: 0, text: 'Giao bóng chuội mép bàn siêu độc!', accentColor: '#38bdf8' },
      { speakerSlot: 1, text: 'Chơi mép bàn thế ai đỡ nổi chứ!', accentColor: '#ef4444' },
    ],
  },
  {
    id: 'pingpong_04',
    category: 'SPORTS_PES',
    furnitureTypes: ['PING_PONG_TABLE'],
    turns: [
      { speakerSlot: 0, text: 'Phản xạ tôi ngang vận động viên!', accentColor: '#38bdf8' },
      { speakerSlot: 1, text: 'Bóng chạm lưới rơi sang bên kìa!', accentColor: '#ef4444' },
      { speakerSlot: 2, text: 'Thần rùa lại nhập vào vợt đỏ rồi!', accentColor: '#f59e0b' },
    ],
  },
  {
    id: 'foosball_01',
    category: 'SPORTS_PES',
    furnitureTypes: ['FOOSBALL_TABLE'],
    turns: [
      { speakerSlot: 0, text: 'Xoay tít mù kiểu gì chả vào lưới!', accentColor: '#ef4444' },
      { speakerSlot: 1, text: 'Cấm quay 360 độ ăn gian nhé bạn!', accentColor: '#38bdf8' },
      { speakerSlot: 2, text: 'Cánh tay vô địch bi lắc công ty!', accentColor: '#f59e0b' },
    ],
  },
  {
    id: 'foosball_02',
    category: 'SPORTS_PES',
    furnitureTypes: ['FOOSBALL_TABLE'],
    turns: [
      { speakerSlot: 0, text: 'Khe thủ môn hở toang hoác kìa!', accentColor: '#ef4444' },
      { speakerSlot: 1, text: 'Đập bóng bay cả ra ngoài sân luôn!', accentColor: '#38bdf8' },
    ],
  },
  {
    id: 'arcade_01',
    category: 'SPORTS_PES',
    furnitureTypes: ['ARCADE_CABINET', 'PINBALL_MACHINE'],
    turns: [
      { speakerSlot: 0, text: 'High Score của tôi đố ai phá được!', accentColor: '#a855f7' },
      { speakerSlot: 1, text: 'Tránh ra cho cao thủ Street Fighter!', accentColor: '#f43f5e' },
      { speakerSlot: 2, text: 'Bấm nát nút máy rồi mấy ông ơi!', accentColor: '#facc15' },
    ],
  },
  {
    id: 'arcade_02',
    category: 'SPORTS_PES',
    furnitureTypes: ['ARCADE_CABINET', 'VR_SIMULATOR_POD', 'CLAW_MACHINE'],
    turns: [
      { speakerSlot: 0, text: 'Gắp con gấu bông này tặng crush!', accentColor: '#ec4899' },
      { speakerSlot: 1, text: 'Kẹp lỏng le thế kia lại tuột thôi!', accentColor: '#f59e0b' },
      { speakerSlot: 2, text: 'Tốn 10 xèng vẫn về tay trắng hahaha!', accentColor: '#38bdf8' },
    ],
  },
  {
    id: 'dart_01',
    category: 'SPORTS_PES',
    furnitureTypes: ['DARTBOARD_CABINET'],
    turns: [
      { speakerSlot: 0, text: 'Nhìn kỹ đây: hồng tâm 100 điểm!', accentColor: '#ef4444' },
      { speakerSlot: 1, text: 'Phi trúng tường xốp bên cạnh kìa!!', accentColor: '#38bdf8' },
      { speakerSlot: 2, text: 'Né xa không ăn phi tiêu oan uổng!', accentColor: '#f59e0b' },
    ],
  },
  {
    id: 'chess_01',
    category: 'SPORTS_PES',
    furnitureTypes: ['CHESS_TABLE'],
    turns: [
      { speakerSlot: 0, text: 'Nước cờ này tính trước 10 bước rồi!', accentColor: '#cbd5e1' },
      { speakerSlot: 1, text: 'Chiếu bí! Mời bạn nhận thua nhanh!', accentColor: '#22c55e' },
      { speakerSlot: 0, text: 'Khoan đã... vừa lơ đãng xíu thôi!', accentColor: '#f59e0b' },
    ],
  },
  {
    id: 'karaoke_01',
    category: 'SPORTS_PES',
    furnitureTypes: ['KARAOKE_BOOTH', 'ARCADE_JUKEBOX'],
    turns: [
      { speakerSlot: 0, text: 'Độ mix giọng 100 điểm phòng thu!', hobbyIcon: 'music_sing', accentColor: '#ec4899' },
      { speakerSlot: 1, text: 'Lên nốt cao cẩn thận vỡ kính tầng 2!', hobbyIcon: 'music_sing', accentColor: '#a855f7' },
      { speakerSlot: 2, text: 'Song ca bản hit bất hủ nào anh em!', hobbyIcon: 'music_sing', accentColor: '#38bdf8' },
    ],
  },
  {
    id: 'karaoke_02',
    category: 'SPORTS_PES',
    furnitureTypes: ['KARAOKE_BOOTH'],
    turns: [
      { speakerSlot: 0, text: 'Giọng ca vàng trong làng... vỡ nhịp!', hobbyIcon: 'music_sing', accentColor: '#ec4899' },
      { speakerSlot: 1, text: 'Nhạc đi đằng nhạc, lời đi đằng lời!', hobbyIcon: 'music_sing', accentColor: '#f59e0b' },
    ],
  },
  {
    id: 'pes_13',
    category: 'SPORTS_PES',
    furnitureTypes: ['PS5_PES_STATION'],
    turns: [
      { speakerSlot: 0, text: 'Nạp thẻ đi rồi nói chuyện tiếp nhé!', hobbyIcon: 'ps5_pes', accentColor: '#22c55e' },
      { speakerSlot: 1, text: 'Đội cùi vẫn vả đội xịn không trượt!', hobbyIcon: 'ps5_pes', accentColor: '#ef4444' },
      { speakerSlot: 2, text: 'Hai ông gáy điếc hết cả tai rồi!', hobbyIcon: 'ps5_pes', accentColor: '#f59e0b' },
    ],
  },
];

// --- CATEGORY B: PHONG CẢNH & SINH THÁI ("ĐẠO LÝ") - 25 SCENARIOS ---
export const NATURE_PHILOSOPHY_SCRIPTS: BanterScript[] = [
  {
    id: 'eco_01',
    category: 'NATURE_PHILOSOPHY',
    furnitureTypes: ['ECO_BIOME_DOME', 'BOTANICAL_GREENHOUSE'],
    turns: [
      { speakerSlot: 0, text: 'Cây muốn vững thì rễ phải sâu bạn ạ', accentColor: '#22c55e' },
      { speakerSlot: 1, text: 'Code cũng vậy, kiến trúc phải sạch!', accentColor: '#38bdf8' },
      { speakerSlot: 2, text: 'Chí lý! Nghe xong thông suốt luôn!', accentColor: '#a855f7' },
    ],
  },
  {
    id: 'eco_02',
    category: 'NATURE_PHILOSOPHY',
    furnitureTypes: ['KOI_POND', 'AQUARIUM'],
    turns: [
      { speakerSlot: 0, text: 'Cá Koi bơi chậm mà chẳng bao giờ rối', accentColor: '#06b6d4' },
      { speakerSlot: 1, text: 'Giống developer giữ bình tĩnh lúc bug', accentColor: '#22c55e' },
      { speakerSlot: 2, text: 'Tâm bất biến giữa dòng deadline vạn biến', accentColor: '#f59e0b' },
    ],
  },
  {
    id: 'eco_03',
    category: 'NATURE_PHILOSOPHY',
    furnitureTypes: ['ZEN_ROCK_GARDEN'],
    turns: [
      { speakerSlot: 0, text: 'Đá vô tri nhưng xếp lại thành thiền', accentColor: '#94a3b8' },
      { speakerSlot: 1, text: 'Dữ liệu thô ghép đúng cũng ra vàng!', accentColor: '#facc15' },
      { speakerSlot: 2, text: 'Đỉnh cao triết lý IT văn phòng đây rồi', accentColor: '#38bdf8' },
    ],
  },
  {
    id: 'eco_04',
    category: 'NATURE_PHILOSOPHY',
    furnitureTypes: ['CHERRY_BLOSSOM_TREE'],
    turns: [
      { speakerSlot: 0, text: 'Hoa anh đào nở rộ rồi lại tàn nhanh', accentColor: '#f472b6' },
      { speakerSlot: 1, text: 'Như thưởng Tết vậy, đến nhanh đi nhanh', accentColor: '#f59e0b' },
      { speakerSlot: 2, text: 'Đang chill mà nói câu đau lòng quá!!', accentColor: '#ef4444' },
    ],
  },
  {
    id: 'eco_05',
    category: 'NATURE_PHILOSOPHY',
    furnitureTypes: ['INDOOR_FOUNTAIN'],
    turns: [
      { speakerSlot: 0, text: 'Nước chảy đá mòn, kiên trì là thắng', accentColor: '#38bdf8' },
      { speakerSlot: 1, text: 'Hoặc dùng búa tạ cho lẹ đỡ tốn nước!', accentColor: '#f59e0b' },
      { speakerSlot: 2, text: 'Ông làm hỏng hết không khí thiền rồi!', accentColor: '#ef4444' },
    ],
  },
  {
    id: 'eco_06',
    category: 'NATURE_PHILOSOPHY',
    furnitureTypes: ['ECO_BIOME_DOME', 'PLANT'],
    turns: [
      { speakerSlot: 0, text: 'Thở sâu một hơi, buông bỏ lo âu...', accentColor: '#22c55e' },
      { speakerSlot: 1, text: 'Muốn buông lắm mà Jira vẫn 12 ticket!', accentColor: '#ef4444' },
      { speakerSlot: 2, text: 'Hít oxy cây xanh rồi chiến tiếp thôi!', accentColor: '#38bdf8' },
    ],
  },
  {
    id: 'eco_07',
    category: 'NATURE_PHILOSOPHY',
    furnitureTypes: ['KOI_POND'],
    turns: [
      { speakerSlot: 0, text: 'Cá nhỏ bơi theo đàn mới an toàn', accentColor: '#06b6d4' },
      { speakerSlot: 1, text: 'Agent phối hợp Crew mới mạnh được!', accentColor: '#22c55e' },
    ],
  },
  {
    id: 'eco_08',
    category: 'NATURE_PHILOSOPHY',
    furnitureTypes: ['ZEN_ROCK_GARDEN'],
    turns: [
      { speakerSlot: 0, text: 'Biết đủ thì ít khi nào khổ bạn ơi', accentColor: '#94a3b8' },
      { speakerSlot: 1, text: 'Chốt câu hay quá, tối làm đĩa đồ nướng!', accentColor: '#f59e0b' },
      { speakerSlot: 2, text: 'Ủa liên quan ghê luôn á trời!', accentColor: '#38bdf8' },
    ],
  },
  {
    id: 'eco_09',
    category: 'NATURE_PHILOSOPHY',
    furnitureTypes: ['ECO_BIOME_DOME', 'BOTANICAL_GREENHOUSE'],
    turns: [
      { speakerSlot: 0, text: 'Cây xanh cần ánh sáng, ta cần nghỉ ngơi', accentColor: '#22c55e' },
      { speakerSlot: 1, text: 'Đừng đốt cháy mình vì mấy bug cỏn con', accentColor: '#a855f7' },
      { speakerSlot: 2, text: 'Sức khỏe là vốn quý nhất của coder!', accentColor: '#38bdf8' },
    ],
  },
  {
    id: 'eco_10',
    category: 'NATURE_PHILOSOPHY',
    furnitureTypes: ['INDOOR_FOUNTAIN'],
    turns: [
      { speakerSlot: 0, text: 'Tĩnh lặng giúp tâm trí sáng suốt hơn', accentColor: '#38bdf8' },
      { speakerSlot: 1, text: 'Ngồi đây 5 phút tự dưng nghĩ ra thuật toán!', accentColor: '#22c55e' },
    ],
  },
  {
    id: 'eco_11',
    category: 'NATURE_PHILOSOPHY',
    furnitureTypes: ['CHERRY_BLOSSOM_TREE'],
    turns: [
      { speakerSlot: 0, text: 'Mùa xuân đến mang theo vạn khởi đầu mới', accentColor: '#f472b6' },
      { speakerSlot: 1, text: 'Hy vọng dự án mới không bị đổi spec!', accentColor: '#f59e0b' },
      { speakerSlot: 2, text: 'Cầu nguyện dưới cây anh đào cực linh!', accentColor: '#a855f7' },
    ],
  },
  {
    id: 'eco_12',
    category: 'NATURE_PHILOSOPHY',
    furnitureTypes: ['PLANT', 'WATERFALL_ROCK_WALL'],
    turns: [
      { speakerSlot: 0, text: 'Bonsai đẹp nhờ những vết uốn gập ghềnh', accentColor: '#22c55e' },
      { speakerSlot: 1, text: 'Trưởng thành từ những lần fix bug xuyên đêm!', accentColor: '#38bdf8' },
    ],
  },
  {
    id: 'eco_13',
    category: 'NATURE_PHILOSOPHY',
    furnitureTypes: ['AQUARIUM', 'KOI_POND'],
    turns: [
      { speakerSlot: 0, text: 'Nhìn cá bơi mà quên hết mệt mỏi', accentColor: '#06b6d4' },
      { speakerSlot: 1, text: 'Ước kiếp sau làm cá Koi công ty nuôi!', accentColor: '#f59e0b' },
      { speakerSlot: 2, text: 'Chỉ ăn với bơi sướng hơn ngồi gõ phím!', accentColor: '#22c55e' },
    ],
  },
  {
    id: 'eco_14',
    category: 'NATURE_PHILOSOPHY',
    furnitureTypes: ['BOTANICAL_GREENHOUSE', 'ECO_BIOME_DOME'],
    turns: [
      { speakerSlot: 0, text: 'Một hệ sinh thái nhỏ phản chiếu vũ trụ', accentColor: '#22c55e' },
      { speakerSlot: 1, text: 'Văn phòng ta cũng là hệ sinh thái AI xịn!', accentColor: '#a855f7' },
    ],
  },
  {
    id: 'eco_15',
    category: 'NATURE_PHILOSOPHY',
    furnitureTypes: ['ZEN_ROCK_GARDEN', 'INDOOR_FOUNTAIN'],
    turns: [
      { speakerSlot: 0, text: 'Vội vàng chỉ tạo thêm lỗi vặt thôi', accentColor: '#94a3b8' },
      { speakerSlot: 1, text: 'Chậm mà chắc còn hơn deploy lỗi rồi rollback!', accentColor: '#38bdf8' },
      { speakerSlot: 2, text: 'Triết gia văn phòng hôm nay phát biểu chuẩn!', accentColor: '#22c55e' },
    ],
  },
  {
    id: 'eco_16',
    category: 'NATURE_PHILOSOPHY',
    furnitureTypes: ['WATERFALL_ROCK_WALL', 'PLANT'],
    turns: [
      { speakerSlot: 0, text: 'Cây tre đốt nào cũng rỗng nhưng cực dẻo', accentColor: '#22c55e' },
      { speakerSlot: 1, text: 'Học tinh thần tre: gặp gió bão không gãy!', accentColor: '#38bdf8' },
    ],
  },
  {
    id: 'eco_17',
    category: 'NATURE_PHILOSOPHY',
    furnitureTypes: ['KOI_POND'],
    turns: [
      { speakerSlot: 0, text: 'Cho cá ăn đừng ném quá tay kẻo no quá', accentColor: '#06b6d4' },
      { speakerSlot: 1, text: 'Giống nhồi quá nhiều prompt vào model vậy!', accentColor: '#a855f7' },
      { speakerSlot: 2, text: 'Quá tải context là cá cũng bơi ngửa á!', accentColor: '#f59e0b' },
    ],
  },
  {
    id: 'eco_18',
    category: 'NATURE_PHILOSOPHY',
    furnitureTypes: ['CHERRY_BLOSSOM_TREE', 'BOTANICAL_GREENHOUSE'],
    turns: [
      { speakerSlot: 0, text: 'Dưới tán cây này nắng gió đều dịu dàng', accentColor: '#f472b6' },
      { speakerSlot: 1, text: 'Khi tâm an thì chỗ nào cũng là chốn bình yên', accentColor: '#22c55e' },
    ],
  },
  {
    id: 'eco_19',
    category: 'NATURE_PHILOSOPHY',
    furnitureTypes: ['ECO_BIOME_DOME'],
    turns: [
      { speakerSlot: 0, text: 'Thiên nhiên chưa bao giờ vội mà vẫn xong', accentColor: '#22c55e' },
      { speakerSlot: 1, text: 'Nhưng khách hàng cần xong trước thứ sáu...', accentColor: '#ef4444' },
      { speakerSlot: 2, text: 'Thôi đứng dậy hít oxy rồi chạy tiếp!', accentColor: '#38bdf8' },
    ],
  },
  {
    id: 'eco_20',
    category: 'NATURE_PHILOSOPHY',
    furnitureTypes: ['ZEN_ROCK_GARDEN'],
    turns: [
      { speakerSlot: 0, text: 'Người thông minh lắng nghe trước khi nói', accentColor: '#94a3b8' },
      { speakerSlot: 1, text: 'Như model đọc kỹ prompt trước khi trả lời!', accentColor: '#22c55e' },
    ],
  },
  {
    id: 'eco_21',
    category: 'NATURE_PHILOSOPHY',
    furnitureTypes: ['AQUARIUM'],
    turns: [
      { speakerSlot: 0, text: 'Bọt khí bay lên trông êm ái ghê', accentColor: '#06b6d4' },
      { speakerSlot: 1, text: 'Mọi muộn phiền theo bọt khí tan biến hết~', accentColor: '#38bdf8' },
    ],
  },
  {
    id: 'eco_22',
    category: 'NATURE_PHILOSOPHY',
    furnitureTypes: ['BOTANICAL_GREENHOUSE'],
    turns: [
      { speakerSlot: 0, text: 'Ươm mầm ý tưởng cần kiên nhẫn mỗi ngày', accentColor: '#22c55e' },
      { speakerSlot: 1, text: 'Không cây nào mới trồng hôm nay mai có quả', accentColor: '#f59e0b' },
      { speakerSlot: 2, text: 'Chăm chỉ tích lũy, thành công sẽ tự nở hoa!', accentColor: '#a855f7' },
    ],
  },
  {
    id: 'eco_23',
    category: 'NATURE_PHILOSOPHY',
    furnitureTypes: ['INDOOR_FOUNTAIN'],
    turns: [
      { speakerSlot: 0, text: 'Tiếng nước róc rách xóa tan tiếng quạt PC', accentColor: '#38bdf8' },
      { speakerSlot: 1, text: 'Đây là thứ chữa lành nhất văn phòng rồi!', accentColor: '#22c55e' },
    ],
  },
  {
    id: 'eco_24',
    category: 'NATURE_PHILOSOPHY',
    furnitureTypes: ['ECO_BIOME_DOME', 'CHERRY_BLOSSOM_TREE'],
    turns: [
      { speakerSlot: 0, text: 'Sống xanh, nghĩ thoáng, làm việc sáng tạo', accentColor: '#22c55e' },
      { speakerSlot: 1, text: 'Slogan văn phòng năm nay chất lượng quá!', accentColor: '#f472b6' },
    ],
  },
  {
    id: 'eco_25',
    category: 'NATURE_PHILOSOPHY',
    furnitureTypes: ['KOI_POND', 'ZEN_ROCK_GARDEN'],
    turns: [
      { speakerSlot: 0, text: 'Quá khứ qua rồi, tương lai chưa tới', accentColor: '#94a3b8' },
      { speakerSlot: 1, text: 'Chỉ có giây phút nghỉ ngơi này là thật!', accentColor: '#06b6d4' },
      { speakerSlot: 2, text: 'Nhưng hết giờ giải lao vẫn phải về bàn đấy!', accentColor: '#f59e0b' },
    ],
  },
];

// --- CATEGORY C: ĐỒ ĂN & PANTRY ("KHEN CHÊ ĐỒ ĂN") - 25 SCENARIOS ---
export const FOOD_PANTRY_SCRIPTS: BanterScript[] = [
  {
    id: 'food_01',
    category: 'FOOD_PANTRY',
    furnitureTypes: ['RAMEN_NOODLE_BAR'],
    turns: [
      { speakerSlot: 0, text: 'Nước dùng Ramen hầm xương béo ngậy ghê!', accentColor: '#f59e0b' },
      { speakerSlot: 1, text: 'Nhưng sợi mì hôm nay hơi mềm chút xíu', accentColor: '#ef4444' },
      { speakerSlot: 2, text: 'Cho thêm trứng lòng đào là 10/10 luôn!', accentColor: '#22c55e' },
    ],
  },
  {
    id: 'food_02',
    category: 'FOOD_PANTRY',
    furnitureTypes: ['PIZZA_OVEN_COUNTER'],
    turns: [
      { speakerSlot: 0, text: 'Pizza phô mai kéo sợi thơm nức mũi!', accentColor: '#f59e0b' },
      { speakerSlot: 1, text: 'Khoan... ai gọi Pizza dứa thế này?!', accentColor: '#ef4444' },
      { speakerSlot: 2, text: 'Đừng khai chiến vụ dứa ở pantry nữa!', accentColor: '#38bdf8' },
    ],
  },
  {
    id: 'food_03',
    category: 'FOOD_PANTRY',
    furnitureTypes: ['COFFEE_MACHINE'],
    turns: [
      { speakerSlot: 0, text: 'Espresso nay đậm đặc tỉnh cả người!', accentColor: '#d97706' },
      { speakerSlot: 1, text: 'Đắng quá, chắc quên cho đường rồi!', accentColor: '#ef4444' },
      { speakerSlot: 2, text: 'Uống nguyên chất mới chuẩn gu dev!', accentColor: '#22c55e' },
    ],
  },
  {
    id: 'food_04',
    category: 'FOOD_PANTRY',
    furnitureTypes: ['MINI_BAR_COUNTER'],
    turns: [
      { speakerSlot: 0, text: 'Ly mocktail chanh sả này chua dịu đã thật!', accentColor: '#06b6d4' },
      { speakerSlot: 1, text: 'Bartender hôm nay hơi thiếu đá nhỉ?', accentColor: '#f59e0b' },
      { speakerSlot: 2, text: 'Trang trí lát chanh nhìn sang xịn mịn!', accentColor: '#22c55e' },
    ],
  },
  {
    id: 'food_05',
    category: 'FOOD_PANTRY',
    furnitureTypes: ['MICROWAVE_STAND'],
    turns: [
      { speakerSlot: 0, text: 'Hâm hộp cơm mà mùi thơm bay khắp phòng!', accentColor: '#f59e0b' },
      { speakerSlot: 1, text: 'Xin đừng quay cá kho bằng lò vi sóng!!', accentColor: '#ef4444' },
      { speakerSlot: 2, text: 'Thịt kho trứng chứ cá đâu mà sợ hả ông!', accentColor: '#22c55e' },
    ],
  },
  {
    id: 'food_06',
    category: 'FOOD_PANTRY',
    furnitureTypes: ['POPCORN_CART'],
    turns: [
      { speakerSlot: 0, text: 'Bỏng ngô vị caramel giòn rụm mê ly!', accentColor: '#facc15' },
      { speakerSlot: 1, text: 'Hơi ngọt quá, ăn 3 miếng khát nước luôn', accentColor: '#f59e0b' },
      { speakerSlot: 2, text: 'Ăn bắp vừa hóng drama công ty là chuẩn bài!', accentColor: '#ec4899' },
    ],
  },
  {
    id: 'food_07',
    category: 'FOOD_PANTRY',
    furnitureTypes: ['ICE_CREAM_FREEZER'],
    turns: [
      { speakerSlot: 0, text: 'Kem matcha mát lạnh tan ngay đầu lưỡi!', accentColor: '#22c55e' },
      { speakerSlot: 1, text: 'Ai ăn hết hộp socola của tôi rồi?!', accentColor: '#ef4444' },
      { speakerSlot: 2, text: 'Chắc con mèo hoặc Corgi lấy ăn chứ gì!', accentColor: '#38bdf8' },
    ],
  },
  {
    id: 'food_08',
    category: 'FOOD_PANTRY',
    furnitureTypes: ['VENDING_MACHINE'],
    turns: [
      { speakerSlot: 0, text: 'Lon soda lạnh buốt tay sảng khoái quá!', accentColor: '#38bdf8' },
      { speakerSlot: 1, text: 'Trà đào hết hàng rồi huhu chán ghê!', accentColor: '#ef4444' },
    ],
  },
  {
    id: 'food_09',
    category: 'FOOD_PANTRY',
    furnitureTypes: ['DOUBLE_FRIDGE'],
    turns: [
      { speakerSlot: 0, text: 'Tủ lạnh công ty nay đầy ắp trái cây tươi!', accentColor: '#22c55e' },
      { speakerSlot: 1, text: 'Ai cất hộp sữa chua hết hạn từ tuần trước?', accentColor: '#ef4444' },
      { speakerSlot: 2, text: 'Ghi tên lên hộp không lại nhầm giờ!', accentColor: '#f59e0b' },
    ],
  },
  {
    id: 'food_10',
    category: 'FOOD_PANTRY',
    furnitureTypes: ['WATER_COOLER'],
    turns: [
      { speakerSlot: 0, text: 'Nhớ uống đủ 2 lít nước mỗi ngày nhé!', accentColor: '#38bdf8' },
      { speakerSlot: 1, text: 'Nước lọc thôi mà đứng cạnh bạn thấy ngon!', accentColor: '#ec4899' },
      { speakerSlot: 2, text: 'Thôi bớt thả thính đi hai bố trẻ!', accentColor: '#f59e0b' },
    ],
  },
  {
    id: 'food_11',
    category: 'FOOD_PANTRY',
    furnitureTypes: ['RAMEN_NOODLE_BAR'],
    turns: [
      { speakerSlot: 0, text: 'Thịt xá xíu mềm tan, đúng chuẩn Nhật!', accentColor: '#f59e0b' },
      { speakerSlot: 1, text: 'Hơi mặn xíu, xin thêm chén nước dùng loãng!', accentColor: '#ef4444' },
    ],
  },
  {
    id: 'food_12',
    category: 'FOOD_PANTRY',
    furnitureTypes: ['PIZZA_OVEN_COUNTER'],
    turns: [
      { speakerSlot: 0, text: 'Đế bánh giòn tan vừa mới ra lò luôn!', accentColor: '#f59e0b' },
      { speakerSlot: 1, text: 'Viền bánh hơi cháy xém chút cho thơm!', accentColor: '#22c55e' },
      { speakerSlot: 2, text: 'Quá ngon, chấm tương ớt nữa hết sẩy!', accentColor: '#ef4444' },
    ],
  },
  {
    id: 'food_13',
    category: 'FOOD_PANTRY',
    furnitureTypes: ['COFFEE_MACHINE'],
    turns: [
      { speakerSlot: 0, text: 'Hạt rang mộc hôm nay thơm phức cả góc!', accentColor: '#d97706' },
      { speakerSlot: 1, text: 'Cho xin ly bạc xỉu nhiều sữa nha!', accentColor: '#38bdf8' },
    ],
  },
  {
    id: 'food_14',
    category: 'FOOD_PANTRY',
    furnitureTypes: ['MINI_BAR_COUNTER'],
    turns: [
      { speakerSlot: 0, text: 'Sinh tố bơ sánh mịn béo ngậy quá đã!', accentColor: '#22c55e' },
      { speakerSlot: 1, text: 'Uống xong lại tăng cân mất thôi trời ơi!', accentColor: '#f59e0b' },
      { speakerSlot: 2, text: 'Năng lượng dồi dào mới gánh nổi Crew AI!', accentColor: '#38bdf8' },
    ],
  },
  {
    id: 'food_15',
    category: 'FOOD_PANTRY',
    furnitureTypes: ['ICE_CREAM_FREEZER'],
    turns: [
      { speakerSlot: 0, text: 'Vị vani hơi ngọt nhưng ăn với bánh quế ngon!', accentColor: '#facc15' },
      { speakerSlot: 1, text: 'Sếp tâm lý ghê, nạp đầy tủ kem luôn!', accentColor: '#22c55e' },
    ],
  },
  {
    id: 'food_16',
    category: 'FOOD_PANTRY',
    furnitureTypes: ['RAMEN_NOODLE_BAR', 'PIZZA_OVEN_COUNTER'],
    turns: [
      { speakerSlot: 0, text: 'Húp xì xụp tô mì nóng ấm cả bụng!', accentColor: '#f59e0b' },
      { speakerSlot: 1, text: 'Cẩn thận ớt siêu cay đó bạn ơi!!', accentColor: '#ef4444' },
      { speakerSlot: 0, text: 'Cay chảy nước mắt mà vẫn ngon quá!', accentColor: '#f59e0b' },
    ],
  },
  {
    id: 'food_17',
    category: 'FOOD_PANTRY',
    furnitureTypes: ['VENDING_MACHINE', 'COFFEE_MACHINE'],
    turns: [
      { speakerSlot: 0, text: 'Nước tăng lực hay cà phê chiều nay đây?', accentColor: '#38bdf8' },
      { speakerSlot: 1, text: 'Cà phê đi, nước ngọt uống hoài không tốt', accentColor: '#22c55e' },
    ],
  },
  {
    id: 'food_18',
    category: 'FOOD_PANTRY',
    furnitureTypes: ['MICROWAVE_STAND'],
    turns: [
      { speakerSlot: 0, text: 'Bánh bao xá xíu quay 40 giây mềm xốp ghê!', accentColor: '#f59e0b' },
      { speakerSlot: 1, text: 'Nhân hơi ít thịt tí nhưng vỏ thơm bơ!', accentColor: '#d97706' },
    ],
  },
  {
    id: 'food_19',
    category: 'FOOD_PANTRY',
    furnitureTypes: ['DOUBLE_FRIDGE'],
    turns: [
      { speakerSlot: 0, text: 'Có trà sữa ô long trong ngăn mát kìa!', accentColor: '#22c55e' },
      { speakerSlot: 1, text: 'Ít đường hay 100% đường thế bạn?', accentColor: '#f59e0b' },
      { speakerSlot: 2, text: '50% đường, trân châu trắng nhai giòn sần sật!', accentColor: '#38bdf8' },
    ],
  },
  {
    id: 'food_20',
    category: 'FOOD_PANTRY',
    furnitureTypes: ['POPCORN_CART'],
    turns: [
      { speakerSlot: 0, text: 'Mẻ bỏng phô mai này mặn ngọt vừa miệng ghê!', accentColor: '#facc15' },
      { speakerSlot: 1, text: 'Hơi nhiều hạt lép ở đáy cốc một chút...', accentColor: '#ef4444' },
    ],
  },
  {
    id: 'food_21',
    category: 'FOOD_PANTRY',
    furnitureTypes: ['MINI_BAR_COUNTER'],
    turns: [
      { speakerSlot: 0, text: 'Trà hoa quả nhiệt đới uống mát rượi!', accentColor: '#22c55e' },
      { speakerSlot: 1, text: 'Nhiều topping táo lê quá ăn no luôn!', accentColor: '#f59e0b' },
    ],
  },
  {
    id: 'food_22',
    category: 'FOOD_PANTRY',
    furnitureTypes: ['COFFEE_MACHINE'],
    turns: [
      { speakerSlot: 0, text: 'Cappuccino lớp bọt sữa dày mịn như mây!', accentColor: '#d97706' },
      { speakerSlot: 1, text: 'Vẽ hình trái tim đẹp quá trời luôn!', accentColor: '#ec4899' },
    ],
  },
  {
    id: 'food_23',
    category: 'FOOD_PANTRY',
    furnitureTypes: ['PIZZA_OVEN_COUNTER'],
    turns: [
      { speakerSlot: 0, text: 'Xúc xích Pepperoni cay nhẹ cực bắt vị!', accentColor: '#ef4444' },
      { speakerSlot: 1, text: 'Ăn liền 2 miếng, tối nay chạy bộ bù sau!', accentColor: '#f59e0b' },
    ],
  },
  {
    id: 'food_24',
    category: 'FOOD_PANTRY',
    furnitureTypes: ['RAMEN_NOODLE_BAR'],
    turns: [
      { speakerSlot: 0, text: 'Tương miso hơi đậm nhưng thơm mùi mè rang!', accentColor: '#d97706' },
      { speakerSlot: 1, text: 'Thêm rong biển giòn là chuẩn quán 5 sao!', accentColor: '#22c55e' },
    ],
  },
  {
    id: 'food_25',
    category: 'FOOD_PANTRY',
    furnitureTypes: ['WATER_COOLER', 'DOUBLE_FRIDGE'],
    turns: [
      { speakerSlot: 0, text: 'Ăn uống nạp năng lượng thế là đủ rồi!', accentColor: '#22c55e' },
      { speakerSlot: 1, text: 'Chuẩn bị quay lại bàn làm việc thôi nào!', accentColor: '#38bdf8' },
    ],
  },
];

// --- CATEGORY D: CHÉM GIÓ CÔNG SỞ, THÚ CƯNG & RỦ CHƠI LOL - 25 SCENARIOS ---
export const OFFICE_SOCIAL_LOL_SCRIPTS: BanterScript[] = [
  {
    id: 'chat_01',
    category: 'CHITCHAT_LOL',
    furnitureTypes: ['SOFA', 'HAMMOCK_STAND', 'SLEEPING_POD'],
    turns: [
      { speakerSlot: 0, text: 'Tối nay làm 5-stack LoL gank nát map ko?', hobbyIcon: 'lol_game', accentColor: '#38bdf8' },
      { speakerSlot: 1, text: 'Chốt kèo! Tôi cầm rừng gank cháy máy!', hobbyIcon: 'lol_game', accentColor: '#22c55e' },
      { speakerSlot: 2, text: 'Đừng feed mạng đầu sớm là may rồi ông!', hobbyIcon: 'lol_game', accentColor: '#f59e0b' },
    ],
  },
  {
    id: 'chat_02',
    category: 'CHITCHAT_LOL',
    furnitureTypes: ['OFFICE_CAT', 'CORGI_DOG'],
    turns: [
      { speakerSlot: 0, text: 'Con boss này mũm mĩm cưng xỉu luôn á!', accentColor: '#f472b6' },
      { speakerSlot: 1, text: 'Sờ bụng nó xíu mà hết sạch stress!', accentColor: '#22c55e' },
      { speakerSlot: 2, text: 'Đút cho nó miếng pate kẻo nó dỗi!', accentColor: '#f59e0b' },
    ],
  },
  {
    id: 'chat_03',
    category: 'CHITCHAT_LOL',
    furnitureTypes: ['ROBOT_VACUUM', 'SNACK_DELIVERY_BOT', 'ROBO_DOG'],
    turns: [
      { speakerSlot: 0, text: 'Con robot này chạy chăm chỉ hơn cả mình!', accentColor: '#38bdf8' },
      { speakerSlot: 1, text: 'Coi chừng nó húc vào chân kìa hahaha!', accentColor: '#f59e0b' },
    ],
  },
  {
    id: 'chat_04',
    category: 'CHITCHAT_LOL',
    turns: [
      { speakerSlot: 0, text: 'Nghe đồn sếp sắp thưởng nóng quý này?!', accentColor: '#facc15' },
      { speakerSlot: 1, text: 'Thật không? Đừng làm tim tôi rung rinh!', accentColor: '#ec4899' },
      { speakerSlot: 2, text: 'Lo chạy Crew xong việc là có thưởng ngay!', accentColor: '#22c55e' },
    ],
  },
  {
    id: 'chat_05',
    category: 'CHITCHAT_LOL',
    turns: [
      { speakerSlot: 0, text: 'Cuối tuần anh em đi camping không?', accentColor: '#22c55e' },
      { speakerSlot: 1, text: 'Chỉ cần có đồ nướng là đi tuốt!', accentColor: '#f59e0b' },
      { speakerSlot: 2, text: 'Nhớ mang theo bộ bài Uno sát phạt nhé!', accentColor: '#a855f7' },
    ],
  },
  {
    id: 'chat_06',
    category: 'CHITCHAT_LOL',
    turns: [
      { speakerSlot: 0, text: 'Ai mở bản nhạc chill vừa nãy hay thế?', hobbyIcon: 'music_sing', accentColor: '#ec4899' },
      { speakerSlot: 1, text: 'Playlist bí mật chuyên để fix bug đó!', hobbyIcon: 'music_sing', accentColor: '#38bdf8' },
    ],
  },
  {
    id: 'chat_07',
    category: 'CHITCHAT_LOL',
    turns: [
      { speakerSlot: 0, text: 'Tối qua thức khuya leo rank giờ ngáp dài', hobbyIcon: 'sleepy_yawn', accentColor: '#a78bfa' },
      { speakerSlot: 1, text: 'Lên được Bạch Kim chưa hay tụt rank rồi?', hobbyIcon: 'lol_game', accentColor: '#38bdf8' },
      { speakerSlot: 0, text: 'Đừng nhắc nữa... chuỗi thua 4 trận liền!', hobbyIcon: 'sleepy_yawn', accentColor: '#ef4444' },
    ],
  },
  {
    id: 'chat_08',
    category: 'CHITCHAT_LOL',
    turns: [
      { speakerSlot: 0, text: 'Con vịt cao su kia nhìn ngớ ngẩn vãi!', accentColor: '#facc15' },
      { speakerSlot: 1, text: 'Nhưng mỗi lần nhìn thấy lại buồn cười!', accentColor: '#22c55e' },
    ],
  },
  {
    id: 'chat_09',
    category: 'CHITCHAT_LOL',
    turns: [
      { speakerSlot: 0, text: 'Chiều nay có ai đặt trà sữa chung đơn ko?', accentColor: '#ec4899' },
      { speakerSlot: 1, text: 'Tôi 1 hồng trà kem cheese ít đá nhé!', accentColor: '#f59e0b' },
      { speakerSlot: 2, text: 'Freeship luôn nha, chốt nhanh kẻo đóng!', accentColor: '#22c55e' },
    ],
  },
  {
    id: 'chat_10',
    category: 'CHITCHAT_LOL',
    turns: [
      { speakerSlot: 0, text: 'Bàn phím cơ mới gõ nghe đã tai cực!', accentColor: '#38bdf8' },
      { speakerSlot: 1, text: 'Ngồi gần nghe cạch cạch tưởng mưa rào!', accentColor: '#f59e0b' },
    ],
  },
  {
    id: 'chat_11',
    category: 'CHITCHAT_LOL',
    turns: [
      { speakerSlot: 0, text: 'Vừa nãy sếp đi dạo nhìn mình làm việc á!', accentColor: '#ef4444' },
      { speakerSlot: 1, text: 'May quá lúc đó tôi đang Alt+Tab kịp!', accentColor: '#22c55e' },
      { speakerSlot: 2, text: 'Các ông cứ đùa, làm hết việc sợ gì!', accentColor: '#38bdf8' },
    ],
  },
  {
    id: 'chat_12',
    category: 'CHITCHAT_LOL',
    turns: [
      { speakerSlot: 0, text: 'Trận LCK tối qua xem mãn nhãn thật sự!', hobbyIcon: 'lol_game', accentColor: '#38bdf8' },
      { speakerSlot: 1, text: 'Pha cướp Baron phút 35 đúng không tưởng!', hobbyIcon: 'lol_game', accentColor: '#f59e0b' },
    ],
  },
  {
    id: 'chat_13',
    category: 'CHITCHAT_LOL',
    turns: [
      { speakerSlot: 0, text: 'Mấy ông biết hát bài nào karaoke chất ko?', hobbyIcon: 'music_sing', accentColor: '#ec4899' },
      { speakerSlot: 1, text: 'Cứ nhạc Trịnh hoặc Sơn Tùng mà quất!', hobbyIcon: 'music_sing', accentColor: '#a855f7' },
    ],
  },
  {
    id: 'chat_14',
    category: 'CHITCHAT_LOL',
    turns: [
      { speakerSlot: 0, text: 'Ghế massage đấm lưng phê đến tận óc...', accentColor: '#22c55e' },
      { speakerSlot: 1, text: 'Nhường tôi ngồi ké 2 phút coi bạn ơi!', accentColor: '#38bdf8' },
    ],
  },
  {
    id: 'chat_15',
    category: 'CHITCHAT_LOL',
    turns: [
      { speakerSlot: 0, text: 'Tháng này chạy Crew AI mượt không vết xước!', accentColor: '#22c55e' },
      { speakerSlot: 1, text: 'Đội hình anh em ăn ý quá mà lị!', accentColor: '#38bdf8' },
      { speakerSlot: 2, text: 'Tự thưởng 10 phút xả hơi rồi làm tiếp!', accentColor: '#f59e0b' },
    ],
  },
  {
    id: 'chat_16',
    category: 'CHITCHAT_LOL',
    turns: [
      { speakerSlot: 0, text: 'Sắp hết giờ giải lao rồi về chỗ thôi!', accentColor: '#38bdf8' },
      { speakerSlot: 1, text: 'Ơ vừa đứng dậy đi được vài vòng mà!', accentColor: '#f59e0b' },
      { speakerSlot: 2, text: 'Về bàn ngồi kẻo sếp tưởng lười ở pantry!', accentColor: '#ef4444' },
    ],
  },
  {
    id: 'chat_17',
    category: 'CHITCHAT_LOL',
    turns: [
      { speakerSlot: 0, text: 'Ai đánh ĐTCL chung với tôi tối nay ko?', hobbyIcon: 'lol_game', accentColor: '#38bdf8' },
      { speakerSlot: 1, text: 'Vào! Nay tôi quyết tâm tranh top 1!', hobbyIcon: 'lol_game', accentColor: '#22c55e' },
    ],
  },
  {
    id: 'chat_18',
    category: 'CHITCHAT_LOL',
    turns: [
      { speakerSlot: 0, text: 'Hôm nay trời mát làm giấc trưa thì sướng~', hobbyIcon: 'sleepy_yawn', accentColor: '#a78bfa' },
      { speakerSlot: 1, text: 'Uống ngụm nước đá cho tỉnh táo đi bạn!', accentColor: '#38bdf8' },
    ],
  },
  {
    id: 'chat_19',
    category: 'CHITCHAT_LOL',
    turns: [
      { speakerSlot: 0, text: 'Văn phòng ta đồ chơi xịn hơn cả Google!', accentColor: '#22c55e' },
      { speakerSlot: 1, text: 'Thiếu mỗi phòng ngủ trưa có điều hòa thôi!', accentColor: '#a78bfa' },
    ],
  },
  {
    id: 'chat_20',
    category: 'CHITCHAT_LOL',
    turns: [
      { speakerSlot: 0, text: 'Đố mấy ông: con mèo thích nằm đâu nhất?', accentColor: '#f472b6' },
      { speakerSlot: 1, text: 'Chắc chắn nằm ngay trên bàn phím dev!!', accentColor: '#f59e0b' },
    ],
  },
  {
    id: 'chat_21',
    category: 'CHITCHAT_LOL',
    turns: [
      { speakerSlot: 0, text: 'Trưa nay ăn gì để không phải nghĩ đây?', accentColor: '#f59e0b' },
      { speakerSlot: 1, text: 'Bún chả đi, lâu rồi chưa ăn bún chả!', accentColor: '#22c55e' },
      { speakerSlot: 2, text: 'Duyệt luôn! 12 giờ tập trung ở sảnh nhé!', accentColor: '#38bdf8' },
    ],
  },
  {
    id: 'chat_22',
    category: 'CHITCHAT_LOL',
    turns: [
      { speakerSlot: 0, text: 'Lâu lâu đi dạo trò chuyện vui phết nhỉ!', accentColor: '#22c55e' },
      { speakerSlot: 1, text: 'Làm việc căng thẳng có bạn tâm sự thật quý!', accentColor: '#ec4899' },
    ],
  },
  {
    id: 'chat_23',
    category: 'CHITCHAT_LOL',
    turns: [
      { speakerSlot: 0, text: 'Có ai biết đánh đàn guitar không vậy?', hobbyIcon: 'music_sing', accentColor: '#ec4899' },
      { speakerSlot: 1, text: 'Tôi gảy được 3 hợp âm cơ bản thôi à!', hobbyIcon: 'music_sing', accentColor: '#38bdf8' },
    ],
  },
  {
    id: 'chat_24',
    category: 'CHITCHAT_LOL',
    turns: [
      { speakerSlot: 0, text: 'Chuẩn bị quay lại bàn gõ tiếp thôi nào!', accentColor: '#38bdf8' },
      { speakerSlot: 1, text: 'Lên dây cót tinh thần! Tối về quất LoL!', hobbyIcon: 'lol_game', accentColor: '#22c55e' },
    ],
  },
  {
    id: 'chat_25',
    category: 'CHITCHAT_LOL',
    turns: [
      { speakerSlot: 0, text: 'Nói chuyện nãy giờ cười đau cả bụng luôn!', accentColor: '#f59e0b' },
      { speakerSlot: 1, text: 'Thôi giải tán không sếp soi camera bây giờ!', accentColor: '#ef4444' },
    ],
  },
];

export const ALL_OFFICE_BANTER_SCRIPTS: BanterScript[] = [
  ...SPORTS_GAMING_SCRIPTS,
  ...NATURE_PHILOSOPHY_SCRIPTS,
  ...FOOD_PANTRY_SCRIPTS,
  ...OFFICE_SOCIAL_LOL_SCRIPTS,
];

const SPORTS_FURNITURE = new Set<FurnitureType>([
  'PS5_PES_STATION',
  'POOL_TABLE',
  'PING_PONG_TABLE',
  'FOOSBALL_TABLE',
  'ARCADE_CABINET',
  'PINBALL_MACHINE',
  'DARTBOARD_CABINET',
  'VR_SIMULATOR_POD',
  'CLAW_MACHINE',
  'CHESS_TABLE',
  'KARAOKE_BOOTH',
  'ARCADE_JUKEBOX',
]);

const NATURE_FURNITURE = new Set<FurnitureType>([
  'ECO_BIOME_DOME',
  'KOI_POND',
  'ZEN_ROCK_GARDEN',
  'CHERRY_BLOSSOM_TREE',
  'INDOOR_FOUNTAIN',
  'BOTANICAL_GREENHOUSE',
  'WATERFALL_ROCK_WALL',
  'AQUARIUM',
  'PLANT',
]);

const FOOD_FURNITURE = new Set<FurnitureType>([
  'RAMEN_NOODLE_BAR',
  'PIZZA_OVEN_COUNTER',
  'MINI_BAR_COUNTER',
  'COFFEE_MACHINE',
  'MICROWAVE_STAND',
  'VENDING_MACHINE',
  'WATER_COOLER',
  'DOUBLE_FRIDGE',
  'POPCORN_CART',
  'ICE_CREAM_FREEZER',
]);

/**
 * Picks a contextual multi-turn banter script suited for a given furniture item.
 */
export function pickGroupBanterScript(
  furnitureType?: FurnitureType | null,
  playerCount = 2,
): BanterScript {
  let pool: BanterScript[] = [];

  if (furnitureType) {
    // 1. Exact furniture-matched scripts first (75% chance when exact match exists)
    const exactMatches = ALL_OFFICE_BANTER_SCRIPTS.filter(
      (s) => s.furnitureTypes && s.furnitureTypes.includes(furnitureType),
    );
    if (exactMatches.length > 0 && Math.random() < 0.78) {
      pool = exactMatches;
    } else if (SPORTS_FURNITURE.has(furnitureType)) {
      pool = SPORTS_GAMING_SCRIPTS;
    } else if (NATURE_FURNITURE.has(furnitureType)) {
      pool = NATURE_PHILOSOPHY_SCRIPTS;
    } else if (FOOD_FURNITURE.has(furnitureType)) {
      pool = FOOD_PANTRY_SCRIPTS;
    } else {
      pool = OFFICE_SOCIAL_LOL_SCRIPTS;
    }
  } else {
    pool = OFFICE_SOCIAL_LOL_SCRIPTS;
  }

  // Prefer 3-turn scripts when 3 players are present
  if (playerCount >= 3) {
    const threeTurnPool = pool.filter((s) => s.turns.length >= 3);
    if (threeTurnPool.length > 0 && Math.random() < 0.75) {
      pool = threeTurnPool;
    }
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Picks a cute at-desk idle activity (playing LoL, singing, or sleepy yawn).
 */
export function pickDeskIdleActivity(preferredIcon?: IdleHobbyIconType): {
  icon: IdleHobbyIconType;
  accentColor: string;
  text: string;
} {
  const bucket =
    (preferredIcon
      ? DESK_IDLE_ACTIVITIES.find((a) => a.icon === preferredIcon)
      : undefined) ||
    DESK_IDLE_ACTIVITIES[Math.floor(Math.random() * DESK_IDLE_ACTIVITIES.length)];
  const text = bucket.texts[Math.floor(Math.random() * bucket.texts.length)];
  return {
    icon: bucket.icon,
    accentColor: bucket.accentColor,
    text,
  };
}
