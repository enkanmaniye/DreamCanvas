import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { angleFrom, boundingBox, center, contains, handlePoint, resizeBox, rotatePoint, snapToCanvas, type Box } from '../../src/lib/engine/geometry';
import { History } from '../../src/lib/engine/history';

const near = (a: number, b: number, e = 1e-6) => assert.ok(Math.abs(a - b) < e, `${a} ~ ${b}`);

describe('geometry', () => {
  const box: Box = { x: 100, y: 100, w: 200, h: 100, rotation: 30 };

  it('hit-tests in the rotated frame', () => {
    const c = center(box);
    assert.ok(contains(box, c));
    const inside = rotatePoint({ x: c.x + 95, y: c.y }, c, 30);
    assert.ok(contains(box, inside));
    assert.ok(!contains(box, { x: box.x + box.w, y: box.y }));
  });

  it('keeps the opposite corner pinned while resizing a rotated box', () => {
    const pinned = handlePoint(box, 'nw');
    const resized = resizeBox(box, 'se', { x: 420, y: 320 }, false);
    const after = handlePoint(resized, 'nw');
    near(pinned.x, after.x);
    near(pinned.y, after.y);
  });

  it('keeps aspect ratio on corner drags when asked', () => {
    const r = resizeBox({ ...box, rotation: 0 }, 'se', { x: 500, y: 150 }, true);
    near(r.w / r.h, 2);
  });

  it('does not collapse below the minimum size', () => {
    const r = resizeBox({ ...box, rotation: 0 }, 'se', { x: 0, y: 0 }, false, 24);
    assert.equal(r.w, 24);
    assert.equal(r.h, 24);
  });

  it('edge handles change one dimension only', () => {
    const r = resizeBox({ ...box, rotation: 0 }, 'e', { x: 400, y: 999 }, false);
    near(r.w, 300);
    near(r.h, 100);
    near(r.y, 100);
  });

  it('computes rotation from the pointer and snaps with shift', () => {
    const plain: Box = { x: 0, y: 0, w: 100, h: 100, rotation: 0 };
    near(angleFrom(plain, { x: 50, y: -50 }), 0);
    near(angleFrom(plain, { x: 150, y: 50 }), 90);
    assert.equal(angleFrom(plain, { x: 148, y: 60 }, true) % 15, 0);
  });

  it('bounding box of a rotated box grows', () => {
    const bb = boundingBox(box);
    assert.ok(bb.maxX - bb.minX > 200);
  });

  it('snaps to canvas centre', () => {
    const s = snapToCanvas({ x: 855, y: 100, w: 200, h: 100, rotation: 0 }, { width: 1920, height: 1080 }, 8);
    assert.equal(s.dx, 5);
    assert.equal(s.guides[0].axis, 'x');
  });
});

describe('history', () => {
  it('undoes, redoes and clears redo after a new edit', () => {
    const h = new History('a');
    assert.ok(h.commit('b'));
    assert.ok(h.commit('c'));
    assert.equal(h.undo(), 'b');
    assert.equal(h.undo(), 'a');
    assert.equal(h.undo(), null);
    assert.equal(h.redo(), 'b');
    h.commit('d');
    assert.equal(h.redo(), null);
    assert.equal(h.undo(), 'b');
  });

  it('ignores no-op commits and respects the limit', () => {
    const h = new History('a', 2);
    assert.equal(h.commit('a'), false);
    h.commit('b'); h.commit('c'); h.commit('d');
    assert.equal(h.undo(), 'c');
    assert.equal(h.undo(), 'b');
    assert.equal(h.undo(), null);
  });
});
