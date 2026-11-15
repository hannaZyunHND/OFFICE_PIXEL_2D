import type { CustomSpriteAsset } from '@/types/assets';

const DB_NAME = 'pixel_agent_office_db';
const DB_VERSION = 1;
const STORE_SPRITES = 'sprite_assets';

function openAssetsDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_SPRITES)) {
        db.createObjectStore(STORE_SPRITES, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllCustomSpriteAssets(): Promise<CustomSpriteAsset[]> {
  try {
    const db = await openAssetsDb();
    return await new Promise<CustomSpriteAsset[]>((resolve, reject) => {
      const tx = db.transaction(STORE_SPRITES, 'readonly');
      const store = tx.objectStore(STORE_SPRITES);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as CustomSpriteAsset[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function saveCustomSpriteAsset(
  asset: CustomSpriteAsset,
): Promise<void> {
  const db = await openAssetsDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_SPRITES, 'readwrite');
    const store = tx.objectStore(STORE_SPRITES);
    // Remove previous asset targeting the same agent/furniture so target_id stays unique
    const getAllReq = store.getAll();
    getAllReq.onsuccess = () => {
      const existing = (getAllReq.result as CustomSpriteAsset[]) || [];
      for (const item of existing) {
        if (item.target_id === asset.target_id && item.id !== asset.id) {
          store.delete(item.id);
        }
      }
      store.put(asset);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteCustomSpriteAsset(id: string): Promise<void> {
  const db = await openAssetsDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_SPRITES, 'readwrite');
    const store = tx.objectStore(STORE_SPRITES);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Generates a ready-to-use 128x128px (4 cols x 4 rows of 32x32px) directional pixel-art
 * PNG Sprite Sheet Blob so users can test Custom Sprite Sheet loading with 1 click!
 * Row 0: DOWN, Row 1: LEFT, Row 2: RIGHT, Row 3: UP.
 */
export async function generateSampleDirectionalSpriteSheetBlob(
  suitColor = '#ec4899',
  visorColor = '#38bdf8',
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 32 * 4;
  canvas.height = 32 * 4;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const directions: ('DOWN' | 'LEFT' | 'RIGHT' | 'UP')[] = [
    'DOWN',
    'LEFT',
    'RIGHT',
    'UP',
  ];

  directions.forEach((dir, rowIdx) => {
    for (let colIdx = 0; colIdx < 4; colIdx++) {
      const ox = colIdx * 32;
      const oy = rowIdx * 32;
      const walkBob = colIdx % 2 === 1 ? -1 : 0;
      const leftStep = colIdx === 1 ? -2 : colIdx === 3 ? 1 : 0;
      const rightStep = colIdx === 1 ? 1 : colIdx === 3 ? -2 : 0;

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(ox + 9, oy + 27, 14, 3);

      // Boots
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(ox + 11, oy + 22 + leftStep, 4, 5);
      ctx.fillRect(ox + 17, oy + 22 + rightStep, 4, 5);

      // Cyber Suit Torso
      ctx.fillStyle = suitColor;
      ctx.fillRect(ox + 9, oy + 13 + walkBob, 14, 9);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(ox + 14, oy + 14 + walkBob, 4, 6);

      // Helmet / Head
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(ox + 9, oy + 3 + walkBob, 14, 10);

      // Directional Neon Visor
      ctx.fillStyle = visorColor;
      if (dir === 'DOWN') {
        ctx.fillRect(ox + 11, oy + 7 + walkBob, 10, 3);
      } else if (dir === 'LEFT') {
        ctx.fillRect(ox + 9, oy + 7 + walkBob, 6, 3);
      } else if (dir === 'RIGHT') {
        ctx.fillRect(ox + 17, oy + 7 + walkBob, 6, 3);
      } else {
        // UP: Back pack power core glow
        ctx.fillRect(ox + 14, oy + 6 + walkBob, 4, 4);
      }
    }
  });

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to create PNG blob'));
    }, 'image/png');
  });
}
