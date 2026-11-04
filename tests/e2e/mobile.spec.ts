import { expect, test } from 'playwright/test';
import { boardFromWords, savedBoard } from './helpers';

test('no sideways scrolling on a phone', async ({ page }) => {
  for (const path of ['/', '/create', '/dashboard', '/login', '/settings', '/privacy']) {
    await page.goto(path);
    await page.waitForTimeout(250);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test('a board can be made and edited on a phone', async ({ page }) => {
  await boardFromWords(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.getByRole('tab', { name: 'Stickers' }).tap();
  await page.getByRole('button', { name: 'Add Sparkle sticker' }).tap();
  await expect(page.getByRole('button', { name: /Back to photos/ })).toBeVisible();
  const board = await savedBoard(page);
  expect(board.scene.objects.at(-1)?.sticker).toBe('sparkle');
  await page.getByRole('button', { name: 'Delete', exact: true }).tap();
  await page.getByRole('button', { name: /Back to photos/ }).tap();
  await page.getByRole('button', { name: 'Download', exact: true }).tap();
  await expect(page.getByRole('button', { name: 'Download PNG' })).toBeVisible();
});

test('touch handles: dragging on the canvas moves a sticker', async ({ page }) => {
  await boardFromWords(page);
  await page.getByRole('tab', { name: 'Stickers' }).tap();
  await page.getByRole('button', { name: 'Add Sparkle sticker' }).tap();
  const before = (await savedBoard(page)).scene.objects.at(-1)!;
  const box = (await page.getByTestId('canvas').boundingBox())!;
  const client = await page.context().newCDPSession(page);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx + 40, y: cy + 20 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx + 80, y: cy + 30 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const after = (await savedBoard(page)).scene.objects.at(-1)!;
  expect(after.x).toBeGreaterThan(before.x + 50);
});
