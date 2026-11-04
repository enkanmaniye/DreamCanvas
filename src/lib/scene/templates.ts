import { fontFor, getFontPair } from './fonts';
import { newId, seededRandom } from './ids';
import { mix, readableOn } from './palettes';
import { getSticker, mapTagsToStickers } from './stickers';
import {
  BASE_SIZE,
  SCENE_VERSION,
  type Asset,
  type BoardShape,
  type FontKey,
  type FrameStyle,
  type ImageObject,
  type Palette,
  type PaletteRole,
  type Scene,
  type SceneObject,
  type ShapeObject,
  type StickerObject,
  type TemplateId,
  type TextObject,
  type TextRole,
} from './types';

export interface TemplateInfo {
  id: TemplateId;
  name: string;
  description: string;
  /** How many photos the layout can hold before the rest wait in the tray. */
  capacity: number;
}

export const TEMPLATES: TemplateInfo[] = [
  { id: 'editorial-grid', name: 'Editorial Grid', description: 'One large photo, a tight grid and a color block for your words.', capacity: 8 },
  { id: 'gallery-wall', name: 'Gallery Wall', description: 'Matted prints hung around a single line, with your quote as a print.', capacity: 9 },
  { id: 'modern-scrapbook', name: 'Modern Scrapbook', description: 'Tilted instant photos, tape and a handwritten note.', capacity: 7 },
  { id: 'minimal-focus', name: 'Minimal Focus', description: 'One photo and plenty of quiet space for desktop icons.', capacity: 4 },
  { id: 'dream-magazine', name: 'Dream Magazine', description: 'A full-page cover with a masthead and cover lines.', capacity: 5 },
];

export interface ComposeInput {
  templateId: TemplateId;
  shape: BoardShape;
  assets: Asset[];
  title: string;
  quotes: string[];
  stickerTags: string[];
  palette: Palette;
  fontPairId: string;
  seed: number;
}

export interface ComposeResult {
  scene: Scene;
  /** Photos that did not fit this layout. They stay in the tray. */
  unplaced: Asset[];
}

interface Rect { x: number; y: number; w: number; h: number }
interface Slot extends Rect { rotation?: number; frame?: FrameStyle }
interface Spot { x: number; y: number; size: number; rotation: number }

const CHAR_WIDTH: Record<FontKey, number> = { bricolage: 0.6, 'space-grotesk': 0.58, 'dm-sans': 0.54, 'instrument-serif': 0.45, caveat: 0.4 };

function estimateHeight(text: string, size: number, width: number, font: FontKey, lineHeight: number): number {
  const perLine = Math.max(1, Math.floor(width / (size * CHAR_WIDTH[font])));
  let lines = 0;
  for (const paragraph of text.split('\n')) {
    let used = 0;
    let count = 1;
    for (const word of paragraph.split(/\s+/)) {
      if (used > 0 && used + 1 + word.length > perLine) {
        count += 1;
        used = word.length;
      } else {
        used += (used ? 1 : 0) + word.length;
      }
    }
    lines += count;
  }
  return lines * size * lineHeight;
}

/** Largest size that fits the box, by estimate. The renderer re-measures with the real font. */
export function fitSize(text: string, box: { w: number; h: number }, max: number, min: number, font: FontKey, lineHeight: number): number {
  let size = max;
  const longest = Math.max(...text.split(/\s+/).map((word) => word.length), 1);
  while (size > min) {
    const wordFits = longest * size * CHAR_WIDTH[font] <= box.w;
    if (wordFits && estimateHeight(text, size, box.w, font, lineHeight) <= box.h) break;
    size -= 1;
  }
  return Math.max(size, min);
}

class Builder {
  objects: SceneObject[] = [];
  placed: Asset[] = [];
  readonly pair;
  readonly u: number;
  readonly random: () => number;
  private readonly used = new Set<string>();
  private photoCount = 0;
  private quoteCount = 0;
  private stickerCount = 0;

  constructor(readonly input: ComposeInput, readonly W: number, readonly H: number) {
    this.pair = getFontPair(input.fontPairId);
    this.u = Math.min(W, H) / 1080;
    this.random = seededRandom(input.seed);
  }

  get palette() {
    return this.input.palette;
  }

