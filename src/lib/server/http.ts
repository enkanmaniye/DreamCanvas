export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { 'cache-control': 'no-store' } });
}

export function problem(status: number, message: string, code?: string): Response {
  return json({ error: message, code }, status);
}

const windows = new Map<string, { start: number; count: number }>();

/** In-memory limiter. Good for one server; serverless instances each keep their own counts (see docs/DEPLOYMENT.md). */
export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  if (windows.size > 5000) for (const [k, w] of windows) if (now - w.start > windowMs) windows.delete(k);
  const current = windows.get(key);
  if (!current || now - current.start > windowMs) {
    windows.set(key, { start: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= limit;
}

export function clientKey(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'local';
}

export function tooLarge(request: Request, maxBytes: number): boolean {
  return Number(request.headers.get('content-length') ?? 0) > maxBytes;
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
