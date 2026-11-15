import { ImageSource, Rectangle, Texture } from 'pixi.js';
import type { Direction } from '@/types/blueprint';

export type DirectionalFrames = Record<Direction, Texture[]>;

/**
 * Slices an uploaded 32x32px PNG Blob or DataURL into PixiJS v8 Textures
 * with nearest-neighbor scaling (`scaleMode: 'nearest'`).
 * Standard 4-row layout: Row 0 = DOWN, Row 1 = LEFT, Row 2 = RIGHT, Row 3 = UP.
 */
export async function sliceDirectionalSpriteSheet(
  blobOrUrl: Blob | string,
  tileWidth = 32,
  tileHeight = 32,
): Promise<DirectionalFrames> {
  const img = await loadHtmlImage(blobOrUrl);
  const source = new ImageSource({
    resource: img,
    scaleMode: 'nearest',
  });

  const cols = Math.max(1, Math.floor(img.width / tileWidth));
  const rows = Math.max(1, Math.floor(img.height / tileHeight));

  const rowOrder: Direction[] = ['DOWN', 'LEFT', 'RIGHT', 'UP'];
  const result: DirectionalFrames = {
    DOWN: [],
    LEFT: [],
    RIGHT: [],
    UP: [],
  };

  for (let r = 0; r < 4; r++) {
    const dir = rowOrder[r];
    const sourceRow = r < rows ? r : 0;
    for (let c = 0; c < cols; c++) {
      const frameRect = new Rectangle(
        c * tileWidth,
        sourceRow * tileHeight,
        tileWidth,
        tileHeight,
      );
      result[dir].push(new Texture({ source, frame: frameRect }));
    }
  }

  return result;
}

export async function sliceSingleFurnitureTexture(
  blobOrUrl: Blob | string,
): Promise<Texture> {
  const img = await loadHtmlImage(blobOrUrl);
  const source = new ImageSource({
    resource: img,
    scaleMode: 'nearest',
  });
  return new Texture({ source });
}

function loadHtmlImage(blobOrUrl: Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let objectUrl: string | null = null;
    if (typeof blobOrUrl !== 'string') {
      objectUrl = URL.createObjectURL(blobOrUrl);
      img.src = objectUrl;
    } else {
      img.src = blobOrUrl;
    }

    img.onload = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = (err) => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(err);
    };
  });
}