  shape(rect: Rect, fillRole: PaletteRole, options: { rotation?: number; stroke?: boolean; shadow?: boolean; name?: string } = {}): ShapeObject {
    const shape: ShapeObject = {
      id: newId('s'), type: 'shape', name: options.name ?? 'Color block', ...rect, rotation: options.rotation ?? 0, opacity: 1,
      fill: this.palette[fillRole], fillRole, stroke: options.stroke ? this.palette.ink : null, strokeWidth: options.stroke ? 3 * this.u : 0, shadow: options.shadow ?? false,
    };
    this.objects.push(shape);
    return shape;
  }

  /** Puts assets into slots: first asset into the first slot, the rest by closest aspect ratio. */
  photos(slots: Slot[], assets: Asset[], defaults: { frame: FrameStyle; shadow?: boolean }): void {
    const remaining = [...assets];
    slots.forEach((slot, index) => {
      if (remaining.length === 0) return;
      const target = slot.w / slot.h;
      let best = 0;
      if (index > 0) {
        let bestScore = Infinity;
        remaining.forEach((asset, i) => {
          const score = Math.abs(Math.log(asset.width / asset.height / target));
          if (score < bestScore) { bestScore = score; best = i; }
        });
      }
      const [asset] = remaining.splice(best, 1);
      this.photo(slot, asset, defaults);
    });
  }

  photo(slot: Slot, asset: Asset, defaults: { frame: FrameStyle; shadow?: boolean }): ImageObject {
    this.photoCount += 1;
    const style = slot.frame ?? defaults.frame;
    const image: ImageObject = {
      id: newId('i'), type: 'image', name: `Photo ${this.photoCount}`,
      x: slot.x, y: slot.y, w: slot.w, h: slot.h, rotation: slot.rotation ?? 0, opacity: 1,
      assetId: asset.id,
      crop: { focusX: asset.focus.x, focusY: asset.focus.y, zoom: 1 },
      frame: { style, color: '#FFFFFF', stroke: this.palette.ink, strokeWidth: style === 'none' ? 0 : 3 * this.u, shadow: defaults.shadow ?? false },
    };
    this.objects.push(image);
    if (!this.used.has(asset.id)) {
      this.used.add(asset.id);
      this.placed.push(asset);
    }
    return image;
  }

  text(role: TextRole, text: string, box: Rect, options: {
    max: number; min?: number; lineHeight?: number; align?: 'left' | 'center' | 'right'; colorRole?: PaletteRole; background?: PaletteRole | null;
    padding?: number; rotation?: number; outline?: boolean; upper?: boolean;
  }): TextObject {
    const style = fontFor(this.pair, role);
    const padding = options.padding ?? 0;
    const lineHeight = options.lineHeight ?? (role === 'title' ? 1 : 1.16);
    const content = options.upper ? text.toUpperCase() : text;
    const inner = { w: box.w - padding * 2, h: box.h - padding * 2 };
    const size = fitSize(content, inner, options.max, options.min ?? Math.round(options.max * 0.4), style.font, lineHeight);
    const background = options.background ?? null;
    const colorRole = options.colorRole ?? (background ? readableOn(this.palette[background], this.palette) : 'ink');
    if (role === 'quote') this.quoteCount += 1;
    const object: TextObject = {
      id: newId('t'), type: 'text', role,
      name: role === 'title' ? 'Title' : role === 'quote' ? `Quote ${this.quoteCount}` : 'Caption',
      ...box, rotation: options.rotation ?? 0, opacity: 1,
      text: content, font: style.font, size, weight: style.weight, italic: style.italic,
      color: this.palette[colorRole], colorRole, align: options.align ?? 'left', lineHeight,
      background: background ? this.palette[background] : null, backgroundRole: background ?? undefined,
      padding, outline: options.outline,
    };
    this.objects.push(object);
    return object;
  }

  sticker(key: string, spot: Spot, colorRole: PaletteRole, accentRole: PaletteRole, options: { locked?: boolean } = {}): void {
    const def = getSticker(key);
    if (!def) return;
    this.stickerCount += 1;
    const w = spot.size;
    const h = spot.size / def.aspect;
    const sticker: StickerObject = {
      id: newId('k'), type: 'sticker', sticker: key, name: `Sticker: ${def.label}`,
      x: spot.x, y: spot.y, w, h, rotation: spot.rotation, opacity: 1,
      color: this.palette[colorRole], colorRole, accent: this.palette[accentRole], accentRole, locked: options.locked,
    };
    this.objects.push(sticker);
  }

