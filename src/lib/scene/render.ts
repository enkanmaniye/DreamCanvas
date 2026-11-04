import { canvasFont } from './fonts';
import { seededRandom } from './ids';
import { getSticker, type StickerPart } from './stickers';
import type { ImageObject, Scene, SceneBackground, SceneObject, ShapeObject, StickerObject, TextObject } from './types';

export type ImageSource = CanvasImageSource & { width: number; height: number };
export type ImageLookup = (assetId: string) => ImageSource | undefined;

interface RenderOptions {
  /** Output pixels per scene unit. */
  scale: number;
  /** Object hidden from this pass, for example text while it is being typed over. */
  skipId?: string | null;
}

function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function drawBackground(ctx: CanvasRenderingContext2D, bg: SceneBackground, W: number, H: number): void {
  ctx.fillStyle = bg.base;
  ctx.fillRect(0, 0, W, H);
  if (bg.kind === 'solid') return;
  const random = seededRandom(bg.seed + 11);
  const spots = bg.kind === 'mesh' ? 6 : 5;
  for (let i = 0; i < spots; i += 1) {
    const color = bg.colors[i % bg.colors.length];
    const x = W * (0.05 + random() * 0.9);
    const y = H * (0.05 + random() * 0.9);
    const r = Math.max(W, H) * (0.3 + random() * 0.28);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, withAlpha(color, bg.kind === 'mesh' ? 0.62 : 0.5));
    g.addColorStop(1, withAlpha(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  if (bg.kind === 'tiles') {
    const cols = W > H ? 14 : 8;
    const tile = W / cols;
    const rows = Math.ceil(H / tile);
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const alpha = random() * 0.22;
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fillRect(c * tile, r * tile, tile, tile);
        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.lineWidth = 1;
        ctx.strokeRect(c * tile, r * tile, tile, tile);
      }
    }
  }
}

/** Cover-fit source rectangle honoring the object's focus point and zoom. */
export function coverRect(srcW: number, srcH: number, boxW: number, boxH: number, crop: ImageObject['crop']) {
  const scale = Math.max(boxW / srcW, boxH / srcH) * Math.max(1, crop.zoom);
  const sw = boxW / scale;
  const sh = boxH / scale;
  const sx = Math.min(srcW - sw, Math.max(0, srcW * crop.focusX - sw / 2));
  const sy = Math.min(srcH - sh, Math.max(0, srcH * crop.focusY - sh / 2));
  return { sx, sy, sw, sh };
}

export function photoInsets(object: ImageObject): { left: number; top: number; right: number; bottom: number } {
  const unit = Math.min(object.w, object.h);
  if (object.frame.style === 'mat') {
    const p = unit * 0.08;
    return { left: p, top: p, right: p, bottom: p };
  }
  if (object.frame.style === 'polaroid') {
    const p = unit * 0.055;
    return { left: p, top: p, right: p, bottom: p * 3 };
  }
  return { left: 0, top: 0, right: 0, bottom: 0 };
}

function hardShadow(ctx: CanvasRenderingContext2D, w: number, h: number, offset: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(offset - w / 2, offset - h / 2, w, h);
}

function drawImageObject(ctx: CanvasRenderingContext2D, o: ImageObject, images: ImageLookup, unit: number): void {
  const { w, h } = o;
  if (o.frame.shadow) hardShadow(ctx, w, h, 9 * unit, o.frame.stroke);
  const insets = photoInsets(o);
  if (o.frame.style === 'mat' || o.frame.style === 'polaroid') {
    ctx.fillStyle = o.frame.color;
    ctx.fillRect(-w / 2, -h / 2, w, h);
  }
  const ix = -w / 2 + insets.left;
  const iy = -h / 2 + insets.top;
  const iw = w - insets.left - insets.right;
  const ih = h - insets.top - insets.bottom;
  const image = images(o.assetId);
  if (image) {
    const { sx, sy, sw, sh } = coverRect(image.width, image.height, iw, ih, o.crop);
    ctx.drawImage(image, sx, sy, sw, sh, ix, iy, iw, ih);
  } else {
    ctx.fillStyle = '#E9E2F5';
    ctx.fillRect(ix, iy, iw, ih);
  }
  if (o.frame.strokeWidth > 0) {
    ctx.strokeStyle = o.frame.stroke;
    ctx.lineWidth = o.frame.strokeWidth;
    if (insets.left > 0) ctx.strokeRect(ix, iy, iw, ih);
    ctx.strokeRect(-w / 2, -h / 2, w, h);
  }
}

export interface TextLayout {
  lines: string[];
  size: number;
  lineHeightPx: number;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(candidate).width > width) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }
  return lines;
}

/**
 * Measures text with the font actually loaded and steps the size down until it fits.
 * This is what keeps text inside its box when a web font falls back or a person types more words.
 */
