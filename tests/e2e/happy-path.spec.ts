import { expect, test } from 'playwright/test';
import sharp from 'sharp';
import { boardFromWords, download, photo, savedBoard, savedBoards, watchErrors } from './helpers';

test('words only: a dream becomes a real board with art and exact-size PNGs', async ({ page }) => {
  const errors = watchErrors(page);
  await boardFromWords(page);
  const board = await savedBoard(page);
  const images = board.scene.objects.filter((o) => o.type === 'image');
  expect(images.length).toBeGreaterThanOrEqual(3);
  expect(board.scene.objects.filter((o) => o.role === 'quote').length).toBeGreaterThanOrEqual(1);
  expect(board.scene.objects.filter((o) => o.type === 'sticker').length).toBeGreaterThanOrEqual(1);

  for (const [label, width, height] of [[/1920/, 1920, 1080], [/2560/, 2560, 1440], [/3840/, 3840, 2160]] as const) {
    const file = await download(page, label);
    expect(file.name).toBe(`dreamcanvas-a-summer-to-remember-${width}x${height}.png`);
    const meta = await sharp(file.buffer).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(['png', width, height]);
    const stats = await sharp(file.buffer).stats();
    expect(stats.channels[0].stdev, 'image is not blank').toBeGreaterThan(20);
  }
  const jpg = await download(page, /1920/, 'JPG');
  expect(jpg.name.endsWith('.jpg')).toBe(true);
  expect((await sharp(jpg.buffer).metadata()).format).toBe('jpeg');
  expect(errors).toEqual([]);
});

