import type { FontKey, TextRole } from './types';

export interface FontFace {
  key: FontKey;
  label: string;
  family: string;
  stack: string;
}

export const FONTS: Record<FontKey, FontFace> = {
  bricolage: { key: 'bricolage', label: 'Bricolage Grotesque', family: 'Bricolage Grotesque', stack: '"Bricolage Grotesque", "Space Grotesk", "Arial Black", Arial, sans-serif' },
  'space-grotesk': { key: 'space-grotesk', label: 'Space Grotesk', family: 'Space Grotesk', stack: '"Space Grotesk", "Trebuchet MS", Arial, sans-serif' },
  'dm-sans': { key: 'dm-sans', label: 'DM Sans', family: 'DM Sans', stack: '"DM Sans", "Segoe UI", Arial, sans-serif' },
  'instrument-serif': { key: 'instrument-serif', label: 'Instrument Serif', family: 'Instrument Serif', stack: '"Instrument Serif", Georgia, "Times New Roman", serif' },
  caveat: { key: 'caveat', label: 'Caveat', family: 'Caveat', stack: 'Caveat, "Segoe Print", "Comic Sans MS", cursive' },
};

export interface FontStyle {
  font: FontKey;
  weight: number;
  italic: boolean;
}

export interface FontPair {
  id: string;
  name: string;
  title: FontStyle;
  quote: FontStyle;
  caption: FontStyle;
}

export const FONT_PAIRS: FontPair[] = [
  { id: 'editorial', name: 'Editorial', title: { font: 'bricolage', weight: 800, italic: false }, quote: { font: 'instrument-serif', weight: 400, italic: true }, caption: { font: 'dm-sans', weight: 500, italic: false } },
  { id: 'bold', name: 'Bold and ambitious', title: { font: 'space-grotesk', weight: 700, italic: false }, quote: { font: 'bricolage', weight: 700, italic: false }, caption: { font: 'dm-sans', weight: 500, italic: false } },
  { id: 'soft', name: 'Dreamy and soft', title: { font: 'instrument-serif', weight: 400, italic: true }, quote: { font: 'instrument-serif', weight: 400, italic: true }, caption: { font: 'dm-sans', weight: 400, italic: false } },
  { id: 'minimal', name: 'Minimal and elegant', title: { font: 'dm-sans', weight: 500, italic: false }, quote: { font: 'dm-sans', weight: 400, italic: false }, caption: { font: 'dm-sans', weight: 400, italic: false } },
  { id: 'handmade', name: 'Handmade', title: { font: 'bricolage', weight: 800, italic: false }, quote: { font: 'caveat', weight: 600, italic: false }, caption: { font: 'caveat', weight: 500, italic: false } },
];

export function getFontPair(id: string): FontPair {
  return FONT_PAIRS.find((p) => p.id === id) ?? FONT_PAIRS[0];
}

export function fontFor(pair: FontPair, role: TextRole): FontStyle {
  return pair[role];
}

export function canvasFont(font: FontKey, size: number, weight: number, italic: boolean): string {
  return `${italic ? 'italic ' : ''}${weight} ${size}px ${FONTS[font].stack}`;
}

/** Loads the fonts a scene uses so canvas text is not drawn with a fallback. Failure is harmless. */
export async function ensureFonts(keys: FontKey[]): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  await Promise.allSettled(
    [...new Set(keys)].flatMap((key) =>
      [400, 500, 700, 800].map((weight) => document.fonts.load(`${weight} 32px "${FONTS[key].family}"`)),
    ),
  );
}
