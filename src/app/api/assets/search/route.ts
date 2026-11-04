import { searchOpenverse } from '@/lib/assets/openverse';
import { clientKey, json, problem, rateLimit } from '@/lib/server/http';

export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get('q') ?? '').trim().slice(0, 100);
  if (!q) return problem(400, 'Type what you’re looking for.');
  if (!rateLimit(`search:${clientKey(request)}`, 40, 60 * 60 * 1000)) return problem(429, 'You’ve reached the hourly search limit. Try again later.', 'rate_limited');
  try {
    return json({ results: await searchOpenverse(q, process.env.OPENVERSE_API_BASE || 'https://api.openverse.org/v1') });
  } catch {
    return problem(502, 'Image search isn’t reachable right now. Your photos and the bundled art still work.', 'search_unavailable');
  }
}