test('photos: upload, validate, reorder, remove, and the photos really appear in the export', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/create?mode=photos');
  const input = page.getByTestId('file-input');

  await input.setInputFiles([await photo('red.jpg', '#E8102A'), await photo('green.jpg', '#10C84A', 600, 900), await photo('blue.jpg', '#1040E8'), await photo('spare.jpg', '#E8E810')]);
  await expect(page.getByTestId('photo-count')).toContainText('4 of 20');

  await page.getByRole('button', { name: 'Remove spare.jpg' }).click();
  await expect(page.getByTestId('photo-count')).toContainText('3 of 20');
  await page.getByRole('button', { name: 'Move green.jpg earlier' }).click();
  await expect(page.locator('li img').first()).toHaveAttribute('alt', 'green.jpg');

  await input.setInputFiles([{ name: 'fake.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('<script>alert(1)</script>') }]);
  await expect(page.getByText(/isn’t a real JPG/)).toBeVisible();
  await input.setInputFiles([{ name: 'phone.heic', mimeType: 'image/heic', buffer: Buffer.from('xxxx') }]);
  await expect(page.getByText(/HEIC photo/)).toBeVisible();
  await input.setInputFiles([{ name: 'huge.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(11 * 1024 * 1024, 1) }]);
  await expect(page.getByText(/over the 10 MB limit/)).toBeVisible();
  await expect(page.getByTestId('photo-count')).toContainText('3 of 20');

  await page.getByRole('button', { name: 'Understand my dream' }).click();
  await page.waitForURL('**/create/review');
  await expect(page.getByText('Not AI: suggested by simple keyword rules')).toBeVisible();
  await expect(page.getByText(/can’t see inside your photos/)).toBeVisible();
  await page.getByRole('radio', { name: /Editorial Grid/ }).click();
  await page.getByRole('button', { name: 'Create my wallpaper' }).click();
  await page.waitForURL('**/board/**');

  const board = await savedBoard(page);
  expect(board.assets.map((a) => a.kind)).toEqual(['upload', 'upload', 'upload']);

  const file = await download(page, /3840/);
  const { data, info } = await sharp(file.buffer).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const seen = { red: 0, green: 0, blue: 0 };
  for (let i = 0; i < data.length; i += info.channels * 16) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    if (r > 215 && g < 45 && b < 65) seen.red += 1;
    if (r < 45 && g > 185 && b < 100) seen.green += 1;
    if (r < 45 && g < 90 && b > 215) seen.blue += 1;
  }
  expect(seen.red, 'red photo exported').toBeGreaterThan(1000);
  expect(seen.green, 'green photo exported').toBeGreaterThan(1000);
  expect(seen.blue, 'blue photo exported').toBeGreaterThan(1000);
  expect(errors).toEqual([]);
});

test('photo privacy: location data is gone from what is stored', async ({ page }) => {
  await page.goto('/create?mode=photos');
  const jpeg = await sharp({ create: { width: 500, height: 400, channels: 3, background: '#FF72B5' } }).withExif({ IFD0: { ImageDescription: 'HOME-GPS-MARKER' } }).jpeg().toBuffer();
  expect(jpeg.includes('HOME-GPS-MARKER')).toBe(true);
  await page.getByTestId('file-input').setInputFiles([{ name: 'exif.jpg', mimeType: 'image/jpeg', buffer: jpeg }]);
  await expect(page.getByTestId('photo-count')).toContainText('1 of 20');
  const stored = await page.evaluate(() => new Promise<string>((resolve) => {
    const open = indexedDB.open('dreamcanvas');
    open.onsuccess = () => {
      const all = open.result.transaction('blobs').objectStore('blobs').getAll();
      all.onsuccess = async () => { open.result.close(); resolve(await (all.result[0] as Blob).text()); };
    };
  }));
  expect(stored.length).toBeGreaterThan(100);
  expect(stored).not.toContain('HOME-GPS-MARKER');
});

test('both: photos plus words, with the text shaping the suggestion', async ({ page }) => {
  await page.goto('/create?mode=both');
  await page.getByTestId('file-input').setInputFiles([await photo('a.jpg', '#CC4488'), await photo('b.jpg', '#4488CC')]);
  await page.locator('#dream').fill('A promotion at work and my own office in the city');
  await page.getByRole('button', { name: 'Understand my dream' }).click();
  await page.waitForURL('**/create/review');
  await expect(page.locator('#title')).toHaveValue('Building the future');
  await page.getByRole('button', { name: 'Create my wallpaper' }).click();
  await page.waitForURL('**/board/**');
  const board = await savedBoard(page);
  const kinds = board.assets.map((a) => a.kind);
  expect(kinds.filter((k) => k === 'upload').length).toBe(2);
  expect(kinds.length, 'bundled art fills in only up to three').toBe(3);
});

test('photos still being prepared are never dropped by clicking ahead', async ({ page }) => {
  await page.goto('/create?mode=photos');
  const files = await Promise.all(['a', 'b', 'c', 'd', 'e', 'f'].map((n) => photo(`${n}.jpg`, '#AA5588', 2400, 1600)));
  await page.getByTestId('file-input').setInputFiles(files);
  await page.getByRole('button', { name: 'Understand my dream' }).click();
  await page.waitForURL('**/create/review');
  await page.getByRole('button', { name: 'Create my wallpaper' }).click();
  await page.waitForURL('**/board/**');
  const board = await savedBoard(page);
  expect(board.assets.filter((a) => a.kind === 'upload')).toHaveLength(6);
});

test('review is editable, and mixed dreams ask instead of guessing', async ({ page }) => {
  await page.goto('/create?mode=words');
  await page.locator('#dream').fill('A beach holiday and a promotion at work');
  await page.getByRole('button', { name: 'Understand my dream' }).click();
  await page.waitForURL('**/create/review');
  await expect(page.getByRole('heading', { name: 'Does this feel right?' })).toBeVisible();
  await expect(page.getByText('This is just a suggestion.', { exact: false })).toBeVisible();
  await expect(page.getByText(/more than one theme/)).toBeVisible();
  await page.getByRole('radio', { name: 'Blend these dreams' }).click();
  await page.locator('#title').fill('Two big plans');
  const quote = page.getByRole('textbox', { name: 'Quote 1', exact: true });
  await quote.fill('My own line about two big plans.');
  await page.getByRole('checkbox', { name: 'Use quote 2' }).check();
  const before = await page.getByRole('textbox', { name: 'Quote 3', exact: true }).inputValue();
  await page.getByRole('radio', { name: /Lilac hour/ }).click();
  await page.getByRole('button', { name: 'Create my wallpaper' }).click();
  await page.waitForURL('**/board/**');
  const board = await savedBoard(page);
  expect(board.scene.meta.title).toBe('Two big plans');
  expect(board.scene.meta.paletteId).toBe('lilac-hour');
  const quotes = board.scene.objects.filter((o) => o.role === 'quote').map((o) => o.text);
  expect(quotes).toContain('My own line about two big plans.');
  expect(quotes).toHaveLength(2);
  expect(quotes).not.toContain(before);
});

test('skipping suggestions still makes a full board', async ({ page }) => {
  await page.goto('/create?mode=photos');
  await page.getByRole('button', { name: 'Build it without suggestions' }).click();
  await page.waitForURL('**/board/**');
  const board = await savedBoard(page);
  expect(board.scene.objects.filter((o) => o.type === 'image').length).toBeGreaterThan(0);
});

test('saved boards reopen with editable layers, and the dashboard manages them', async ({ page }) => {
  await boardFromWords(page);
  const before = await savedBoard(page);
  await page.reload();
  await expect(page.getByTestId('board-title')).toHaveValue('A summer to remember');
  await expect(page.getByRole('complementary', { name: 'Properties' }).getByRole('button', { name: /Photo 1/ })).toBeVisible();
  const after = (await savedBoards(page)).find((b) => b.id === before.id);
  expect(after?.scene.objects.length).toBe(before.scene.objects.length);

  await page.goto('/dashboard');
  await expect(page.getByTestId('board-card')).toHaveCount(1);
  await expect(page.getByTestId('board-card').locator('img')).toHaveAttribute('src', /^data:image/);

  await page.getByRole('button', { name: 'Rename A summer to remember' }).click();
  await page.getByLabel('Board name').fill('Bali plans');
  await page.getByRole('button', { name: 'Rename board' }).click();
  await expect(page.getByRole('heading', { name: 'Bali plans' })).toBeVisible();

  await page.getByRole('button', { name: 'Duplicate Bali plans' }).click();
  await expect(page.getByTestId('board-card')).toHaveCount(2);

  await page.getByRole('button', { name: 'Delete Bali plans copy' }).click();
  await page.getByRole('button', { name: 'Delete board' }).click();
  await expect(page.getByTestId('board-card')).toHaveCount(1);

  await page.getByRole('link', { name: 'Open Bali plans' }).click();
  await expect(page.getByTestId('board-title')).toHaveValue('Bali plans');
});

test('a board id that does not exist shows a way out, not a blank page', async ({ page }) => {
  await page.goto('/board/00000000-0000-0000-0000-000000000000');
  await expect(page.getByRole('heading', { name: 'This board isn’t here' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Go to my boards' })).toBeVisible();
});
