import { expect, test } from 'playwright/test';
import { boardFromWords, dragScene, photo, savedBoard, screenPoint, selectLayer, watchErrors, type SavedObject } from './helpers';

const center = (o: SavedObject) => ({ x: o.x + o.w / 2, y: o.y + o.h / 2 });

/** Puts an obvious sticker on top in open space, so gestures aren't affected by what's underneath. */
async function addSticker(page: import('playwright/test').Page, name = 'Sparkle') {
  await page.getByRole('tab', { name: 'Stickers' }).click();
  await page.getByRole('button', { name: `Add ${name} sticker` }).click();
}

test.beforeEach(async ({ page }) => {
  await boardFromWords(page);
});

test('drag, resize and rotate change the saved board, and undo and redo walk back', async ({ page }) => {
  const errors = watchErrors(page);
  await addSticker(page);
  let board = await savedBoard(page);
  const W = board.scene.width;
  const start = board.scene.objects.at(-1)!;

  await dragScene(page, W, center(start), { x: 500, y: 400 });
  board = await savedBoard(page);
  const moved = board.scene.objects.find((o) => o.id === start.id)!;
  expect(center(moved).x).toBeCloseTo(500, -1);
  expect(center(moved).y).toBeCloseTo(400, -1);

  await dragScene(page, W, { x: moved.x + moved.w, y: moved.y + moved.h }, { x: moved.x + moved.w + 120, y: moved.y + moved.h + 120 });
  board = await savedBoard(page);
  const resized = board.scene.objects.find((o) => o.id === start.id)!;
  expect(resized.w).toBeGreaterThan(moved.w + 80);
  expect(resized.w / resized.h, 'sticker keeps its shape').toBeCloseTo(moved.w / moved.h, 1);

  const zoomed = await page.getByTestId('canvas').boundingBox();
  const k = zoomed!.width / W;
  const top = { x: center(resized).x, y: resized.y - 30 / k };
  await dragScene(page, W, top, { x: resized.x + resized.w + 150, y: center(resized).y });
  board = await savedBoard(page);
  const rotated = board.scene.objects.find((o) => o.id === start.id)!;
  expect(Math.abs(rotated.rotation)).toBeGreaterThan(45);

  await page.getByRole('button', { name: 'Undo' }).click();
  board = await savedBoard(page);
  expect(board.scene.objects.find((o) => o.id === start.id)!.rotation).toBe(0);
  await page.getByRole('button', { name: 'Undo' }).click();
  board = await savedBoard(page);
  expect(board.scene.objects.find((o) => o.id === start.id)!.w).toBeCloseTo(moved.w, 0);
  await page.getByRole('button', { name: 'Redo' }).click();
  board = await savedBoard(page);
  expect(board.scene.objects.find((o) => o.id === start.id)!.w).toBeCloseTo(resized.w, 0);
  expect(errors).toEqual([]);
});

test('photos can be replaced, zoomed and removed', async ({ page }) => {
  let board = await savedBoard(page);
  const target = board.scene.objects.find((o) => o.type === 'image')!;
  await selectLayer(page, /Photo 1/);
  await page.getByRole('button', { name: 'Replace' }).click();
  await page.getByRole('button', { name: /Replace with Stack of books/ }).click();
  board = await savedBoard(page);
  expect(board.scene.objects.find((o) => o.id === target.id)!.assetId).toBe('demo-book-stack');

  const zoom = page.getByRole('slider', { name: /^Zoom/ });
  await zoom.fill('2');
  await zoom.dispatchEvent('pointerup');
  board = await savedBoard(page);
  expect(board.scene.objects.find((o) => o.id === target.id)!.crop!.zoom).toBe(2);

  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  board = await savedBoard(page);
  expect(board.scene.objects.some((o) => o.id === target.id)).toBe(false);
});

