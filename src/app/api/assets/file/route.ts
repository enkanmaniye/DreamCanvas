import { STORAGE_BUCKET } from '@/lib/config';
import { problem } from '@/lib/server/http';
import { requireUser } from '@/lib/supabase/server';

function ownedPath(request: Request, userId: string): string | null {
  const path = new URL(request.url).searchParams.get('path') ?? '';
  if (!path || path.includes('..') || !path.startsWith(`${userId}/`)) return null;
  return path;
}

export async function GET(request: Request) {
  const context = await requireUser(request);
  if (context instanceof Response) return context;
  const path = ownedPath(request, context.user.id);
  if (!path) return problem(404, 'Image not found.');
  const { data, error } = await context.db.storage.from(STORAGE_BUCKET).download(path);
  if (error || !data) return problem(404, 'Image not found.');
  return new Response(data, { headers: { 'content-type': data.type || 'image/webp', 'cache-control': 'private, max-age=3600', 'x-content-type-options': 'nosniff' } });
}

export async function DELETE(request: Request) {
  const context = await requireUser(request);
  if (context instanceof Response) return context;
  const path = ownedPath(request, context.user.id);
  if (!path) return problem(404, 'Image not found.');
  const { error } = await context.db.storage.from(STORAGE_BUCKET).remove([path]);
  if (error) return problem(502, 'That image couldn’t be deleted. Try again.');
  return new Response(null, { status: 204 });
}
