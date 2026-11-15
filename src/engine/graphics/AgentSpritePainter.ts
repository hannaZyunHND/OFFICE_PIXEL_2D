import { Graphics } from 'pixi.js';
import type { Direction } from '@/types/blueprint';
import {
  getAgentAvatarPreset,
  type AgentAvatarLookSpec,
  type AgentAvatarPreset,
} from '@/data/agentAvatarCatalog';

export interface PixelRectTarget {
  rect(x: number, y: number, w: number, h: number, color: number, alpha?: number): void;
}

function darken(color: number, factor = 0.72): number {
  const r = Math.max(0, Math.floor(((color >> 16) & 0xff) * factor));
  const g = Math.max(0, Math.floor(((color >> 8) & 0xff) * factor));
  const b = Math.max(0, Math.floor((color & 0xff) * factor));
  return (r << 16) | (g << 8) | b;
}

function lighten(color: number, factor = 1.25): number {
  const r = Math.min(255, Math.floor(((color >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.floor(((color >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.floor((color & 0xff) * factor));
  return (r << 16) | (g << 8) | b;
}

function parseHexColor(hex: string): number {
  const cleaned = hex.replace('#', '').trim();
  const parsed = Number.parseInt(cleaned, 16);
  return Number.isNaN(parsed) ? 0x38bdf8 : parsed;
}

/**
 * Shared sprite painter that renders any of the 56+ pixel-art avatars into either
 * a Pixi.js Graphics instance or an offscreen HTML2D Canvas thumbnail.
 */
export function paintProceduralAgent(
  target: PixelRectTarget,
  colorHex: string,
  facing: Direction,
  isMoving: boolean,
  isWorking: boolean,
  walkFrame: number,
  avatarPreset = 'default_scientist',
): void {
  const preset: AgentAvatarPreset = getAgentAvatarPreset(avatarPreset);
  const look: AgentAvatarLookSpec = preset.look;
  const agentColor = parseHexColor(colorHex);

  const bob = isMoving && walkFrame % 2 === 1 ? -1.5 : 0;
  const leftStep = isMoving ? (walkFrame % 2 === 0 ? -1.5 : 1.5) : 0;
  const rightStep = -leftStep;
  const typeOffset = isWorking ? ((walkFrame % 2) * 1.5) : 0;

  const isCustomObject =
    look.silhouette === 'boba_cup' ||
    look.silhouette === 'toilet_paper' ||
    look.silhouette === 'coffee_cup' ||
    look.silhouette === 'cactus' ||
    look.silhouette === 'banana' ||
    look.silhouette === 'mushroom' ||
    look.silhouette === 'toast' ||
    look.silhouette === 'battery' ||
    look.silhouette === 'slime';

  // Gold aura backglow for Super Saiyan
  if (look.propBadge === 'aura_gold') {
    target.rect(-13, -24 + bob, 26, 28, 0xfef08a, 0.25);
    target.rect(-11, -26 + bob, 22, 4, 0xfacc15, 0.35);
    target.rect(-12, -16 + bob, 2, 8, 0xfacc15, 0.5);
    target.rect(10, -16 + bob, 2, 8, 0xfacc15, 0.5);
  }

  // Ground shadow
  target.rect(-8, 6, 16, 4, 0x020617, 0.45);

  if (isCustomObject) {
    paintCustomObjectSilhouette(target, preset, facing, bob, leftStep, rightStep, typeOffset);
    return;
  }

  // Suit/Torso base color: for default classic roles keep dynamic agentColor;
  // for themed presets keep their signature costume or subtle tint.
  const usesDynamicSuit = look.suitHex === undefined;
  const suitColor = usesDynamicSuit ? agentColor : look.suitHex!;
  const suitDark = darken(suitColor, 0.72);
  const accentColor = look.accentHex ?? agentColor;

  // Back-facing crimson cape
  if (look.propBadge === 'cape_red') {
    const capeColor = 0xdc2626;
    target.rect(-9, -6 + bob, 18, 12, darken(capeColor, 0.8));
    if (facing === 'UP') {
      target.rect(-8, -7 + bob, 16, 13, capeColor);
    }
  }

  // Rooster tail feathers (visible on UP / LEFT / RIGHT)
  if (look.silhouette === 'rooster') {
    const tailX = facing === 'LEFT' ? 6 : facing === 'RIGHT' ? -10 : -5;
    target.rect(tailX, -4 + bob, 4, 6, 0xef4444);
    target.rect(tailX + (facing === 'LEFT' ? 2 : -1), -6 + bob, 3, 5, 0x16a34a);
    target.rect(tailX + 1, -2 + bob, 3, 4, 0xfacc15);
  }

  // T-Rex spiky green tail / Fox fluffy tail / Cat tail
  if (look.silhouette === 'trex') {
    const tailX = facing === 'LEFT' ? 6 : facing === 'RIGHT' ? -12 : -2;
    target.rect(tailX, 1 + bob, 6, 4, look.skinHex);
    target.rect(tailX + (facing === 'LEFT' ? 2 : 0), -1 + bob, 2, 2, 0xfde047);
  } else if (look.silhouette === 'fox' || look.silhouette === 'cat_ears') {
    const tailX = facing === 'LEFT' ? 6 : facing === 'RIGHT' ? -10 : 5;
    target.rect(tailX, 0 + bob, 4, 6, look.skinHex);
    if (look.silhouette === 'fox') {
      target.rect(tailX + (facing === 'RIGHT' ? 0 : 1), 0 + bob, 3, 2, 0xf8fafc);
    }
  }

  // 1. Feet / Boots / Claws
  const bootColor =
    look.silhouette === 'rooster' || look.silhouette === 'duck' || look.silhouette === 'penguin'
      ? 0xf97316
      : 0x0f172a;
  target.rect(-5, 3 + leftStep, 4, 5, bootColor);
  target.rect(1, 3 + rightStep, 4, 5, bootColor);

  // 2. Torso & Outfit
  const isMuscular = look.silhouette === 'bodybuilder';
  const torsoW = isMuscular ? 16 : 14;
  const torsoX = isMuscular ? -8 : -7;

  if (isMuscular) {
    // Broad tanned muscular chest + abs + shorts
    target.rect(torsoX, -7 + bob, torsoW, 8, look.skinHex);
    target.rect(-5, -5 + bob, 4, 3, darken(look.skinHex, 0.88));
    target.rect(1, -5 + bob, 4, 3, darken(look.skinHex, 0.88));
    target.rect(-3, -2 + bob, 2, 2, darken(look.skinHex, 0.85));
    target.rect(1, -2 + bob, 2, 2, darken(look.skinHex, 0.85));
    target.rect(-6, 1 + bob, 12, 3, suitColor); // gym trunks/shorts
  } else {
    target.rect(torsoX, -7 + bob, torsoW, 11, suitColor);
    target.rect(torsoX, 1 + bob, torsoW, 3, suitDark);
  }

  // Special torso details
  if (look.silhouette === 'penguin' || look.silhouette === 'panda') {
    if (facing !== 'UP') {
      target.rect(-4, -5 + bob, 8, 8, 0xf8fafc);
    }
  } else if (look.silhouette === 'rooster') {
    target.rect(-7, -7 + bob, 14, 10, 0xf8fafc);
    target.rect(-8, -5 + bob, 2, 6, 0xe2e8f0);
    target.rect(6, -5 + bob, 2, 6, 0xe2e8f0);
  } else if (look.silhouette === 'robot_mech' || look.silhouette === 'robot_crt') {
    // Glowing core LED on chest
    target.rect(-2, -4 + bob, 4, 4, accentColor);
    target.rect(-1, -3 + bob, 2, 2, 0xffffff, 0.8);
  } else if (look.silhouette === 'robot_round') {
    // Belly pocket
    if (facing !== 'UP') {
      target.rect(-4, -5 + bob, 8, 7, 0xf8fafc);
      target.rect(-3, -2 + bob, 6, 3, 0xe2e8f0);
    }
  } else if (!isMuscular && facing !== 'UP') {
    // Inner shirt / tie / apron / bowtie
    target.rect(-2, -7 + bob, 4, 4, 0xf8fafc);
    if (look.propBadge === 'bowtie') {
      target.rect(-3, -7 + bob, 6, 2, accentColor);
    } else if (look.propBadge === 'bell') {
      target.rect(-4, -7 + bob, 8, 2, 0xef4444);
      target.rect(-2, -6 + bob, 4, 3, 0xfacc15);
    } else if (look.propBadge === 'apron') {
      target.rect(-4, -5 + bob, 8, 8, 0xf8fafc);
    } else {
      target.rect(-1, -6 + bob, 2, 5, darken(accentColor, 0.85));
    }
  }

  // 3. Arms
  const armSkin =
    look.silhouette === 'bodybuilder'
      ? look.skinHex
      : look.silhouette === 'rooster' || look.silhouette === 'penguin'
        ? suitColor
        : suitDark;
  if (isMuscular) {
    // Thicker biceps
    target.rect(-11, -7 + bob, 3, 7, armSkin);
    target.rect(8, -7 + bob, 3, 7, armSkin);
    if (look.propBadge === 'dumbbell') {
      target.rect(9, -1 + bob, 6, 2, 0x64748b);
      target.rect(8, -2 + bob, 2, 4, 0x0f172a);
      target.rect(14, -2 + bob, 2, 4, 0x0f172a);
    }
  } else if (isWorking) {
    target.rect(-9, -6 + bob + typeOffset, 3, 6, armSkin);
    target.rect(6, -6 + bob - typeOffset, 3, 6, armSkin);
    if (facing !== 'UP') {
      target.rect(-8, 0 + bob + typeOffset, 3, 2, look.skinHex);
      target.rect(5, 0 + bob - typeOffset, 3, 2, look.skinHex);
    }
  } else {
    target.rect(-9, -6 + bob, 2, 7, armSkin);
    target.rect(7, -6 + bob, 2, 7, armSkin);
  }

  // Held Coffee Prop
  if (look.propBadge === 'coffee' && facing !== 'UP') {
    target.rect(7, -3 + bob, 4, 5, 0xf8fafc);
    target.rect(8, -3 + bob, 2, 1, 0x78350f);
  }

  // 4. Head Base
  const headColor = look.skinHex;
  if (look.silhouette === 'robot_crt') {
    // Monitor Box Head
    target.rect(-8, -20 + bob, 16, 13, headColor);
    target.rect(-6, -18 + bob, 12, 9, 0x0f172a); // CRT screen bezel
    if (facing !== 'UP') {
      // Glowing pixel CRT eyes + smile
      target.rect(-4, -15 + bob, 2, 3, accentColor);
      target.rect(2, -15 + bob, 2, 3, accentColor);
      target.rect(-2, -11 + bob, 4, 1, accentColor);
    }
  } else if (look.silhouette === 'robot_round') {
    target.rect(-7, -20 + bob, 14, 12, headColor);
    target.rect(-6, -21 + bob, 12, 2, headColor);
    if (facing !== 'UP') {
      target.rect(-5, -17 + bob, 10, 8, 0xf8fafc);
      target.rect(-3, -15 + bob, 2, 2, 0x0f172a);
      target.rect(1, -15 + bob, 2, 2, 0x0f172a);
      target.rect(-1, -12 + bob, 2, 2, 0xef4444); // cute red nose
      target.rect(-4, -11 + bob, 8, 1, 0x334155);
    }
  } else if (look.silhouette === 'robot_mech') {
    target.rect(-8, -20 + bob, 16, 12, headColor);
    target.rect(-9, -8 + bob, 18, 3, darken(suitColor, 0.85)); // armored shoulders
    if (facing !== 'UP') {
      target.rect(-5, -16 + bob, 10, 3, 0x020617);
      target.rect(-4, -15 + bob, 8, 2, accentColor);
    }
  } else if (look.silhouette === 'frog') {
    // Bulging frog eye bumps on top!
    target.rect(-7, -18 + bob, 14, 11, headColor);
    target.rect(-6, -22 + bob, 5, 5, headColor);
    target.rect(1, -22 + bob, 5, 5, headColor);
    if (facing !== 'UP') {
      target.rect(-5, -21 + bob, 3, 3, 0xf8fafc);
      target.rect(2, -21 + bob, 3, 3, 0xf8fafc);
      target.rect(-4, -20 + bob, 2, 2, 0x0f172a);
      target.rect(3, -20 + bob, 2, 2, 0x0f172a);
      target.rect(-4, -11 + bob, 8, 2, 0x15803d); // chill frog lips
    }
  } else {
    // Standard rounded pixel head
    target.rect(-6, -19 + bob, 12, 12, headColor);
    target.rect(-7, -17 + bob, 1, 8, headColor);
    target.rect(6, -17 + bob, 1, 8, headColor);
    paintStandardHeadDetails(target, preset, facing, bob, accentColor);
  }

  // 5. Hair Styles (layered cleanly on standard/robot_mech heads)
  if (
    look.silhouette === 'standard' ||
    look.silhouette === 'bodybuilder' ||
    look.silhouette === 'robot_mech'
  ) {
    paintHair(target, look, facing, bob);
  }

  // 6. Headgear (crowns, combs, hats, helmets, tangerine!)
  paintHeadgear(target, look, facing, bob, accentColor);

  // 7. Eyewear / Beaks
  if (facing !== 'UP') {
    paintEyewearAndBeak(target, look, facing, bob, accentColor);
  }
}

function paintStandardHeadDetails(
  target: PixelRectTarget,
  preset: AgentAvatarPreset,
  facing: Direction,
  bob: number,
  accentColor: number,
): void {
  const { look } = preset;

  // Ears on top for animals
  if (look.silhouette === 'cat_ears' || look.silhouette === 'fox') {
    target.rect(-6, -23 + bob, 4, 4, look.skinHex);
    target.rect(2, -23 + bob, 4, 4, look.skinHex);
    target.rect(-5, -22 + bob, 2, 2, look.silhouette === 'fox' ? 0xf8fafc : 0xfda4af);
    target.rect(3, -22 + bob, 2, 2, look.silhouette === 'fox' ? 0xf8fafc : 0xfda4af);
  } else if (look.silhouette === 'dog_ears') {
    target.rect(-7, -22 + bob, 3, 5, darken(look.skinHex, 0.72));
    target.rect(4, -22 + bob, 3, 5, darken(look.skinHex, 0.72));
  } else if (look.silhouette === 'bunny_ears') {
    target.rect(-5, -26 + bob, 3, 7, look.skinHex);
    target.rect(2, -26 + bob, 3, 7, look.skinHex);
    if (preset.id === 'anime_electric_mouse') {
      target.rect(-5, -26 + bob, 3, 2, 0x0f172a);
      target.rect(2, -26 + bob, 3, 2, 0x0f172a);
    } else {
      target.rect(-4, -25 + bob, 1, 5, 0xfda4af);
      target.rect(3, -25 + bob, 1, 5, 0xfda4af);
    }
  } else if (look.silhouette === 'panda') {
    target.rect(-7, -21 + bob, 4, 4, 0x0f172a);
    target.rect(3, -21 + bob, 4, 4, 0x0f172a);
  } else if (look.silhouette === 'shark') {
    target.rect(-2, -24 + bob, 4, 5, 0x475569); // Dorsal fin!
    target.rect(-1, -25 + bob, 2, 2, 0x475569);
  } else if (look.silhouette === 'trex') {
    target.rect(-2, -21 + bob, 4, 2, 0xfde047);
    if (facing === 'LEFT') {
      target.rect(-9, -16 + bob, 4, 6, look.skinHex);
    } else if (facing === 'RIGHT') {
      target.rect(5, -16 + bob, 4, 6, look.skinHex);
    }
  } else if (look.silhouette === 'capybara') {
    target.rect(-6, -21 + bob, 2, 2, darken(look.skinHex, 0.75));
    target.rect(4, -21 + bob, 2, 2, darken(look.skinHex, 0.75));
  }

  if (facing === 'UP') {
    return;
  }

  // Face markings + Eyes
  if (look.silhouette === 'panda') {
    target.rect(-5, -15 + bob, 4, 4, 0x0f172a);
    target.rect(1, -15 + bob, 4, 4, 0x0f172a);
    target.rect(-4, -14 + bob, 2, 2, 0xf8fafc);
    target.rect(2, -14 + bob, 2, 2, 0xf8fafc);
    return;
  }

  if (look.silhouette === 'capybara') {
    // Chill half-closed zen eyes + darker muzzle
    target.rect(-3, -12 + bob, 6, 4, darken(look.skinHex, 0.75));
    target.rect(-4, -14 + bob, 3, 1, 0x0f172a);
    target.rect(1, -14 + bob, 3, 1, 0x0f172a);
    return;
  }

  if (look.silhouette === 'shark') {
    target.rect(-4, -12 + bob, 8, 4, 0xf8fafc); // shark white jaw + teeth
    target.rect(-3, -11 + bob, 1, 2, 0x0f172a);
    target.rect(-1, -11 + bob, 1, 2, 0x0f172a);
    target.rect(1, -11 + bob, 1, 2, 0x0f172a);
    target.rect(3, -11 + bob, 1, 2, 0x0f172a);
  }

  if (facing === 'DOWN') {
    target.rect(-4, -13 + bob, 2, 3, 0x0f172a);
    target.rect(2, -13 + bob, 2, 3, 0x0f172a);
    target.rect(-4, -13 + bob, 1, 1, 0xffffff);
    target.rect(2, -13 + bob, 1, 1, 0xffffff);

    if (preset.id === 'anime_electric_mouse') {
      target.rect(-6, -10 + bob, 2, 2, 0xef4444);
      target.rect(4, -10 + bob, 2, 2, 0xef4444);
    } else if (look.silhouette === 'cat_ears' || look.silhouette === 'fox' || look.silhouette === 'dog_ears') {
      target.rect(-1, -11 + bob, 2, 2, 0x0f172a); // cute nose
    } else if (look.silhouette === 'rooster') {
      target.rect(-1, -10 + bob, 2, 3, 0xef4444); // red rooster wattle!
    }
  } else if (facing === 'LEFT') {
    target.rect(-5, -13 + bob, 2, 3, 0x0f172a);
  } else if (facing === 'RIGHT') {
    target.rect(3, -13 + bob, 2, 3, 0x0f172a);
  }

  // Ninja whisker marks
  if (preset.id === 'anime_leaf_ninja' && facing === 'DOWN') {
    target.rect(-6, -11 + bob, 2, 1, 0xd97706);
    target.rect(4, -11 + bob, 2, 1, 0xd97706);
  }
  void accentColor;
}

function paintHair(
  target: PixelRectTarget,
  look: AgentAvatarLookSpec,
  facing: Direction,
  bob: number,
): void {
  const hairStyle = look.hairStyle ?? 'none';
  if (hairStyle === 'none') return;
  const hair = look.hairHex ?? 0x1e293b;

  if (hairStyle === 'hood') {
    target.rect(-7, -21 + bob, 14, 5, hair);
    target.rect(-7, -18 + bob, 2, 11, hair);
    target.rect(5, -18 + bob, 2, 11, hair);
    return;
  }

  if (hairStyle === 'spiky_gold' || hairStyle === 'spiky_white' || hairStyle === 'spiky_black') {
    target.rect(-7, -21 + bob, 14, 4, hair);
    target.rect(-8, -24 + bob, 3, 4, hair);
    target.rect(-3, -26 + bob, 4, 6, hair);
    target.rect(2, -25 + bob, 4, 5, hair);
    target.rect(5, -22 + bob, 3, 3, hair);
    if (facing === 'UP') {
      target.rect(-6, -18 + bob, 12, 10, hair);
    }
    return;
  }

  if (hairStyle === 'rock_mohawk') {
    target.rect(-2, -26 + bob, 4, 7, hair);
    target.rect(-1, -28 + bob, 2, 3, lighten(hair, 1.2));
    return;
  }

  if (hairStyle === 'twin_pink') {
    target.rect(-7, -21 + bob, 14, 4, hair);
    target.rect(-9, -18 + bob, 3, 12, hair);
    target.rect(6, -18 + bob, 3, 12, hair);
    return;
  }

  // Standard hair styles
  target.rect(-7, -21 + bob, 14, 4, hair);
  if (facing === 'UP') {
    target.rect(-6, -19 + bob, 12, 11, hair);
  } else if (hairStyle === 'long') {
    target.rect(-7, -17 + bob, 2, 11, hair);
    target.rect(5, -17 + bob, 2, 11, hair);
  } else if (hairStyle === 'bun') {
    target.rect(-3, -24 + bob, 6, 3, hair);
  }
}

function paintHeadgear(
  target: PixelRectTarget,
  look: AgentAvatarLookSpec,
  facing: Direction,
  bob: number,
  accentColor: number,
): void {
  const headgear = look.headgear ?? 'none';
  if (headgear === 'none') return;

  if (headgear === 'crown') {
    target.rect(-5, -24 + bob, 10, 3, 0xfacc15);
    target.rect(-5, -26 + bob, 2, 2, 0xfacc15);
    target.rect(-1, -27 + bob, 2, 3, 0xfacc15);
    target.rect(3, -26 + bob, 2, 2, 0xfacc15);
    target.rect(-1, -24 + bob, 2, 2, 0xef4444);
  } else if (headgear === 'rooster_comb') {
    target.rect(-4, -23 + bob, 8, 4, 0xef4444);
    target.rect(-3, -25 + bob, 2, 3, 0xdc2626);
    target.rect(0, -26 + bob, 2, 4, 0xef4444);
    target.rect(3, -24 + bob, 2, 3, 0xdc2626);
  } else if (headgear === 'headband_red') {
    target.rect(-7, -18 + bob, 14, 2, 0xef4444);
  } else if (headgear === 'headband_ninja') {
    target.rect(-7, -18 + bob, 14, 3, 0x1e293b);
    if (facing !== 'UP') {
      target.rect(-3, -18 + bob, 6, 2, 0x94a3b8);
    }
  } else if (headgear === 'chef_hat') {
    target.rect(-6, -24 + bob, 12, 4, 0xf8fafc);
    target.rect(-7, -28 + bob, 14, 5, 0xffffff);
  } else if (headgear === 'astronaut_helmet') {
    target.rect(-8, -22 + bob, 16, 15, 0xf8fafc, 0.35);
    target.rect(-8, -22 + bob, 16, 2, 0xf8fafc);
    target.rect(-8, -9 + bob, 16, 2, 0x94a3b8);
  } else if (headgear === 'pirate_hat') {
    target.rect(-9, -21 + bob, 18, 3, 0x0f172a);
    target.rect(-6, -26 + bob, 12, 5, 0x0f172a);
    target.rect(-2, -24 + bob, 4, 2, 0xf8fafc);
  } else if (headgear === 'straw_hat') {
    target.rect(-10, -20 + bob, 20, 2, 0xfde047);
    target.rect(-6, -24 + bob, 12, 4, 0xfacc15);
    target.rect(-6, -21 + bob, 12, 1, 0xef4444);
  } else if (headgear === 'wizard_hat') {
    target.rect(-9, -20 + bob, 18, 2, 0x4c1d95);
    target.rect(-5, -24 + bob, 10, 4, 0x5b21b6);
    target.rect(-3, -28 + bob, 6, 4, 0x6d28d9);
    target.rect(-1, -30 + bob, 2, 2, 0xfacc15);
  } else if (headgear === 'knight_visor') {
    target.rect(-7, -21 + bob, 14, 13, 0x94a3b8);
    target.rect(-2, -25 + bob, 4, 4, 0xef4444);
    if (facing !== 'UP') {
      target.rect(-5, -15 + bob, 10, 2, 0x0f172a);
    }
  } else if (headgear === 'detective_cap') {
    target.rect(-8, -20 + bob, 16, 3, 0x78350f);
    target.rect(-6, -23 + bob, 12, 3, 0x92400e);
  } else if (headgear === 'tangerine') {
    // Capybara signature mini orange fruit balanced on top of head!
    target.rect(-2, -24 + bob, 5, 5, 0xf97316);
    target.rect(0, -25 + bob, 2, 2, 0x22c55e);
  } else if (headgear === 'antenna') {
    target.rect(-1, -25 + bob, 2, 5, 0x94a3b8);
    target.rect(-2, -27 + bob, 4, 3, accentColor);
  }
}

function paintEyewearAndBeak(
  target: PixelRectTarget,
  look: AgentAvatarLookSpec,
  facing: Direction,
  bob: number,
  accentColor: number,
): void {
  const eyewear = look.eyewear ?? 'none';
  if (eyewear === 'glasses') {
    if (facing === 'DOWN') {
      target.rect(-5, -14 + bob, 4, 3, 0x020617);
      target.rect(1, -14 + bob, 4, 3, 0x020617);
      target.rect(-4, -13 + bob, 2, 1, 0x38bdf8);
      target.rect(2, -13 + bob, 2, 1, 0x38bdf8);
      target.rect(-1, -13 + bob, 2, 1, 0x020617);
    }
  } else if (eyewear === 'sunglasses') {
    target.rect(-5, -14 + bob, 10, 3, 0x020617);
    target.rect(-4, -14 + bob, 2, 1, 0xffffff, 0.6);
    target.rect(2, -14 + bob, 2, 1, 0xffffff, 0.6);
  } else if (eyewear === 'blindfold') {
    target.rect(-6, -15 + bob, 12, 4, 0x020617);
  } else if (eyewear === 'cyber_visor') {
    target.rect(-6, -15 + bob, 12, 4, 0x020617);
    target.rect(-5, -14 + bob, 10, 2, accentColor);
  } else if (eyewear === 'eyepatch') {
    target.rect(-5, -14 + bob, 4, 3, 0x020617);
    target.rect(-6, -15 + bob, 12, 1, 0x020617);
  } else if (eyewear === 'beak') {
    const beakX = facing === 'LEFT' ? -8 : facing === 'RIGHT' ? 4 : -2;
    target.rect(beakX, -12 + bob, 5, 3, 0xf97316);
    target.rect(beakX + 1, -11 + bob, 3, 1, 0xfde047);
  }
}

function paintCustomObjectSilhouette(
  target: PixelRectTarget,
  preset: AgentAvatarPreset,
  facing: Direction,
  bob: number,
  leftStep: number,
  rightStep: number,
  typeOffset: number,
): void {
  const { look } = preset;

  // Tiny legs underneath funny objects
  target.rect(-4, 3 + leftStep, 3, 4, 0x0f172a);
  target.rect(1, 3 + rightStep, 3, 4, 0x0f172a);

  if (look.silhouette === 'boba_cup') {
    // Cup + milk tea + pearls + pink dome lid + black straw
    target.rect(-1, -28 + bob, 3, 9, 0x0f172a); // straw
    target.rect(-7, -19 + bob, 14, 4, 0xf472b6); // lid
    target.rect(-6, -15 + bob, 12, 18, 0xfde68a); // milk tea
    target.rect(-6, -4 + bob, 12, 7, 0xd97706); // brown sugar swirl
    // Boba pearls
    target.rect(-4, 0 + bob, 2, 2, 0x1c1917);
    target.rect(-1, 1 + bob, 2, 2, 0x1c1917);
    target.rect(2, 0 + bob, 2, 2, 0x1c1917);
    if (facing !== 'UP') {
      target.rect(-4, -10 + bob, 2, 2, 0x0f172a);
      target.rect(2, -10 + bob, 2, 2, 0x0f172a);
    }
    return;
  }

  if (look.silhouette === 'cactus') {
    // Terracotta pot
    target.rect(-6, -4 + bob, 12, 7, 0xb45309);
    target.rect(-7, -6 + bob, 14, 3, 0xd97706);
    // Green cactus body + arms + yellow top flower
    target.rect(-5, -20 + bob, 10, 14, 0x16a34a);
    target.rect(-9, -15 + bob, 4, 5, 0x22c55e);
    target.rect(-9, -17 + bob, 3, 3, 0x22c55e);
    target.rect(5, -13 + bob, 4, 5, 0x22c55e);
    target.rect(-2, -23 + bob, 4, 3, 0xfacc15); // blossom
    if (facing !== 'UP') {
      target.rect(-4, -15 + bob, 8, 3, 0x020617); // sunglasses!
    }
    return;
  }

  if (look.silhouette === 'toilet_paper') {
    // White plush cylinder + cardboard core + loose sheet
    target.rect(-7, -18 + bob, 14, 21, 0xf8fafc);
    target.rect(-5, -19 + bob, 10, 3, 0xe2e8f0);
    target.rect(-2, -19 + bob, 4, 2, 0x78350f); // core hole
    target.rect(4, -8 + bob, 5, 9, 0xffffff); // dangling square!
    if (facing !== 'UP') {
      target.rect(-4, -11 + bob, 3, 3, 0x0f172a);
      target.rect(1, -11 + bob, 3, 3, 0x0f172a);
      target.rect(-3, -10 + bob, 1, 1, 0xffffff);
      target.rect(2, -10 + bob, 1, 1, 0xffffff);
    }
    return;
  }

  if (look.silhouette === 'coffee_cup') {
    // Steam wisps
    target.rect(-4, -26 + bob + typeOffset, 2, 4, 0xe2e8f0, 0.7);
    target.rect(1, -27 + bob - typeOffset, 2, 5, 0xe2e8f0, 0.7);
    // Ceramic mug + sleeve + handle
    target.rect(-7, -18 + bob, 14, 20, 0xf8fafc);
    target.rect(7, -14 + bob, 3, 9, 0xe2e8f0); // handle
    target.rect(-7, -10 + bob, 14, 7, 0x92400e); // craft sleeve
    target.rect(-6, -18 + bob, 12, 2, 0x78350f); // espresso top
    if (facing !== 'UP') {
      target.rect(-4, -14 + bob, 2, 2, 0x0f172a);
      target.rect(2, -14 + bob, 2, 2, 0x0f172a);
    }
    return;
  }

  if (look.silhouette === 'banana') {
    target.rect(-2, -25 + bob, 4, 4, 0x78350f); // stem
    target.rect(-5, -21 + bob, 10, 24, 0xfde047);
    target.rect(-6, -14 + bob, 12, 13, 0xfacc15);
    if (facing !== 'UP') {
      target.rect(-4, -15 + bob, 8, 3, 0x020617); // sunglasses
      target.rect(-1, -10 + bob, 2, 8, 0xef4444); // formal necktie!
    }
    return;
  }

  if (look.silhouette === 'mushroom') {
    target.rect(-9, -20 + bob, 18, 10, 0xdc2626);
    target.rect(-7, -23 + bob, 14, 4, 0xef4444);
    target.rect(-6, -19 + bob, 3, 3, 0xf8fafc);
    target.rect(2, -20 + bob, 4, 4, 0xf8fafc);
    target.rect(-5, -10 + bob, 10, 13, 0xfef3c7);
    if (facing !== 'UP') {
      target.rect(-3, -6 + bob, 2, 3, 0x0f172a);
      target.rect(1, -6 + bob, 2, 3, 0x0f172a);
    }
    return;
  }

  if (look.silhouette === 'toast') {
    target.rect(-7, -18 + bob, 14, 20, 0x92400e); // brown crust
    target.rect(-5, -16 + bob, 10, 16, 0xfde68a); // crumb
    target.rect(-2, -14 + bob, 4, 4, 0xfacc15); // melting butter pat!
    if (facing !== 'UP') {
      target.rect(-4, -8 + bob, 2, 2, 0x0f172a);
      target.rect(2, -8 + bob, 2, 2, 0x0f172a);
      target.rect(-2, -4 + bob, 4, 1, 0x0f172a);
    }
    return;
  }

  if (look.silhouette === 'battery') {
    target.rect(-3, -22 + bob, 6, 3, 0x94a3b8); // + terminal
    target.rect(-7, -19 + bob, 14, 21, 0x1e293b);
    target.rect(-5, -16 + bob, 10, 4, 0x22c55e);
    target.rect(-5, -11 + bob, 10, 4, 0x4ade80);
    target.rect(-5, -6 + bob, 10, 5, 0x22c55e);
    if (facing !== 'UP') {
      target.rect(-3, -10 + bob, 2, 2, 0x020617);
      target.rect(1, -10 + bob, 2, 2, 0x020617);
    }
    return;
  }

  // Slime King
  target.rect(-8, -12 + bob, 16, 15, look.skinHex);
  target.rect(-6, -16 + bob, 12, 6, look.skinHex);
  target.rect(-5, -14 + bob, 3, 2, 0xe0f2fe);
  // Gold crown on top
  target.rect(-4, -20 + bob, 8, 3, 0xfacc15);
  target.rect(-4, -22 + bob, 2, 2, 0xfacc15);
  target.rect(-1, -23 + bob, 2, 3, 0xfacc15);
  target.rect(2, -22 + bob, 2, 2, 0xfacc15);
  if (facing !== 'UP') {
    target.rect(-4, -9 + bob, 2, 3, 0x0f172a);
    target.rect(2, -9 + bob, 2, 3, 0x0f172a);
  }
}

/**
 * Draw into PixiJS Graphics directly.
 */
export function drawAgentToPixiGraphics(
  g: Graphics,
  colorHex: string,
  facing: Direction,
  isMoving: boolean,
  isWorking: boolean,
  walkFrame: number,
  avatarPreset = 'default_scientist',
): void {
  paintProceduralAgent(
    {
      rect(x, y, w, h, color, alpha = 1) {
        g.rect(x + 16, y + 20, w, h).fill({ color, alpha });
      },
    },
    colorHex,
    facing,
    isMoving,
    isWorking,
    walkFrame,
    avatarPreset,
  );
}

const PREVIEW_CACHE = new Map<string, string>();

/**
 * Renders any avatar preset onto a crisp 48x48 pixelated HTML2D canvas data URL
 * so Vue components (Agent Inspector Picker, Drama Bubble, Cards) show true
 * live pixel-art previews without duplicating a single drawing pixel!
 */
export function renderAgentAvatarToDataUrl(
  avatarPreset: string,
  colorHex = '#38BDF8',
): string {
  const key = `${avatarPreset}__${colorHex}`;
  const cached = PREVIEW_CACHE.get(key);
  if (cached) return cached;
  if (typeof document === 'undefined') return '';

  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 48;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.save();
  ctx.translate(24, 35);
  ctx.scale(1.1, 1.1);

  paintProceduralAgent(
    {
      rect(x, y, w, h, color, alpha = 1) {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
        ctx.fillRect(x, y, w, h);
      },
    },
    colorHex,
    'DOWN',
    false,
    false,
    0,
    avatarPreset,
  );

  ctx.restore();
  const dataUrl = canvas.toDataURL('image/png');
  PREVIEW_CACHE.set(key, dataUrl);
  return dataUrl;
}
