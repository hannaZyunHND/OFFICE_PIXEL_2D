import { Container, Graphics } from 'pixi.js';
import { hexToNumber } from './graphics/ProceduralSprites';

interface ActiveBezierPacket {
  fromX: number;
  fromY: number;
  ctrlX: number;
  ctrlY: number;
  toX: number;
  toY: number;
  elapsedMs: number;
  durationMs: number;
  color: number;
  graphics: Graphics;
  onComplete?: () => void;
}

/**
 * Animates glowing data packets / documents flying along a quadratic Bézier curve
 * between Agent A's desk and Agent B's desk during AGENT_HANDOFF events.
 */
export class HandoffAnimator {
  public readonly container: Container;
  private packets: ActiveBezierPacket[] = [];

  constructor() {
    this.container = new Container();
  }

  public launchPacket(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    colorHex = '#f59e0b',
    durationMs = 650,
    onComplete?: () => void,
  ): void {
    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2;
    const dist = Math.hypot(toX - fromX, toY - fromY);
    const arcHeight = Math.min(72, Math.max(28, dist * 0.32));

    const g = new Graphics();
    this.container.addChild(g);

    this.packets.push({
      fromX,
      fromY,
      ctrlX: midX,
      ctrlY: midY - arcHeight,
      toX,
      toY,
      elapsedMs: 0,
      durationMs,
      color: hexToNumber(colorHex),
      graphics: g,
      onComplete,
    });
  }

  public tick(deltaMs: number): void {
    for (let i = this.packets.length - 1; i >= 0; i--) {
      const p = this.packets[i];
      p.elapsedMs += deltaMs;
      const t = Math.min(1, p.elapsedMs / p.durationMs);

      // Quadratic Bézier formula: B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
      const invT = 1 - t;
      const x = invT * invT * p.fromX + 2 * invT * t * p.ctrlX + t * t * p.toX;
      const y = invT * invT * p.fromY + 2 * invT * t * p.ctrlY + t * t * p.toY;

      p.graphics.clear();
      // Outer energy halo
      p.graphics.circle(x, y, 7).fill({ color: p.color, alpha: 0.28 });
      // Pixel document / data packet icon (8x6px)
      p.graphics
        .rect(x - 4, y - 3, 8, 6)
        .fill({ color: 0xf8fafc })
        .stroke({ width: 1, color: p.color });
      p.graphics.rect(x - 2, y - 1, 4, 1).fill({ color: p.color });
      p.graphics.rect(x - 2, y + 1, 3, 1).fill({ color: 0x334155 });

      if (t >= 1) {
        this.container.removeChild(p.graphics);
        p.graphics.destroy();
        this.packets.splice(i, 1);
        if (p.onComplete) p.onComplete();
      }
    }
  }

  public clear(): void {
    for (const p of this.packets) {
      this.container.removeChild(p.graphics);
      p.graphics.destroy();
    }
    this.packets = [];
  }

  public destroy(): void {
    this.clear();
    this.container.destroy({ children: true });
  }
}
