import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { IdleHobbyIconType, ToolIconType } from '@/types/events';
import { hexToNumber } from './ProceduralSprites';

const WATERCOOLER_QUOTES = [
  'Token budget vẫn ổn chứ?',
  'Cà phê ly thứ 3 rồi ☕',
  'Prompt vừa rồi mượt thật!',
  'RAG hay Fine-tune đây nhỉ?',
  'Chờ Reviewer duyệt bài...',
  'Context window 1M thoải mái!',
];

export class BubbleRenderer {
  public readonly container: Container;
  private readonly bg: Graphics;
  private readonly iconGraphics: Graphics;
  private readonly labelText: Text;

  constructor() {
    this.container = new Container();
    this.bg = new Graphics();
    this.iconGraphics = new Graphics();

    const style = new TextStyle({
      fontFamily: 'IBM Plex Sans, sans-serif',
      fontSize: 8.5,
      fontWeight: '600',
      fill: 0xf8fafc,
      wordWrap: true,
      wordWrapWidth: 116,
      breakWords: true,
      lineHeight: 10.5,
      align: 'center',
    });

    this.labelText = new Text({ text: '', style, resolution: 2 });
    this.container.addChild(this.bg);
    this.container.addChild(this.iconGraphics);
    this.container.addChild(this.labelText);
    this.container.visible = false;
  }

  private safeTextWidth(): number {
    return typeof document !== 'undefined'
      ? Math.min(122, this.labelText.width)
      : Math.min(116, this.labelText.text.length * 5.2);
  }

  private safeTextHeight(): number {
    if (typeof document !== 'undefined') {
      return Math.max(10, this.labelText.height);
    }
    const lines = Math.max(1, Math.ceil(this.labelText.text.length / 22));
    return lines * 11;
  }

  public showStatusBubble(text: string, borderColorHex = '#22c55e'): void {
    const truncated = text.length > 44 ? `${text.slice(0, 43)}…` : text;
    this.labelText.style.align = 'center';
    this.labelText.style.wordWrapWidth = 116;
    this.labelText.text = truncated;
    this.labelText.visible = true;
    this.iconGraphics.clear();

    const padX = 5;
    const padY = 3;
    const textW = this.safeTextWidth();
    const textH = this.safeTextHeight();
    const w = Math.max(36, Math.ceil(textW + padX * 2));
    const h = Math.max(15, Math.ceil(textH + padY * 2));
    const top = -h - 6;
    const borderColor = hexToNumber(borderColorHex);

    this.bg.clear();
    this.bg
      .roundRect(-w / 2, top, w, h, 4)
      .fill({ color: 0x0f172a, alpha: 0.92 })
      .stroke({ width: 1, color: borderColor, alpha: 0.95 });

    // Pointer triangle
    this.bg
      .poly([-3, -6, 3, -6, 0, -2])
      .fill({ color: borderColor });

    this.labelText.x = -Math.round(textW / 2);
    this.labelText.y = top + padY - 0.5;
    this.container.visible = true;
  }

  private renderIconPill(
    text: string,
    maxChars: number,
    badgeColor: number,
    drawIcon: (ix: number, iy: number) => void,
  ): void {
    this.bg.clear();
    this.iconGraphics.clear();

    const shortText =
      text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text;

    this.labelText.style.align = 'left';
    this.labelText.style.wordWrapWidth = 104;
    this.labelText.text = shortText;
    this.labelText.visible = true;

    const iconSpace = 13;
    const padX = 5;
    const padY = 3;
    const textW = this.safeTextWidth();
    const textH = this.safeTextHeight();
    const w = Math.max(40, Math.ceil(textW + iconSpace + padX * 2));
    const h = Math.max(16, Math.ceil(textH + padY * 2));
    const left = -w / 2;
    const top = -h - 6;

    this.bg
      .roundRect(left, top, w, h, 4)
      .fill({ color: 0x0f172a, alpha: 0.95 })
      .stroke({ width: 1.2, color: badgeColor });

    this.bg.poly([-3, -6, 3, -6, 0, -2]).fill({ color: badgeColor });

    const ix = left + 5;
    const iy = top + Math.round((h - 8) / 2);
    drawIcon(ix, iy);

    this.labelText.x = ix + iconSpace - 1;
    this.labelText.y = top + padY - 0.5;
    this.container.visible = true;
  }

  public showToolBadge(icon: ToolIconType, statusText?: string): void {
    const badgeColor = icon === 'error' ? 0xef4444 : 0xf59e0b;
    const label = statusText || icon.toUpperCase();
    this.renderIconPill(label, 38, badgeColor, (ix, iy) =>
      this.drawPixelToolIcon(icon, ix, iy),
    );
  }

  /**
   * Renders a cute pixel hobby icon (LoL controller, PS5 PES, music note, sleepy Zz)
   * alongside a compact wrapped speech pill.
   */
  public showHobbyBadge(
    hobbyIcon: IdleHobbyIconType,
    text: string,
    borderColorHex = '#38bdf8',
  ): void {
    const badgeColor = hexToNumber(borderColorHex);
    this.renderIconPill(text, 44, badgeColor, (ix, iy) =>
      this.drawPixelHobbyIcon(hobbyIcon, ix, iy),
    );
  }

