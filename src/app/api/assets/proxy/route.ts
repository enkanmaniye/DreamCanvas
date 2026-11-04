import { Buffer } from 'node:buffer';
import { fetchLicensedImage } from '@/lib/assets/openverse';
import { clientKey, problem, rateLimit } from '@/lib/server/http';

/** Copies a license-checked Openverse image through this server so it can't taint the export canvas. */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!rateLimit(`proxy:${clientKey(request)}`, 60, 60 * 60 * 1000)) return problem(429, 'You’ve reached the hourly image limit. Try again later.', 'rate_limited');
  try {
    const { bytes, contentType } = await fetchLicensedImage(id, process.env.OPENVERSE_API_BASE || 'https://api.openverse.org/v1');
    return new Response(Buffer.from(bytes), { headers: { 'content-type': contentType, 'cache-control': 'private, max-age=3600', 'x-content-type-options': 'nosniff' } });
  } catch (error) {
    return problem(502, error instanceof Error && /license/.test(error.message) ? error.message : 'This image couldn’t be added. Pick another one.', 'asset_unavailable');
  }
}
