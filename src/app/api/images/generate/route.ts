import { Buffer } from 'node:buffer';
import { z } from 'zod';
import { getImageProvider } from '@/lib/image-gen/provider';
import { problem, rateLimit, readJson } from '@/lib/server/http';
import { requireUser } from '@/lib/supabase/server';

const Body = z.object({ prompt: z.string().trim().min(3).max(300), acceptedCost: z.literal(true) });

/** Optional and off by default. Requires an account, a cost acknowledgement and stays within 2 images a day per person. */
export async function POST(request: Request) {
  const provider = getImageProvider(process.env);
  if (!provider) return problem(503, 'AI photo generation is turned off on this copy of DreamCanvas.', 'generation_disabled');
  const context = await requireUser(request);
  if (context instanceof Response) return context;
  const parsed = Body.safeParse(await readJson(request));
  if (!parsed.success) return problem(400, 'Describe the image and confirm the cost notice.');
  if (!rateLimit(`generate:${context.user.id}`, 2, 24 * 60 * 60 * 1000)) return problem(429, 'You’ve used today’s 2 AI photos.', 'rate_limited');
  try {
    const result = await provider.generate(parsed.data.prompt);
    await context.db.from('generations').insert({ user_id: context.user.id, provider: result.provider, status: 'succeeded', metadata_json: { promptLength: parsed.data.prompt.length } });
    return new Response(Buffer.from(result.bytes), { headers: { 'content-type': result.contentType, 'cache-control': 'no-store' } });
  } catch {
    return problem(502, 'The image service didn’t return a picture. You weren’t given a broken image; try again.', 'generation_failed');
  }
}
