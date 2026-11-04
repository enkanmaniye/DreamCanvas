import { newId } from '../scene/ids';
import type { Asset } from '../scene/types';
import { idbGet, idbPut } from '../store/idb';
import { checkFileMeta, problemMessage, sniffImageType } from './validate';

const MAX_EDGE = 3840;
const TARGET_BYTES = 3.5 * 1024 * 1024;

export class IngestError extends Error {}

function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new IngestError('This image couldn’t be processed.'))), 'image/webp', quality);
  });
}

/** Finds the busiest part of the image from a small copy, so crops favor the subject over empty sky or wall. */
function analyseSmall(ctx: CanvasRenderingContext2D, w: number, h: number): { focus: { x: number; y: number }; colors: string[] } {
  const { data } = ctx.getImageData(0, 0, w, h);
  let sumX = 0; let sumY = 0; let sumE = 0;
  const buckets = new Map<number, { n: number; r: number; g: number; b: number; sat: number }>();
  for (let y = 0; y < h - 1; y += 1) {
    for (let x = 0; x < w - 1; x += 1) {
      const i = (y * w + x) * 4;
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      const right = i + 4;
      const down = i + w * 4;
      const energy = Math.abs(r - data[right]) + Math.abs(g - data[right + 1]) + Math.abs(b - data[right + 2]) + Math.abs(r - data[down]) + Math.abs(g - data[down + 1]) + Math.abs(b - data[down + 2]);
      sumX += x * energy; sumY += y * energy; sumE += energy;
      const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
      const bucket = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0, sat: 0 };
      bucket.n += 1; bucket.r += r; bucket.g += g; bucket.b += b;
      bucket.sat += Math.max(r, g, b) - Math.min(r, g, b);
      buckets.set(key, bucket);
    }
  }
  const focus = sumE > 0 ? { x: Math.min(0.8, Math.max(0.2, sumX / sumE / w)), y: Math.min(0.75, Math.max(0.2, sumY / sumE / h)) } : { x: 0.5, y: 0.45 };
  const colors = [...buckets.values()]
    .sort((a, b) => b.n * (1 + b.sat / b.n / 40) - a.n * (1 + a.sat / a.n / 40))
    .slice(0, 3)
    .map((c) => `#${[c.r / c.n, c.g / c.n, c.b / c.n].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`.toUpperCase());
  return { focus, colors };
}

export interface IngestedPhoto {
  asset: Asset;
  colors: string[];
}

/**
 * Validates and prepares one photo. Decoding and redrawing the pixels to a fresh file removes EXIF data
 * such as GPS location, and anything that isn't a real image fails here.
 */
export async function ingestFile(file: File): Promise<IngestedPhoto> {
  const metaProblem = checkFileMeta(file.name, file.type, file.size);
  if (metaProblem) throw new IngestError(problemMessage(metaProblem, file.name));
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (!sniffImageType(head)) throw new IngestError(problemMessage('mismatch', file.name));

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new IngestError(`${file.name} is damaged and couldn’t be opened.`);
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new IngestError('This browser couldn’t process the image.');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const small = document.createElement('canvas');
  small.width = 48;
  small.height = Math.max(8, Math.round((48 * bitmap.height) / bitmap.width));
  const smallCtx = small.getContext('2d', { willReadFrequently: true });
  if (!smallCtx) throw new IngestError('This browser couldn’t process the image.');
  smallCtx.drawImage(bitmap, 0, 0, small.width, small.height);
  const { focus, colors } = analyseSmall(smallCtx, small.width, small.height);
  bitmap.close();

  let blob = await encode(canvas, 0.92);
  if (blob.size > TARGET_BYTES) blob = await encode(canvas, 0.78);
  const id = newId('p');
  await idbPut('blobs', id, blob);
  return {
    asset: { id, kind: 'upload', src: `idb:${id}`, name: file.name.slice(0, 120), width: canvas.width, height: canvas.height, focus },
    colors,
  };
}

/** Stores a blob from the licensed-image proxy or the optional generator so it can be used like an upload. */
export async function ingestRemoteBlob(blob: Blob, partial: Pick<Asset, 'name' | 'credit' | 'width' | 'height'>, kind: Asset['kind'] = 'openverse'): Promise<Asset> {
  const id = newId('o');
  await idbPut('blobs', id, blob);
  return { id, kind, src: `idb:${id}`, focus: { x: 0.5, y: 0.45 }, ...partial };
}

/** Small JPEG copies for AI analysis: full photos are never sent, which keeps cost and exposure down. */
export async function aiThumbnail(asset: Asset): Promise<{ mimeType: 'image/jpeg'; data: string } | null> {
  const blob = asset.src.startsWith('idb:') ? await idbGet<Blob>('blobs', asset.src.slice(4)) : null;
  if (!blob) return null;
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, 640 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return { mimeType: 'image/jpeg', data: canvas.toDataURL('image/jpeg', 0.72).split(',')[1] };
}
