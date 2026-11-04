import { boundingBox } from '../engine/geometry';
import { fontFor, getFontPair } from './fonts';
import { newId } from './ids';
import { getPalette, mix, readableOn } from './palettes';
import { getSticker } from './stickers';
import type { Asset, FontKey, ImageObject, Palette, Scene, SceneObject, ShapeObject, StickerObject, TextObject } from './types';

export const MAX_VISIBLE_QUOTES = 2;

export function cloneScene(scene: Scene): Scene {
  return JSON.parse(JSON.stringify(scene)) as Scene;
}

export function countQuotes(scene: Scene): number {
  return scene.objects.filter((o) => o.type === 'text' && o.role === 'quote').length;
}

export function sceneFonts(scene: Scene): FontKey[] {
  return scene.objects.filter((o): o is TextObject => o.type === 'text').map((o) => o.font);
}

/** Recolors every object that remembers its palette role. Colors a person picked by hand stay as they are. */
export function applyPalette(scene: Scene, palette: Palette): Scene {
  const next = cloneScene(scene);
  next.meta.paletteId = palette.id;
  for (const o of next.objects) {
    if (o.type === 'shape' && o.fillRole) {
      o.fill = palette[o.fillRole];
    } else if (o.type === 'sticker') {
      if (o.colorRole) o.color = palette[o.colorRole];
      if (o.accentRole) o.accent = palette[o.accentRole];
    } else if (o.type === 'text') {
      if (o.backgroundRole) {
        o.background = palette[o.backgroundRole];
        if (o.colorRole === 'ink' || o.colorRole === 'paper') o.colorRole = readableOn(palette[o.backgroundRole], palette);
      }
      if (o.colorRole) o.color = palette[o.colorRole];
    } else if (o.type === 'image') {
      o.frame.stroke = palette.ink;
    }
  }
  const bg = next.background;
  if (scene.meta.templateId === 'gallery-wall') bg.base = mix(palette.accent, palette.paper, 0.35);
  else if (scene.meta.templateId === 'dream-magazine') bg.base = palette.deep;
  else bg.base = palette.paper;
  if (bg.colors.length) bg.colors = [palette.primary, palette.secondary, palette.accent];
  return next;
}

export function applyFontPair(scene: Scene, pairId: string): Scene {
  const next = cloneScene(scene);
  const pair = getFontPair(pairId);
  next.meta.fontPairId = pairId;
  for (const o of next.objects) {
    if (o.type !== 'text') continue;
    const style = fontFor(pair, o.role);
    o.font = style.font;
    o.weight = style.weight;
    o.italic = style.italic;
  }
  return next;
}

function centred(scene: Scene, w: number, h: number): { x: number; y: number } {
  return { x: (scene.width - w) / 2, y: (scene.height - h) / 2 };
}

export function makeSticker(scene: Scene, key: string, palette: Palette): StickerObject | null {
  const def = getSticker(key);
  if (!def) return null;
  const w = Math.min(scene.width, scene.height) * 0.16;
  const h = w / def.aspect;
  return {
    id: newId('k'), type: 'sticker', sticker: key, name: `Sticker: ${def.label}`, ...centred(scene, w, h), w, h, rotation: 0, opacity: 1,
    color: palette.primary, colorRole: 'primary', accent: palette.secondary, accentRole: 'secondary',
  };
}

export function makeImage(scene: Scene, asset: Asset, palette: Palette): ImageObject {
  const unit = Math.min(scene.width, scene.height) * 0.42;
  const aspect = asset.width / Math.max(1, asset.height);
  const w = aspect >= 1 ? unit * Math.min(aspect, 1.6) : unit;
  const h = w / Math.min(1.6, Math.max(0.6, aspect));
  const count = scene.objects.filter((o) => o.type === 'image').length;
  return {
    id: newId('i'), type: 'image', name: `Photo ${count + 1}`, ...centred(scene, w, h), w, h, rotation: 0, opacity: 1, assetId: asset.id,
    crop: { focusX: asset.focus.x, focusY: asset.focus.y, zoom: 1 },
    frame: { style: 'outline', color: '#FFFFFF', stroke: palette.ink, strokeWidth: 3, shadow: true },
  };
}

