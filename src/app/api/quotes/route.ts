import { z } from 'zod';
import { analyze, resolveAiStatus } from '@/lib/ai/provider';
import { bankQuotes } from '@/lib/ai/quotes';
import { themeKeyFor } from '@/lib/ai/rules';
import { AnalyzeRequestSchema } from '@/lib/ai/schema';
import { clientKey, json, problem, rateLimit, readJson } from '@/lib/server/http';

const Body = z.object({ theme: z.string().max(80), summary: z.string().max(240).default(''), language: z.string().max(40).default(''), avoid: z.array(z.string().max(160)).max(30).default([]), offset: z.number().int().min(0).max(1000).default(0) });

export async function POST(request: Request) {
  const usesAi = resolveAiStatus(process.env).provider !== 'rules';
  if (usesAi && !rateLimit(`quotes:${clientKey(request)}`, 30, 60 * 60 * 1000)) return problem(429, 'You’ve reached the hourly limit for new quotes. Try again later.', 'rate_limited');
  const parsed = Body.safeParse(await readJson(request));
  if (!parsed.success) return problem(400, 'Those details couldn’t be read.');
  const { theme, summary, language, avoid, offset } = parsed.data;
  const result = await analyze(AnalyzeRequestSchema.parse({ text: `${theme}. ${summary}`, language }), process.env);
  const fresh = result.provider === 'rules' ? [] : result.interpretation.quotes.filter((q) => !avoid.includes(q));
  const quotes = fresh.length ? fresh : bankQuotes(themeKeyFor(theme), offset, avoid);
  return json({ quotes, provider: fresh.length ? result.provider : 'rules' });
}
