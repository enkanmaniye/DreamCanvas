type Paint = 'color' | 'accent' | 'paper' | 'ink' | 'none';

export interface StickerPart {
  d: string;
  fill?: Paint;
  stroke?: Paint;
  width?: number;
  dash?: number[];
  opacity?: number;
}

export interface StickerDef {
  key: string;
  label: string;
  tags: string[];
  /** Width / height. Keeps tape and routes from being squashed. */
  aspect: number;
  parts: StickerPart[];
}

function polar(cx: number, cy: number, r: number, deg: number): string {
  const a = ((deg - 90) * Math.PI) / 180;
  return `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
}

function starburst(cx: number, cy: number, outer: number, inner: number, points: number): string {
  const step = 180 / points;
  let d = '';
  for (let i = 0; i < points * 2; i += 1) {
    d += `${i === 0 ? 'M' : 'L'}${polar(cx, cy, i % 2 === 0 ? outer : inner, i * step)} `;
  }
  return `${d}Z`;
}

function circle(cx: number, cy: number, r: number): string {
  return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0Z`;
}

function petals(count: number, dist: number, r: number): string {
  let d = '';
  for (let i = 0; i < count; i += 1) {
    const a = ((i * 360) / count - 90) * (Math.PI / 180);
    d += circle(50 + dist * Math.cos(a), 50 + dist * Math.sin(a), r);
  }
  return d;
}

function perforated(x: number, y: number, w: number, h: number, teeth: number): string {
  const sw = w / teeth;
  const r = sw / 2;
  const rows = Math.round(h / sw);
  const sh = h / rows;
  let d = `M${x} ${y}`;
  for (let i = 0; i < teeth; i += 1) d += `a${r} ${r} 0 0 0 ${sw} 0`;
  for (let i = 0; i < rows; i += 1) d += `a${sh / 2} ${sh / 2} 0 0 0 0 ${sh}`;
  for (let i = 0; i < teeth; i += 1) d += `a${r} ${r} 0 0 0 ${-sw} 0`;
  for (let i = 0; i < rows; i += 1) d += `a${sh / 2} ${sh / 2} 0 0 0 0 ${-sh}`;
  return `${d}Z`;
}

const SPARKLE = 'M50 3C53 33 67 47 97 50C67 53 53 67 50 97C47 67 33 53 3 50C33 47 47 33 50 3Z';
const HEART = 'M50 86C20 64 8 48 8 32C8 19 18 11 29 11C38 11 46 16 50 25C54 16 62 11 71 11C82 11 92 19 92 32C92 48 80 64 50 86Z';

