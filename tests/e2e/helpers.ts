import { expect, type Page } from 'playwright/test';
import sharp from 'sharp';

export interface SavedObject { id: string; type: string; x: number; y: number; w: number; h: number; rotation: number; text?: string; role?: string; assetId?: string; sticker?: string; color?: string; crop?: { zoom: number } }
export interface SavedBoard { id: string; title: string; assets: { id: string; src: string; kind: string; credit?: unknown }[]; scene: { width: number; height: number; objects: SavedObject[]; meta: { templateId: string; paletteId: string; title: string } } }

export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    // Web fonts are unreachable in the offline sandbox, and tests that simulate failures log failed requests.
    if (m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) errors.push(m.text());
  });
  return errors;
}

export function savedBoards(page: Page): Promise<SavedBoard[]> {
  return page.evaluate(() => new Promise<SavedBoard[]>((resolve, reject) => {
    const open = indexedDB.open('dreamcanvas');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const all = open.result.transaction('boards').objectStore('boards').getAll();
      all.onsuccess = () => { open.result.close(); resolve(all.result as SavedBoard[]); };
    };
  }));
}

/** Waits for autosave, then returns what was actually written to the browser's database. */
export async function savedBoard(page: Page): Promise<SavedBoard> {
  await expect(page.getByTestId('save-status')).toHaveText(/Unsaved|Saving|Saved/);
  await expect(page.getByTestId('save-status')).toHaveText(/Saved/, { timeout: 8000 });
  const id = page.url().split('/board/')[1];
  const boards = await savedBoards(page);
  const board = boards.find((b) => b.id === id);
  if (!board) throw new Error('Board not saved');
  return board;
}

export async function photo(name: string, color: string, width = 900, height = 600): Promise<{ name: string; mimeType: string; buffer: Buffer }> {
  return { name, mimeType: 'image/jpeg', buffer: await sharp({ create: { width, height, channels: 3, background: color } }).jpeg({ quality: 95 }).toBuffer() };
}

export async function boardFromWords(page: Page, text = 'I want to spend a peaceful summer in Bali and the Maldives'): Promise<void> {
  await page.goto('/create?mode=words');
  await page.locator('#dream').fill(text);
  await page.getByRole('button', { name: 'Understand my dream' }).click();
  await page.waitForURL('**/create/review');
  await page.getByRole('button', { name: 'Create my wallpaper' }).click();
  await page.waitForURL('**/board/**');
  await expect(page.getByTestId('canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible();
  await page.waitForTimeout(400);
}

/** Screen position of a point given in scene units. */
export async function screenPoint(page: Page, sceneWidth: number, x: number, y: number): Promise<{ x: number; y: number }> {
  const box = await page.getByTestId('canvas').boundingBox();
  if (!box) throw new Error('canvas not visible');
  const k = box.width / sceneWidth;
  return { x: box.x + x * k, y: box.y + y * k };
}

export async function dragScene(page: Page, sceneWidth: number, from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> {
  const a = await screenPoint(page, sceneWidth, from.x, from.y);
  const b = await screenPoint(page, sceneWidth, to.x, to.y);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 4 });
  await page.mouse.move(b.x, b.y, { steps: 4 });
  await page.mouse.up();
}

export async function selectLayer(page: Page, name: RegExp | string): Promise<void> {
  await page.getByRole('complementary', { name: 'Properties' }).getByRole('button', { name }).first().click();
}

export async function download(page: Page, sizeLabel: RegExp, format: 'PNG' | 'JPG' = 'PNG'): Promise<{ name: string; buffer: Buffer }> {
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('radio', { name: sizeLabel }).check();
  if (format === 'JPG') await dialog.getByRole('radio', { name: /JPG/ }).check();
  const waiting = page.waitForEvent('download');
  await dialog.getByRole('button', { name: `Download ${format}` }).click();
  const file = await waiting;
  const path = await file.path();
  await expect(dialog.getByText('Downloaded', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Close' }).click();
  const { readFileSync } = await import('node:fs');
  return { name: file.suggestedFilename(), buffer: readFileSync(path) };
}
