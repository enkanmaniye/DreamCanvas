import { idbAll, idbClear, idbDelete, idbGet, idbKeys, idbPut } from './idb';
import type { BoardRecord, BoardRepository, BoardSummary } from './types';

function uuid(): string {
  return crypto.randomUUID();
}

function summary({ id, title, thumbnail, createdAt, updatedAt, location }: BoardRecord): BoardSummary {
  return { id, title, thumbnail, createdAt, updatedAt, location };
}

function blobKeys(board: BoardRecord): string[] {
  return board.assets.filter((a) => a.src.startsWith('idb:')).map((a) => a.src.slice(4));
}

/** Saves boards in this browser. Nothing is uploaded, and clearing site data removes them. */
export class LocalBoardRepository implements BoardRepository {
  readonly location = 'local' as const;

  async list(): Promise<BoardSummary[]> {
    const boards = await idbAll<BoardRecord>('boards');
    return boards.map(summary).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async get(id: string): Promise<BoardRecord | null> {
    return (await idbGet<BoardRecord>('boards', id)) ?? null;
  }

  async save(board: BoardRecord): Promise<BoardRecord> {
    const saved = { ...board, updatedAt: new Date().toISOString(), location: 'local' as const };
    await idbPut('boards', saved.id, saved);
    return saved;
  }

  async rename(id: string, title: string): Promise<void> {
    const board = await this.get(id);
    if (board) await this.save({ ...board, title, scene: { ...board.scene, meta: { ...board.scene.meta, title } } });
  }

  async duplicate(id: string): Promise<BoardRecord | null> {
    const board = await this.get(id);
    if (!board) return null;
    const now = new Date().toISOString();
    return this.save({ ...board, id: uuid(), title: `${board.title} copy`, createdAt: now, updatedAt: now });
  }

  async remove(id: string): Promise<void> {
    const board = await this.get(id);
    await idbDelete('boards', id);
    if (!board) return;
    const others = await idbAll<BoardRecord>('boards');
    const stillUsed = new Set(others.flatMap(blobKeys));
    await Promise.all(blobKeys(board).filter((k) => !stillUsed.has(k)).map((k) => idbDelete('blobs', k)));
  }
}

/** Removes one photo's file unless another saved board still uses it. */
export async function deleteLocalPhoto(key: string, boardId: string): Promise<void> {
  const boards = await idbAll<BoardRecord>('boards');
  if (!boards.some((b) => b.id !== boardId && blobKeys(b).includes(key))) await idbDelete('blobs', key);
}

export async function wipeLocalData(): Promise<void> {
  await Promise.all([idbClear('boards'), idbClear('blobs'), idbClear('drafts')]);
}

export async function localUsage(): Promise<{ boards: number; photos: number }> {
  const [boards, blobs] = await Promise.all([idbKeys('boards'), idbKeys('blobs')]);
  return { boards: boards.length, photos: blobs.length };
}

export function newBoardId(): string {
  return uuid();
}