export const STICKERS: StickerDef[] = [
  { key: 'sunburst', label: 'Sunburst', tags: ['sun', 'summer', 'sunburst', 'warm', 'light', 'beach', 'energy'], aspect: 1, parts: [
    { d: starburst(50, 50, 48, 33, 14), fill: 'color', stroke: 'ink', width: 2.4 },
    { d: circle(50, 50, 21), fill: 'accent', stroke: 'ink', width: 2.4 },
  ] },
  { key: 'star', label: 'Hand-drawn star', tags: ['star', 'goal', 'ambition', 'success', 'night', 'dream'], aspect: 1, parts: [
    { d: 'M51 6L62 37L95 38L68 58L79 92L50 71L21 93L32 58L5 39L39 36Z', fill: 'color', stroke: 'ink', width: 2.8 },
    { d: 'M46 25L44 36M72 48L62 50', stroke: 'paper', fill: 'none', width: 3 },
  ] },
  { key: 'sparkle', label: 'Sparkle', tags: ['sparkle', 'magic', 'shine', 'dream', 'glow', 'creative'], aspect: 1, parts: [
    { d: SPARKLE, fill: 'color', stroke: 'ink', width: 2.4 },
  ] },
  { key: 'flower', label: 'Flower', tags: ['flower', 'garden', 'soft', 'spring', 'wellness', 'nature', 'growth', 'bloom'], aspect: 1, parts: [
    { d: petals(6, 25, 17), fill: 'color', stroke: 'ink', width: 2.4 },
    { d: circle(50, 50, 13), fill: 'accent', stroke: 'ink', width: 2.4 },
  ] },
  { key: 'cloud', label: 'Cloud', tags: ['cloud', 'sky', 'calm', 'soft', 'dream', 'rest', 'peace'], aspect: 1.5, parts: [
    { d: 'M26 74C12 74 4 65 4 54C4 43 13 35 24 36C27 22 39 14 52 16C63 18 71 26 73 37C86 36 96 44 96 55C96 66 87 74 76 74Z', fill: 'color', stroke: 'ink', width: 2.4 },
  ] },
  { key: 'wave', label: 'Wave', tags: ['wave', 'ocean', 'sea', 'water', 'surf', 'beach', 'island', 'travel'], aspect: 1.4, parts: [
    { d: 'M3 12H97V88H3Z', fill: 'paper', stroke: 'ink', width: 2.6 },
    { d: 'M12 36C22 24 30 24 40 36S58 48 68 36S82 26 88 32', fill: 'none', stroke: 'color', width: 9 },
    { d: 'M12 60C22 48 30 48 40 60S58 72 68 60S82 50 88 56', fill: 'none', stroke: 'accent', width: 9 },
    { d: 'M12 78C22 70 30 70 40 78S58 86 68 78S82 72 88 76', fill: 'none', stroke: 'ink', width: 3.4 },
  ] },
  { key: 'compass', label: 'Compass', tags: ['compass', 'travel', 'adventure', 'direction', 'explore', 'journey', 'career'], aspect: 1, parts: [
    { d: circle(50, 50, 45), fill: 'paper', stroke: 'ink', width: 3 },
    { d: circle(50, 50, 36), fill: 'none', stroke: 'ink', width: 1.5, dash: [3, 4] },
    { d: 'M50 16L60 50L50 84L40 50Z', fill: 'accent', stroke: 'ink', width: 2.4 },
    { d: 'M50 16L60 50H40Z', fill: 'color', stroke: 'ink', width: 2.4 },
  ] },
  { key: 'stamp', label: 'Postage stamp', tags: ['stamp', 'postage', 'travel', 'letter', 'vintage', 'journey'], aspect: 0.82, parts: [
    { d: perforated(10, 8, 80, 84, 8), fill: 'paper', stroke: 'ink', width: 2 },
    { d: 'M20 18H80V82H20Z', fill: 'color', stroke: 'ink', width: 2 },
    { d: 'M50 28C53 44 58 49 72 50C58 51 53 56 50 72C47 56 42 51 28 50C42 49 47 44 50 28Z', fill: 'paper', stroke: 'ink', width: 2 },
  ] },
  { key: 'bow', label: 'Bow', tags: ['bow', 'gift', 'cute', 'feminine', 'style', 'fashion', 'celebrate'], aspect: 1.3, parts: [
    { d: 'M46 46C30 26 12 20 6 28C0 38 0 58 8 66C16 72 32 62 46 52Z', fill: 'color', stroke: 'ink', width: 2.6 },
    { d: 'M54 46C70 26 88 20 94 28C100 38 100 58 92 66C84 72 68 62 54 52Z', fill: 'color', stroke: 'ink', width: 2.6 },
    { d: 'M44 54L30 88L42 82L48 92L52 56Z', fill: 'accent', stroke: 'ink', width: 2.4 },
    { d: 'M56 54L70 88L58 82L52 92L48 56Z', fill: 'accent', stroke: 'ink', width: 2.4 },
    { d: 'M43 40H57V60H43Z', fill: 'accent', stroke: 'ink', width: 2.6 },
  ] },
  { key: 'arrow', label: 'Arrow', tags: ['arrow', 'forward', 'progress', 'goal', 'next', 'career', 'momentum'], aspect: 1.25, parts: [
    { d: 'M6 74C26 26 56 22 84 44', fill: 'none', stroke: 'ink', width: 5 },
    { d: 'M64 54L94 54L84 24Z', fill: 'color', stroke: 'ink', width: 2.6 },
  ] },
  { key: 'route', label: 'Dashed route', tags: ['route', 'journey', 'road', 'map', 'travel', 'path', 'plan'], aspect: 1.6, parts: [
    { d: 'M10 80C24 40 44 80 58 52S80 22 88 20', fill: 'none', stroke: 'ink', width: 3.4, dash: [8, 7] },
    { d: circle(10, 80, 7), fill: 'accent', stroke: 'ink', width: 2.4 },
    { d: 'M88 28C80 18 78 12 82 7C85 3 91 3 94 7C98 12 96 18 88 28Z', fill: 'color', stroke: 'ink', width: 2.4 },
  ] },
  { key: 'ticket', label: 'Ticket', tags: ['ticket', 'event', 'concert', 'cinema', 'travel', 'flight', 'music'], aspect: 1.9, parts: [
    { d: 'M4 24H96V40A10 10 0 0 0 96 60V76H4V60A10 10 0 0 0 4 40Z', fill: 'color', stroke: 'ink', width: 2.4 },
    { d: 'M68 28V72', fill: 'none', stroke: 'ink', width: 2, dash: [4, 4] },
    { d: 'M16 40H56M16 50H46M16 60H52', fill: 'none', stroke: 'ink', width: 3 },
  ] },
  { key: 'tape', label: 'Masking tape', tags: ['tape', 'paper', 'collage', 'scrapbook', 'craft'], aspect: 3, parts: [
    { d: 'M3 18L8 25L3 32L8 39L3 46L8 53L3 60L8 67L3 74L8 82H92L97 74L92 67L97 60L92 53L97 46L92 39L97 32L92 25L97 18Z', fill: 'color', stroke: 'none', opacity: 0.86 },
  ] },
  { key: 'heart', label: 'Heart outline', tags: ['heart', 'love', 'family', 'relationship', 'care', 'wellness', 'self'], aspect: 1.05, parts: [
    { d: HEART, fill: 'none', stroke: 'color', width: 6 },
    { d: 'M50 74C28 58 18 46 18 34', fill: 'none', stroke: 'ink', width: 2 },
  ] },
  { key: 'polaroid', label: 'Tiny photo frame', tags: ['polaroid', 'photo', 'memory', 'camera', 'moment', 'lifestyle'], aspect: 0.86, parts: [
    { d: 'M10 6H90V94H10Z', fill: 'paper', stroke: 'ink', width: 2.6 },
    { d: 'M18 14H82V68H18Z', fill: 'color', stroke: 'ink', width: 2 },
    { d: 'M18 58L38 40L52 52L64 44L82 60V68H18Z', fill: 'accent', stroke: 'ink', width: 2 },
  ] },
  { key: 'butterfly', label: 'Butterfly', tags: ['butterfly', 'change', 'growth', 'freedom', 'soft', 'nature', 'girly'], aspect: 1.15, parts: [
    { d: 'M48 46C38 22 16 10 8 20C2 30 8 48 24 54C12 56 12 76 24 82C36 86 46 70 49 56Z', fill: 'color', stroke: 'ink', width: 2.6 },
    { d: 'M52 46C62 22 84 10 92 20C98 30 92 48 76 54C88 56 88 76 76 82C64 86 54 70 51 56Z', fill: 'accent', stroke: 'ink', width: 2.6 },
    { d: 'M50 36V74', fill: 'none', stroke: 'ink', width: 4 },
    { d: 'M50 36C48 28 44 24 40 22M50 36C52 28 56 24 60 22', fill: 'none', stroke: 'ink', width: 1.8 },
  ] },
  { key: 'vinyl', label: 'Vinyl record', tags: ['vinyl', 'music', 'record', 'song', 'creative', 'retro', 'studio'], aspect: 1, parts: [
    { d: circle(50, 50, 46), fill: 'ink', stroke: 'ink', width: 2 },
    { d: circle(50, 50, 36), fill: 'none', stroke: 'paper', width: 0.8, opacity: 0.5 },
    { d: circle(50, 50, 29), fill: 'none', stroke: 'paper', width: 0.8, opacity: 0.5 },
    { d: circle(50, 50, 17), fill: 'color', stroke: 'ink', width: 1.5 },
    { d: circle(50, 50, 3), fill: 'paper' },
  ] },
];

export function getSticker(key: string): StickerDef | undefined {
  return STICKERS.find((s) => s.key === key);
}

export function searchStickers(query: string): StickerDef[] {
  const q = query.trim().toLowerCase();
  if (!q) return STICKERS;
  return STICKERS.filter((s) => s.label.toLowerCase().includes(q) || s.tags.some((t) => t.includes(q)));
}

/**
 * Turns AI or rule-based sticker tags into curated artwork. No model call is involved:
 * exact keys win, then tag matches, then a mood-neutral default set.
 */
export function mapTagsToStickers(tags: string[], count: number, exclude: string[] = []): string[] {
  const picks: string[] = [];
  const add = (key: string) => {
    if (!picks.includes(key) && !exclude.includes(key) && key !== 'tape') picks.push(key);
  };
  const clean = tags.map((t) => t.trim().toLowerCase()).filter(Boolean);
  for (const tag of clean) if (getSticker(tag)) add(tag);
  for (const tag of clean) {
    for (const sticker of STICKERS) if (sticker.tags.includes(tag)) add(sticker.key);
  }
  for (const key of ['sparkle', 'star', 'flower', 'sunburst', 'arrow']) add(key);
  return picks.slice(0, Math.max(0, count));
}
