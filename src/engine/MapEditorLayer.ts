import { Container, Graphics } from 'pixi.js';
import type { OfficeBlueprint, FurnitureItem } from '@/types/blueprint';

/**
 * Interactive Map Editor Overlay (Edit Mode):
 * - Renders 32x32px grid lines across the entire map.
 * - Renders the translucent crimson Collision Map (rgba(239, 68, 68, 0.32)) on blocked tiles.
 * - Renders emerald interaction_point markers & live drag-and-drop footprint preview.
 */
export class MapEditorLayer {
  public readonly container: Container;
  private readonly gridGraphics: Graphics;
  private readonly collisionGraphics: Graphics;
  private readonly previewGraphics: Graphics;

  constructor() {
    this.container = new Container();
    this.container.visible = false;

    this.gridGraphics = new Graphics();
    this.collisionGraphics = new Graphics();
    this.previewGraphics = new Graphics();

    this.container.addChild(this.collisionGraphics);
    this.container.addChild(this.gridGraphics);
    this.container.addChild(this.previewGraphics);
  }

  public setVisible(visible: boolean): void {
    this.container.visible = visible;
    if (!visible) {
      this.previewGraphics.clear();
    }
  }

  public redrawOverlay(
    blueprint: OfficeBlueprint,
    collisionMatrix: number[][],
  ): void {
    this.gridGraphics.clear();
    this.collisionGraphics.clear();

    const cols = blueprint.meta.grid_cols;
    const rows = blueprint.meta.grid_rows;
    const widthPx = cols * 32;
    const heightPx = rows * 32;

    // 1. Draw 32x32 Grid Lines
    for (let x = 0; x <= cols; x++) {
      this.gridGraphics
        .moveTo(x * 32, 0)
        .lineTo(x * 32, heightPx)
        .stroke({ width: 1, color: 0x94a3b8, alpha: 0.22 });
    }
    for (let y = 0; y <= rows; y++) {
      this.gridGraphics
        .moveTo(0, y * 32)
        .lineTo(widthPx, y * 32)
        .stroke({ width: 1, color: 0x94a3b8, alpha: 0.22 });
    }

    // 2. Draw Translucent Red Collision Map for blocked tiles (matrix[y][x] === 1)
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (collisionMatrix[y]?.[x] === 1) {
          this.collisionGraphics
            .rect(x * 32 + 1, y * 32 + 1, 30, 30)
            .fill({ color: 0xef4444, alpha: 0.28 })
            .stroke({ width: 1, color: 0xef4444, alpha: 0.55 });
        }
      }
    }

    // 3. Draw Emerald Interaction Point indicators for each furniture item
    for (const furn of blueprint.furniture) {
      const [ix, iy] = furn.interaction_point;
      const cx = ix * 32 + 16;
      const cy = iy * 32 + 16;
      this.collisionGraphics
        .circle(cx, cy, 5)
        .fill({ color: 0x22c55e, alpha: 0.85 })
        .stroke({ width: 1, color: 0x020617 });
    }
  }

  public showDragPreview(
    furn: FurnitureItem,
    candidateX: number,
    candidateY: number,
    isValid: boolean,
  ): void {
    this.previewGraphics.clear();
    const [w, h] = furn.footprint;
    const color = isValid ? 0x22c55e : 0xef4444;

    this.previewGraphics
      .rect(candidateX * 32, candidateY * 32, w * 32, h * 32)
      .fill({ color, alpha: 0.28 })
      .stroke({ width: 2, color, alpha: 0.95 });
  }

  public clearDragPreview(): void {
    this.previewGraphics.clear();
  }

  public destroy(): void {
    this.container.destroy({ children: true });
  }
}