  /** Sticker colors rotate through the palette so a board never reads as one flat tint. */
  stickers(spots: Spot[], exclude: string[] = []): void {
    const keys = mapTagsToStickers(this.input.stickerTags, spots.length, exclude);
    const colors: [PaletteRole, PaletteRole][] = [['secondary', 'primary'], ['primary', 'secondary'], ['accent', 'secondary'], ['secondary', 'accent'], ['primary', 'accent']];
    keys.forEach((key, i) => this.sticker(key, spots[i], colors[i % colors.length][0], colors[i % colors.length][1]));
  }
}

function clampRotated(rect: Rect, rotation: number, W: number, H: number, margin: number): Rect {
  const a = (Math.abs(rotation) * Math.PI) / 180;
  const bw = rect.w * Math.cos(a) + rect.h * Math.sin(a);
  const bh = rect.w * Math.sin(a) + rect.h * Math.cos(a);
  const cx = Math.min(W - margin - bw / 2, Math.max(margin + bw / 2, rect.x + rect.w / 2));
  const cy = Math.min(H - margin - bh / 2, Math.max(margin + bh / 2, rect.y + rect.h / 2));
  return { ...rect, x: cx - rect.w / 2, y: cy - rect.h / 2 };
}

/** One dominant image with the rest stacked beside and beneath it, so no two tiles share a size. */
function mosaic(area: Rect, count: number, gap: number, heroShare: number): Rect[] {
  const { x, y, w, h } = area;
  if (count <= 0) return [];
  if (count === 1) return [area];
  const tall = h > w;
  if (tall) {
    const heroH = (h - gap) * heroShare;
    const rest = count - 1;
    const rows = rest > 3 ? 2 : 1;
    const perRow = Math.ceil(rest / rows);
    const rowH = (h - heroH - gap * rows) / rows;
    const rects: Rect[] = [{ x, y, w, h: heroH }];
    for (let r = 0, placed = 0; r < rows; r += 1) {
      const inRow = Math.min(perRow, rest - placed);
      const cw = (w - gap * (inRow - 1)) / inRow;
      for (let c = 0; c < inRow; c += 1, placed += 1) {
        rects.push({ x: x + c * (cw + gap), y: y + heroH + gap + r * (rowH + gap), w: cw, h: rowH });
      }
    }
    return rects;
  }
  const rest = count - 1;
  const side = rest >= 2 ? Math.min(3, Math.ceil(rest / 2)) : rest;
  const bottom = rest - side;
  const heroW = (w - gap) * heroShare;
  const heroH = bottom > 0 ? (h - gap) * 0.68 : h;
  const rects: Rect[] = [{ x, y, w: heroW, h: heroH }];
  const sideH = (h - gap * (side - 1)) / side;
  for (let i = 0; i < side; i += 1) {
    rects.push({ x: x + heroW + gap, y: y + i * (sideH + gap), w: w - heroW - gap, h: sideH });
  }
  const cellW = (heroW - gap * (bottom - 1)) / Math.max(1, bottom);
  for (let i = 0; i < bottom; i += 1) {
    rects.push({ x: x + i * (cellW + gap), y: y + heroH + gap, w: cellW, h: h - heroH - gap });
  }
  return rects;
}

