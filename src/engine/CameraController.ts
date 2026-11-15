import type { Container } from 'pixi.js';

export class CameraController {
  private worldContainer: Container;
  private canvasElement: HTMLCanvasElement;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private cameraStartX = 0;
  private cameraStartY = 0;
  private scale = 2.0;
  private readonly minScale = 0.65;
  private readonly maxScale = 4.0;
  public isInteractionLocked = false; // True while dragging furniture in Edit Mode

  private boundPointerDown: (e: PointerEvent) => void;
  private boundPointerMove: (e: PointerEvent) => void;
  private boundPointerUp: (e: PointerEvent) => void;
  private boundWheel: (e: WheelEvent) => void;

  constructor(worldContainer: Container, canvasElement: HTMLCanvasElement) {
    this.worldContainer = worldContainer;
    this.canvasElement = canvasElement;

    this.boundPointerDown = this.onPointerDown.bind(this);
    this.boundPointerMove = this.onPointerMove.bind(this);
    this.boundPointerUp = this.onPointerUp.bind(this);
    this.boundWheel = this.onWheel.bind(this);

    this.canvasElement.addEventListener('pointerdown', this.boundPointerDown);
    window.addEventListener('pointermove', this.boundPointerMove);
    window.addEventListener('pointerup', this.boundPointerUp);
    this.canvasElement.addEventListener('wheel', this.boundWheel, { passive: false });
  }

  public centerOnGrid(
    gridCols: number,
    gridRows: number,
    tileSize = 32,
    targetScale = 2.0,
  ): void {
    const viewWidth = this.canvasElement.clientWidth || window.innerWidth;
    const viewHeight = this.canvasElement.clientHeight || window.innerHeight;

    let computedScale = targetScale;
    if (gridCols > 24 || gridRows > 16) {
      const fitX = (viewWidth - 48) / (gridCols * tileSize);
      const fitY = (viewHeight - 150) / (gridRows * tileSize);
      const rawFit = Math.min(2.0, Math.min(fitX, fitY));
      computedScale = Math.max(this.minScale, Number(rawFit.toFixed(2)));
    }

    this.scale = Math.min(this.maxScale, Math.max(this.minScale, computedScale));
    this.worldContainer.scale.set(this.scale);

    const mapWidthPx = gridCols * tileSize * this.scale;
    const mapHeightPx = gridRows * tileSize * this.scale;

    this.worldContainer.x = Math.round((viewWidth - mapWidthPx) / 2);
    this.worldContainer.y = Math.round((viewHeight - mapHeightPx) / 2 + 8);
  }

  public getScale(): number {
    return this.scale;
  }

  public screenToGrid(
    clientX: number,
    clientY: number,
    tileSize = 32,
  ): [number, number] {
    const rect = this.canvasElement.getBoundingClientRect();
    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;

    const localX = (canvasX - this.worldContainer.x) / this.scale;
    const localY = (canvasY - this.worldContainer.y) / this.scale;

    return [Math.floor(localX / tileSize), Math.floor(localY / tileSize)];
  }

  private onPointerDown(e: PointerEvent): void {
    if (this.isInteractionLocked) return;
    // Allow left button (0) or middle button (1)
    if (e.button !== 0 && e.button !== 1) return;

    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.cameraStartX = this.worldContainer.x;
    this.cameraStartY = this.worldContainer.y;
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.isDragging || this.isInteractionLocked) {
      this.isDragging = false;
      return;
    }

    const dx = e.clientX - this.dragStartX;
    const dy = e.clientY - this.dragStartY;
    this.worldContainer.x = Math.round(this.cameraStartX + dx);
    this.worldContainer.y = Math.round(this.cameraStartY + dy);
  }

  private onPointerUp(): void {
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const rect = this.canvasElement.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldXBefore = (mouseX - this.worldContainer.x) / this.scale;
    const worldYBefore = (mouseY - this.worldContainer.y) / this.scale;

    const zoomFactor = e.deltaY < 0 ? 0.25 : -0.25;
    const nextScale = Math.min(
      this.maxScale,
      Math.max(this.minScale, Number((this.scale + zoomFactor).toFixed(2))),
    );

    if (nextScale === this.scale) return;

    this.scale = nextScale;
    this.worldContainer.scale.set(this.scale);
    this.worldContainer.x = Math.round(mouseX - worldXBefore * this.scale);
    this.worldContainer.y = Math.round(mouseY - worldYBefore * this.scale);
  }

  public destroy(): void {
    this.canvasElement.removeEventListener('pointerdown', this.boundPointerDown);
    window.removeEventListener('pointermove', this.boundPointerMove);
    window.removeEventListener('pointerup', this.boundPointerUp);
    this.canvasElement.removeEventListener('wheel', this.boundWheel);
  }
}
