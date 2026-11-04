import { expect, test } from 'playwright/test';
import { boardFromWords, download, photo, savedBoard, watchErrors } from './helpers';

const GEMINI_STATUS = { ai: { provider: 'gemini', model: 'gemini-3.1-flash-lite', sendsPhotosToThirdParty: true, freeTierDataUse: true }, accounts: false, imageGeneration: false };
const AI_RESULT = {
  provider: 'gemini', model: 'gemini-3.1-flash-lite', notice: null,
  interpretation: { boardTitle: 'Golden Summer Escape', themeCandidates: [{ name: 'tropical travel', confidence: 0.92 }], themeSummary: 'These photos suggest warm travel scenes', mood: ['sunlit'], palette: ['#FF72B5', '#FFE36F', '#BEA4FF'], searchQueries: ['lagoon'], stickerTags: ['wave'], quotes: ['A first original line for you.', 'A second original line for you.', 'A third original line for you.'], recommendedLayout: 'dream-magazine', clarificationQuestion: null },
};

test('no fake sign-in: forms are off and say why when accounts are not configured', async ({ page }) => {
  for (const path of ['/login', '/signup']) {
    await page.goto(path);
    await expect(page.getByText('Accounts aren’t set up on this copy')).toBeVisible();
    await expect(page.getByLabel('Email')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Continue in Local Demo Mode' })).toBeVisible();
  }
  await page.goto('/dashboard');
  await expect(page.getByText(/Saved in this browser only/)).toBeVisible();
});

test('consent: photos are not sent to a cloud AI until the person agrees', async ({ page }) => {
  let sent: { images: unknown[]; consent: boolean } | null = null;
  await page.route('**/api/status', (r) => r.fulfill({ json: GEMINI_STATUS }));
  await page.route('**/api/analyze', async (r) => { sent = r.request().postDataJSON(); await r.fulfill({ json: AI_RESULT }); });
  await page.goto('/create?mode=photos');
  await page.getByTestId('file-input').setInputFiles([await photo('a.jpg', '#CC4488')]);
  await expect(page.getByText(/Google may use what you send/)).toBeVisible();

  await page.getByRole('button', { name: 'Understand my dream' }).click();
  await expect(page.getByText(/Tick the box/)).toBeVisible();
  expect(sent).toBeNull();

  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Understand my dream' }).click();
  await page.waitForURL('**/create/review');
  expect(sent!.consent).toBe(true);
  expect(sent!.images).toHaveLength(1);
  await expect(page.getByText('Suggested by AI (gemini-3.1-flash-lite)')).toBeVisible();
  await expect(page.locator('#title')).toHaveValue('Golden Summer Escape');
  await page.locator('#title').fill('My corrected title');
  await page.getByRole('button', { name: 'Create my wallpaper' }).click();
  await page.waitForURL('**/board/**');
  expect((await savedBoard(page)).scene.meta.title).toBe('My corrected title');
});

test('AI failure degrades to the labeled manual route, not a dead end', async ({ page }) => {
  await page.route('**/api/analyze', (r) => r.fulfill({ status: 500, json: { error: 'Boom.' } }));
  await page.goto('/create?mode=words');
  await page.locator('#dream').fill('A summer at the beach');
  await page.getByRole('button', { name: 'Understand my dream' }).click();
  await page.waitForURL('**/create/review');
  await expect(page.getByText('Not AI: suggested by simple keyword rules')).toBeVisible();
  await expect(page.getByText(/simple keyword rules instead/)).toBeVisible();
});

test('a dropped connection keeps working, and uploads survive a refresh', async ({ page }) => {
  await page.route('**/api/analyze', (r) => r.abort());
  await page.goto('/create?mode=both');
  await page.getByTestId('file-input').setInputFiles([await photo('keep.jpg', '#AA33CC')]);
  await page.locator('#dream').fill('A cozy home');
  await page.waitForTimeout(600);
  await page.reload();
  await expect(page.getByTestId('photo-count')).toContainText('1 of 20');
  await expect(page.locator('#dream')).toHaveValue('A cozy home');
  await page.getByRole('button', { name: 'Understand my dream' }).click();
  await page.waitForURL('**/create/review');
  await expect(page.getByText(/couldn’t be reached/)).toBeVisible();
});

test('open images: search, add, credit, export without tainting, and failure stays friendly', async ({ page }) => {
  const errors = watchErrors(page);
  const id = '11111111-2222-3333-4444-555555555555';
  const png = (await photo('x.jpg', '#20B0A0', 800, 600)).buffer;
  await page.route('**/api/assets/search**', (r) => r.fulfill({ json: { results: [{ id, title: 'Quiet sea', thumbnail: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', width: 800, height: 600, credit: { title: 'Quiet sea', creator: 'Ana Rivera', license: 'CC0 1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', sourceUrl: 'https://example.org/sea' } }] } }));
  await page.route('**/api/assets/proxy**', (r) => r.fulfill({ body: png, contentType: 'image/jpeg' }));
  await boardFromWords(page);
  await page.getByLabel('Search open images').fill('sea');
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('button', { name: 'Add to canvas: Quiet sea' }).click();
  const board = await savedBoard(page);
  expect(board.assets.find((a) => a.kind === 'openverse')?.credit).toBeTruthy();
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  await expect(page.getByRole('dialog').getByText(/Ana Rivera, CC0 1.0/)).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
  const file = await download(page, /1920/);
  expect(file.buffer.length).toBeGreaterThan(10_000);

  await page.unroute('**/api/assets/search**');
  await page.route('**/api/assets/search**', (r) => r.fulfill({ status: 502, json: { error: 'Image search isn’t reachable right now. Your photos and the bundled art still work.' } }));
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByText(/isn’t reachable right now/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('storage failure is reported with a way to retry', async ({ page }) => {
  await boardFromWords(page);
  await savedBoard(page);
  await page.evaluate(() => { IDBObjectStore.prototype.put = () => { throw new DOMException('full', 'QuotaExceededError'); }; });
  await page.getByRole('tab', { name: 'Stickers' }).click();
  await page.getByRole('button', { name: 'Add Sparkle sticker' }).click();
  await expect(page.getByRole('button', { name: 'Try saving again' })).toBeVisible({ timeout: 6000 });
});

test('settings: data deletion empties this browser', async ({ page }) => {
  await boardFromWords(page);
  await savedBoard(page);
  await page.goto('/settings');
  await expect(page.getByText(/This browser holds 1 boards/)).toBeVisible();
  await page.getByRole('button', { name: 'Delete everything in this browser' }).click();
  await page.getByRole('button', { name: 'Delete everything', exact: true }).click();
  await expect(page.getByText(/This browser holds 0 boards/)).toBeVisible();
  await page.goto('/dashboard');
  await expect(page.getByTestId('board-card')).toHaveCount(0);
  await expect(page.getByText('No boards yet.', { exact: false })).toBeVisible();
});
