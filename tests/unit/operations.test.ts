import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyFontPair, applyPalette, duplicateObject, moveLayer } from '../../src/lib/scene/operations';
import { contrastRatio, getPalette, paletteFromColors, PALETTES, readableOn } from '../../src/lib/scene/palettes';
import { getSticker, mapTagsToStickers, searchStickers, STICKERS } from '../../src/lib/scene/stickers';
import { compose } from '../../src/lib/scene/templates';
import { makeAssets } from './helpers';

const scene = compose({ templateId: 'editorial-grid', shape: 'landscape', assets: makeAssets(4), title: 'Title', quotes: ['One quote here', 'Two'], stickerTags: ['wave'], palette: PALETTES[0], fontPairId: 'editorial', seed: 2 }).scene;

describe('sticker mapping', () => {
  it('ships all 15 stickers the PRD lists', () => {
    for (const key of ['sunburst', 'star', 'sparkle', 'flower', 'cloud', 'wave', 'compass', 'stamp', 'bow', 'arrow', 'route', 'ticket', 'tape', 'heart', 'polaroid']) {
      assert.ok(getSticker(key), key);
    }
  });

  it('maps exact keys first, then tags, then defaults, without repeats', () => {
    assert.deepEqual(mapTagsToStickers(['wave', 'compass'], 2), ['wave', 'compass']);
    assert.ok(mapTagsToStickers(['ocean'], 1).includes('wave'));
    const picks = mapTagsToStickers(['nonsense'], 5);
    assert.equal(picks.length, 5);
    assert.equal(new Set(picks).size, 5);
  });

  it('never auto-picks tape, which only makes sense on a photo', () => {
    assert.ok(!mapTagsToStickers(['tape', 'collage'], 5).includes('tape'));
  });

  it('search finds by label and tag and returns all for an empty query', () => {
    assert.equal(searchStickers('').length, STICKERS.length);
    assert.ok(searchStickers('ocean').some((s) => s.key === 'wave'));
    assert.equal(searchStickers('zzz').length, 0);
  });
});

describe('palette operations', () => {
  it('recolors role-tagged objects and keeps hand-picked colors', () => {
    const custom = JSON.parse(JSON.stringify(scene));
    const text = custom.objects.find((o: { type: string }) => o.type === 'text');
    text.colorRole = undefined;
    text.color = '#123456';
    const next = applyPalette(custom, getPalette('fuchsia-veil'));
    assert.equal(next.meta.paletteId, 'fuchsia-veil');
    assert.equal(next.objects.find((o) => o.id === text.id)!.type === 'text' && (next.objects.find((o) => o.id === text.id) as { color: string }).color, '#123456');
    const sticker = next.objects.find((o) => o.type === 'sticker');
    assert.equal(sticker!.type === 'sticker' && sticker!.color, getPalette('fuchsia-veil')[sticker!.type === 'sticker' ? sticker!.colorRole! : 'ink']);
  });

  it('keeps quote text readable on every palette panel', () => {
    for (const palette of PALETTES) {
      const next = applyPalette(scene, palette);
      for (const o of next.objects) {
        if (o.type === 'text' && o.background) assert.ok(contrastRatio(o.color, o.background) >= 3, `${palette.id} ${o.name}`);
      }
    }
  });

  it('never mutates the original scene', () => {
    const before = JSON.stringify(scene);
    applyPalette(scene, PALETTES[3]);
    applyFontPair(scene, 'bold');
    assert.equal(JSON.stringify(scene), before);
  });

  it('builds a readable palette from AI colors and ignores junk', () => {
    const p = paletteFromColors(['#ff0000', 'not-a-color', '#00ff00']);
    assert.equal(p.primary, '#FF0000');
    assert.equal(p.secondary, '#00FF00');
    assert.ok(contrastRatio(p.ink, p.paper) > 7);
    assert.equal(readableOn('#000000', p), 'paper');
  });
});

describe('layers', () => {
  const objs = scene.objects;
  it('moves one step, to front and to back', () => {
    const id = objs[1].id;
    assert.equal(moveLayer(objs, id, 'front').at(-1)!.id, id);
    assert.equal(moveLayer(objs, id, 'back')[0].id, id);
    assert.equal(moveLayer(objs, id, 'forward')[2].id, id);
    assert.equal(moveLayer(objs, id, 'backward')[0].id, id);
  });
  it('duplicates with a fresh id', () => {
    const copy = duplicateObject(objs[0], 20);
    assert.notEqual(copy.id, objs[0].id);
    assert.equal(copy.x, objs[0].x + 20);
  });
});
