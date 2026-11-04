import type { AnalyzeResultPayload } from '../api';
import type { Asset, Scene } from '../scene/types';

export interface BoardRecord {
  id: string;
  title: string;
  scene: Scene;
  /** Everything in this board's tray, placed on the canvas or not. */
  assets: Asset[];
  theme: AnalyzeResultPayload | null;
  thumbnail: string | null;
  createdAt: string;
  updatedAt: string;
  location: 'local' | 'cloud';
}

export type BoardSummary = Omit<BoardRecord, 'scene' | 'assets' | 'theme'>;

export interface BoardRepository {
  readonly location: 'local' | 'cloud';
  list(): Promise<BoardSummary[]>;
  get(id: string): Promise<BoardRecord | null>;
  save(board: BoardRecord): Promise<BoardRecord>;
  rename(id: string, title: string): Promise<void>;
  duplicate(id: string): Promise<BoardRecord | null>;
  remove(id: string): Promise<void>;
}