export function layoutText(ctx: CanvasRenderingContext2D, o: TextObject, fit = true): TextLayout {
  const innerW = Math.max(10, o.w - o.padding * 2);
  const innerH = Math.max(10, o.h - o.padding * 2);
  let size = o.size;
  const floor = fit ? o.size * 0.35 : o.size;
  for (;;) {
    ctx.font = canvasFont(o.font, size, o.weight, o.italic);
    const lines = wrap(ctx, o.text, innerW);
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width), 0);
    const height = lines.length * size * o.lineHeight;
    if ((height <= innerH && widest <= innerW) || size <= floor) return { lines, size, lineHeightPx: size * o.lineHeight };
    size = Math.max(floor, size * 0.95);
  }
}

function drawTextObject(ctx: CanvasRenderingContext2D, o: TextObject, unit: number): void {
  const { w, h } = o;
  if (o.background) {
    if (o.outline) hardShadow(ctx, w, h, 8 * unit, '#241B32');
    ctx.fillStyle = o.background;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    if (o.outline) {
      ctx.strokeStyle = '#241B32';
      ctx.lineWidth = 3 * unit;
      ctx.strokeRect(-w / 2, -h / 2, w, h);
    }
  }
  const layout = layoutText(ctx, o);
  const blockH = layout.lines.length * layout.lineHeightPx;
  const innerH = h - o.padding * 2;
  const top = -h / 2 + o.padding + (o.background ? Math.max(0, (innerH - blockH) / 2) : 0);
  const x = o.align === 'left' ? -w / 2 + o.padding : o.align === 'right' ? w / 2 - o.padding : 0;
  ctx.fillStyle = o.color;
  ctx.textAlign = o.align;
  ctx.textBaseline = 'alphabetic';
  layout.lines.forEach((line, i) => {
    ctx.fillText(line, x, top + (i + 0.5) * layout.lineHeightPx + layout.size * 0.34);
  });
}

function paint(part: 'color' | 'accent' | 'paper' | 'ink' | 'none' | undefined, o: StickerObject): string | null {
  switch (part) {
    case 'color': return o.color;
    case 'accent': return o.accent;
    case 'paper': return '#FFFFFF';
    case 'ink': return '#241B32';
    default: return null;
  }
}

const pathCache = new Map<string, Path2D>();

function stickerPath(d: string): Path2D {
  let path = pathCache.get(d);
  if (!path) {
    path = new Path2D(d);
    pathCache.set(d, path);
  }
  return path;
}

function drawStickerPart(ctx: CanvasRenderingContext2D, part: StickerPart, o: StickerObject): void {
  const path = stickerPath(part.d);
  ctx.globalAlpha *= part.opacity ?? 1;
  const fill = paint(part.fill, o);
  const stroke = paint(part.stroke, o);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill(path);
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = part.width ?? 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.setLineDash(part.dash ?? []);
    ctx.stroke(path);
    ctx.setLineDash([]);
  }
}

function drawStickerObject(ctx: CanvasRenderingContext2D, o: StickerObject): void {
  const def = getSticker(o.sticker);
  if (!def) return;
  ctx.scale(o.w / 100, o.h / 100);
  ctx.translate(-50, -50);
  const alpha = ctx.globalAlpha;
  for (const part of def.parts) {
    ctx.globalAlpha = alpha;
    drawStickerPart(ctx, part, o);
  }
}

function drawShapeObject(ctx: CanvasRenderingContext2D, o: ShapeObject, unit: number): void {
  if (o.shadow) hardShadow(ctx, o.w, o.h, 8 * unit, o.stroke ?? '#241B32');
  ctx.fillStyle = o.fill;
  ctx.fillRect(-o.w / 2, -o.h / 2, o.w, o.h);
  if (o.stroke && o.strokeWidth > 0) {
    ctx.strokeStyle = o.stroke;
    ctx.lineWidth = o.strokeWidth;
    ctx.strokeRect(-o.w / 2, -o.h / 2, o.w, o.h);
  }
}

export function drawObject(ctx: CanvasRenderingContext2D, o: SceneObject, images: ImageLookup, unit: number): void {
  ctx.save();
  ctx.globalAlpha = o.opacity;
  ctx.translate(o.x + o.w / 2, o.y + o.h / 2);
  ctx.rotate((o.rotation * Math.PI) / 180);
  if (o.type === 'image') drawImageObject(ctx, o, images, unit);
  else if (o.type === 'text') drawTextObject(ctx, o, unit);
  else if (o.type === 'sticker') drawStickerObject(ctx, o);
  else drawShapeObject(ctx, o, unit);
  ctx.restore();
}

/** Draws the whole board. The live editor, thumbnails and final exports all go through this one function. */
export function renderScene(ctx: CanvasRenderingContext2D, scene: Scene, images: ImageLookup, options: RenderOptions): void {
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.scale(options.scale, options.scale);
  drawBackground(ctx, scene.background, scene.width, scene.height);
  const unit = Math.min(scene.width, scene.height) / 1080;
  for (const object of scene.objects) {
    if (object.id !== options.skipId) drawObject(ctx, object, images, unit);
  }
  ctx.restore();
}
