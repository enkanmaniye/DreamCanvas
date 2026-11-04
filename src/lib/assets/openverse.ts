import { isIP } from 'node:net';
import { z } from 'zod';
import type { Credit } from '../scene/types';

/** Only licenses that need no permission. Attribution-required licenses stay out of the automatic path. */
export const ALLOWED_LICENSES = ['cc0', 'pdm'];
const MAX_REMOTE_BYTES = 12 * 1024 * 1024;

const ResultSchema = z.object({
  id: z.string().regex(/^[0-9a-f-]{36}$/i),
  title: z.string().nullish(),
  creator: z.string().nullish(),
  license: z.string(),
  license_version: z.string().nullish(),
  license_url: z.string().nullish(),
  foreign_landing_url: z.string().nullish(),
  url: z.string().url(),
  thumbnail: z.string().url().nullish(),
  width: z.number().nullish(),
  height: z.number().nullish(),
});

export interface LicensedImage {
  id: string;
  title: string;
  thumbnail: string;
  width: number;
  height: number;
  credit: Credit;
}

function toLicensed(raw: unknown, base: string): LicensedImage | null {
  const parsed = ResultSchema.safeParse(raw);
  if (!parsed.success) return null;
  const r = parsed.data;
  if (!ALLOWED_LICENSES.includes(r.license.toLowerCase())) return null;
  if (!r.license_url || !r.foreign_landing_url || !r.url.startsWith('https://')) return null;
  return {
    id: r.id,
    title: r.title?.trim() || 'Untitled',
    thumbnail: r.thumbnail ?? `${base}/images/${r.id}/thumb/`,
    width: r.width ?? 1200,
    height: r.height ?? 800,
    credit: {
      title: r.title?.trim() || 'Untitled',
      creator: r.creator?.trim() || 'Unknown creator',
      license: `${r.license.toUpperCase()} ${r.license_version ?? ''}`.trim(),
      licenseUrl: r.license_url,
      sourceUrl: r.foreign_landing_url,
    },
  };
}

export async function searchOpenverse(query: string, base: string, fetchImpl: typeof fetch = fetch): Promise<LicensedImage[]> {
  const params = new URLSearchParams({ q: query, license: ALLOWED_LICENSES.join(','), page_size: '12', mature: 'false' });
  const response = await fetchImpl(`${base}/images/?${params}`, { headers: { accept: 'application/json', 'user-agent': 'DreamCanvas/0.1' }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Openverse answered ${response.status}`);
  const data = (await response.json()) as { results?: unknown[] };
  return (data.results ?? []).map((r) => toLicensed(r, base)).filter((r): r is LicensedImage => r !== null);
}

/** True only for an https URL on a public host. Blocks server-side request forgery into private networks. */
export function isSafeRemoteUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.username || url.password) return false;
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return false;
  const version = isIP(host);
  if (version === 6) return false;
  if (version === 4) {
    const [a, b] = host.split('.').map(Number);
    if (a === 10 || a === 127 || a === 0 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)) return false;
  }
  return true;
}

/**
 * Fetches an image for a person's board. The caller supplies an Openverse id, never a URL. The URL comes from
 * Openverse's record, the license is checked again, and each redirect is re-validated.
 */
export async function fetchLicensedImage(id: string, base: string, fetchImpl: typeof fetch = fetch): Promise<{ bytes: Uint8Array; contentType: string; image: LicensedImage }> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Invalid image id');
  const record = await fetchImpl(`${base}/images/${id}/`, { headers: { accept: 'application/json', 'user-agent': 'DreamCanvas/0.1' }, signal: AbortSignal.timeout(10_000) });
  if (!record.ok) throw new Error('Image record not found');
  const raw = (await record.json()) as { url?: string };
  const image = toLicensed(raw, base);
  if (!image) throw new Error('The license of this image could not be verified');

  let target = raw.url as string;
  for (let hop = 0; hop < 4; hop += 1) {
    if (!isSafeRemoteUrl(target)) throw new Error('Blocked image address');
    const response = await fetchImpl(target, { redirect: 'manual', signal: AbortSignal.timeout(15_000) });
    if (response.status >= 300 && response.status < 400) {
      const next = response.headers.get('location');
      if (!next) throw new Error('Broken redirect');
      target = new URL(next, target).toString();
      continue;
    }
    if (!response.ok) throw new Error('Image download failed');
    const contentType = (response.headers.get('content-type') ?? '').split(';')[0].trim();
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) throw new Error('Unsupported image type');
    const declared = Number(response.headers.get('content-length') ?? 0);
    if (declared > MAX_REMOTE_BYTES) throw new Error('Image too large');
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_REMOTE_BYTES) throw new Error('Image too large');
    return { bytes, contentType, image };
  }
  throw new Error('Too many redirects');
}
