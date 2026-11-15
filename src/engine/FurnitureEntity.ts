import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import {
  getCanonicalFootprint,
  isRoamingFurnitureType,
  type FurnitureItem,
  type FurnitureType,
} from '@/types/blueprint';
import { drawProceduralFurniture } from './graphics/ProceduralSprites';

const ANIMATED_FURNITURE_TYPES = new Set<FurnitureType>([
  'POOL_TABLE',
  'PING_PONG_TABLE',
  'ARCADE_CABINET',
  'CLAW_MACHINE',
  'PINBALL_MACHINE',
  'VR_SIMULATOR_POD',
  'KARAOKE_BOOTH',
  'COFFEE_MACHINE',
  'MINI_BAR_COUNTER',
  'MICROWAVE_STAND',
  'VENDING_MACHINE',
  'RAMEN_NOODLE_BAR',
  'POPCORN_CART',
  'PIZZA_OVEN_COUNTER',
  'ECO_BIOME_DOME',
  'KOI_POND',
  'CHERRY_BLOSSOM_TREE',
  'INDOOR_FOUNTAIN',
  'HAMMOCK_STAND',
  'AQUARIUM',
  'SERVER_RACK',
  'HOLOGRAM_GLOBE',
  'ARCADE_JUKEBOX',
  'PRINTER_3D',
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

const HOPPING_MOVER_TYPES = new Set<FurnitureType>([
  'OFFICE_CAT',
  'CORGI_DOG',
  'ROBO_DOG',
  'RUBBER_DUCK_CART',
  'PENGUIN_MASCOT',
  'BOUNCING_SLIME',
]);

export class FurnitureEntity {
  public readonly container: Container;
  private readonly graphics: Graphics;
  private readonly selectionOutline: Graphics;
  private customSprite: Sprite | null = null;
  public item: FurnitureItem;
  private isWorkingActive = false;
  private agentColorHex = '#38bdf8';
  private animPhase = Math.random() * 10;
  private isSelected = false;

  // Roaming state for moving pets, robots, and silly props
  public readonly isRoaming: boolean;
  private isEditMode = false;
  private roamFromX: number;
  private roamFromY: number;
  private roamToX: number;
  private roamToY: number;
  private roamProgress = 1;
  private roamWaitTimer = 0.2;
  private lastDir: [number, number] = [1, 0];
  private readonly canRoamToTile?: (gx: number, gy: number) => boolean;

  constructor(
    item: FurnitureItem,
    agentColorHex = '#38bdf8',
    onClick?: (item: FurnitureItem) => void,
    canRoamToTile?: (gx: number, gy: number) => boolean,
  ) {
    this.item = { ...item };
    this.agentColorHex = agentColorHex;
    this.isRoaming = isRoamingFurnitureType(item.type);
    this.canRoamToTile = canRoamToTile;

    this.roamFromX = item.x;
    this.roamFromY = item.y;
    this.roamToX = item.x;
    this.roamToY = item.y;

    this.container = new Container();
    this.container.eventMode = 'static';
    this.container.cursor = 'pointer';

    this.graphics = new Graphics();
    this.selectionOutline = new Graphics();

    this.container.addChild(this.graphics);
    this.container.addChild(this.selectionOutline);

    if (onClick) {
      this.container.on('pointertap', (e) => {
        e.stopPropagation();
        onClick(this.item);
      });
    }

    this.syncPosition();
    this.redraw();
  }

  public syncPosition(): void {
    this.roamFromX = this.item.x;
    this.roamFromY = this.item.y;
    this.roamToX = this.item.x;
    this.roamToY = this.item.y;
    this.roamProgress = 1;
    this.container.x = this.item.x * 32;
    this.container.y = this.item.y * 32;
    this.container.zIndex = (this.item.y + this.item.footprint[1]) * 32;
  }

  public setEditMode(editMode: boolean): void {
    this.isEditMode = editMode;
    if (editMode && this.isRoaming) {
      this.syncPosition();
    }
  }

  public setWorkingActive(active: boolean, agentColorHex?: string): void {
    const changed =
      this.isWorkingActive !== active ||
      (agentColorHex !== undefined && this.agentColorHex !== agentColorHex);
    this.isWorkingActive = active;
    if (agentColorHex) this.agentColorHex = agentColorHex;
    if (changed) {
      this.redraw();
    }
  }

  public setSelected(selected: boolean): void {
    if (this.isSelected === selected) return;
    this.isSelected = selected;
    this.drawSelectionOutline();
  }

  public setCustomTexture(texture: Texture | null): void {
    if (!texture) {
      if (this.customSprite) {
        this.container.removeChild(this.customSprite);
        this.customSprite.destroy();
        this.customSprite = null;
      }
      this.graphics.visible = true;
      this.redraw();
      return;
    }

    this.graphics.visible = false;
    if (!this.customSprite) {
      this.customSprite = new Sprite(texture);
      this.container.addChildAt(this.customSprite, 0);
    } else {
      this.customSprite.texture = texture;
    }
    this.applyCustomSpriteTransform();
  }

  public isQuarterTurnRotated(): boolean {
    return this.item.facing === 'RIGHT' || this.item.facing === 'LEFT';
  }

  public getVisualScale(): number {
    const [canonW, canonH] = getCanonicalFootprint(this.item.type);
    if (typeof this.item.scale === 'number' && this.item.scale > 0) {
      return this.item.scale;
    }
    const baseW = this.isQuarterTurnRotated() ? canonH : canonW;
    const baseH = this.isQuarterTurnRotated() ? canonW : canonH;
    return Math.max(
      this.item.footprint[0] / baseW,
      this.item.footprint[1] / baseH,
      0.5,
    );
  }

  public getVisualPixelWidth(): number {
    const [canonW, canonH] = getCanonicalFootprint(this.item.type);
    const baseW = this.isQuarterTurnRotated() ? canonH : canonW;
    return Math.round(baseW * 32 * this.getVisualScale());
  }

  public getVisualPixelHeight(): number {
    const [canonW, canonH] = getCanonicalFootprint(this.item.type);
    const baseH = this.isQuarterTurnRotated() ? canonW : canonH;
    return Math.round(baseH * 32 * this.getVisualScale());
  }

  private applyGraphicsOrientation(): void {
    const scaleFactor = this.getVisualScale();
    const boxW = this.getVisualPixelWidth();
    const boxH = this.getVisualPixelHeight();

    this.graphics.scale.set(scaleFactor, scaleFactor);
    if (this.item.facing === 'RIGHT') {
      this.graphics.rotation = Math.PI / 2;
      this.graphics.position.set(boxW, 0);
    } else if (this.item.facing === 'DOWN') {
      this.graphics.rotation = Math.PI;
      this.graphics.position.set(boxW, boxH);
    } else if (this.item.facing === 'LEFT') {
      this.graphics.rotation = -Math.PI / 2;
      this.graphics.position.set(0, boxH);
    } else {
      this.graphics.rotation = 0;
      this.graphics.position.set(0, 0);
    }
  }

  private applyCustomSpriteTransform(): void {
    if (!this.customSprite) return;
    const [canonW, canonH] = getCanonicalFootprint(this.item.type);
    const scaleFactor = this.getVisualScale();
    const unrotW = Math.round(canonW * 32 * scaleFactor);
    const unrotH = Math.round(canonH * 32 * scaleFactor);
    const boxW = this.getVisualPixelWidth();
    const boxH = this.getVisualPixelHeight();

    this.customSprite.width = unrotW;
    this.customSprite.height = unrotH;
    if (this.item.facing === 'RIGHT') {
      this.customSprite.rotation = Math.PI / 2;
      this.customSprite.position.set(boxW, 0);
    } else if (this.item.facing === 'DOWN') {
      this.customSprite.rotation = Math.PI;
      this.customSprite.position.set(boxW, boxH);
    } else if (this.item.facing === 'LEFT') {
      this.customSprite.rotation = -Math.PI / 2;
      this.customSprite.position.set(0, boxH);
    } else {
      this.customSprite.rotation = 0;
      this.customSprite.position.set(0, 0);
    }
  }

  public tick(deltaSeconds: number): void {
    const needsAnimation =
      this.isWorkingActive || ANIMATED_FURNITURE_TYPES.has(this.item.type);

    if (needsAnimation && !this.customSprite) {
      this.animPhase += deltaSeconds;
      this.redraw();
    }

    if (this.isRoaming && !this.isEditMode && this.canRoamToTile) {
      this.tickRoamingMovement(deltaSeconds);
    }
  }

  private tickRoamingMovement(deltaSeconds: number): void {
    if (this.roamProgress < 1) {
      const speed = this.getRoamSpeedTilesPerSec();
      this.roamProgress = Math.min(1, this.roamProgress + deltaSeconds * speed);

      const curGridX =
        this.roamFromX + (this.roamToX - this.roamFromX) * this.roamProgress;
      const curGridY =
        this.roamFromY + (this.roamToY - this.roamFromY) * this.roamProgress;

      const hopPixels = HOPPING_MOVER_TYPES.has(this.item.type)
        ? -Math.abs(Math.sin(this.roamProgress * Math.PI * 2)) * 5.5
        : 0;

      this.container.x = curGridX * 32;
      this.container.y = curGridY * 32 + hopPixels;
      this.container.zIndex = (curGridY + 1) * 32;

      if (this.roamProgress >= 1) {
        this.roamFromX = this.roamToX;
        this.roamFromY = this.roamToY;
        this.roamWaitTimer =
          this.item.type === 'ROBOT_VACUUM' || this.item.type === 'RC_RACING_CAR'
            ? 0.05
            : 0.25 + Math.random() * 0.65;
      }
      return;
    }

    this.roamWaitTimer -= deltaSeconds;
    if (this.roamWaitTimer > 0) return;

    const dirs: [number, number][] = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];

    // Prefer continuing in current direction 65% of the time (like a Roomba / pet cruising a corridor)
    const forwardX = this.roamFromX + this.lastDir[0];
    const forwardY = this.roamFromY + this.lastDir[1];
    if (Math.random() < 0.65 && this.canRoamToTile?.(forwardX, forwardY)) {
      this.roamToX = forwardX;
      this.roamToY = forwardY;
      this.roamProgress = 0;
      return;
    }

    const validDirs = dirs.filter(([dx, dy]) =>
      this.canRoamToTile?.(this.roamFromX + dx, this.roamFromY + dy),
    );
    if (validDirs.length > 0) {
      const chosen = validDirs[Math.floor(Math.random() * validDirs.length)];
      this.lastDir = chosen;
      this.roamToX = this.roamFromX + chosen[0];
      this.roamToY = this.roamFromY + chosen[1];
      this.roamProgress = 0;
    } else {
      this.roamWaitTimer = 0.8;
    }
  }

  private getRoamSpeedTilesPerSec(): number {
    switch (this.item.type) {
      case 'RC_RACING_CAR':
        return 3.2;
      case 'MINI_DRONE':
        return 2.4;
      case 'OFFICE_CAT':
      case 'CORGI_DOG':
      case 'ROBO_DOG':
        return 2.0;
      case 'BOUNCING_SLIME':
      case 'RUBBER_DUCK_CART':
        return 1.75;
      case 'ROBOT_VACUUM':
      case 'SNACK_DELIVERY_BOT':
      case 'PENGUIN_MASCOT':
      default:
        return 1.45;
    }
  }

  public redraw(): void {
    if (this.customSprite) {
      this.applyCustomSpriteTransform();
      this.drawSelectionOutline();
      return;
    }
    this.applyGraphicsOrientation();
    drawProceduralFurniture(
      this.graphics,
      this.item.type,
      this.item.footprint,
      this.isWorkingActive,
      this.agentColorHex,
      this.animPhase,
    );
    this.drawSelectionOutline();
  }

  private drawSelectionOutline(): void {
    this.selectionOutline.clear();
    if (!this.isSelected) return;
    const w = this.getVisualPixelWidth();
    const h = this.getVisualPixelHeight();
    this.selectionOutline
      .rect(0, 0, w, h)
      .stroke({ width: 2, color: 0xa855f7, alpha: 0.95 });
  }

  public getCenterPixel(): [number, number] {
    return [
      (this.item.x + this.item.footprint[0] / 2) * 32,
      (this.item.y + this.item.footprint[1] / 2) * 32,
    ];
  }

  public destroy(): void {
    this.container.destroy({ children: true });
  }
}
