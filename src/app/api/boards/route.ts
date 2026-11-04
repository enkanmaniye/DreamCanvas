import { BoardWriteSchema } from '@/lib/server/board-schema';
import { createBoard, listBoards } from '@/lib/server/board-store';
import { json, problem, readJson, tooLarge } from '@/lib/server/http';
import { requireUser } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const context = await requireUser(request);
  if (context instanceof Response) return context;
  try {
    return json({ boards: await listBoards(context) });
  } catch {
    return problem(502, 'Your boards couldn’t be loaded. Try again.');
  }
}

export async function POST(request: Request) {
  const context = await requireUser(request);
  if (context instanceof Response) return context;
  if (tooLarge(request, 3 * 1024 * 1024)) return problem(413, 'This board is too large to save.');
  const parsed = BoardWriteSchema.safeParse(await readJson(request));
  if (!parsed.success) return problem(400, 'This board couldn’t be read, so it wasn’t saved.');
  try {
    return json({ board: await createBoard(context, parsed.data) }, 201);
  } catch {
    return problem(502, 'This board couldn’t be saved. Try again.');
  }
}
