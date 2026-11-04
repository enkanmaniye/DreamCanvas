import { History } from './history';
import { angleFrom, CORNERS, contains, EDGES, handlePoint, resizeBox, rotatePoint, snapToCanvas, center, corners, type Box, type HandleId, type Point } from './geometry';
import { duplicateObject, moveLayer, type LayerMove } from '../scene/operations';
import { layoutText, renderScene, type ImageLookup } from '../scene/render';
import type { ImageObject, Scene, SceneObject, TextObject } from '../scene/types';

const HANDLE = 11;
const ROTATE_OFFSET = 30;
const INK = '#241B32';
const ACTIVE = '#6F4DCE';

export interface EditorEvents {
  onSelection(id: string | null): void;
  /** A finished change: drag released, field changed, layer moved. */
  onCommit(scene: Scene): void;
  onHistory(canUndo: boolean, canRedo: boolean): void;
  onEditText(id: string): void;
  onCropMode(id: string | null): void;
  onZoom(zoom: number): void;
}

type Gesture =
  | { kind: 'move'; start: Box; pointer: Point; moved: boolean }
  | { kind: 'resize'; start: Box; handle: Exclude<HandleId, 'rotate'>; startSize?: number; startPadding?: number }
  | { kind: 'rotate'; start: Box }
  | { kind: 'crop'; pointer: Point; focusX: number; focusY: number };