function editorialGrid(b: Builder, assets: Asset[], title: string, quotes: string[]): void {
  const { W, H, u } = b;
  const m = 44 * u;
  const g = 18 * u;
  const landscape = W > H;
  const mirror = b.random() > 0.5;
  const flipX = (r: Rect): Rect => (mirror && landscape ? { ...r, x: W - r.x - r.w } : r);

  if (landscape) {
    const textW = W * 0.3;
    const imageArea: Rect = { x: m, y: m, w: W - m * 2 - textW - g, h: H - m * 2 };
    b.photos(mosaic(imageArea, Math.min(assets.length, 8), g, 0.66).map(flipX), assets, { frame: 'outline' });
    const tx = W - m - textW;
    const titleBox: Rect = { x: tx, y: m, w: textW, h: H * 0.34 };
    b.text('title', title, flipX(titleBox), { max: 104 * u, min: 44 * u });
    const panelY = m + titleBox.h + g;
    const panelH = H - m - panelY;
    if (quotes[1]) {
      const small = panelH * 0.34;
      b.text('quote', quotes[0], flipX({ x: tx, y: panelY, w: textW, h: panelH - small - g }), { max: 58 * u, background: 'primary', padding: 30 * u, outline: true });
      b.text('quote', quotes[1], flipX({ x: tx, y: H - m - small, w: textW, h: small }), { max: 38 * u, background: 'secondary', padding: 24 * u, outline: true });
    } else if (quotes[0]) {
      b.text('quote', quotes[0], flipX({ x: tx, y: panelY, w: textW, h: panelH }), { max: 68 * u, background: 'primary', padding: 34 * u, outline: true });
    }
    const seam = mirror ? m + textW + g / 2 : W - m - textW - g / 2;
    const spots: Spot[] = [
      { x: seam - 84 * u, y: m + titleBox.h - 64 * u, size: 168 * u, rotation: -10 },
      { x: mirror ? W - m - 168 * u : m + 22 * u, y: m + 22 * u, size: 146 * u, rotation: 10 },
      { x: mirror ? seam + 22 * u : seam - 170 * u, y: H - m - 156 * u, size: 148 * u, rotation: 8 },
    ];
    b.stickers(spots);
  } else {
    const textH = H * 0.3;
    b.text('title', title, { x: m, y: m, w: W - m * 2, h: textH * 0.5 }, { max: 112 * u, min: 52 * u });
    const qy = m + textH * 0.5 + g;
    const fullW = W - m * 2;
    const firstW = quotes[1] ? fullW * 0.6 : fullW;
    if (quotes[0]) b.text('quote', quotes[0], { x: m, y: qy, w: firstW, h: textH * 0.5 - g }, { max: 54 * u, background: 'primary', padding: 26 * u, outline: true });
    if (quotes[1]) b.text('quote', quotes[1], { x: m + firstW + g, y: qy, w: fullW - firstW - g, h: textH * 0.5 - g }, { max: 36 * u, background: 'secondary', padding: 20 * u, outline: true });
    const imageArea: Rect = { x: m, y: m + textH + g, w: W - m * 2, h: H - m * 2 - textH - g };
    b.photos(mosaic(imageArea, Math.min(assets.length, 8), g, 0.62), assets, { frame: 'outline' });
    b.stickers([
      { x: W - m - 170 * u, y: m + textH + g - 70 * u, size: 164 * u, rotation: 10 },
      { x: m + 14 * u, y: m + textH + g + 18 * u, size: 134 * u, rotation: -9 },
      { x: W - m - 156 * u, y: H - m - 170 * u, size: 142 * u, rotation: 6 },
    ]);
  }
}

function galleryWall(b: Builder, assets: Asset[], title: string, quotes: string[]): void {
  const { W, H, u, palette } = b;
  const m = 56 * u;
  const g = 30 * u;
  const landscape = W > H;
  const topH = landscape ? H * 0.2 : H * 0.14;
  b.text('title', title, { x: m, y: m * 0.8, w: W * (landscape ? 0.56 : 0.86), h: topH - m * 0.5 }, { max: 92 * u, min: 44 * u });
  if (quotes[1]) {
    b.text('quote', quotes[1], { x: W * 0.62, y: m * 0.8, w: W * 0.34, h: topH - m * 0.5 }, { max: 36 * u, align: 'right', colorRole: 'ink' });
  }

  type Item = { aspect: number; asset?: Asset; quote?: string };
  const images = assets.slice(0, 9);
  const items: Item[] = images.map((asset) => ({ aspect: Math.min(1.6, Math.max(0.72, asset.width / asset.height)), asset }));
  if (quotes[0]) items.splice(Math.floor(items.length / 2), 0, { aspect: 1.15, quote: quotes[0] });
  const rows = landscape ? (items.length <= 3 ? 1 : items.length <= 8 ? 2 : 3) : Math.min(5, Math.ceil(items.length / 2));
  const perRow = Math.ceil(items.length / rows);
  const area: Rect = { x: m, y: topH + 20 * u, w: W - m * 2, h: H - topH - 20 * u - m };
  const maxRowH = (area.h - g * (rows - 1)) / rows;
  const rhythm = [1, 0.84, 0.95, 0.8, 0.9];
  let index = 0;
  for (let r = 0; r < rows; r += 1) {
    const row = items.slice(index, index + perRow);
    const sizes = row.map((item, i) => ({ item, factor: rhythm[(i + r * 2) % rhythm.length] }));
    const span = sizes.reduce((sum, s) => sum + s.item.aspect * s.factor, 0);
    const rowH = Math.min(maxRowH, (area.w - g * (row.length - 1)) / span);
    const totalW = sizes.reduce((sum, s) => sum + s.item.aspect * s.factor * rowH, 0) + g * (row.length - 1);
    let x = area.x + (area.w - totalW) / 2;
    const axis = area.y + r * (maxRowH + g) + maxRowH / 2;
    for (const { item, factor } of sizes) {
      const h = rowH * factor;
      const w = item.aspect * h;
      const slot = { x, y: axis - h / 2, w, h };
      if (item.asset) b.photo(slot, item.asset, { frame: 'mat', shadow: true });
      else if (item.quote) b.text('quote', item.quote, slot, { max: 56 * u, background: 'paper', colorRole: 'ink', padding: Math.min(w, h) * 0.1, align: 'center', outline: true });
      x += w + g;
    }
    index += row.length;
  }
  b.stickers([
    { x: W - m - 136 * u, y: H - m - 128 * u, size: 150 * u, rotation: 10 },
    { x: m * 0.4, y: H - m - 120 * u, size: 136 * u, rotation: -8 },
  ]);
  void palette;
}