test('upload inside the editor and delete a photo for good', async ({ page }) => {
  await page.getByTestId('editor-file-input').setInputFiles([await photo('late.jpg', '#33AA88')]);
  await expect(page.getByRole('button', { name: 'Add to canvas: late.jpg' })).toBeVisible();
  await page.getByRole('button', { name: 'Add to canvas: late.jpg' }).click();
  let board = await savedBoard(page);
  const asset = board.assets.find((a) => a.src.startsWith('idb:'))!;
  expect(board.scene.objects.some((o) => o.assetId === asset.id)).toBe(true);

  await page.getByRole('button', { name: 'Delete late.jpg from this board' }).click();
  await page.getByRole('button', { name: 'Delete photo' }).click();
  board = await savedBoard(page);
  expect(board.assets.some((a) => a.id === asset.id)).toBe(false);
  expect(board.scene.objects.some((o) => o.assetId === asset.id)).toBe(false);
  await expect.poll(() => page.evaluate((key) => new Promise((resolve) => {
    const open = indexedDB.open('dreamcanvas');
    open.onsuccess = () => {
      const q = open.result.transaction('blobs').objectStore('blobs').get(key);
      q.onsuccess = () => { open.result.close(); resolve(q.result === undefined); };
    };
  }), asset.src.slice(4))).toBe(true);
});

test('quotes: edit in the panel, type on the canvas, restyle, add ideas, respect the limit', async ({ page }) => {
  await selectLayer(page, /Make space|Go where|Book the ticket|summer/i);
  await page.getByRole('tab', { name: 'Text' }).click();
  let board = await savedBoard(page);
  const quote = board.scene.objects.find((o) => o.role === 'quote')!;
  await selectLayer(page, quote.text!);

  await page.getByLabel('Words').fill('Edited in the panel.');
  await page.getByLabel('Words').blur();
  board = await savedBoard(page);
  expect(board.scene.objects.find((o) => o.id === quote.id)!.text).toBe('Edited in the panel.');

  const p = await screenPoint(page, board.scene.width, quote.x + quote.w / 2, quote.y + quote.h / 2);
  await page.mouse.dblclick(p.x, p.y);
  const overlay = page.getByTestId('text-overlay');
  await expect(overlay).toBeVisible();
  await overlay.fill('Typed on the canvas.');
  await overlay.press('Escape');
  board = await savedBoard(page);
  expect(board.scene.objects.find((o) => o.id === quote.id)!.text).toBe('Typed on the canvas.');

  await page.getByLabel('Font', { exact: true }).selectOption('caveat');
  await page.getByLabel('Use color #FFE36F').first().click().catch(() => undefined);
  board = await savedBoard(page);
  expect((board.scene.objects.find((o) => o.id === quote.id) as unknown as { font: string }).font).toBe('caveat');

  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /^Add quote:/ }).first().click();
  await expect(page.getByText(/which is the limit/)).toBeVisible();
  board = await savedBoard(page);
  expect(board.scene.objects.filter((o) => o.role === 'quote')).toHaveLength(2);

  await page.getByRole('button', { name: 'New ideas' }).click();
  await expect(page.getByRole('button', { name: /^Add quote:/ }).first()).toBeDisabled();
});

