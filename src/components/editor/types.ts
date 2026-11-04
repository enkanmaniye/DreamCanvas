import type { EditorEngine } from '@/lib/engine/editor';
import type { Asset, Palette, Scene, TemplateId } from '@/lib/scene/types';
import type { BoardRecord } from '@/lib/store/types';

export interface EditorApi {
  engine: () => EditorEngine | null;
  scene: Scene;
  board: BoardRecord;
  assets: Asset[];
  palette: Palette;
  selectedId: string | null;
  /** Copies the engine's scene into React state after a live edit. */
  sync: () => void;
  addAssetToBoard: (asset: Asset) => Promise<void>;
  placeAsset: (asset: Asset) => Promise<void>;
  replaceWith: (asset: Asset) => Promise<void>;
  deleteAsset: (asset: Asset) => void;
  switchLayout: (templateId: TemplateId, seed?: number) => void;
  setPalette: (palette: Palette) => void;
  setFontPair: (id: string) => void;
  replacing: boolean;
  setReplacing: (on: boolean) => void;
}
