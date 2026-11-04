import { exportFilename } from './filename';
import { saveFile } from './platform';
import { ensureFonts } from './scene/fonts';
import { sceneFonts } from './scene/operations';
import { renderScene, type ImageLookup } from './scene/render';
import type { Scene } from './scene/types';

export interface ExportRequest {
  width: number;
  height: number;
  format: 'png' | 'jpg';
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The browser ran out of memory making this image. Try a smaller size.'))), type, quality);
  });
}

/** Draws the scene at exactly the requested pixel size from vector data, so 4K text and stickers stay crisp. */
export async function renderExport(scene: Scene, images: ImageLookup, request: ExportRequest): Promise<Blob> {
  await ensureFonts(sceneFonts(scene));
  const canvas = document.createElement('canvas');
  canvas.width = request.width;
  canvas.height = request.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('The browser couldn’t create an image this large. Try a smaller size.');
  renderScene(ctx, scene, images, { scale: request.width / scene.width });
  const blob = await toBlob(canvas, request.format === 'png' ? 'image/png' : 'image/jpeg', 0.94);
  canvas.width = 0;
  canvas.height = 0;
  return blob;
}

export async function exportScene(scene: Scene, images: ImageLookup, request: ExportRequest): Promise<string> {
  const blob = await renderExport(scene, images, request);
  const filename = exportFilename(scene.meta.title, request.width, request.height, request.format);
  await saveFile(blob, filename);
  return filename;
}

export function renderThumbnail(scene: Scene, images: ImageLookup, width = 640): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = Math.round((width * scene.height) / scene.width);
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  renderScene(ctx, scene, images, { scale: width / scene.width });
  return canvas.toDataURL('image/webp', 0.78);
}
