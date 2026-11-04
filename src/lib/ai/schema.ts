import { z } from 'zod';
import { filterQuotes } from './quotes';
import { TEMPLATES } from '../scene/templates';
import type { TemplateId } from '../scene/types';

const LAYOUT_IDS = TEMPLATES.map((t) => t.id) as [TemplateId, ...TemplateId[]];
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const InterpretationSchema = z.object({
  boardTitle: z.string().min(1).max(60),
  themeCandidates: z.array(z.object({ name: z.string().min(1).max(60), confidence: z.number().min(0).max(1) })).min(1).max(4),
  themeSummary: z.string().min(1).max(240),
  mood: z.array(z.string().min(1).max(30)).min(1).max(6),
  palette: z.array(hex).min(3).max(5),
  searchQueries: z.array(z.string().min(1).max(80)).max(6),
  stickerTags: z.array(z.string().min(1).max(30)).max(8),
  quotes: z.array(z.string().min(1).max(160)).min(1).max(6),
  recommendedLayout: z.enum(LAYOUT_IDS),
  clarificationQuestion: z.string().max(200).nullable(),
});

export type Interpretation = z.infer<typeof InterpretationSchema>;

/** Response shape for Gemini's `responseSchema` (an OpenAPI subset). Zod still validates what comes back. */
export const GEMINI_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    boardTitle: { type: 'STRING' },
    themeCandidates: { type: 'ARRAY', items: { type: 'OBJECT', properties: { name: { type: 'STRING' }, confidence: { type: 'NUMBER' } }, required: ['name', 'confidence'] } },
    themeSummary: { type: 'STRING' },
    mood: { type: 'ARRAY', items: { type: 'STRING' } },
    palette: { type: 'ARRAY', items: { type: 'STRING' } },
    searchQueries: { type: 'ARRAY', items: { type: 'STRING' } },
    stickerTags: { type: 'ARRAY', items: { type: 'STRING' } },
    quotes: { type: 'ARRAY', items: { type: 'STRING' } },
    recommendedLayout: { type: 'STRING', enum: LAYOUT_IDS },
    clarificationQuestion: { type: 'STRING', nullable: true },
  },
  required: ['boardTitle', 'themeCandidates', 'themeSummary', 'mood', 'palette', 'searchQueries', 'stickerTags', 'quotes', 'recommendedLayout'],
};

/** Plain JSON Schema for Ollama's structured `format` option. */
export const JSON_SCHEMA = {
  type: 'object',
  properties: {
    boardTitle: { type: 'string' },
    themeCandidates: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, confidence: { type: 'number' } }, required: ['name', 'confidence'] } },
    themeSummary: { type: 'string' },
    mood: { type: 'array', items: { type: 'string' } },
    palette: { type: 'array', items: { type: 'string' } },
    searchQueries: { type: 'array', items: { type: 'string' } },
    stickerTags: { type: 'array', items: { type: 'string' } },
    quotes: { type: 'array', items: { type: 'string' } },
    recommendedLayout: { type: 'string', enum: LAYOUT_IDS },
    clarificationQuestion: { type: ['string', 'null'] },
  },
  required: ['boardTitle', 'themeCandidates', 'themeSummary', 'mood', 'palette', 'searchQueries', 'stickerTags', 'quotes', 'recommendedLayout', 'clarificationQuestion'],
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string').map((v) => v.trim()).filter(Boolean) : [];
}

/**
 * Validates model output. Small slips are repaired (extra items, odd casing, a hallucinated layout name)
 * while anything structural falls back to `fallback`. Model text never reaches the UI unchecked.
 */
export function normalizeInterpretation(raw: unknown, fallback: Interpretation): Interpretation {
  const r = asObject(raw);
  const candidates = Array.isArray(r.themeCandidates)
    ? r.themeCandidates.map(asObject).filter((c) => typeof c.name === 'string' && c.name.trim())
        .map((c) => ({ name: String(c.name).trim().slice(0, 60), confidence: Math.min(1, Math.max(0, Number(c.confidence) || 0)) }))
        .slice(0, 4)
    : [];
  const palette = stringList(r.palette).filter((c) => /^#[0-9a-fA-F]{6}$/.test(c)).slice(0, 5);
  const quotes = filterQuotes(stringList(r.quotes));
  const layout = LAYOUT_IDS.includes(r.recommendedLayout as TemplateId) ? (r.recommendedLayout as TemplateId) : fallback.recommendedLayout;
  const merged: Interpretation = {
    boardTitle: typeof r.boardTitle === 'string' && r.boardTitle.trim() ? r.boardTitle.trim().slice(0, 60) : fallback.boardTitle,
    themeCandidates: candidates.length ? candidates : fallback.themeCandidates,
    themeSummary: typeof r.themeSummary === 'string' && r.themeSummary.trim() ? r.themeSummary.trim().slice(0, 240) : fallback.themeSummary,
    mood: stringList(r.mood).slice(0, 6).map((m) => m.slice(0, 30)),
    palette: palette.length >= 3 ? palette : fallback.palette,
    searchQueries: stringList(r.searchQueries).slice(0, 6).map((q) => q.slice(0, 80)),
    stickerTags: stringList(r.stickerTags).slice(0, 8).map((t) => t.toLowerCase().slice(0, 30)),
    quotes: quotes.length ? [...quotes, ...fallback.quotes.filter((q) => !quotes.includes(q))].slice(0, 3) : fallback.quotes,
    recommendedLayout: layout,
    clarificationQuestion: typeof r.clarificationQuestion === 'string' && r.clarificationQuestion.trim() ? r.clarificationQuestion.trim().slice(0, 200) : null,
  };
  if (!merged.mood.length) merged.mood = fallback.mood;
  return InterpretationSchema.parse(merged);
}

export const AnalyzeRequestSchema = z.object({
  text: z.string().max(1200).default(''),
  topics: z.array(z.string().max(30)).max(8).default([]),
  moods: z.array(z.string().max(30)).max(8).default([]),
  styleTags: z.array(z.string().max(30)).max(8).default([]),
  exclude: z.string().max(200).default(''),
  language: z.string().max(40).default(''),
  photoNames: z.array(z.string().max(120)).max(20).default([]),
  photoColors: z.array(hex).max(8).default([]),
  images: z.array(z.object({ mimeType: z.enum(['image/jpeg', 'image/webp', 'image/png']), data: z.string().max(700_000) })).max(8).default([]),
  consent: z.boolean().default(false),
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;