test('stickers: search, add, recolor, remove', async ({ page }) => {
  await page.getByRole('tab', { name: 'Stickers' }).click();
  await page.getByLabel('Search stickers').fill('ocean');
  await expect(page.getByRole('button', { name: 'Add Wave sticker' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Compass sticker' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Add Wave sticker' }).click();
  let board = await savedBoard(page);
  const added = board.scene.objects.at(-1)!;
  expect(added.sticker).toBe('wave');

  await page.getByLabel('Main color: custom color').fill('#123456');
  board = await savedBoard(page);
  expect(board.scene.objects.find((o) => o.id === added.id)!.color).toBe('#123456');

  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  board = await savedBoard(page);
  expect(board.scene.objects.some((o) => o.id === added.id)).toBe(false);
});

test('keyboard: arrows move, Delete removes, Escape clears, Ctrl+Z undoes', async ({ page }) => {
  await addSticker(page);
  let board = await savedBoard(page);
  const target = board.scene.objects.at(-1)!;
  await page.getByTestId('canvas').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Shift+ArrowDown');
  board = await savedBoard(page);
  const moved = board.scene.objects.find((o) => o.id === target.id)!;
  expect(moved.x).toBeCloseTo(target.x + 2, 3);
  expect(moved.y).toBeCloseTo(target.y + 20, 3);

  await page.keyboard.press('Delete');
  board = await savedBoard(page);
  expect(board.scene.objects.some((o) => o.id === target.id)).toBe(false);
  await page.keyboard.press('Control+z');
  board = await savedBoard(page);
  expect(board.scene.objects.some((o) => o.id === target.id)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByText('Nothing selected')).toBeAttached();
});

test('layers move, and locked items resist dragging', async ({ page }) => {
  await addSticker(page);
  let board = await savedBoard(page);
  const W = board.scene.width;
  const target = board.scene.objects.at(-1)!;
  await page.getByRole('button', { name: 'Send to back' }).click();
  board = await savedBoard(page);
  expect(board.scene.objects[0].id).toBe(target.id);
  await page.getByRole('button', { name: 'Bring to front' }).click();
  await page.getByRole('button', { name: 'Lock', exact: true }).click();
  board = await savedBoard(page);
  await dragScene(page, W, center(target), { x: 300, y: 300 });
  await page.waitForTimeout(300);
  board = await savedBoard(page);
  expect(board.scene.objects.find((o) => o.id === target.id)!.x).toBeCloseTo(target.x, 3);
});

test('all five layouts stay on canvas, keep the words, and can be undone', async ({ page }) => {
  await page.getByRole('tab', { name: 'Layouts' }).click();
  const seen = new Set<string>();
  let original = (await savedBoard(page)).scene.meta.templateId;
  for (const name of ['Editorial Grid', 'Gallery Wall', 'Modern Scrapbook', 'Minimal Focus', 'Dream Magazine']) {
    await page.getByRole('radio', { name: new RegExp(name) }).click();
    await page.waitForTimeout(100);
    const board = await savedBoard(page);
    seen.add(board.scene.objects.filter((o) => o.type === 'image').map((o) => `${Math.round(o.x)},${Math.round(o.y)}`).join('|'));
    expect(board.scene.meta.title).toBe('A summer to remember');
    expect(board.scene.objects.some((o) => o.role === 'quote')).toBe(true);
    for (const o of board.scene.objects) {
      expect(o.x, `${name} ${o.type}`).toBeGreaterThanOrEqual(-20);
      expect(o.y, `${name} ${o.type}`).toBeGreaterThanOrEqual(-20);
      expect(o.x + o.w, `${name} ${o.type}`).toBeLessThanOrEqual(board.scene.width + 20);
      expect(o.y + o.h, `${name} ${o.type}`).toBeLessThanOrEqual(board.scene.height + 20);
    }
  }
  expect(seen.size).toBe(5);
  await page.getByRole('button', { name: 'Undo' }).click();
  original = (await savedBoard(page)).scene.meta.templateId;
  expect(original).toBe('minimal-focus');
});

test('palette and fonts restyle the board, and zoom controls work', async ({ page }) => {
  await page.keyboard.press('Escape');
  await page.getByRole('radio', { name: /Fuchsia veil/ }).click();
  let board = await savedBoard(page);
  expect(board.scene.meta.paletteId).toBe('fuchsia-veil');
  await page.getByLabel('Font style').selectOption('bold');
  board = await savedBoard(page);
  expect((board.scene.meta as unknown as { fontPairId: string }).fontPairId).toBe('bold');

  const fitted = await page.getByTestId('zoom').textContent();
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await expect(page.getByTestId('zoom')).not.toHaveText(fitted!);
  await page.getByRole('button', { name: 'Fit' }).click();
  await expect(page.getByTestId('zoom')).toHaveText(fitted!);
});