const SCRAP_LANDSCAPE = [
  [0.245, 0.585, 0.335, 1.28, -2.5], [0.57, 0.36, 0.225, 1.12, 2.2], [0.835, 0.31, 0.2, 0.92, -3], [0.5, 0.75, 0.19, 1.2, -1.8],
  [0.405, 0.14, 0.12, 1, 3.5], [0.94, 0.74, 0.105, 0.9, 4], [0.07, 0.17, 0.095, 1, -4],
] as const;
const SCRAP_PORTRAIT = [
  [0.4, 0.29, 0.68, 1.1, -2.2], [0.78, 0.125, 0.34, 1, 3], [0.28, 0.7, 0.46, 0.98, -3], [0.73, 0.74, 0.44, 1, 3],
  [0.5, 0.895, 0.3, 1, -3], [0.13, 0.9, 0.21, 1, 3], [0.89, 0.46, 0.18, 1, 4],
] as const;

function modernScrapbook(b: Builder, assets: Asset[], title: string, quotes: string[]): void {
  const { W, H, u } = b;
  const m = 34 * u;
  const landscape = W > H;
  const table = landscape ? SCRAP_LANDSCAPE : SCRAP_PORTRAIT;
  const images = assets.slice(0, table.length);
  const taped: Rect[] = [];
  images.forEach((asset, i) => {
    const [cx, cy, wf, ar, rot] = table[i];
    const w = W * wf;
    const h = w / ar + w * 0.1;
    const box = clampRotated({ x: W * cx - w / 2, y: H * cy - h / 2, w, h }, rot, W, H, m);
    b.photo({ ...box, rotation: rot }, asset, { frame: 'polaroid', shadow: true });
    if (i < 2) taped.push(box);
  });
  taped.forEach((box, i) => {
    const size = 150 * u;
    const h = size / 3;
    b.sticker('tape', { x: box.x + box.w / 2 - size / 2, y: box.y - h * 0.45, size, rotation: i === 0 ? -4 : 5 }, i === 0 ? 'secondary' : 'accent', 'accent');
  });
  const titleW = landscape ? W * 0.3 : W * 0.56;
  b.text('title', title, { x: m + 10 * u, y: m + (landscape ? 150 * u : 8 * u), w: titleW, h: landscape ? 150 * u : 180 * u }, {
    max: 62 * u, min: 34 * u, background: 'secondary', padding: 20 * u, rotation: -2, outline: true,
  });
  if (quotes[0]) {
    const note: Rect = landscape
      ? { x: W * 0.625, y: H * 0.585, w: W * 0.235, h: H * 0.3 }
      : { x: W * 0.14, y: H * 0.475, w: W * 0.62, h: H * 0.095 };
    b.text('quote', quotes[0], note, { max: 62 * u, background: 'paper', padding: 26 * u, rotation: 1.6, outline: true, align: 'center' });
  }
  if (quotes[1]) {
    const line: Rect = landscape
      ? { x: W * 0.33, y: H * 0.915, w: W * 0.34, h: H * 0.062 }
      : { x: W * 0.08, y: H * 0.955, w: W * 0.84, h: H * 0.036 };
    b.text('quote', quotes[1], line, { max: 34 * u, colorRole: 'ink', background: 'accent', padding: 8 * u, align: 'center' });
  }
  b.stickers(landscape
    ? [{ x: W * 0.588, y: H * 0.525, size: 132 * u, rotation: -10 }, { x: W * 0.69, y: H * 0.04, size: 118 * u, rotation: 9 }]
    : [{ x: W * 0.8, y: H * 0.545, size: 146 * u, rotation: 9 }, { x: W * 0.03, y: H * 0.12, size: 128 * u, rotation: -9 }]);
}

