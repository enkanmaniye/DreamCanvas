import type { AnalyzeResultPayload } from './api';
import { buildScene, chooseAssets, fontPairForStyle, resolvePalette } from './compose-board';
import { renderThumbnail } from './export';
import { loadAll } from './images/loader';
import { ensureFonts } from './scene/fonts';
import { sceneFonts } from './scene/operations';
import type { Asset, BoardShape, TemplateId } from './scene/types';
import { newBoardId } from './store/local';
import type { BoardRecord, BoardRepository } from './store/types';

export interface CreateChoices {
  title: string;
  quotes: string[];
  stickerTags: string[];
  templateId: TemplateId;
  paletteId: string;
  moods: string[];
  shape: BoardShape;
  photos: Asset[];
  extraAssets: Asset[];
  exclude: string;
  result: AnalyzeResultPayload;
}

/** Runs the two real stages of making a board and reports each as it starts. */
export async function createBoard(choices: CreateChoices, repo: BoardRepository, onStage: (stage: number) => void, token?: string | null): Promise<{ board: BoardRecord; unplaced: number; failed: number }> {
  onStage(0);
  const { interpretation } = choices.result;
  const assets = chooseAssets(choices.photos, interpretation, choices.extraAssets, choices.exclude);
  const palette = resolvePalette(choices.paletteId, interpretation.palette);
  const { scene, unplaced } = buildScene({
    templateId: choices.templateId, shape: choices.shape, assets, title: choices.title, quotes: choices.quotes, stickerTags: choices.stickerTags,
    palette, fontPairId: fontPairForStyle(choices.moods, choices.templateId),
  });

  onStage(1);
  const [{ lookup, failed }] = await Promise.all([loadAll(assets, token), ensureFonts(sceneFonts(scene))]);
  const now = new Date().toISOString();
  const board: BoardRecord = {
    id: newBoardId(), title: choices.title, scene, assets, theme: choices.result, thumbnail: renderThumbnail(scene, lookup), createdAt: now, updatedAt: now, location: repo.location,
  };
  return { board: await repo.save(board), unplaced: unplaced.length, failed: failed.length };
}
