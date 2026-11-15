import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { OfficeBlueprint } from '@/types/blueprint';
import type { FurnitureEntity } from './FurnitureEntity';

interface EdgeHighlight {
  from: string;
  to: string;
  remainingMs: number;
}

/**
 * Renders the God-View (`Tab`) Live DAG Overlay:
 * - Glowing spline curves connecting source agent desks to target agent desks.
 * - Animated pulse Particles along edges.
 * - Bright amber/cyan flare when an AGENT_HANDOFF traverses an edge.
 */
export class DagOverlayLayer {
  public readonly container: Container;
  private readonly splineGraphics: Graphics;
  private readonly labelsContainer: Container;
  private highlights: EdgeHighlight[] = [];
  private animPhase = 0;
  private currentBlueprint: OfficeBlueprint | null = null;

  constructor() {
    this.container = new Container();
    this.container.visible = false;
    this.splineGraphics = new Graphics();
    this.labelsContainer = new Container();
    this.container.addChild(this.splineGraphics);
    this.container.addChild(this.labelsContainer);
  }

  public setVisible(visible: boolean): void {
    this.container.visible = visible;
  }

  public triggerEdgePulse(fromAgentId: string, toAgentId: string, durationMs = 1300): void {
    const existing = this.highlights.find(
      (h) => h.from === fromAgentId && h.to === toAgentId,
    );
    if (existing) {
      existing.remainingMs = durationMs;
    } else {
      this.highlights.push({
        from: fromAgentId,
        to: toAgentId,
        remainingMs: durationMs,
      });
    }
  }

  public rebuildLabels(
    blueprint: OfficeBlueprint,
    getDeskEntity: (agentId: string) => FurnitureEntity | undefined,
  ): void {
    this.currentBlueprint = blueprint;
    this.labelsContainer.removeChildren();

    const labelStyle = new TextStyle({
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 8,
      fontWeight: '600',
      fill: 0x38bdf8,
    });

    for (const edge of blueprint.edges) {
      if (!edge.label) continue;
      const fromDesk = getDeskEntity(edge.from);
      const toDesk = getDeskEntity(edge.to);
      if (!fromDesk || !toDesk) continue;

      const [x1, y1] = fromDesk.getCenterPixel();
      const [x2, y2] = toDesk.getCenterPixel();
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2 - 18;

      const pill = new Container();
      const bg = new Graphics();
      const txt = new Text({ text: edge.label, style: labelStyle, resolution: 2 });
      const w = txt.width + 8;
      const h = 13;

      bg.roundRect(-w / 2, -h / 2, w, h, 3)
        .fill({ color: 0x020617, alpha: 0.88 })
        .stroke({ width: 1, color: 0x38bdf8, alpha: 0.7 });

      txt.x = -Math.round(txt.width / 2);
      txt.y = -Math.round(txt.height / 2);

      pill.x = Math.round(midX);
      pill.y = Math.round(midY);
      pill.addChild(bg);
      pill.addChild(txt);
      this.labelsContainer.addChild(pill);
    }
  }

  public tick(
    deltaMs: number,
    getDeskEntity: (agentId: string) => FurnitureEntity | undefined,
  ): void {
    // Decrement active edge pulses
    for (let i = this.highlights.length - 1; i >= 0; i--) {
      this.highlights[i].remainingMs -= deltaMs;
      if (this.highlights[i].remainingMs <= 0) {
        this.highlights.splice(i, 1);
      }
    }

    if (!this.container.visible || !this.currentBlueprint) return;

    this.animPhase += deltaMs / 1000;
    this.splineGraphics.clear();

    for (const edge of this.currentBlueprint.edges) {
      const fromDesk = getDeskEntity(edge.from);
      const toDesk = getDeskEntity(edge.to);
      if (!fromDesk || !toDesk) continue;

      const [x1, y1] = fromDesk.getCenterPixel();
      const [x2, y2] = toDesk.getCenterPixel();
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2 - 22;

      const isPulsing = this.highlights.some(
        (h) => h.from === edge.from && h.to === edge.to,
      );

      const coreColor = isPulsing ? 0xf59e0b : 0x38bdf8;
      const glowWidth = isPulsing ? 7 : 5;
      const coreWidth = isPulsing ? 2.5 : 1.5;

      // Outer spline glow
      this.splineGraphics
        .moveTo(x1, y1)
        .quadraticCurveTo(midX, midY, x2, y2)
        .stroke({ width: glowWidth, color: coreColor, alpha: isPulsing ? 0.38 : 0.18 });

      // Inner crisp spline
      this.splineGraphics
        .moveTo(x1, y1)
        .quadraticCurveTo(midX, midY, x2, y2)
        .stroke({ width: coreWidth, color: coreColor, alpha: isPulsing ? 1.0 : 0.65 });

      // Animated travelling flow node along the Bézier curve
      const t = (this.animPhase * (isPulsing ? 1.4 : 0.55)) % 1;
      const invT = 1 - t;
      const px = invT * invT * x1 + 2 * invT * t * midX + t * t * x2;
      const py = invT * invT * y1 + 2 * invT * t * midY + t * t * y2;
      this.splineGraphics
        .circle(px, py, isPulsing ? 4 : 2.5)
        .fill({ color: isPulsing ? 0xfef08a : 0x7dd3fc });
    }
  }

  public destroy(): void {
    this.container.destroy({ children: true });
  }
}