export function makeText(scene: Scene, role: TextObject['role'], text: string, palette: Palette): TextObject {
  const style = fontFor(getFontPair(scene.meta.fontPairId), role);
  const u = Math.min(scene.width, scene.height) / 1080;
  const w = scene.width * (scene.width > scene.height ? 0.36 : 0.7);
  const h = 190 * u;
  const count = scene.objects.filter((o) => o.type === 'text' && o.role === role).length;
  return {
    id: newId('t'), type: 'text', role, name: role === 'quote' ? `Quote ${count + 1}` : role === 'title' ? 'Title' : 'Caption',
    ...centred(scene, w, h), w, h, rotation: 0, opacity: 1, text, font: style.font, size: (role === 'title' ? 84 : 52) * u, weight: style.weight, italic: style.italic,
    color: palette.ink, colorRole: 'ink', align: 'left', lineHeight: 1.16, background: role === 'quote' ? palette.paper : null,
    backgroundRole: role === 'quote' ? 'paper' : undefined, padding: role === 'quote' ? 26 * u : 0, outline: role === 'quote',
  };
}

export function makeBlock(scene: Scene, palette: Palette): ShapeObject {
  const w = scene.width * 0.24;
  const h = scene.height * 0.22;
  return {
    id: newId('s'), type: 'shape', name: 'Color block', ...centred(scene, w, h), w, h, rotation: 0, opacity: 1,
    fill: palette.secondary, fillRole: 'secondary', stroke: palette.ink, strokeWidth: 3, shadow: true,
  };
}

export type LayerMove = 'forward' | 'backward' | 'front' | 'back';

export function moveLayer(objects: SceneObject[], id: string, move: LayerMove): SceneObject[] {
  const index = objects.findIndex((o) => o.id === id);
  if (index < 0) return objects;
  const next = [...objects];
  const [item] = next.splice(index, 1);
  const target = move === 'front' ? next.length : move === 'back' ? 0 : Math.min(next.length, Math.max(0, index + (move === 'forward' ? 1 : -1)));
  next.splice(target, 0, item);
  return next;
}

export function duplicateObject(object: SceneObject, offset: number): SceneObject {
  const copy = JSON.parse(JSON.stringify(object)) as SceneObject;
  copy.id = newId(object.id[0]);
  copy.x += offset;
  copy.y += offset;
  copy.name = `${object.name} copy`;
  return copy;
}

export interface SceneIssue {
  objectId: string;
  problem: string;
}

/** Every generated board must pass this: on canvas, quote and sticker limits respected, a hero image present. */
export function validateScene(scene: Scene, options: { requireImage?: boolean } = {}): SceneIssue[] {
  const issues: SceneIssue[] = [];
  const tolerance = 1;
  for (const o of scene.objects) {
    if (![o.x, o.y, o.w, o.h, o.rotation].every(Number.isFinite)) issues.push({ objectId: o.id, problem: 'non-finite geometry' });
    const bb = boundingBox(o);
    if (bb.minX < -tolerance || bb.minY < -tolerance || bb.maxX > scene.width + tolerance || bb.maxY > scene.height + tolerance) {
      issues.push({ objectId: o.id, problem: `off canvas: ${o.name} [${bb.minX.toFixed(0)},${bb.minY.toFixed(0)} to ${bb.maxX.toFixed(0)},${bb.maxY.toFixed(0)}]` });
    }
    if (o.w <= 0 || o.h <= 0) issues.push({ objectId: o.id, problem: 'empty size' });
  }
  if (countQuotes(scene) > MAX_VISIBLE_QUOTES) issues.push({ objectId: '', problem: 'too many quotes' });
  if (scene.objects.filter((o) => o.type === 'sticker').length > 5) issues.push({ objectId: '', problem: 'too many stickers' });
  if (options.requireImage && !scene.objects.some((o) => o.type === 'image')) issues.push({ objectId: '', problem: 'no hero image' });
  return issues;
}

export { getPalette };
