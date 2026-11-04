export interface Box { x: number; y: number; w: number; h: number; rotation: number }
export interface Point { x: number; y: number }

export type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rotate';

const SIGNS: Record<Exclude<HandleId, 'rotate'>, [number, number]> = {
  nw: [-1, -1], n: [0, -1], ne: [1, -1], e: [1, 0], se: [1, 1], s: [0, 1], sw: [-1, 1], w: [-1, 0],
};

export const CORNERS: HandleId[] = ['nw', 'ne', 'se', 'sw'];
export const EDGES: HandleId[] = ['n', 'e', 's', 'w'];

function rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function center(box: Box): Point {
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
}

export function rotatePoint(p: Point, origin: Point, deg: number): Point {
  const c = Math.cos(rad(deg));
  const s = Math.sin(rad(deg));
  const dx = p.x - origin.x;
  const dy = p.y - origin.y;
  return { x: origin.x + dx * c - dy * s, y: origin.y + dx * s + dy * c };
}

/** A world point in the box's unrotated frame, relative to its centre. */
export function toLocal(box: Box, p: Point): Point {
  const c = center(box);
  const r = rotatePoint(p, c, -box.rotation);
  return { x: r.x - c.x, y: r.y - c.y };
}

export function contains(box: Box, p: Point, pad = 0): boolean {
  const l = toLocal(box, p);
  return Math.abs(l.x) <= box.w / 2 + pad && Math.abs(l.y) <= box.h / 2 + pad;
}

export function corners(box: Box): Point[] {
  const c = center(box);
  return ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).map(([sx, sy]) =>
    rotatePoint({ x: c.x + (sx * box.w) / 2, y: c.y + (sy * box.h) / 2 }, c, box.rotation));
}

export function boundingBox(box: Box): { minX: number; minY: number; maxX: number; maxY: number } {
  const pts = corners(box);
  return {
    minX: Math.min(...pts.map((p) => p.x)),
    minY: Math.min(...pts.map((p) => p.y)),
    maxX: Math.max(...pts.map((p) => p.x)),
    maxY: Math.max(...pts.map((p) => p.y)),
  };
}

export function handlePoint(box: Box, handle: HandleId, rotateOffset = 0): Point {
  const c = center(box);
  if (handle === 'rotate') return rotatePoint({ x: c.x, y: c.y - box.h / 2 - rotateOffset }, c, box.rotation);
  const [sx, sy] = SIGNS[handle];
  return rotatePoint({ x: c.x + (sx * box.w) / 2, y: c.y + (sy * box.h) / 2 }, c, box.rotation);
}

/** Resizes from a handle while the opposite corner or edge stays pinned, including on rotated boxes. */
export function resizeBox(start: Box, handle: Exclude<HandleId, 'rotate'>, pointer: Point, keepAspect: boolean, minSize = 24): Box {
  const [sx, sy] = SIGNS[handle];
  const c = center(start);
  const p = toLocal(start, pointer);
  const ax = (-sx * start.w) / 2;
  const ay = (-sy * start.h) / 2;
  let w = sx ? Math.max(minSize, (p.x - ax) * sx) : start.w;
  let h = sy ? Math.max(minSize, (p.y - ay) * sy) : start.h;
  if (keepAspect && sx && sy) {
    const scale = Math.max(w / start.w, h / start.h, minSize / Math.min(start.w, start.h));
    w = start.w * scale;
    h = start.h * scale;
  }
  const local = { x: sx ? ax + (sx * w) / 2 : 0, y: sy ? ay + (sy * h) / 2 : 0 };
  const worldCentre = rotatePoint({ x: c.x + local.x, y: c.y + local.y }, c, start.rotation);
  return { x: worldCentre.x - w / 2, y: worldCentre.y - h / 2, w, h, rotation: start.rotation };
}

export function angleFrom(box: Box, pointer: Point, snap = false): number {
  const c = center(box);
  let deg = (Math.atan2(pointer.y - c.y, pointer.x - c.x) * 180) / Math.PI + 90;
  deg = ((deg + 180) % 360 + 360) % 360 - 180;
  if (snap) deg = Math.round(deg / 15) * 15;
  else if (Math.abs(deg) < 1.5) deg = 0;
  return Math.round(deg * 10) / 10;
}

export interface SnapResult { dx: number; dy: number; guides: { axis: 'x' | 'y'; at: number }[] }

/** Nudges a moving box onto the canvas edges or centre lines when it comes within `threshold`. */
export function snapToCanvas(box: Box, canvas: { width: number; height: number }, threshold: number): SnapResult {
  const bb = boundingBox(box);
  const midX = (bb.minX + bb.maxX) / 2;
  const midY = (bb.minY + bb.maxY) / 2;
  const result: SnapResult = { dx: 0, dy: 0, guides: [] };
  const xCandidates: [number, number][] = [[midX, canvas.width / 2], [bb.minX, 0], [bb.maxX, canvas.width]];
  const yCandidates: [number, number][] = [[midY, canvas.height / 2], [bb.minY, 0], [bb.maxY, canvas.height]];
  for (const [value, target] of xCandidates) {
    if (Math.abs(value - target) < threshold) {
      result.dx = target - value;
      result.guides.push({ axis: 'x', at: target });
      break;
    }
  }
  for (const [value, target] of yCandidates) {
    if (Math.abs(value - target) < threshold) {
      result.dy = target - value;
      result.guides.push({ axis: 'y', at: target });
      break;
    }
  }
  return result;
}
