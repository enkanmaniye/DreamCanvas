import { TEMPLATES } from '../scene/templates';
import type { TemplateId } from '../scene/types';
import { bankQuotes, type ThemeKey } from './quotes';
import type { AnalyzeRequest, Interpretation } from './schema';

interface ThemeRule {
  key: ThemeKey;
  name: string;
  summary: string;
  words: string[];
  palette: string[];
  stickers: string[];
  layout: TemplateId;
  title: string;
}

const RULES: ThemeRule[] = [
  { key: 'travel', name: 'Travel and escape', summary: 'Sunny places and time away', words: ['travel', 'trip', 'vacation', 'holiday', 'beach', 'island', 'summer', 'bali', 'maldives', 'hawaii', 'greece', 'italy', 'japan', 'paris', 'flight', 'abroad', 'ocean', 'sea', 'mountain', 'road', 'adventure', 'explore', 'palm', 'sunset', 'tropical'], palette: ['#FF72B5', '#FFE36F', '#BEDCFF'], stickers: ['sunburst', 'wave', 'compass', 'route', 'stamp'], layout: 'modern-scrapbook', title: 'A summer to remember' },
  { key: 'career', name: 'Career and ambition', summary: 'Work you are proud of and rooms you want to walk into', words: ['career', 'job', 'work', 'promotion', 'office', 'business', 'startup', 'company', 'ceo', 'founder', 'manager', 'lawyer', 'doctor', 'engineer', 'salary', 'city', 'skyscraper', 'leader', 'interview', 'freelance', 'success'], palette: ['#6F4DCE', '#FF72B5', '#FFE36F'], stickers: ['arrow', 'star', 'compass', 'sparkle'], layout: 'editorial-grid', title: 'Building the future' },
  { key: 'wellness', name: 'Calm and wellbeing', summary: 'Slower days, a stronger body and a quieter mind', words: ['health', 'wellness', 'calm', 'peace', 'peaceful', 'yoga', 'meditation', 'gym', 'fitness', 'run', 'marathon', 'sleep', 'rest', 'balance', 'mindful', 'heal', 'nature', 'forest', 'slow', 'tea', 'self care', 'gentle'], palette: ['#8FBDB0', '#F6C28B', '#F58DA0'], stickers: ['flower', 'cloud', 'heart', 'sunburst'], layout: 'minimal-focus', title: 'A softer rhythm' },
  { key: 'study', name: 'Study and learning', summary: 'Books, late-night focus and doors they open', words: ['study', 'student', 'exam', 'university', 'college', 'degree', 'graduate', 'graduation', 'learn', 'language', 'library', 'book', 'books', 'read', 'reading', 'school', 'scholarship', 'phd', 'masters'], palette: ['#BEA4FF', '#FFE36F', '#FFB9D1'], stickers: ['star', 'arrow', 'sparkle', 'polaroid'], layout: 'gallery-wall', title: 'Chapter by chapter' },
  { key: 'creativity', name: 'Making things', summary: 'A studio, a practice and work with your name on it', words: ['art', 'artist', 'paint', 'painting', 'draw', 'design', 'designer', 'music', 'song', 'band', 'album', 'write', 'writer', 'novel', 'film', 'photography', 'creative', 'studio', 'fashion', 'dance', 'craft'], palette: ['#CE4A8E', '#CD81FF', '#FFE36F'], stickers: ['vinyl', 'sparkle', 'star', 'ticket', 'bow'], layout: 'dream-magazine', title: 'Made by me' },
  { key: 'lifestyle', name: 'Home and lifestyle', summary: 'The rooms, rituals and people you want around you', words: ['home', 'house', 'apartment', 'flat', 'family', 'wedding', 'love', 'car', 'garden', 'kitchen', 'cozy', 'plants', 'dog', 'cat', 'friends', 'money', 'savings', 'independent', 'independence', 'style', 'wardrobe'], palette: ['#FFB9D1', '#FFE36F', '#BEA4FF'], stickers: ['heart', 'flower', 'bow', 'polaroid', 'butterfly'], layout: 'gallery-wall', title: 'A life I love' },
];

