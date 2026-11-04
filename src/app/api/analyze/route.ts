import { analyze, resolveAiStatus } from '@/lib/ai/provider';
import { AnalyzeRequestSchema } from '@/lib/ai/schema';
import { clientKey, json, problem, rateLimit, readJson, tooLarge } from '@/lib/server/http';

const MAX_BODY = 4 * 1024 * 1024;

export async function POST(request: Request) {
  if (tooLarge(request, MAX_BODY)) return problem(413, 'That request is too large. Try fewer photos.');
  // The limit protects paid or heavy AI calls. Local keyword rules cost nothing.
  const usesAi = resolveAiStatus(process.env).provider !== 'rules';
  if (usesAi && !rateLimit(`analyze:${clientKey(request)}`, 20, 60 * 60 * 1000)) return problem(429, 'You’ve reached the hourly limit for suggestions. Try again later or build the board by hand.', 'rate_limited');
  const parsed = AnalyzeRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) return problem(400, 'Those details couldn’t be read. Check your description and photos, then try again.');
  if (!parsed.data.text.trim() && parsed.data.images.length === 0 && parsed.data.photoNames.length === 0) {
    return problem(400, 'Add a photo or describe your dream first.');
  }
  return json(await analyze(parsed.data, process.env));
}
