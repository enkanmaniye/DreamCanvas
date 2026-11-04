import { Buffer } from 'node:buffer';
import { STORAGE_BUCKET } from '../config';
import type { AuthedContext } from '../supabase/server';
import type { BoardWrite } from './board-schema';

interface BoardRow {
  id: string; title: string; theme_json: unknown; canvas_json: { scene: unknown; assets: unknown[] } | null; width: number; height: number;
  thumbnail_path: string | null; created_at: string; updated_at: string;
}

const LIST_COLUMNS = 'id,title,width,height,thumbnail_path,created_at,updated_at';

async function signedThumb(ctx: AuthedContext, path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await ctx.db.storage.from(STORAGE_BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

function publicShape(row: BoardRow, thumbnail: string | null) {
  return {
    id: row.id, title: row.title, theme: row.theme_json ?? null, scene: row.canvas_json?.scene ?? null, assets: row.canvas_json?.assets ?? [],
    thumbnail, createdAt: row.created_at, updatedAt: row.updated_at, width: row.width, height: row.height, location: 'cloud' as const,
  };
}

export async function listBoards(ctx: AuthedContext) {
  const { data, error } = await ctx.db.from('boards').select(LIST_COLUMNS).eq('user_id', ctx.user.id).order('updated_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as unknown as BoardRow[];
  return Promise.all(rows.map(async (row) => publicShape({ ...row, canvas_json: null, theme_json: null }, await signedThumb(ctx, row.thumbnail_path))));
}

export async function getBoard(ctx: AuthedContext, id: string) {
  const { data, error } = await ctx.db.from('boards').select('*').eq('id', id).eq('user_id', ctx.user.id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as BoardRow;
  return publicShape(row, await signedThumb(ctx, row.thumbnail_path));
}

async function storeThumbnail(ctx: AuthedContext, boardId: string, dataUrl: string): Promise<string | null> {
  const match = /^data:(image\/(?:webp|png|jpeg));base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const path = `${ctx.user.id}/${boardId}/thumbnail.webp`;
  const { error } = await ctx.db.storage.from(STORAGE_BUCKET).upload(path, Buffer.from(match[2], 'base64'), { contentType: match[1], upsert: true });
  return error ? null : path;
}

async function syncAssetRows(ctx: AuthedContext, boardId: string, assets: BoardWrite['assets']): Promise<void> {
  await ctx.db.from('board_assets').delete().eq('board_id', boardId).eq('user_id', ctx.user.id);
  const rows = assets.filter((a) => a.kind !== 'demo').map((a) => ({
    board_id: boardId, user_id: ctx.user.id, source_type: a.kind,
    storage_path: a.src.startsWith('/api/assets/file') ? new URL(a.src, 'http://x').searchParams.get('path') : null,
    source_url: a.credit?.sourceUrl ?? null, license: a.credit?.license ?? null, license_url: a.credit?.licenseUrl ?? null,
    attribution: a.credit ? `${a.credit.title} by ${a.credit.creator}` : null,
  }));
  if (rows.length) await ctx.db.from('board_assets').insert(rows);
}

export async function createBoard(ctx: AuthedContext, input: BoardWrite) {
  const { data, error } = await ctx.db.from('boards').insert({
    ...(input.id ? { id: input.id } : {}),
    user_id: ctx.user.id, title: input.title, theme_json: input.theme, canvas_json: { scene: input.scene, assets: input.assets },
    width: input.scene.width, height: input.scene.height,
  }).select('*').single();
  if (error) throw error;
  const row = data as BoardRow;
  let path: string | null = null;
  if (input.thumbnail) {
    path = await storeThumbnail(ctx, row.id, input.thumbnail);
    if (path) await ctx.db.from('boards').update({ thumbnail_path: path }).eq('id', row.id).eq('user_id', ctx.user.id);
  }
  await syncAssetRows(ctx, row.id, input.assets);
  return publicShape({ ...row, thumbnail_path: path }, await signedThumb(ctx, path));
}

export async function updateBoard(ctx: AuthedContext, id: string, patch: Partial<BoardWrite>) {
  const current = await getBoard(ctx, id);
  if (!current) return null;
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.theme !== undefined) update.theme_json = patch.theme;
  if (patch.scene || patch.assets) {
    const scene = patch.scene ?? current.scene;
    update.canvas_json = { scene, assets: patch.assets ?? current.assets };
    if (patch.scene) { update.width = patch.scene.width; update.height = patch.scene.height; }
  }
  if (patch.thumbnail) {
    const path = await storeThumbnail(ctx, id, patch.thumbnail);
    if (path) update.thumbnail_path = path;
  }
  const { data, error } = await ctx.db.from('boards').update(update).eq('id', id).eq('user_id', ctx.user.id).select('*').maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (patch.assets) await syncAssetRows(ctx, id, patch.assets);
  const row = data as BoardRow;
  return publicShape(row, await signedThumb(ctx, row.thumbnail_path));
}

export async function deleteBoard(ctx: AuthedContext, id: string): Promise<boolean> {
  const current = await getBoard(ctx, id);
  if (!current) return false;
  const { data: files } = await ctx.db.storage.from(STORAGE_BUCKET).list(`${ctx.user.id}/${id}`);
  if (files?.length) await ctx.db.storage.from(STORAGE_BUCKET).remove(files.map((f: { name: string }) => `${ctx.user.id}/${id}/${f.name}`));
  const { error } = await ctx.db.from('boards').delete().eq('id', id).eq('user_id', ctx.user.id);
  if (error) throw error;
  return true;
}