const GENERAL: ThemeRule = { key: 'general', name: 'Personal vision', summary: 'A collection of things you want more of', words: [], palette: ['#FF72B5', '#FFE36F', '#BEA4FF'], stickers: ['sparkle', 'star', 'flower', 'butterfly'], layout: 'editorial-grid', title: 'Next chapter' };

const MOOD_LAYOUT: Record<string, TemplateId> = { editorial: 'editorial-grid', bold: 'dream-magazine', cozy: 'modern-scrapbook', pastel: 'gallery-wall', minimal: 'minimal-focus', calm: 'minimal-focus' };

function words(text: string): string[] {
  return text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

function placeNames(text: string): string[] {
  const found = text.match(/\b(?:in|to|at|visit|visiting|near)\s+(?:the\s+)?([A-Z][\p{L}]+(?:\s[A-Z][\p{L}]+)?)/gu) ?? [];
  const also = text.match(/\band\s+(?:the\s+)?([A-Z][\p{L}]+)/gu) ?? [];
  return [...new Set([...found, ...also].map((m) => m.replace(/^(?:in|to|at|visit|visiting|near|and)\s+(?:the\s+)?/iu, '').trim()))].slice(0, 3);
}

/**
 * Keyword matching with no AI at all. It powers Local Demo Mode and is the fallback when a provider fails.
 * It reads the words a person typed and their photo file names. It cannot see inside photos, and the UI says so.
 */
export function interpretWithRules(input: Pick<AnalyzeRequest, 'text' | 'topics' | 'moods' | 'styleTags' | 'photoNames' | 'photoColors' | 'exclude'>, quoteOffset = 0): Interpretation {
  const source = [input.text, ...input.topics, ...input.photoNames.map((n) => n.replace(/\.[a-z0-9]+$/i, ''))].join(' ');
  const tokens = new Set(words(source));
  const lower = source.toLowerCase();
  const scored = RULES.map((rule) => ({
    rule,
    hits: rule.words.filter((w) => (w.includes(' ') ? lower.includes(w) : tokens.has(w))).length + (input.topics.some((t) => rule.key.startsWith(t.toLowerCase().slice(0, 4))) ? 2 : 0),
  })).filter((s) => s.hits > 0).sort((a, b) => b.hits - a.hits);

  const top = scored[0]?.rule ?? GENERAL;
  const total = scored.reduce((sum, s) => sum + s.hits, 0) || 1;
  const candidates = scored.length
    ? scored.slice(0, 3).map((s) => ({ name: s.rule.name, confidence: Math.round((s.hits / total) * 100) / 100 }))
    : [{ name: GENERAL.name, confidence: 0.3 }];

  const moods = [...input.moods, ...input.styleTags].slice(0, 4);
  const excludeWords = words(input.exclude);
  const places = placeNames(input.text);
  const layoutFromMood = moods.map((m) => MOOD_LAYOUT[m.toLowerCase()]).find(Boolean);
  const seen = new Set<string>();
  const queries = [...places, ...[...tokens].filter((t) => top.words.includes(t))].filter((q) => {
    const key = q.toLowerCase();
    if (excludeWords.includes(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 4);
  const title = top.key === 'travel' && places.length && !tokens.has('summer') ? `${places[0]} is calling` : top.title;

  return {
    boardTitle: title.slice(0, 60),
    themeCandidates: candidates,
    themeSummary: top.summary,
    mood: moods.length ? moods : ['hopeful', 'bright'],
    palette: input.photoColors.length >= 3 ? input.photoColors.slice(0, 3) : top.palette,
    searchQueries: queries.length ? queries : [top.name],
    stickerTags: top.stickers,
    quotes: bankQuotes(top.key, quoteOffset),
    recommendedLayout: layoutFromMood ?? top.layout,
    clarificationQuestion: scored.length > 1 ? `I found more than one theme here. Should this board focus on ${scored[0].rule.name.toLowerCase()}, or blend them?` : null,
  };
}

export function themeKeyFor(name: string): ThemeKey {
  return RULES.find((r) => r.name === name)?.key ?? 'general';
}

export const LAYOUT_NAMES = TEMPLATES.map((t) => t.id);
