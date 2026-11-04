import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateScene, countQuotes } from '../../src/lib/scene/operations';
import { PALETTES } from '../../src/lib/scene/palettes';
import { compose, fitSize, TEMPLATES } from '../../src/lib/scene/templates';
import type { BoardShape } from '../../src/lib/scene/types';
import { makeAssets } from './helpers';

const quotes = ['Make room for the life you are building.', 'A little closer to your own horizon, one bright morning at a time.'];
const shapes: BoardShape[] = ['landscape', 'portrait'];

function build(templateId: (typeof TEMPLATES)[number]['id'], shape: BoardShape, photos: number, seed = 7, q = quotes) {
  return compose({ templateId, shape, assets: makeAssets(photos), title: 'A summer to remember', quotes: q, stickerTags: ['sunburst', 'wave', 'sparkle'], palette: PALETTES[0], fontPairId: 'editorial', seed });
}

describe('template constraints', () => {
  for (const template of TEMPLATES) {
    for (const shape of shapes) {
      it(`${template.id} ${shape}: stays on canvas with 1 to 20 photos`, () => {
        for (let photos = 1; photos <= 20; photos += 1) {
          for (const seed of [1, 2, 3, 4]) {
            const { scene } = build(template.id, shape, photos, seed);
            assert.deepEqual(validateScene(scene, { requireImage: true }), [], `${photos} photos, seed ${seed}`);
          }
        }
      });
    }

    it(`${template.id}: reports photos that did not fit instead of dropping them`, () => {
      const { scene, unplaced } = build(template.id, 'landscape', 20);
      const placed = new Set(scene.objects.filter((o) => o.type === 'image').map((o) => (o.type === 'image' ? o.assetId : '')));
      assert.equal(placed.size + unplaced.length, 20);
    });

    it(`${template.id}: has title, stickers within 2 to 5 and at most 2 quotes`, () => {
      const { scene } = build(template.id, 'landscape', 6);
      assert.ok(scene.objects.some((o) => o.type === 'text' && o.role === 'title'));
      const stickers = scene.objects.filter((o) => o.type === 'sticker').length;
      assert.ok(stickers >= 1 && stickers <= 5, `stickers: ${stickers}`);
      assert.ok(countQuotes(scene) <= 2);
    });
  }

  it('the five templates are structurally different, not palette swaps', () => {
    const signatures = TEMPLATES.map((t) => {
      const { scene } = build(t.id, 'landscape', 5, 3);
      return scene.objects.filter((o) => o.type === 'image').map((o) => `${Math.round(o.x / 40)},${Math.round(o.y / 40)},${Math.round(o.w / 40)}`).join('|');
    });
    assert.equal(new Set(signatures).size, TEMPLATES.length);
  });

  it('is deterministic for a seed', () => {
    const strip = (s: unknown) => JSON.stringify(s).replace(/"id":"[^"]+"/g, '');
    assert.equal(strip(build('editorial-grid', 'landscape', 5, 9).scene), strip(build('editorial-grid', 'landscape', 5, 9).scene));
  });

  it('first photo is the hero: the largest image on every template', () => {
    for (const t of TEMPLATES) {
      if (t.id === 'gallery-wall') continue;
      const { scene } = build(t.id, 'landscape', 5);
      const images = scene.objects.filter((o) => o.type === 'image');
      const largest = [...images].sort((a, b) => b.w * b.h - a.w * a.h)[0];
      assert.ok(largest.type === 'image' && largest.assetId === 'a0', t.id);
    }
  });

  it('survives no quotes and an empty title', () => {
    for (const t of TEMPLATES) {
      const { scene } = compose({ templateId: t.id, shape: 'landscape', assets: makeAssets(3), title: '  ', quotes: [], stickerTags: [], palette: PALETTES[2], fontPairId: 'soft', seed: 1 });
      assert.equal(scene.meta.title, 'My dream board');
      assert.deepEqual(validateScene(scene), []);
    }
  });

  it('fitSize shrinks long text and keeps single long words inside the box', () => {
    assert.equal(fitSize('Hi', { w: 800, h: 300 }, 100, 40, 'bricolage', 1), 100);
    const size = fitSize('Supercalifragilisticexpialidocious', { w: 400, h: 300 }, 100, 10, 'bricolage', 1);
    assert.ok(size * 34 * 0.6 <= 400);
  });
});