function minimalFocus(b: Builder, assets: Asset[], title: string, quotes: string[]): void {
  const { W, H, u } = b;
  const m = 72 * u;
  const landscape = W > H;
  const [hero, ...rest] = assets;
  const thumbs = rest.slice(0, 3);
  if (landscape) {
    const heroBox: Rect = { x: W * 0.47, y: m, w: W * 0.53 - m, h: H - m * 2 };
    if (hero) b.photo(heroBox, hero, { frame: 'outline', shadow: true });
    const colW = W * 0.47 - m * 1.6;
    b.text('title', title, { x: m, y: m, w: colW, h: H * 0.32 }, { max: 112 * u, min: 48 * u });
    const quoteY = m + H * 0.34;
    if (quotes[0]) b.text('quote', quotes[0], { x: m, y: quoteY, w: colW * 0.92, h: H * 0.2 }, { max: 50 * u, min: 26 * u, lineHeight: 1.2 });
    if (quotes[1]) b.text('quote', quotes[1], { x: m, y: quoteY + H * 0.21, w: colW * 0.8, h: H * 0.08 }, { max: 36 * u, min: 22 * u, lineHeight: 1.2, colorRole: 'deep' });
    const size = Math.min(170 * u, (colW - 36 * u) / 3);
    thumbs.forEach((asset, i) => b.photo({ x: m + i * (size + 18 * u), y: H - m - size, w: size, h: size }, asset, { frame: 'outline' }));
    b.stickers([{ x: W * 0.47 - 92 * u, y: H - m - 150 * u, size: 176 * u, rotation: 8 }]);
  } else {
    const heroH = H * 0.54;
    if (hero) b.photo({ x: m, y: m, w: W - m * 2, h: heroH }, hero, { frame: 'outline', shadow: true });
    b.text('title', title, { x: m, y: m + heroH + 40 * u, w: W - m * 2, h: H * 0.16 }, { max: 104 * u, min: 48 * u });
    if (quotes[0]) b.text('quote', quotes[0], { x: m, y: m + heroH + 50 * u + H * 0.16, w: W - m * 2, h: H * 0.11 }, { max: 50 * u, min: 26 * u });
    const size = 124 * u;
    thumbs.forEach((asset, i) => b.photo({ x: m + i * (size + 16 * u), y: H - m - size, w: size, h: size }, asset, { frame: 'outline' }));
    b.stickers([{ x: W - m - 140 * u, y: m + heroH - 74 * u, size: 148 * u, rotation: 8 }]);
  }
}

