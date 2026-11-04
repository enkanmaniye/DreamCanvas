import { BoardPatchSchema } from '@/lib/server/board-schema';
import { deleteBoard, getBoard, updateBoard } from '@/lib/server/board-store';
import { json, problem, readJson, tooLarge } from '@/lib/server/http';
import { requireUser } from '@/lib/supabase/server';

interface RouteContext { params: Promise<{ id: string }> }

const UUID = /^[0-9a-f-]{36}$/i;
// Someone else's board and a missing board give the same answer, so ids can't be probed.
const notFound = () => problem(404, 'Board not found.');

export async function GET(request: Request, { params }: RouteContext) {
  const context = await requireUser(request);
  if (context instanceof Response) return context;
  const { id } = await params;
  if (!UUID.test(id)) return notFound();
  const board = await getBoard(context, id).catch(() => null);
  return board ? json({ board }) : notFound();
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const context = await requireUser(request);
  if (context instanceof Response) return context;
  const { id } = await params;
  if (!UUID.test(id)) return notFound();
  if (tooLarge(request, 3 * 1024 * 1024)) return problem(413, 'This board is too large to save.');
  const parsed = BoardPatchSchema.safeParse(await readJson(request));
  if (!parsed.success) return problem(400, 'This board couldn’t be read, so it wasn’t saved.');
  try {
    const board = await updateBoard(context, id, parsed.data);
    return board ? json({ board }) : notFound();
  } catch {
    return problem(502, 'This board couldn’t be saved. Try again.');
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const context = await requireUser(request);
  if (context instanceof Response) return context;
  const { id } = await params;
  if (!UUID.test(id)) return notFound();
  try {
    return (await deleteBoard(context, id)) ? new Response(null, { status: 204 }) : notFound();
  } catch {
    return problem(502, 'This board couldn’t be deleted. Try again.');
  }
}
