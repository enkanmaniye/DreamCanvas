import { matchDemoAssets } from './assets/demo-library';
import type { Interpretation } from './ai/schema';
import { getPalette, paletteFromColors } from './scene/palettes';
import { compose, type ComposeResult } from './scene/templates';
import type { Asset, BoardShape, Palette, TemplateId } from './scene/types';

const STYLE_FONTS: Record<string, string> = { bold: 'bold', sunny: 'editorial', pastel: 'soft', dreamy: 'soft', soft: 'soft', minimal: 'minimal', calm: 'minimal', cozy: 'handmade', playful: 'handmade', editorial: 'editorial' };

export function fontPairForStyle(moods: string[], templateId: TemplateId): string {
  for (const mood of moods) {
    const pair = STYLE_FONTS[mood.toLowerCase()];
    if (pair) return pair;
  }
  return templateId === 'modern-scrapbook' ? 'handmade' : 'editorial';
}

export function resolvePalette(paletteId: string, colors: string[]): Palette {
  return paletteId === 'custom' ? paletteFromColors(colors) : getPalette(paletteId);
}

/** Their own photos first. Bundled art fills in only when there are too few to make a composed board. */
export function chooseAssets(photos: Asset[], interpretation: Interpretation, extra: Asset[], exclude: string): Asset[] {
  const own = [...photos, ...extra];
  const wanted = own.length === 0 ? 6 : Math.max(0, 3 - own.length);
  if (wanted === 0) return own;
  const keywords = [...interpretation.searchQueries, ...interpretation.themeCandidates.map((c) => c.name), ...interpretation.mood, interpretation.boardTitle, interpretation.themeSummary];
  return [...own, ...matchDemoAssets(keywords, wanted, exclude)];
}

export interface BuildOptions {
  templateId: TemplateId;
  shape: BoardShape;
  assets: Asset[];
  title: string;
  quotes: string[];
  stickerTags: string[];
  palette: Palette;
  fontPairId: string;
  seed?: number;
}

export function buildScene(options: BuildOptions): ComposeResult {
  return compose({ ...options, seed: options.seed ?? Math.floor(Math.random() * 1_000_000) });
}
