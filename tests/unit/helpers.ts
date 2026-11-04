import type { Asset } from '../../src/lib/scene/types';

export function makeAssets(count: number): Asset[] {
  const shapes = [[1600, 1067], [1067, 1600], [1600, 900], [1200, 1200]];
  return Array.from({ length: count }, (_, i) => ({
    id: `a${i}`, kind: 'upload' as const, src: `idb:a${i}`, name: `photo-${i}.jpg`,
    width: shapes[i % 4][0], height: shapes[i % 4][1], focus: { x: 0.5, y: 0.45 },
  }));
}
