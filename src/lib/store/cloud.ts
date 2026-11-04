import { idbGet } from './idb';
import type { Asset } from '../scene/types';
import type { BoardRecord, BoardRepository, BoardSummary } from './types';

async function failure(response: Response): Promise<Error> {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return new Error(body?.error ?? 'The server didn’t respond as expected. Try again.');
}

/** Saves through the API routes, which act as the signed-in person so Row Level Security applies. */
export class CloudBoardRepository implements BoardRepository {
  readonly location = 'cloud' as const;

  constructor(private readonly token: () => Promise<string | null>) {}

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    const token = await this.token();
    return fetch(path, { ...init, headers: { ...(init.body instanceof FormData ? {} : { 'content-type': 'application/json' }), ...(token ? { authorization: `Bearer ${token}` } : {}), ...init.headers } });
  }

  /** Moves any photos still held in this browser into private cloud storage before the board is saved. */
  private async uploadLocalAssets(assets: Asset[]): Promise<Asset[]> {
    return Promise.all(assets.map(async (asset) => {
      if (!asset.src.startsWith('idb:')) return asset;
      const blob = await idbGet<Blob>('blobs', asset.src.slice(4));
      if (!blob) return asset;
      const form = new FormData();
      form.append('file', new File([blob], `${asset.id}.webp`, { type: blob.type || 'image/webp' }));
      const response = await this.request('/api/assets/upload', { method: 'POST', body: form });
      if (!response.ok) throw await failure(response);
      const { src } = (await response.json()) as { src: string };
      return { ...asset, src };
    }));
  }

  async list(): Promise<BoardSummary[]> {
    const response = await this.request('/api/boards');
    if (!response.ok) throw await failure(response);
    return ((await response.json()) as { boards: BoardSummary[] }).boards;
  }

  async get(id: string): Promise<BoardRecord | null> {
    const response = await this.request(`/api/boards/${id}`);
    if (response.status === 404) return null;
    if (!response.ok) throw await failure(response);
    return ((await response.json()) as { board: BoardRecord }).board;
  }

  async save(board: BoardRecord): Promise<BoardRecord> {
    const assets = await this.uploadLocalAssets(board.assets);
    const body = JSON.stringify({
      id: board.id, title: board.title, scene: board.scene, assets, theme: board.theme,
      thumbnail: board.thumbnail?.startsWith('data:') ? board.thumbnail : null,
    });
    let response = await this.request(`/api/boards/${board.id}`, { method: 'PATCH', body });
    if (response.status === 404) response = await this.request('/api/boards', { method: 'POST', body });
    if (!response.ok) throw await failure(response);
    return ((await response.json()) as { board: BoardRecord }).board;
  }

  async rename(id: string, title: string): Promise<void> {
    const response = await this.request(`/api/boards/${id}`, { method: 'PATCH', body: JSON.stringify({ title }) });
    if (!response.ok) throw await failure(response);
  }

  async duplicate(id: string): Promise<BoardRecord | null> {
    const board = await this.get(id);
    if (!board) return null;
    return this.save({ ...board, id: crypto.randomUUID(), title: `${board.title} copy`, thumbnail: null });
  }

  async remove(id: string): Promise<void> {
    const response = await this.request(`/api/boards/${id}`, { method: 'DELETE' });
    if (!response.ok && response.status !== 404) throw await failure(response);
  }
}