  public showWatercoolerChat(seedIndex?: number): string {
    const quote =
      WATERCOOLER_QUOTES[
        (seedIndex ?? Math.floor(Math.random() * WATERCOOLER_QUOTES.length)) %
          WATERCOOLER_QUOTES.length
      ];
    this.showStatusBubble(`💬 ${quote}`, '#10b981');
    return quote;
  }

  public hide(): void {
    this.container.visible = false;
  }

  private drawPixelToolIcon(icon: ToolIconType, x: number, y: number): void {
    const g = this.iconGraphics;
    switch (icon) {
      case 'search':
        // Magnifying glass
        g.rect(x + 1, y, 5, 5).stroke({ width: 1.2, color: 0x38bdf8 });
        g.rect(x + 5, y + 5, 3, 2).fill({ color: 0x38bdf8 });
        break;
      case 'code':
        // Gear / Code brackets
        g.rect(x, y + 1, 2, 6).fill({ color: 0xc084fc });
        g.rect(x + 6, y + 1, 2, 6).fill({ color: 0xc084fc });
        g.rect(x + 3, y + 3, 2, 2).fill({ color: 0xf8fafc });
        break;
      case 'db':
        // Database cylinder
        g.rect(x + 1, y, 6, 2).fill({ color: 0x22c55e });
        g.rect(x + 1, y + 3, 6, 2).fill({ color: 0x22c55e });
        g.rect(x + 1, y + 6, 6, 2).fill({ color: 0x22c55e });
        break;
      case 'error':
        // Red warning triangle
        g.poly([x + 4, y, x + 8, y + 8, x, y + 8]).fill({ color: 0xef4444 });
        g.rect(x + 3.5, y + 3, 1, 3).fill({ color: 0xffffff });
        break;
      case 'check':
        g.rect(x + 1, y + 4, 2, 3).fill({ color: 0x4ade80 });
        g.rect(x + 3, y + 2, 4, 2).fill({ color: 0x4ade80 });
        break;
      default:
        g.rect(x + 1, y + 1, 6, 6).fill({ color: 0xf59e0b });
        break;
    }
  }

  private drawPixelHobbyIcon(
    icon: IdleHobbyIconType,
    x: number,
    y: number,
  ): void {
    const g = this.iconGraphics;
    switch (icon) {
      case 'lol_game':
        // Cute cyan/gold pixel gaming gamepad for League of Legends
        g.rect(x + 1, y + 2, 7, 4).fill({ color: 0x38bdf8 });
        g.rect(x, y + 4, 2, 3).fill({ color: 0x0284c7 });
        g.rect(x + 7, y + 4, 2, 3).fill({ color: 0x0284c7 });
        g.rect(x + 2, y + 3, 1, 2).fill({ color: 0xfacc15 });
        g.rect(x + 6, y + 3, 1, 1).fill({ color: 0xf43f5e });
        g.rect(x + 7, y + 4, 1, 1).fill({ color: 0x4ade80 });
        break;
      case 'ps5_pes':
        // Sleek DualSense white/blue controller + soccer ball dot
        g.rect(x + 1, y + 2, 7, 4).fill({ color: 0xf8fafc });
        g.rect(x, y + 4, 2, 3).fill({ color: 0xcbd5e1 });
        g.rect(x + 7, y + 4, 2, 3).fill({ color: 0xcbd5e1 });
        g.rect(x + 3, y + 2, 3, 2).fill({ color: 0x2563eb });
        g.rect(x + 6, y + 3, 2, 2).fill({ color: 0x22c55e });
        break;
      case 'music_sing':
        // Pink beamed eighth-notes ♫
        g.rect(x + 2, y + 1, 6, 2).fill({ color: 0xf472b6 });
        g.rect(x + 2, y + 2, 1, 5).fill({ color: 0xec4899 });
        g.rect(x + 7, y + 1, 1, 5).fill({ color: 0xec4899 });
        g.rect(x + 1, y + 5, 2, 2).fill({ color: 0xf9a8d4 });
        g.rect(x + 6, y + 4, 2, 2).fill({ color: 0xf9a8d4 });
        break;
      case 'sleepy_yawn':
        // Cute lavender crescent + glowing sleepy zZ
        g.rect(x, y + 4, 4, 1).fill({ color: 0xc4b5fd });
        g.rect(x + 2, y + 5, 1, 1).fill({ color: 0xc4b5fd });
        g.rect(x, y + 6, 4, 1).fill({ color: 0xc4b5fd });
        g.rect(x + 5, y, 4, 1).fill({ color: 0xfde047 });
        g.rect(x + 7, y + 1, 1, 1).fill({ color: 0xfde047 });
        g.rect(x + 5, y + 2, 4, 1).fill({ color: 0xfde047 });
        break;
    }
  }

  public destroy(): void {
    this.container.destroy({ children: true });
  }
}
