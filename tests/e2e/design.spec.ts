import { expect, test } from 'playwright/test';
import { boardFromWords } from './helpers';

const PAGES = ['/', '/create', '/dashboard', '/login', '/signup', '/settings', '/privacy', '/create/review'];
const EMOJI = /\p{Extended_Pictographic}/u;

test('square geometry and no emoji on every page', async ({ page }) => {
  for (const path of PAGES) {
    await page.goto(path);
    await page.waitForTimeout(250);
    const report = await page.evaluate(() => {
      const round: string[] = [];
      for (const el of document.querySelectorAll('body *')) {
        const r = parseFloat(getComputedStyle(el).borderTopLeftRadius);
        if (r > 6) round.push(`${el.tagName}.${(el as HTMLElement).className} ${r}`);
      }
      return { round, text: document.body.innerText };
    });
    expect(report.round, path).toEqual([]);
    expect(report.text.match(EMOJI), path).toBeNull();
  }
});

test('editor is square and emoji-free too, including the board text', async ({ page }) => {
  await boardFromWords(page);
  const report = await page.evaluate(() => ({
    round: [...document.querySelectorAll('body *')].filter((el) => parseFloat(getComputedStyle(el).borderTopLeftRadius) > 6).length,
    text: document.body.innerText,
  }));
  expect(report.round).toBe(0);
  expect(report.text.match(EMOJI)).toBeNull();
});

test('main text and controls meet contrast minimums', async ({ page }) => {
  const channels = (c: string) => c.match(/[\d.]+/g)!.slice(0, 3).map(Number);
  const lum = (rgb: number[]) => { const [r, g, b] = rgb.map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  await page.goto('/');
  for (const selector of ['h1', '.btn-primary', '.btn-yellow', 'header nav a']) {
    const { color, background } = await page.locator(selector).first().evaluate((el) => {
      let node: Element | null = el;
      let bg = 'transparent';
      while (node && /rgba\(.*, 0\)|transparent/.test(bg)) { bg = getComputedStyle(node).backgroundColor; node = node.parentElement; }
      return { color: getComputedStyle(el).color, background: bg };
    });
    const [hi, lo] = [lum(channels(color)), lum(channels(background))].sort((a, b) => b - a);
    expect((hi + 0.05) / (lo + 0.05), selector).toBeGreaterThanOrEqual(4.5);
  }
});

test('reduced motion turns off decoration and everything still works', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 }, baseURL: test.info().project.use.baseURL });
  const page = await context.newPage();
  await page.goto('/');
  const piece = await page.locator('.piece').first().evaluate((el) => getComputedStyle(el).animationDuration);
  expect(parseFloat(piece)).toBeLessThan(0.01);
  await page.getByRole('link', { name: 'My boards' }).click();
  await expect(page.locator('.route-wipe')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'My boards' })).toBeVisible();
  await context.close();
});

test('keyboard users can reach the main actions and see where focus is', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement as Element).outlineStyle);
  expect(outline).toBe('solid');
  const reached: string[] = [];
  for (let i = 0; i < 8; i += 1) {
    reached.push((await page.evaluate(() => document.activeElement?.textContent)) ?? '');
    await page.keyboard.press('Tab');
  }
  expect(reached.join(' ')).toContain('Upload inspiration');
  expect(reached.join(' ')).toContain('Describe your dream');
});
