import type { AnalyzeResultPayload } from '../api';
import type { Asset, BoardShape } from '../scene/types';
import { idbDelete, idbGet, idbPut } from './idb';

export type CreateMode = 'photos' | 'words' | 'both';

export interface Draft {
  mode: CreateMode;
  photos: Asset[];
  text: string;
  topics: string[];
  moods: string[];
  exclude: string;
  language: string;
  shape: BoardShape;
  consent: boolean;
  result: AnalyzeResultPayload | null;
}

export const EMPTY_DRAFT: Draft = { mode: 'photos', photos: [], text: '', topics: [], moods: [], exclude: '', language: '', shape: 'landscape', consent: false, result: null };

const KEY = 'current';

export async function loadDraft(): Promise<Draft | null> {
  return (await idbGet<Draft>('drafts', KEY)) ?? null;
}

export function saveDraft(draft: Draft): Promise<unknown> {
  return idbPut('drafts', KEY, draft);
}

export function clearDraft(): Promise<unknown> {
  return idbDelete('drafts', KEY);
}