function dreamMagazine(b: Builder, assets: Asset[], title: string, quotes: string[]): void {
  const { W, H, u } = b;
  const m = 44 * u;
  const landscape = W > H;
  const [hero, ...rest] = assets;
  if (hero) b.photo({ x: 0, y: 0, w: W, h: H }, hero, { frame: 'none' });
  const bandH = landscape ? H * 0.22 : H * 0.16;
  b.shape({ x: 0, y: 0, w: W, h: bandH }, 'primary', { name: 'Masthead band' });
  const masthead = b.text('title', title, { x: m, y: 14 * u, w: W - m * 2, h: bandH - 28 * u }, { max: landscape ? 188 * u : 118 * u, min: 58 * u, lineHeight: 0.98, upper: true });
  masthead.name = 'Masthead';

  const insets = rest.slice(0, 4);
  if (landscape) {
    const insetW = W * 0.17;
    const count = insets.length;
    const top = bandH + 26 * u;
    const available = H - top - m;
    const insetH = count ? Math.min(insetW * 0.92, (available - (count - 1) * 18 * u) / count) : 0;
    insets.forEach((asset, i) => b.photo({ x: W - m - insetW, y: top + i * (insetH + 18 * u), w: insetW, h: insetH }, asset, { frame: 'outline', shadow: true }));
    if (quotes[0]) b.text('quote', quotes[0], { x: m, y: H - m - H * 0.3, w: W * 0.4, h: H * 0.3 }, { max: 70 * u, background: 'paper', colorRole: 'ink', padding: 30 * u, outline: true });
    if (quotes[1]) b.text('quote', quotes[1], { x: m + W * 0.4 + 18 * u, y: H - m - H * 0.15, w: W * 0.26, h: H * 0.15 }, { max: 34 * u, background: 'secondary', padding: 18 * u, outline: true });
    b.stickers([
      { x: m + 8 * u, y: bandH + 24 * u, size: 176 * u, rotation: -8 },
      { x: W * 0.4 + m - 78 * u, y: H - m - H * 0.3 - 66 * u, size: 142 * u, rotation: 10 },
    ], []);
  } else {
    const size = (W - m * 2 - 18 * u * 3) / 4;
    insets.forEach((asset, i) => b.photo({ x: m + i * (size + 18 * u), y: H - m - size, w: size, h: size }, asset, { frame: 'outline', shadow: true }));
    const bottom = H - m - (insets.length ? size + 24 * u : 0);
    if (quotes[0]) b.text('quote', quotes[0], { x: m, y: bottom - H * 0.17, w: W * 0.76, h: H * 0.17 }, { max: 64 * u, background: 'paper', colorRole: 'ink', padding: 26 * u, outline: true });
    if (quotes[1]) b.text('quote', quotes[1], { x: m, y: bottom - H * 0.17 - H * 0.085 - 16 * u, w: W * 0.6, h: H * 0.085 }, { max: 34 * u, background: 'secondary', padding: 16 * u, outline: true });
    b.stickers([
      { x: W - m - 150 * u, y: bandH + 30 * u, size: 146 * u, rotation: 8 },
      { x: W - m - 132 * u, y: H * 0.52, size: 118 * u, rotation: -9 },
    ]);
  }
}

const LAYOUTS: Record<TemplateId, (b: Builder, assets: Asset[], title: string, quotes: string[]) => void> = {
  'editorial-grid': editorialGrid,
  'gallery-wall': galleryWall,
  'modern-scrapbook': modernScrapbook,
  'minimal-focus': minimalFocus,
  'dream-magazine': dreamMagazine,
};

function backgroundFor(templateId: TemplateId, palette: Palette, seed: number): Scene['background'] {
  switch (templateId) {
    case 'gallery-wall':
      return { kind: 'tiles', base: mix(palette.accent, palette.paper, 0.35), colors: [palette.primary, palette.secondary, palette.accent], seed };
    case 'modern-scrapbook':
      return { kind: 'mesh', base: palette.paper, colors: [palette.primary, palette.secondary, palette.accent], seed };
    case 'dream-magazine':
      return { kind: 'solid', base: palette.deep, colors: [], seed };
    default:
      return { kind: 'solid', base: palette.paper, colors: [], seed };
  }
}

export function compose(input: ComposeInput): ComposeResult {
  const { width: W, height: H } = BASE_SIZE[input.shape];
  const capacity = TEMPLATES.find((t) => t.id === input.templateId)?.capacity ?? 8;
  const assets = input.assets.slice(0, capacity);
  const quotes = input.quotes.map((q) => q.trim()).filter(Boolean).slice(0, 2);
  const builder = new Builder(input, W, H);
  LAYOUTS[input.templateId](builder, assets, input.title.trim() || 'My dream board', quotes);
  const placedIds = new Set(builder.placed.map((a) => a.id));
  return {
    scene: {
      version: SCENE_VERSION,
      width: W,
      height: H,
      background: backgroundFor(input.templateId, input.palette, input.seed),
      objects: builder.objects,
      meta: { title: input.title.trim() || 'My dream board', templateId: input.templateId, paletteId: input.palette.id, fontPairId: input.fontPairId, seed: input.seed },
    },
    unplaced: input.assets.filter((a) => !placedIds.has(a.id)),
  };
}