function boxOf(o: SceneObject): Box {
  return { x: o.x, y: o.y, w: o.w, h: o.h, rotation: o.rotation };
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** The interactive layer over the scene: selection, handles, gestures, zoom, history. Drawing lives in render.ts. */
export class EditorEngine {
  scene: Scene;
  selectedId: string | null = null;
  editingTextId: string | null = null;
  cropId: string | null = null;
  zoom = 0.5;

  private readonly ctx: CanvasRenderingContext2D;
  private readonly history: History;
  private gesture: Gesture | null = null;
  private guides: { axis: 'x' | 'y'; at: number }[] = [];
  private frame = 0;
  private wiggleStart = 0;
  private dpr = 1;
  private disposed = false;

  constructor(private readonly canvas: HTMLCanvasElement, scene: Scene, private lookup: ImageLookup, private readonly events: EditorEvents) {
    this.scene = scene;
    this.history = new History(JSON.stringify(scene));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('This browser can’t draw the canvas.');
    this.ctx = ctx;
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerUp);
    canvas.addEventListener('dblclick', this.onDoubleClick);
    this.setZoom(this.zoom);
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerUp);
    this.canvas.removeEventListener('dblclick', this.onDoubleClick);
  }

  get selected(): SceneObject | null {
    return this.scene.objects.find((o) => o.id === this.selectedId) ?? null;
  }

  setImages(lookup: ImageLookup): void {
    this.lookup = lookup;
    this.requestRender();
  }

  setZoom(zoom: number): void {
    this.zoom = Math.min(3, Math.max(0.08, zoom));
    this.dpr = typeof window === 'undefined' ? 1 : Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.scene.width * this.zoom * this.dpr);
    this.canvas.height = Math.round(this.scene.height * this.zoom * this.dpr);
    this.canvas.style.width = `${Math.round(this.scene.width * this.zoom)}px`;
    this.canvas.style.height = `${Math.round(this.scene.height * this.zoom)}px`;
    this.events.onZoom(this.zoom);
    this.requestRender();
  }

  fit(width: number, height: number): void {
    this.setZoom(Math.min(width / this.scene.width, height / this.scene.height));
  }

  requestRender(): void {
    if (this.frame || this.disposed) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.render();
    });
  }

  private render(): void {
    if (this.disposed) return;
    const { ctx, canvas } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scale = this.zoom * this.dpr;
    const selected = this.selected;
    let wiggleRestore: number | null = null;
    if (selected?.type === 'sticker' && this.wiggleStart) {
      const t = (performance.now() - this.wiggleStart) / 240;
      if (t < 1) {
        wiggleRestore = selected.rotation;
        selected.rotation += Math.sin(t * Math.PI) * 6;
        this.requestRender();
      } else {
        this.wiggleStart = 0;
      }
    }
    renderScene(ctx, this.scene, this.lookup, { scale, skipId: this.editingTextId });
    if (wiggleRestore !== null && selected) selected.rotation = wiggleRestore;
    this.drawOverlay();
  }

  private drawOverlay(): void {
    const { ctx } = this;
    const k = this.zoom * this.dpr;
    ctx.save();
    ctx.setTransform(k, 0, 0, k, 0, 0);
    const px = 1 / this.zoom;
    for (const guide of this.guides) {
      ctx.strokeStyle = '#FF72B5';
      ctx.lineWidth = 1.5 * px;
      ctx.setLineDash([6 * px, 5 * px]);
      ctx.beginPath();
      if (guide.axis === 'x') { ctx.moveTo(guide.at, 0); ctx.lineTo(guide.at, this.scene.height); } else { ctx.moveTo(0, guide.at); ctx.lineTo(this.scene.width, guide.at); }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    const o = this.selected;
    if (o && !this.editingTextId) {
      const box = boxOf(o);
      const pts = corners(box);
      ctx.strokeStyle = o.locked ? '#9A8FAB' : ACTIVE;
      ctx.lineWidth = 2 * px;
      if (this.cropId === o.id) ctx.setLineDash([8 * px, 6 * px]);
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
      if (!o.locked && this.cropId !== o.id) {
        const top = handlePoint(box, 'n');
        const rotate = handlePoint(box, 'rotate', ROTATE_OFFSET * px);
        ctx.beginPath();
        ctx.moveTo(top.x, top.y);
        ctx.lineTo(rotate.x, rotate.y);
        ctx.stroke();
        for (const handle of this.handlesFor(o)) {
          const p = handlePoint(box, handle);
          const s = (handle === 'n' || handle === 's' || handle === 'e' || handle === 'w' ? HANDLE - 2 : HANDLE) * px;
          ctx.fillStyle = '#FFFFFF';
          ctx.strokeStyle = INK;
          ctx.lineWidth = 2 * px;
          ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
          ctx.strokeRect(p.x - s / 2, p.y - s / 2, s, s);
        }
        ctx.fillStyle = '#FFE36F';
        ctx.strokeStyle = INK;
        const s = (HANDLE + 2) * px;
        ctx.fillRect(rotate.x - s / 2, rotate.y - s / 2, s, s);
        ctx.strokeRect(rotate.x - s / 2, rotate.y - s / 2, s, s);
      }
    }
    ctx.restore();
  }

  private handlesFor(o: SceneObject): HandleId[] {
    return o.type === 'sticker' ? CORNERS : [...CORNERS, ...EDGES];
  }

  private toScene(event: PointerEvent | MouseEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / this.zoom, y: (event.clientY - rect.top) / this.zoom };
  }

  private hitHandle(o: SceneObject, p: Point, touch: boolean): HandleId | null {
    const reach = (touch ? 22 : 11) / this.zoom;
    const box = boxOf(o);
    const rotate = handlePoint(box, 'rotate', ROTATE_OFFSET / this.zoom);
    if (Math.hypot(p.x - rotate.x, p.y - rotate.y) <= reach) return 'rotate';
    for (const handle of this.handlesFor(o)) {
      const h = handlePoint(box, handle);
      if (Math.hypot(p.x - h.x, p.y - h.y) <= reach) return handle;
    }
    return null;
  }

  private hitObject(p: Point): SceneObject | null {
    for (let i = this.scene.objects.length - 1; i >= 0; i -= 1) {
      if (contains(boxOf(this.scene.objects[i]), p)) return this.scene.objects[i];
    }
    return null;
  }

  select(id: string | null): void {
    if (id === this.selectedId) return;
    if (this.cropId) this.setCrop(null);
    this.selectedId = id;
    const o = this.selected;
    this.wiggleStart = o?.type === 'sticker' && !prefersReducedMotion() ? performance.now() : 0;
    this.events.onSelection(id);
    this.requestRender();
  }

  private setCrop(id: string | null): void {
    this.cropId = id;
    this.events.onCropMode(id);
    this.requestRender();
  }

  enterCrop(id: string): void {
    this.select(id);
    this.setCrop(id);
  }

  exitCrop(): void {
    if (this.cropId) {
      this.setCrop(null);
      this.commit();
    }
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    this.canvas.focus({ preventScroll: true });
    const p = this.toScene(event);
    const touch = event.pointerType === 'touch';
    const o = this.selected;

    if (this.cropId && o?.type === 'image') {
      if (contains(boxOf(o), p)) {
        this.gesture = { kind: 'crop', pointer: p, focusX: o.crop.focusX, focusY: o.crop.focusY };
        this.canvas.setPointerCapture(event.pointerId);
        return;
      }
      this.exitCrop();
    }

    if (o && !o.locked) {
      const handle = this.hitHandle(o, p, touch);
      if (handle === 'rotate') {
        this.gesture = { kind: 'rotate', start: boxOf(o) };
      } else if (handle) {
        this.gesture = { kind: 'resize', start: boxOf(o), handle, startSize: o.type === 'text' ? o.size : undefined, startPadding: o.type === 'text' ? o.padding : undefined };
      }
      if (this.gesture) {
        this.canvas.setPointerCapture(event.pointerId);
        return;
      }
    }

    const hit = this.hitObject(p);
    this.select(hit?.id ?? null);
    if (hit && !hit.locked) {
      this.gesture = { kind: 'move', start: boxOf(hit), pointer: p, moved: false };
      this.canvas.setPointerCapture(event.pointerId);
    }
  };

  private onPointerMove = (event: PointerEvent): void => {
    const p = this.toScene(event);
    const gesture = this.gesture;
    if (!gesture) {
      this.updateCursor(p);
      return;
    }
    const o = this.selected;
    if (!o) return;
    if (gesture.kind === 'move') {
      const box = { ...gesture.start, x: gesture.start.x + p.x - gesture.pointer.x, y: gesture.start.y + p.y - gesture.pointer.y };
      if (Math.hypot(box.x - gesture.start.x, box.y - gesture.start.y) > 0.5) gesture.moved = true;
      const snap = event.altKey ? { dx: 0, dy: 0, guides: [] } : snapToCanvas(box, this.scene, 7 / this.zoom);
      o.x = box.x + snap.dx;
      o.y = box.y + snap.dy;
      this.guides = snap.guides;
    } else if (gesture.kind === 'resize') {
      const keepAspect = o.type === 'sticker' || (o.type === 'image' && !event.shiftKey) || (o.type === 'text' && CORNERS.includes(gesture.handle));
      const next = resizeBox(gesture.start, gesture.handle, p, keepAspect, 28);
      Object.assign(o, { x: next.x, y: next.y, w: next.w, h: next.h });
      if (o.type === 'text' && gesture.startSize && CORNERS.includes(gesture.handle)) {
        const ratio = next.w / gesture.start.w;
        o.size = Math.max(10, gesture.startSize * ratio);
        o.padding = (gesture.startPadding ?? 0) * ratio;
      }
    } else if (gesture.kind === 'rotate') {
      o.rotation = angleFrom(gesture.start, p, event.shiftKey);
    } else if (gesture.kind === 'crop' && o.type === 'image') {
      this.dragCrop(o, gesture, p);
    }
    this.requestRender();
  };

  private dragCrop(o: ImageObject, gesture: Extract<Gesture, { kind: 'crop' }>, p: Point): void {
    const delta = rotatePoint({ x: p.x - gesture.pointer.x, y: p.y - gesture.pointer.y }, { x: 0, y: 0 }, -o.rotation);
    o.crop.focusX = Math.min(1, Math.max(0, gesture.focusX - delta.x / (o.w * o.crop.zoom)));
    o.crop.focusY = Math.min(1, Math.max(0, gesture.focusY - delta.y / (o.h * o.crop.zoom)));
  }

  private onPointerUp = (event: PointerEvent): void => {
    const gesture = this.gesture;
    this.gesture = null;
    this.guides = [];
    if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
    this.requestRender();
    if (gesture && (gesture.kind !== 'move' || gesture.moved)) this.commit();
  };

  private onDoubleClick = (event: MouseEvent): void => {
    const hit = this.hitObject(this.toScene(event));
    if (!hit || hit.locked) return;
    if (hit.type === 'text') {
      this.select(hit.id);
      this.startTextEdit(hit.id);
    } else if (hit.type === 'image') {
      this.enterCrop(hit.id);
    }
  };

  canvasFocus(): void {
    this.canvas.focus({ preventScroll: true });
  }

  startTextEdit(id: string): void {
    this.editingTextId = id;
    this.events.onEditText(id);
    this.requestRender();
  }

  endTextEdit(): void {
    this.editingTextId = null;
    this.requestRender();
  }

  private updateCursor(p: Point): void {
    const o = this.selected;
    let cursor = 'default';
    if (this.cropId) cursor = 'grab';
    else if (o && !o.locked) {
      const handle = this.hitHandle(o, p, false);
      if (handle === 'rotate') cursor = 'grab';
      else if (handle) cursor = handle === 'n' || handle === 's' ? 'ns-resize' : handle === 'e' || handle === 'w' ? 'ew-resize' : handle === 'ne' || handle === 'sw' ? 'nesw-resize' : 'nwse-resize';
    }
    if (cursor === 'default' && this.hitObject(p)) cursor = 'move';
    this.canvas.style.cursor = cursor;
  }

  commit(): void {
    if (this.history.commit(JSON.stringify(this.scene))) this.events.onCommit(this.scene);
    this.events.onHistory(this.history.canUndo, this.history.canRedo);
  }

  /** Grows a text box when its text no longer fits, so typing never silently shrinks words. */
  private growText(o: TextObject): void {
    const layout = layoutText(this.ctx, o, false);
    const needed = layout.lines.length * layout.lineHeightPx + o.padding * 2;
    if (needed > o.h) o.h = Math.min(needed, this.scene.height - Math.max(0, o.y));
  }

  update(id: string, patch: Record<string, unknown>, options: { commit?: boolean } = {}): void {
    const o = this.scene.objects.find((x) => x.id === id);
    if (!o) return;
    Object.assign(o, patch);
    if (o.type === 'text' && ('text' in patch || 'size' in patch || 'font' in patch || 'weight' in patch)) this.growText(o);
    if (options.commit !== false) this.commit();
    this.requestRender();
  }

  /** Replaces the whole scene as one undoable step, for layout, palette and font changes. */
  replaceScene(scene: Scene): void {
    const sizeChanged = scene.width !== this.scene.width || scene.height !== this.scene.height;
    this.scene = scene;
    if (!this.scene.objects.some((o) => o.id === this.selectedId)) this.select(null);
    if (sizeChanged) this.setZoom(this.zoom);
    this.commit();
    this.requestRender();
  }

  add(object: SceneObject): void {
    this.scene.objects.push(object);
    this.select(object.id);
    this.commit();
    this.requestRender();
  }

  remove(id: string): void {
    this.scene.objects = this.scene.objects.filter((o) => o.id !== id);
    if (this.selectedId === id) this.select(null);
    this.commit();
    this.requestRender();
  }

  duplicate(id: string): void {
    const o = this.scene.objects.find((x) => x.id === id);
    if (!o) return;
    const offset = Math.min(this.scene.width, this.scene.height) * 0.025;
    const copy = duplicateObject(o, offset);
    const index = this.scene.objects.indexOf(o);
    this.scene.objects.splice(index + 1, 0, copy);
    this.select(copy.id);
    this.commit();
    this.requestRender();
  }

  layer(id: string, move: LayerMove): void {
    this.scene.objects = moveLayer(this.scene.objects, id, move);
    this.commit();
    this.requestRender();
  }

  nudge(dx: number, dy: number): void {
    const o = this.selected;
    if (!o || o.locked) return;
    o.x += dx;
    o.y += dy;
    this.commit();
    this.requestRender();
  }

  private restore(snapshot: string): void {
    const previousSize = `${this.scene.width}x${this.scene.height}`;
    this.scene = JSON.parse(snapshot) as Scene;
    if (`${this.scene.width}x${this.scene.height}` !== previousSize) this.setZoom(this.zoom);
    if (!this.selected) this.select(null);
    this.events.onCommit(this.scene);
    this.events.onHistory(this.history.canUndo, this.history.canRedo);
    this.requestRender();
  }

  undo(): void {
    const snapshot = this.history.undo();
    if (snapshot) this.restore(snapshot);
  }

  redo(): void {
    const snapshot = this.history.redo();
    if (snapshot) this.restore(snapshot);
  }

  /** On-screen box for the text being edited, for placing the typing overlay. */
  textBox(id: string): { left: number; top: number; width: number; height: number; rotation: number } | null {
    const o = this.scene.objects.find((x) => x.id === id);
    if (!o) return null;
    const c = center(boxOf(o));
    return { left: (c.x - o.w / 2) * this.zoom, top: (c.y - o.h / 2) * this.zoom, width: o.w * this.zoom, height: o.h * this.zoom, rotation: o.rotation };
  }
}
