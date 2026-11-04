import { demoUrl } from '../platform';
import type { Asset } from '../scene/types';
import type { ImageLookup, ImageSource } from '../scene/render';
import { idbGet } from '../store/idb';

const cache = new Map<string, Promise<HTMLImageElement>>();

function fromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image failed to load'));
    image.src = url;
  });
}

function dataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Photo could not be read'));
    reader.readAsDataURL(blob);
  });
}

/** Some hosts forbid blob: images. A data URL is slower but works everywhere and is equally safe for export. */
async function fromBlob(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    return await fromUrl(url);
  } catch {
    URL.revokeObjectURL(url);
    return fromUrl(await dataUrl(blob));
  }
}

/**
 * Every source ends up same-origin or as a blob URL. That is what guarantees
 * the export canvas is never tainted by a cross-origin image.
 */
export function loadImage(asset: Asset, token?: string | null): Promise<HTMLImageElement> {
  const cached = cache.get(asset.src);
  if (cached) return cached;
  const loading = (async () => {
    if (asset.src.startsWith('idb:')) {
      const blob = await idbGet<Blob>('blobs', asset.src.slice(4));
      if (!blob) throw new Error('Photo is missing from this browser');
      return fromBlob(blob);
    }
    if (asset.src.startsWith('/api/')) {
      const response = await fetch(asset.src, { headers: token ? { authorization: `Bearer ${token}` } : {} });
      if (!response.ok) throw new Error('Photo could not be loaded');
      return fromBlob(await response.blob());
    }
    return fromUrl(demoUrl(asset.src));
  })();
  cache.set(asset.src, loading);
  loading.catch(() => cache.delete(asset.src));
  return loading;
}

export interface LoadedImages {
  lookup: ImageLookup;
  failed: Asset[];
}

export async function loadAll(assets: Asset[], token?: string | null): Promise<LoadedImages> {
  const images = new Map<string, HTMLImageElement>();
  const failed: Asset[] = [];
  await Promise.all(assets.map(async (asset) => {
    try {
      images.set(asset.id, await loadImage(asset, token));
    } catch {
      failed.push(asset);
    }
  }));
  return { lookup: (id) => images.get(id) as ImageSource | undefined, failed };
}
