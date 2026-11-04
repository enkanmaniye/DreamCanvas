import manifest from './demo-manifest.json';
import type { Asset } from '../scene/types';

interface DemoEntry { id: string; title: string; width: number; height: number; focus: { x: number; y: number }; tags: string[] }

const ENTRIES = manifest as DemoEntry[];

export const DEMO_ASSETS: Asset[] = ENTRIES.map((e) => ({
  id: `demo-${e.id}`, kind: 'demo', src: `/demo/${e.id}.jpg`, name: e.title, width: e.width, height: e.height, focus: e.focus,
}));

function tokens(text: string): string[] {
  return text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((t) => t.length > 2);
}

/** Bundled art ranked by keyword overlap. Ties keep a varied order so boards don't all share one image. */
export function matchDemoAssets(keywords: string[], count: number, excludeText = ''): Asset[] {
  const wanted = new Set(keywords.flatMap(tokens));
  const banned = new Set(tokens(excludeText));
  const scored = ENTRIES.map((entry, index) => {
    const tags = entry.tags.flatMap(tokens);
    const blocked = tags.some((t) => banned.has(t)) || tokens(entry.title).some((t) => banned.has(t));
    const score = tags.filter((t) => wanted.has(t)).length;
    return { index, blocked, score };
  }).filter((s) => !s.blocked).sort((a, b) => b.score - a.score || (a.index * 7) % 11 - (b.index * 7) % 11);
  return scored.slice(0, count).map((s) => DEMO_ASSETS[s.index]);
}
