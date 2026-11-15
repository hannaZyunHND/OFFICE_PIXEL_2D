import { Graphics } from 'pixi.js';
import {
  getCanonicalFootprint,
  type Direction,
  type FurnitureType,
  type ZoneType,
} from '@/types/blueprint';
import { drawAgentToPixiGraphics } from './AgentSpritePainter';

export function hexToNumber(hex: string): number {
  const cleaned = hex.replace('#', '').trim();
  const parsed = Number.parseInt(cleaned, 16);
  return Number.isNaN(parsed) ? 0x38bdf8 : parsed;
}

export function darkenColor(color: number, factor = 0.72): number {
  const r = Math.max(0, Math.floor(((color >> 16) & 0xff) * factor));
  const g = Math.max(0, Math.floor(((color >> 8) & 0xff) * factor));
  const b = Math.max(0, Math.floor((color & 0xff) * factor));
  return (r << 16) | (g << 8) | b;
}

export function lightenColor(color: number, factor = 1.25): number {
  const r = Math.min(255, Math.floor(((color >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.floor(((color >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.floor((color & 0xff) * factor));
  return (r << 16) | (g << 8) | b;
}

/**
 * Draws a 32x32 floor or wall tile onto a PIXI.Graphics instance.
 */
export function drawFloorTile(
  g: Graphics,
  col: number,
  row: number,
  isWall: boolean,
  zoneType: ZoneType | null,
): void {
  const x = col * 32;
  const y = row * 32;
  const isEven = (col + row) % 2 === 0;

  if (isWall) {
    g.rect(x, y, 32, 32).fill({ color: 0x090d16 });
    g.rect(x, y, 32, 6).fill({ color: 0x334155 });
    g.rect(x, y + 6, 32, 2).fill({ color: 0x475569 });
    g.rect(x + 2, y + 12, 12, 6).fill({ color: 0x131c2e });
    g.rect(x + 16, y + 12, 14, 6).fill({ color: 0x131c2e });
    g.rect(x + 8, y + 21, 14, 6).fill({ color: 0x131c2e });
    return;
  }

  let baseColor = isEven ? 0x0f172a : 0x131d33;
  if (zoneType === 'WORK') {
    baseColor = isEven ? 0x1e293b : 0x243247;
  } else if (zoneType === 'APPROVAL') {
    baseColor = isEven ? 0x2e1f3e : 0x38264b;
  } else if (zoneType === 'IDLE') {
    baseColor = isEven ? 0x1f2e2b : 0x263935;
  } else if (zoneType === 'DIRECTOR') {
    baseColor = isEven ? 0x2a1f12 : 0x362716;
  }

  g.rect(x, y, 32, 32).fill({ color: baseColor });
  g.rect(x + 1, y + 1, 2, 2).fill({
    color: zoneType === 'DIRECTOR' ? 0xfbbf24 : lightenColor(baseColor, 1.12),
    alpha: zoneType === 'DIRECTOR' ? 0.28 : 0.35,
  });
}

/**
 * Draws any of the 50 furniture & roaming pet/robot items in canonical local coordinates
 * [canonW * 32, canonH * 32]. FurnitureEntity then applies uniform proportional scaling
 * (`graphics.scale.set(scaleFactor, scaleFactor)`) so every item scales with 100% locked aspect ratio.
 */
export function drawProceduralFurniture(
  g: Graphics,
  type: FurnitureType,
  _footprint: [number, number],
  isActiveWorking = false,
  agentColorHex = '#38bdf8',
  animPhase = 0,
): void {
  g.clear();
  const [canonW, canonH] = getCanonicalFootprint(type);
  const widthPx = canonW * 32;
  const heightPx = canonH * 32;
  const accentColor = hexToNumber(agentColorHex);
  const pulse = Math.floor(animPhase * 4) % 2 === 0;
  const wave = Math.sin(animPhase * 3);

  // Drop shadow under furniture
  g.rect(2, heightPx - 4, widthPx - 4, 5).fill({ color: 0x000000, alpha: 0.42 });

  switch (type) {
    case 'DESK_PC': {
      g.rect(2, 4, widthPx - 4, 24).fill({ color: 0x78350f });
      g.rect(2, 4, widthPx - 4, 3).fill({ color: 0x92400e });
      g.rect(4, 6, widthPx - 8, 18).fill({ color: 0x854d0e });
      g.rect(4, 26, 5, 5).fill({ color: 0x451a03 });
      g.rect(widthPx - 9, 26, 5, 5).fill({ color: 0x451a03 });

      const screenBg = isActiveWorking ? accentColor : 0x0f172a;
      g.rect(14, 6, 22, 11).fill({ color: 0x1e293b });
      g.rect(16, 8, 18, 7).fill({ color: screenBg });
      if (isActiveWorking) {
        const lineOffset = Math.floor(animPhase * 4) % 2;
        g.rect(18, 9 + lineOffset, 10, 1).fill({ color: 0xffffff });
        g.rect(18, 11 + lineOffset, 14, 1).fill({ color: 0xe2e8f0 });
        g.rect(18, 13, 8, 1).fill({ color: 0xffffff });
        g.rect(12, 5, 26, 14).fill({ color: accentColor, alpha: 0.22 });
      }
      g.rect(23, 17, 4, 2).fill({ color: 0x475569 });
      g.rect(17, 20, 14, 3).fill({ color: 0xcbd5e1 });
      g.rect(46, 12, 6, 6).fill({ color: 0xf8fafc });
      g.rect(47, 13, 4, 3).fill({ color: 0x78350f });
      break;
    }

    case 'DIRECTOR_DESK': {
      // 3x1 (96x32px) Executive CEO Mahogany Desk + Gold Trim + Dual Displays
      g.rect(2, 3, widthPx - 4, 26).fill({ color: 0x451a03 });
      g.rect(2, 3, widthPx - 4, 3).fill({ color: 0xd97706 });
      g.rect(4, 5, widthPx - 8, 22).fill({ color: 0x6b2f10 });
      // Gold front executive nameplate + trim bar
      g.rect(4, 25, widthPx - 8, 2).fill({ color: 0xfbbf24 });
      g.rect(Math.floor(widthPx / 2) - 10, 23, 20, 4).fill({ color: 0xf59e0b });
      g.rect(Math.floor(widthPx / 2) - 8, 24, 16, 2).fill({ color: 0xfef08a });
      // Leather desk blotter pad
      g.rect(30, 15, 36, 9).fill({ color: 0x1e293b });
      g.rect(38, 17, 20, 4).fill({ color: 0x94a3b8 });
      // Dual curved executive monitors
      const scrColor = isActiveWorking ? 0xfbbf24 : 0x0f172a;
      g.rect(22, 5, 22, 10).fill({ color: 0x1e293b });
      g.rect(24, 6, 18, 7).fill({ color: scrColor });
      g.rect(48, 5, 22, 10).fill({ color: 0x1e293b });
      g.rect(50, 6, 18, 7).fill({ color: scrColor });
      if (isActiveWorking) {
        g.rect(20, 4, 52, 12).fill({ color: 0xfbbf24, alpha: 0.16 });
      }
      // Executive brass lamp (left) & coffee mug (right)
      g.rect(8, 7, 7, 7).fill({ color: 0xfbbf24 });
      g.rect(9, 8, 5, 4).fill({ color: 0xfef08a });
      g.rect(80, 10, 6, 6).fill({ color: 0xf8fafc });
      g.rect(81, 11, 4, 3).fill({ color: 0x78350f });
      break;
    }

    // =========================================================================
    // CATEGORY C: GRAND ECO ZONE & LOUNGE (LARGE MULTI-TILE INSTALLATIONS!)
    // =========================================================================
    case 'ECO_BIOME_DOME': {
      // 4x3 (128x96px) Grand Indoor Tropical Eco-Biome Oasis with River, Bridge, Trees & Fireflies
      g.rect(3, 3, widthPx - 6, heightPx - 6).fill({ color: 0x064e3b }); // outer stone & hedge curb
      g.rect(6, 6, widthPx - 12, heightPx - 12).fill({ color: 0x15803d }); // lush lawn
      g.rect(10, 10, widthPx - 20, heightPx - 20).fill({ color: 0x16a34a });

      // Winding crystal-blue stream & waterfall lagoon across the 128x96 biome
      g.rect(42, 10, 38, 28).fill({ color: 0x0369a1 });
      g.rect(46, 14, 30, 22).fill({ color: 0x0ea5e9 });
      g.rect(34, 34, 44, 28).fill({ color: 0x0284c7 });
      g.rect(38, 38, 36, 22).fill({ color: 0x38bdf8 });
      g.rect(26, 58, 48, 26).fill({ color: 0x0369a1 });
      g.rect(30, 62, 40, 18).fill({ color: 0x0ea5e9 });

      // Animated water sparkles
      const ripple = Math.floor(wave * 4);
      g.rect(52 + ripple, 20, 10, 2).fill({ color: 0xe0f2fe });
      g.rect(44 - ripple, 48, 12, 2).fill({ color: 0xe0f2fe });
      g.rect(38 + ripple, 70, 10, 2).fill({ color: 0xe0f2fe });

      // Wooden arched bridge over the center stream
      g.rect(30, 42, 52, 14).fill({ color: 0x78350f });
      g.rect(32, 44, 48, 10).fill({ color: 0xb45309 });
      for (let bx = 34; bx < 78; bx += 6) {
        g.rect(bx, 44, 4, 10).fill({ color: 0xd97706 });
      }
      g.rect(30, 41, 52, 2).fill({ color: 0x991b1b }); // red handrail
      g.rect(30, 55, 52, 2).fill({ color: 0x991b1b });

      // Left Ancient Canopy Tree (Top-Left)
      g.rect(18, 28, 8, 12).fill({ color: 0x451a03 });
      g.rect(10, 10, 26, 22).fill({ color: 0x14532d });
      g.rect(13, 12, 20, 16).fill({ color: 0x22c55e });
      g.rect(16, 14, 12, 10).fill({ color: 0x4ade80 });

      // Right Blooming Sakura & Tropical Tree (Top-Right)
      g.rect(98, 28, 8, 12).fill({ color: 0x451a03 });
      g.rect(86, 10, 30, 22).fill({ color: 0xdb2777 });
      g.rect(90, 12, 22, 16).fill({ color: 0xf472b6 });
      g.rect(94, 14, 14, 10).fill({ color: 0xfbcfe8 });

      // Bottom-Right Tropical Fern & Flower Garden
      g.rect(84, 54, 32, 28).fill({ color: 0x15803d });
      g.rect(88, 58, 24, 20).fill({ color: 0x22c55e });
      g.rect(92, 62, 5, 5).fill({ color: 0xfacc15 });
      g.rect(102, 66, 5, 5).fill({ color: 0xf43f5e });
      g.rect(94, 72, 5, 5).fill({ color: 0xc084fc });

      // Bottom-Left Zen Stepping Stones & Bush
      g.rect(14, 62, 8, 6).fill({ color: 0x94a3b8 });
      g.rect(20, 52, 7, 5).fill({ color: 0xcbd5e1 });
      g.rect(12, 72, 14, 12).fill({ color: 0x22c55e });

      // Floating Golden Fireflies
      const flyShift = Math.floor(wave * 7);
      g.rect(28 + flyShift, 22, 3, 3).fill({ color: 0xfef08a });
      g.rect(78 - flyShift, 34, 3, 3).fill({ color: 0xfef08a });
      g.rect(62 + flyShift, 68, 3, 3).fill({ color: 0xfef08a });
      break;
    }

    case 'KOI_POND': {
      // 3x2 (96x64px) Grand Japanese Koi Pond with Waterfall & Lotus Pads
      g.rect(2, 3, widthPx - 4, heightPx - 6).fill({ color: 0x475569 }); // natural rock border
      g.rect(6, 7, widthPx - 12, heightPx - 14).fill({ color: 0x0369a1 });
      g.rect(10, 11, widthPx - 20, heightPx - 22).fill({ color: 0x0284c7 });
      g.rect(14, 15, widthPx - 28, heightPx - 30).fill({ color: 0x0ea5e9 });

      // Corner Slate Waterfall (Top-Left)
      g.rect(4, 4, 22, 16).fill({ color: 0x334155 });
      g.rect(8, 6, 12, 16).fill({ color: 0x38bdf8 });
      g.rect(10, 8 + (pulse ? 2 : 0), 8, 12).fill({ color: 0xe0f2fe });

      // Lily Pads & Blooming Pink Lotus Flowers
      g.rect(18, 38, 12, 10).fill({ color: 0x16a34a });
      g.rect(21, 40, 6, 6).fill({ color: 0xf472b6 });
      g.rect(68, 14, 12, 10).fill({ color: 0x16a34a });
      g.rect(71, 16, 6, 6).fill({ color: 0xfbcfe8 });
      g.rect(64, 42, 10, 8).fill({ color: 0x15803d });

      // 4 Swimming Koi Fish (Orange-White, Red, Gold)
      const koi1 = Math.floor(wave * 14);
      const koi2 = Math.floor(Math.cos(animPhase * 2.5) * 12);
      // Koi 1 (Orange/White Kohaku)
      g.rect(40 + koi1, 20, 10, 5).fill({ color: 0xf97316 });
      g.rect(43 + koi1, 20, 4, 5).fill({ color: 0xffffff });
      // Koi 2 (Crimson Red)
      g.rect(46 - koi1, 34, 10, 5).fill({ color: 0xef4444 });
      g.rect(50 - koi1, 34, 3, 5).fill({ color: 0xfef08a });
      // Koi 3 (Golden Yamabuki)
      g.rect(36 + koi2, 46, 9, 4).fill({ color: 0xfacc15 });
      break;
    }

    case 'ZEN_ROCK_GARDEN': {
      // 3x2 (96x64px) Japanese Kare-sansui White Sand Zen Garden & Stone Lantern
      g.rect(2, 3, widthPx - 4, heightPx - 6).fill({ color: 0x78350f });
      g.rect(6, 7, widthPx - 12, heightPx - 14).fill({ color: 0xe2e8f0 });

      // Raked white sand wave grooves across the 96x64 garden
      for (let ry = 11; ry < heightPx - 10; ry += 5) {
        g.rect(10, ry, widthPx - 20, 1).fill({ color: 0x94a3b8 });
      }

      // Left Zen Rock Island with Moss
      g.rect(16, 18, 22, 18).fill({ color: 0xcbd5e1 });
      g.rect(18, 20, 18, 14).fill({ color: 0x475569 });
      g.rect(22, 16, 10, 10).fill({ color: 0x334155 });
      g.rect(20, 30, 14, 4).fill({ color: 0x16a34a });

      // Right Zen Rock Cluster
      g.rect(58, 32, 20, 16).fill({ color: 0x475569 });
      g.rect(62, 28, 12, 12).fill({ color: 0x64748b });
      g.rect(60, 44, 16, 4).fill({ color: 0x15803d });

      // Traditional Toro Stone Lantern (Top-Right) with glowing warm flame
      g.rect(68, 10, 14, 14).fill({ color: 0x64748b });
      g.rect(71, 13, 8, 6).fill({ color: pulse ? 0xfef08a : 0xf59e0b });

      // Green Bamboo Corner (Bottom-Left)
      g.rect(10, 40, 3, 16).fill({ color: 0x15803d });
      g.rect(15, 42, 3, 14).fill({ color: 0x22c55e });
      break;
    }

    case 'BOTANICAL_GREENHOUSE': {
      // 3x2 (96x64px) Glass Conservatory & Exotic Orchid Greenhouse
      g.rect(2, 3, widthPx - 4, heightPx - 6).fill({ color: 0x0f172a });
      g.rect(4, 5, widthPx - 8, heightPx - 10).fill({ color: 0x064e3b });
      // Glass roof ribs & cyan skylight reflection
      g.rect(6, 7, widthPx - 12, heightPx - 14).fill({ color: 0x38bdf8, alpha: 0.22 });
      for (let gx = 20; gx < widthPx - 10; gx += 18) {
        g.rect(gx, 5, 2, heightPx - 10).fill({ color: 0x94a3b8, alpha: 0.65 });
      }
      // Exotic tropical plants, palms & orchids inside
      g.rect(12, 14, 20, 16).fill({ color: 0x16a34a });
      g.rect(16, 18, 6, 6).fill({ color: 0xf43f5e });
      g.rect(38, 12, 22, 18).fill({ color: 0x22c55e });
      g.rect(44, 16, 8, 8).fill({ color: 0xc084fc });
      g.rect(66, 14, 18, 16).fill({ color: 0x15803d });
      g.rect(70, 18, 6, 6).fill({ color: 0xfacc15 });
      // Lower planters
      g.rect(14, 38, 68, 14).fill({ color: 0x14532d });
      g.rect(18, 40, 60, 10).fill({ color: 0x4ade80 });
      break;
    }

    case 'HAMMOCK_STAND': {
      // 3x2 (96x64px) Tropical Palm & Beach Deck Hammock Oasis
      g.rect(3, 5, widthPx - 6, heightPx - 10).fill({ color: 0x78350f }); // wooden sun deck
      for (let py = 9; py < heightPx - 8; py += 6) {
        g.rect(5, py, widthPx - 10, 4).fill({ color: 0x92400e });
      }
      // Tropical Palm Tree on Left
      g.rect(14, 24, 6, 22).fill({ color: 0x451a03 });
      g.rect(6, 8, 24, 18).fill({ color: 0x16a34a });
      g.rect(10, 10, 16, 12).fill({ color: 0x22c55e });
      // Swaying Large Hammock on Right
      const swayY = Math.floor(wave * 3);
      g.rect(34, 28, 6, 16).fill({ color: 0x451a03 });
      g.rect(82, 28, 6, 16).fill({ color: 0x451a03 });
      g.rect(40, 22 + swayY, 42, 18).fill({ color: 0xf97316 });
      g.rect(46, 26 + swayY, 30, 10).fill({ color: 0xfacc15 });
      break;
    }

    case 'CHERRY_BLOSSOM_TREE': {
      // 2x2 (64x64px) Giant Ancient Sakura Cherry Blossom Tree
      // Stone garden bed at base
      g.rect(12, 42, 40, 16).fill({ color: 0x475569 });
      g.rect(16, 45, 32, 10).fill({ color: 0x15803d });
      // Gnarled ancient tree trunk & branches
      g.rect(26, 26, 12, 22).fill({ color: 0x451a03 });
      g.rect(20, 22, 8, 8).fill({ color: 0x78350f });
      g.rect(36, 22, 8, 8).fill({ color: 0x78350f });
      // Massive multi-layered pink Sakura canopy (64px wide)
      g.rect(4, 6, 56, 24).fill({ color: 0xdb2777 });
      g.rect(8, 3, 48, 22).fill({ color: 0xec4899 });
      g.rect(12, 6, 40, 16).fill({ color: 0xf472b6 });
      g.rect(18, 8, 28, 10).fill({ color: 0xfbcfe8 });
      // Drifting sakura petals
      const petalY = 30 + (Math.floor(animPhase * 5) % 18);
      g.rect(10, petalY, 3, 3).fill({ color: 0xfbcfe8 });
      g.rect(48, 48 - (Math.floor(animPhase * 5) % 18), 3, 3).fill({ color: 0xf472b6 });
      g.rect(22, 50, 4, 2).fill({ color: 0xfbcfe8 });
      g.rect(38, 48, 4, 2).fill({ color: 0xf472b6 });
      break;
    }

    case 'INDOOR_FOUNTAIN': {
      // 2x2 (64x64px) Grand Plaza 3-Tier Water Fountain
      g.rect(6, 10, 52, 46).fill({ color: 0x334155 });
      g.rect(10, 14, 44, 38).fill({ color: 0x0284c7 });
      g.rect(14, 18, 36, 30).fill({ color: 0x0ea5e9 });
      // Middle & top stone fountain tiers
      g.rect(20, 22, 24, 20).fill({ color: 0x64748b });
      g.rect(24, 24, 16, 14).fill({ color: 0x38bdf8 });
      g.rect(28, 14, 8, 18).fill({ color: 0x94a3b8 });
      // Animated water spouts & cascades
      const spout = Math.floor(animPhase * 6) % 6;
      g.rect(30, 6 + spout, 4, 10).fill({ color: 0xe0f2fe });
      g.rect(18, 28 + spout, 4, 8).fill({ color: 0xe0f2fe });
      g.rect(42, 28 + spout, 4, 8).fill({ color: 0xe0f2fe });
      break;
    }

    case 'WATERFALL_ROCK_WALL': {
      // 3x1 (96x32px) Natural Cliff Waterfall Wall
      g.rect(2, 2, widthPx - 4, 27).fill({ color: 0x334155 });
      g.rect(6, 4, widthPx - 12, 22).fill({ color: 0x475569 });
      // 3 cascading water streams into base pool
      g.rect(8, 21, widthPx - 16, 6).fill({ color: 0x0284c7 });
      for (const wx of [18, 44, 70]) {
        g.rect(wx, 4, 10, 20).fill({ color: 0x0ea5e9 });
        const drop = Math.floor(animPhase * 6) % 12;
        g.rect(wx + 2, 5 + drop, 6, 6).fill({ color: 0xe0f2fe });
      }
      // Hanging green vines
      g.rect(8, 3, 8, 10).fill({ color: 0x16a34a });
      g.rect(34, 3, 8, 12).fill({ color: 0x22c55e });
      g.rect(82, 3, 8, 10).fill({ color: 0x16a34a });
      break;
    }

    case 'AQUARIUM': {
      // 3x1 (96x32px) Panoramic Coral Reef Cyber-Aquarium
      g.rect(2, 19, widthPx - 4, 10).fill({ color: 0x1e293b });
      g.rect(4, 3, widthPx - 8, 17).fill({ color: 0x0284c7 });
      g.rect(6, 5, widthPx - 12, 13).fill({ color: 0x0ea5e9 });
      // Coral reef & kelp forest
      g.rect(10, 11, 5, 7).fill({ color: 0x10b981 });
      g.rect(24, 13, 6, 5).fill({ color: 0xf43f5e });
      g.rect(56, 12, 6, 6).fill({ color: 0xa855f7 });
      g.rect(78, 10, 5, 8).fill({ color: 0x10b981 });
      // 3 Swimming tropical fish
      const fishOffset = Math.floor(Math.sin(animPhase * 2) * 14);
      g.rect(34 + fishOffset, 8, 6, 3).fill({ color: 0xf97316 });
      g.rect(58 - fishOffset, 12, 6, 3).fill({ color: 0xfacc15 });
      g.rect(6, 4, widthPx - 12, 2).fill({ color: 0x7dd3fc });
      break;
    }

    case 'SLEEPING_POD': {
      g.rect(3, 5, widthPx - 6, 22).fill({ color: 0xe2e8f0 });
      g.rect(6, 8, 26, 16).fill({ color: 0x0284c7 });
      g.rect(8, 10, 22, 12).fill({ color: 0x38bdf8, alpha: 0.7 });
      g.rect(34, 8, 22, 16).fill({ color: 0x1e293b });
      break;
    }

    case 'SOFA': {
      g.rect(3, 6, widthPx - 6, 22).fill({ color: 0x312e81 });
      g.rect(5, 6, widthPx - 10, 7).fill({ color: 0x4338ca });
      g.rect(3, 8, 6, 18).fill({ color: 0x3730a3 });
      g.rect(widthPx - 9, 8, 6, 18).fill({ color: 0x3730a3 });
      g.rect(10, 13, 21, 13).fill({ color: 0x4f46e5 });
      g.rect(33, 13, 21, 13).fill({ color: 0x4f46e5 });
      g.rect(11, 14, 19, 3).fill({ color: 0x6366f1 });
      g.rect(34, 14, 19, 3).fill({ color: 0x6366f1 });
      break;
    }

    case 'PLANT': {
      g.rect(10, 19, 12, 10).fill({ color: 0x9a3412 });
      g.rect(9, 17, 14, 3).fill({ color: 0xc2410c });
      g.rect(8, 8, 16, 10).fill({ color: 0x15803d });
      g.rect(6, 10, 6, 6).fill({ color: 0x16a34a });
      g.rect(20, 10, 6, 6).fill({ color: 0x16a34a });
      g.rect(11, 4, 10, 6).fill({ color: 0x22c55e });
      g.rect(13, 6, 4, 3).fill({ color: 0x4ade80 });
      break;
    }

    // =========================================================================
    // CATEGORY A: GAME & RECREATION (11 TYPES)
    // =========================================================================
    case 'PS5_PES_STATION': {
      // Entertainment media bench + gaming rug
      g.rect(3, 18, widthPx - 6, 12).fill({ color: 0x1e293b });
      g.rect(4, 19, widthPx - 8, 9).fill({ color: 0x334155 });
      g.rect(6, 25, widthPx - 12, 4).fill({ color: 0x0f172a, alpha: 0.7 });
      // Wide 4K TV displaying a live PES football pitch
      g.rect(6, 2, 40, 17).fill({ color: 0x090d16 });
      g.rect(8, 3, 36, 14).fill({ color: 0x15803d });
      g.rect(9, 4, 34, 12).fill({ color: 0x16a34a });
      // Halfway line & center circle
      g.rect(25, 4, 1, 12).fill({ color: 0xf8fafc, alpha: 0.85 });
      g.rect(23, 8, 5, 4).stroke({ width: 1, color: 0xf8fafc, alpha: 0.85 });
      // Scoreboard banner
      g.rect(9, 4, 10, 3).fill({ color: 0x020617, alpha: 0.85 });
      g.rect(10, 5, 3, 1).fill({ color: 0xef4444 });
      g.rect(15, 5, 3, 1).fill({ color: 0x38bdf8 });
      // Animated PES players & ball on TV screen
      const ballShift = Math.floor(wave * 10);
      g.rect(16, 10, 3, 3).fill({ color: 0xef4444 });
      g.rect(32, 9, 3, 3).fill({ color: 0x38bdf8 });
      g.rect(25 + ballShift, 10 + (pulse ? 1 : 0), 2, 2).fill({ color: 0xffffff });
      // PlayStation 5 console standing vertically on the right side
      g.rect(49, 4, 9, 16).fill({ color: 0xf8fafc });
      g.rect(52, 5, 3, 14).fill({ color: 0x0f172a });
      // Signature glowing blue PS5 LED accent strip
      g.rect(51, 5, 1, 13).fill({ color: pulse ? 0x38bdf8 : 0x2563eb });
      g.rect(55, 5, 1, 13).fill({ color: pulse ? 0x38bdf8 : 0x2563eb });
      // 2 DualSense controllers sitting on the console bench
      g.rect(13, 21, 7, 4).fill({ color: 0xf8fafc });
      g.rect(15, 22, 3, 2).fill({ color: 0x0f172a });
      g.rect(34, 21, 7, 4).fill({ color: 0xf8fafc });
      g.rect(36, 22, 3, 2).fill({ color: 0x0f172a });
      g.rect(25, 22, 4, 2).fill({ color: pulse ? 0x22c55e : 0xfacc15 });
      break;
    }

    case 'POOL_TABLE': {
      g.rect(2, 3, widthPx - 4, 25).fill({ color: 0x7c2d12 });
      g.rect(5, 6, widthPx - 10, 19).fill({ color: 0x059669 });
      g.rect(7, 8, widthPx - 14, 15).fill({ color: 0x10b981 });
      for (const px of [5, 30, widthPx - 8]) {
        g.rect(px, 6, 3, 3).fill({ color: 0x020617 });
        g.rect(px, 22, 3, 3).fill({ color: 0x020617 });
      }
      const ballRoll = Math.floor(wave * 3);
      g.rect(18 + ballRoll, 14, 3, 3).fill({ color: 0xffffff });
      g.rect(36, 12, 3, 3).fill({ color: 0xfacc15 });
      g.rect(40, 15, 3, 3).fill({ color: 0xef4444 });
      g.rect(43, 11, 3, 3).fill({ color: 0x3b82f6 });
      g.rect(44, 17, 3, 3).fill({ color: 0xa855f7 });
      g.rect(10, 4, 26, 1).fill({ color: 0xfde68a });
      break;
    }

    case 'PING_PONG_TABLE': {
      g.rect(2, 4, widthPx - 4, 23).fill({ color: 0xf8fafc });
      g.rect(4, 6, widthPx - 8, 19).fill({ color: 0x1d4ed8 });
      g.rect(4, 15, widthPx - 8, 1).fill({ color: 0xffffff, alpha: 0.85 });
      g.rect(31, 3, 2, 25).fill({ color: 0xe2e8f0 });
      g.rect(30, 5, 4, 21).fill({ color: 0x94a3b8, alpha: 0.45 });
      g.rect(8, 10, 4, 5).fill({ color: 0xef4444 });
      g.rect(52, 16, 4, 5).fill({ color: 0x0f172a });
      const pongX = 30 + Math.floor(wave * 14);
      const pongY = 13 - Math.abs(Math.floor(Math.cos(animPhase * 3) * 3));
      g.rect(pongX, pongY, 3, 3).fill({ color: 0xfef08a });
      break;
    }

    case 'FOOSBALL_TABLE': {
      g.rect(2, 4, widthPx - 4, 24).fill({ color: 0x451a03 });
      g.rect(5, 7, widthPx - 10, 18).fill({ color: 0x15803d });
      g.rect(31, 7, 2, 18).fill({ color: 0xffffff, alpha: 0.5 });
      for (const rx of [14, 24, 38, 48]) {
        g.rect(rx, 2, 1, 28).fill({ color: 0xcbd5e1 });
        const teamColor = rx < 31 ? 0xef4444 : 0x38bdf8;
        g.rect(rx - 1, 9, 3, 3).fill({ color: teamColor });
        g.rect(rx - 1, 15, 3, 3).fill({ color: teamColor });
        g.rect(rx - 1, 20, 3, 3).fill({ color: teamColor });
      }
      break;
    }

    case 'ARCADE_CABINET': {
      g.rect(5, 2, 22, 27).fill({ color: 0x312e81 });
      g.rect(7, 3, 18, 4).fill({ color: pulse ? 0xf43f5e : 0xfacc15 });
      g.rect(7, 8, 18, 10).fill({ color: 0x020617 });
      g.rect(9, 9, 14, 8).fill({ color: pulse ? 0x0ea5e9 : 0x6366f1 });
      g.rect(14 + (pulse ? 1 : -1), 12, 4, 3).fill({ color: 0xfef08a });
      g.rect(6, 18, 20, 4).fill({ color: 0x1e293b });
      g.rect(10, 16, 2, 3).fill({ color: 0xef4444 });
      g.rect(18, 19, 2, 2).fill({ color: 0x22c55e });
      g.rect(21, 19, 2, 2).fill({ color: 0xfacc15 });
      break;
    }

    case 'CLAW_MACHINE': {
      g.rect(4, 2, 24, 27).fill({ color: 0xdb2777 });
      g.rect(6, 6, 20, 14).fill({ color: 0x0f172a });
      g.rect(7, 7, 18, 12).fill({ color: 0x38bdf8, alpha: 0.25 });
      const clawX = 14 + Math.floor(wave * 5);
      g.rect(clawX, 7, 2, 4).fill({ color: 0xe2e8f0 });
      g.rect(clawX - 2, 11, 6, 2).fill({ color: 0xf8fafc });
      g.rect(8, 15, 4, 4).fill({ color: 0xfacc15 });
      g.rect(14, 15, 4, 4).fill({ color: 0x4ade80 });
      g.rect(20, 15, 4, 4).fill({ color: 0xf472b6 });
      break;
    }

    case 'DARTBOARD_CABINET': {
      g.rect(4, 3, 24, 25).fill({ color: 0x451a03 });
      g.rect(9, 6, 14, 14).fill({ color: 0x0f172a });
      g.rect(11, 8, 10, 10).fill({ color: 0x16a34a });
      g.rect(13, 10, 6, 6).fill({ color: 0xf8fafc });
      g.rect(15, 12, 2, 2).fill({ color: 0xef4444 });
      break;
    }

    case 'PINBALL_MACHINE': {
      g.rect(5, 2, 22, 7).fill({ color: 0x701a75 });
      g.rect(6, 9, 20, 19).fill({ color: 0x1e1b4b });
      g.rect(8, 11, 16, 14).fill({ color: 0x312e81 });
      g.rect(10, 13, 4, 4).fill({ color: pulse ? 0xfacc15 : 0xf43f5e });
      g.rect(18, 15, 4, 4).fill({ color: pulse ? 0x38bdf8 : 0x4ade80 });
      g.rect(14, 21, 4, 2).fill({ color: 0xffffff });
      break;
    }

    case 'VR_SIMULATOR_POD': {
      g.rect(5, 4, 22, 24).fill({ color: 0x0f172a });
      g.rect(7, 6, 18, 20).fill({ color: 0x1e293b });
      g.rect(9, 8, 14, 6).fill({ color: pulse ? 0x38bdf8 : 0x0284c7 });
      g.rect(10, 16, 12, 8).fill({ color: 0x6366f1 });
      break;
    }

    case 'KARAOKE_BOOTH': {
      g.rect(2, 5, widthPx - 4, 22).fill({ color: 0x1e1b4b });
      g.rect(4, 7, 10, 18).fill({ color: 0x0f172a });
      g.rect(6, 10, 6, 6).fill({ color: 0xec4899 });
      g.rect(widthPx - 14, 7, 10, 18).fill({ color: 0x0f172a });
      g.rect(widthPx - 12, 10, 6, 6).fill({ color: 0xec4899 });
      g.rect(18, 6, 28, 14).fill({ color: 0x020617 });
      g.rect(20, 8, 24, 10).fill({ color: pulse ? 0x8b5cf6 : 0x3b82f6 });
      g.rect(24, 12, 16, 2).fill({ color: 0xfef08a });
      break;
    }

    case 'CHESS_TABLE': {
      g.rect(4, 5, 24, 22).fill({ color: 0x78350f });
      g.rect(8, 8, 16, 16).fill({ color: 0xf8fafc });
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if ((r + c) % 2 === 1) {
            g.rect(8 + c * 4, 8 + r * 4, 4, 4).fill({ color: 0x1e293b });
          }
        }
      }
      g.rect(10, 9, 3, 3).fill({ color: 0xfacc15 });
      g.rect(19, 19, 3, 3).fill({ color: 0x38bdf8 });
      break;
    }

    // =========================================================================
    // CATEGORY B: PANTRY, BAR & KITCHEN (10 TYPES)
    // =========================================================================
    case 'COFFEE_MACHINE': {
      g.rect(4, 10, 24, 20).fill({ color: 0x334155 });
      g.rect(4, 10, 24, 3).fill({ color: 0x64748b });
      g.rect(7, 2, 18, 16).fill({ color: 0x1f2937 });
      g.rect(8, 3, 16, 3).fill({ color: 0x9ca3af });
      g.rect(10, 4, 2, 2).fill({ color: 0xef4444 });
      g.rect(14, 4, 2, 2).fill({ color: 0x22c55e });
      g.rect(12, 11, 8, 6).fill({ color: 0xf8fafc });
      g.rect(13, 13, 6, 3).fill({ color: 0x451a03 });
      const steamY = Math.floor(animPhase * 3) % 3;
      g.rect(14, 8 - steamY, 2, 2).fill({ color: 0xffffff, alpha: 0.65 });
      g.rect(17, 7 - ((steamY + 1) % 3), 2, 2).fill({ color: 0xffffff, alpha: 0.45 });
      break;
    }

    case 'MINI_BAR_COUNTER': {
      g.rect(2, 6, widthPx - 4, 22).fill({ color: 0x1e293b });
      g.rect(2, 6, widthPx - 4, 5).fill({ color: 0x475569 });
      g.rect(4, 25, widthPx - 8, 2).fill({ color: pulse ? 0xf59e0b : 0xec4899 });
      const bottleColors = [0x22c55e, 0xef4444, 0x38bdf8, 0xa855f7, 0xfacc15];
      bottleColors.forEach((col, idx) => {
        g.rect(8 + idx * 9, 2, 4, 6).fill({ color: col });
        g.rect(9 + idx * 9, 1, 2, 2).fill({ color: 0xf8fafc });
      });
      break;
    }

    case 'MICROWAVE_STAND': {
      g.rect(4, 14, 24, 15).fill({ color: 0x334155 });
      g.rect(5, 4, 22, 12).fill({ color: 0xe2e8f0 });
      g.rect(7, 6, 13, 8).fill({ color: pulse ? 0xfef08a : 0xf59e0b });
      g.rect(10, 10, 7, 3).fill({ color: 0xef4444 });
      g.rect(22, 6, 3, 3).fill({ color: 0x22c55e });
      g.rect(22, 10, 3, 4).fill({ color: 0x475569 });
      break;
    }

    case 'VENDING_MACHINE': {
      g.rect(5, 2, 22, 27).fill({ color: 0xb91c1c });
      g.rect(7, 4, 14, 16).fill({ color: 0x0f172a });
      for (let r = 0; r < 3; r++) {
        g.rect(8, 5 + r * 5, 3, 4).fill({ color: 0x38bdf8 });
        g.rect(12, 5 + r * 5, 3, 4).fill({ color: 0xfacc15 });
        g.rect(16, 5 + r * 5, 3, 4).fill({ color: 0x4ade80 });
      }
      g.rect(22, 8, 3, 4).fill({ color: pulse ? 0x4ade80 : 0x38bdf8 });
      g.rect(8, 22, 12, 4).fill({ color: 0x1e293b });
      break;
    }

    case 'RAMEN_NOODLE_BAR': {
      g.rect(2, 6, widthPx - 4, 22).fill({ color: 0x78350f });
      g.rect(3, 2, widthPx - 6, 6).fill({ color: 0xdc2626 });
      g.rect(14, 3, 2, 4).fill({ color: 0xfef08a });
      g.rect(30, 3, 2, 4).fill({ color: 0xfef08a });
      g.rect(46, 3, 2, 4).fill({ color: 0xfef08a });
      g.rect(12, 13, 8, 5).fill({ color: 0xf8fafc });
      g.rect(13, 14, 6, 3).fill({ color: 0xf59e0b });
      g.rect(38, 13, 8, 5).fill({ color: 0xf8fafc });
      g.rect(39, 14, 6, 3).fill({ color: 0xf59e0b });
      const steamOffset = Math.floor(animPhase * 3) % 3;
      g.rect(15, 10 - steamOffset, 2, 2).fill({ color: 0xffffff, alpha: 0.7 });
      g.rect(41, 10 - steamOffset, 2, 2).fill({ color: 0xffffff, alpha: 0.7 });
      break;
    }

    case 'POPCORN_CART': {
      g.rect(5, 2, 22, 5).fill({ color: 0xef4444 });
      g.rect(9, 2, 4, 5).fill({ color: 0xffffff });
      g.rect(17, 2, 4, 5).fill({ color: 0xffffff });
      g.rect(6, 7, 20, 11).fill({ color: 0x0ea5e9, alpha: 0.35 });
      g.rect(8, 12, 16, 6).fill({ color: 0xfacc15 });
      g.rect(12, 9 + (pulse ? 0 : 1), 3, 3).fill({ color: 0xfef08a });
      g.rect(6, 18, 20, 9).fill({ color: 0xdc2626 });
      break;
    }

    case 'ICE_CREAM_FREEZER': {
      g.rect(4, 6, 24, 22).fill({ color: 0xf8fafc });
      g.rect(6, 8, 20, 10).fill({ color: 0xbae6fd });
      g.rect(7, 9, 8, 4).fill({ color: 0xf472b6 });
      g.rect(17, 9, 8, 4).fill({ color: 0x4ade80 });
      g.rect(7, 14, 8, 4).fill({ color: 0x78350f });
      g.rect(17, 14, 8, 4).fill({ color: 0xfacc15 });
      break;
    }

    case 'PIZZA_OVEN_COUNTER': {
      g.rect(4, 4, 24, 24).fill({ color: 0x9a3412 });
      g.rect(6, 6, 20, 6).fill({ color: 0xc2410c });
      g.rect(8, 12, 16, 10).fill({ color: 0x1c1917 });
      g.rect(10, 15, 12, 6).fill({ color: pulse ? 0xf97316 : 0xfacc15 });
      g.rect(12, 17, 8, 3).fill({ color: 0xfef08a });
      break;
    }

    case 'DOUBLE_FRIDGE': {
      g.rect(5, 2, 22, 27).fill({ color: 0x94a3b8 });
      g.rect(6, 3, 9, 25).fill({ color: 0xcbd5e1 });
      g.rect(16, 3, 10, 25).fill({ color: 0xcbd5e1 });
      g.rect(8, 10, 4, 5).fill({ color: 0x0f172a });
      g.rect(19, 8, 3, 3).fill({ color: 0xef4444 });
      g.rect(20, 14, 3, 3).fill({ color: 0x22c55e });
      break;
    }

    case 'WATER_COOLER': {
      g.rect(9, 13, 14, 16).fill({ color: 0xf8fafc });
      g.rect(10, 3, 12, 10).fill({ color: 0x0ea5e9 });
      g.rect(12, 5, 8, 6).fill({ color: 0x7dd3fc });
      g.rect(12, 16, 3, 3).fill({ color: 0xef4444 });
      g.rect(17, 16, 3, 3).fill({ color: 0x3b82f6 });
      break;
    }

    // =========================================================================
    // CATEGORY D: ROAMING PETS, BOTS & SILLY MOVERS (10 TYPES)
    // =========================================================================
    case 'OFFICE_CAT': {
      const tailWag = Math.floor(wave * 2);
      g.rect(8, 14, 14, 10).fill({ color: 0xf97316 });
      g.rect(10, 18, 10, 6).fill({ color: 0xffffff });
      g.rect(9, 7, 12, 9).fill({ color: 0xfb923c });
      g.rect(9, 4, 3, 3).fill({ color: 0xea580c });
      g.rect(18, 4, 3, 3).fill({ color: 0xea580c });
      g.rect(11, 10, 2, 2).fill({ color: 0x0f172a });
      g.rect(17, 10, 2, 2).fill({ color: 0x0f172a });
      g.rect(14, 12, 2, 2).fill({ color: 0xf472b6 });
      g.rect(22, 11 + tailWag, 4, 3).fill({ color: 0xea580c });
      break;
    }

    case 'CORGI_DOG': {
      g.rect(7, 14, 18, 10).fill({ color: 0xd97706 });
      g.rect(9, 17, 14, 7).fill({ color: 0xffffff });
      g.rect(8, 7, 12, 9).fill({ color: 0xf59e0b });
      g.rect(7, 4, 3, 4).fill({ color: 0xb45309 });
      g.rect(17, 4, 3, 4).fill({ color: 0xb45309 });
      g.rect(10, 10, 2, 2).fill({ color: 0x0f172a });
      g.rect(15, 10, 2, 2).fill({ color: 0x0f172a });
      g.rect(9, 24, 3, 4).fill({ color: 0xffffff });
      g.rect(19, 24, 3, 4).fill({ color: 0xffffff });
      break;
    }

    case 'ROBOT_VACUUM': {
      g.rect(5, 10, 22, 16).fill({ color: 0x1e293b });
      g.rect(7, 8, 18, 18).fill({ color: 0x334155 });
      g.rect(11, 12, 10, 10).fill({ color: 0x0f172a });
      g.rect(13, 14, 6, 6).fill({ color: pulse ? 0x38bdf8 : 0x22c55e });
      const brushOffset = pulse ? 2 : 0;
      g.rect(3 + brushOffset, 9, 3, 2).fill({ color: 0xfacc15 });
      g.rect(26 - brushOffset, 9, 3, 2).fill({ color: 0xfacc15 });
      break;
    }

    case 'ROBO_DOG': {
      g.rect(7, 12, 18, 8).fill({ color: 0xfacc15 });
      g.rect(9, 14, 14, 4).fill({ color: 0x0f172a });
      g.rect(5, 8, 8, 6).fill({ color: 0xeab308 });
      g.rect(6, 9, 4, 3).fill({ color: pulse ? 0xef4444 : 0x38bdf8 });
      g.rect(8, 20, 3, 7).fill({ color: 0x1e293b });
      g.rect(13, 20, 3, 7).fill({ color: 0x1e293b });
      g.rect(18, 20, 3, 7).fill({ color: 0x1e293b });
      g.rect(22, 20, 3, 7).fill({ color: 0x1e293b });
      break;
    }

    case 'MINI_DRONE': {
      const hoverY = Math.floor(wave * 3);
      g.rect(10, 10 + hoverY, 12, 6).fill({ color: 0x38bdf8 });
      g.rect(13, 11 + hoverY, 6, 4).fill({ color: 0x0f172a });
      const bladeW = pulse ? 8 : 4;
      g.rect(4, 8 + hoverY, bladeW, 2).fill({ color: 0xe2e8f0 });
      g.rect(28 - bladeW, 8 + hoverY, bladeW, 2).fill({ color: 0xe2e8f0 });
      g.rect(14, 16 + hoverY, 4, 5).fill({ color: 0xf8fafc });
      break;
    }

    case 'RUBBER_DUCK_CART': {
      g.rect(6, 23, 20, 3).fill({ color: 0xef4444 });
      g.rect(8, 26, 4, 3).fill({ color: 0x0f172a });
      g.rect(20, 26, 4, 3).fill({ color: 0x0f172a });
      g.rect(7, 13, 18, 10).fill({ color: 0xfacc15 });
      g.rect(9, 5, 12, 10).fill({ color: 0xfde047 });
      g.rect(10, 8, 9, 3).fill({ color: 0x020617 });
      g.rect(19, 10, 6, 3).fill({ color: 0xf97316 });
      break;
    }

    case 'RC_RACING_CAR': {
      g.rect(4, 14, 24, 9).fill({ color: 0xef4444 });
      g.rect(10, 11, 10, 6).fill({ color: 0xfacc15 });
      g.rect(3, 11, 4, 6).fill({ color: 0x991b1b });
      g.rect(6, 21, 6, 5).fill({ color: 0x0f172a });
      g.rect(20, 21, 6, 5).fill({ color: 0x0f172a });
      break;
    }

    case 'PENGUIN_MASCOT': {
      g.rect(8, 6, 16, 20).fill({ color: 0x0f172a });
      g.rect(11, 11, 10, 13).fill({ color: 0xf8fafc });
      g.rect(11, 8, 2, 2).fill({ color: 0xffffff });
      g.rect(19, 8, 2, 2).fill({ color: 0xffffff });
      g.rect(14, 10, 4, 3).fill({ color: 0xf59e0b });
      g.rect(9, 25, 5, 3).fill({ color: 0xf59e0b });
      g.rect(18, 25, 5, 3).fill({ color: 0xf59e0b });
      break;
    }

    case 'SNACK_DELIVERY_BOT': {
      g.rect(7, 10, 18, 16).fill({ color: 0xf8fafc });
      g.rect(9, 4, 14, 7).fill({ color: 0x0f172a });
      g.rect(11, 6, 3, 2).fill({ color: 0x38bdf8 });
      g.rect(18, 6, 3, 2).fill({ color: 0x38bdf8 });
      g.rect(13, 14, 6, 7).fill({ color: 0xfdba74 });
      g.rect(15, 11, 2, 3).fill({ color: 0xec4899 });
      break;
    }

    case 'BOUNCING_SLIME': {
      const squish = pulse ? 2 : 0;
      g.rect(6 - squish, 10 + squish, 20 + squish * 2, 16 - squish).fill({
        color: 0x22c55e,
      });
      g.rect(8, 12 + squish, 16, 12 - squish).fill({ color: 0x4ade80 });
      g.rect(10, 13 + squish, 3, 2).fill({ color: 0xffffff });
      g.rect(11, 17, 2, 3).fill({ color: 0x0f172a });
      g.rect(19, 17, 2, 3).fill({ color: 0x0f172a });
      break;
    }

    // =========================================================================
    // CATEGORY E: TECH & OFFICE GEAR (8 TYPES)
    // =========================================================================
    case 'SERVER_RACK': {
      g.rect(5, 2, 22, 27).fill({ color: 0x0f172a });
      g.rect(7, 4, 18, 23).fill({ color: 0x1e293b });
      for (let i = 0; i < 5; i++) {
        g.rect(8, 5 + i * 4, 16, 3).fill({ color: 0x020617 });
        g.rect(10, 6 + i * 4, 2, 1).fill({
          color: (i + (pulse ? 1 : 0)) % 2 === 0 ? 0x22c55e : 0x38bdf8,
        });
        g.rect(14, 6 + i * 4, 2, 1).fill({ color: 0xf59e0b });
      }
      break;
    }

    case 'HOLOGRAM_GLOBE': {
      g.rect(8, 19, 16, 9).fill({ color: 0x334155 });
      g.rect(7, 4, 18, 14).fill({ color: 0x0ea5e9, alpha: 0.35 });
      g.rect(9, 6, 14, 10).fill({ color: 0x38bdf8 });
      g.rect(12 + (pulse ? 2 : 0), 8, 6, 5).fill({ color: 0x4ade80 });
      break;
    }

    case 'ARCADE_JUKEBOX': {
      g.rect(5, 3, 22, 25).fill({ color: 0x701a75 });
      g.rect(6, 4, 20, 4).fill({ color: pulse ? 0xfacc15 : 0xec4899 });
      g.rect(8, 9, 16, 10).fill({ color: 0x38bdf8 });
      g.rect(8, 20, 16, 6).fill({ color: 0x4a044e });
      break;
    }

    case 'PRINTER_3D': {
      g.rect(5, 4, 22, 24).fill({ color: 0x334155 });
      g.rect(8, 7, 16, 14).fill({ color: 0x020617 });
      const headX = 12 + Math.floor(wave * 4);
      g.rect(headX, 8, 4, 3).fill({ color: 0xf97316 });
      g.rect(12, 14, 8, 6).fill({ color: 0x38bdf8 });
      break;
    }

    case 'TELEPRESENCE_SCREEN': {
      g.rect(3, 4, widthPx - 6, 18).fill({ color: 0x1e293b });
      g.rect(5, 6, widthPx - 10, 14).fill({ color: 0x0284c7 });
      g.rect(12, 9, 14, 8).fill({ color: 0x38bdf8 });
      g.rect(34, 9, 18, 3).fill({ color: 0x4ade80 });
      g.rect(34, 14, 14, 3).fill({ color: 0xfacc15 });
      g.rect(12, 22, 4, 6).fill({ color: 0x475569 });
      g.rect(widthPx - 16, 22, 4, 6).fill({ color: 0x475569 });
      break;
    }

    case 'WHITEBOARD': {
      g.rect(4, 4, widthPx - 8, 18).fill({ color: 0x475569 });
      g.rect(6, 6, widthPx - 12, 14).fill({ color: 0xf8fafc });
      g.rect(10, 8, 6, 5).fill({ color: 0xfef08a });
      g.rect(18, 8, 6, 5).fill({ color: 0xbfdbfe });
      g.rect(28, 9, 18, 2).fill({ color: 0x334155 });
      g.rect(28, 13, 14, 2).fill({ color: 0xef4444 });
      g.rect(8, 22, 3, 7).fill({ color: 0x334155 });
      g.rect(widthPx - 11, 22, 3, 7).fill({ color: 0x334155 });
      break;
    }

    case 'BOOKSHELF':
    default: {
      g.rect(3, 3, widthPx - 6, 26).fill({ color: 0x451a03 });
      g.rect(5, 5, widthPx - 10, 9).fill({ color: 0x271202 });
      g.rect(5, 16, widthPx - 10, 9).fill({ color: 0x271202 });
      const colors = [0xef4444, 0x38bdf8, 0x22c55e, 0xf59e0b, 0xa855f7, 0xec4899];
      for (let i = 0; i < 10; i++) {
        g.rect(7 + i * 5, 6, 4, 8).fill({ color: colors[i % colors.length] });
        g.rect(7 + i * 5, 17, 4, 8).fill({ color: colors[(i + 2) % colors.length] });
      }
      break;
    }
  }
}

/**
 * Draws a 32x32px procedural pixel-art Agent character with directional orientation,
 * walking leg alternation, typing hands, and role-specific headgear/glasses.
 */
export function drawProceduralAgent(
  g: Graphics,
  colorHex: string,
  facing: Direction,
  isMoving: boolean,
  isWorking: boolean,
  walkFrame: number,
  avatarPreset = 'default_scientist',
): void {
  g.clear();
  drawAgentToPixiGraphics(
    g,
    colorHex,
    facing,
    isMoving,
    isWorking,
    walkFrame,
    avatarPreset,
  );
}
