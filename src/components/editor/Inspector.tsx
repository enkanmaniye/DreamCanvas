'use client';

import { Icon } from '@/components/Icon';
import { FONT_PAIRS, FONTS } from '@/lib/scene/fonts';
import { paletteFromColors, PALETTES } from '@/lib/scene/palettes';
import { getSticker } from '@/lib/scene/stickers';
import type { FontKey, FrameStyle, ImageObject, SceneObject, ShapeObject, StickerObject, TextObject } from '@/lib/scene/types';
import { ColorField, Section, Slider } from './controls';
import type { EditorApi } from './types';

const FRAMES: { id: FrameStyle; label: string }[] = [{ id: 'none', label: 'No frame' }, { id: 'outline', label: 'Outline' }, { id: 'mat', label: 'Mat' }, { id: 'polaroid', label: 'Instant photo' }];

function swatches(api: EditorApi): string[] {
  const p = api.palette;
  return [p.ink, '#FFFFFF', p.paper, p.primary, p.secondary, p.accent, p.deep];
}

function useEdit(api: EditorApi, id: string) {
  return {
    live: (patch: Record<string, unknown>) => { api.engine()?.update(id, patch, { commit: false }); api.sync(); },
    done: () => api.engine()?.commit(),
    set: (patch: Record<string, unknown>) => { api.engine()?.update(id, patch); api.sync(); },
  };
}

function TextFields({ api, o }: { api: EditorApi; o: TextObject }) {
  const edit = useEdit(api, o.id);
  return (
    <Section title={o.role === 'quote' ? 'Quote' : o.role === 'title' ? 'Title' : 'Caption'}>
      <div>
        <label className="field-label" htmlFor="text-content">Words</label>
        <textarea id="text-content" className="field min-h-24" maxLength={300} value={o.text} onChange={(e) => edit.live({ text: e.target.value })} onBlur={edit.done} />
      </div>
      <div>
        <label className="field-label" htmlFor="text-font">Font</label>
        <select id="text-font" className="field" value={o.font} onChange={(e) => edit.set({ font: e.target.value as FontKey })}>
          {Object.values(FONTS).map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>
      </div>
      <Slider label="Size" value={o.size} min={12} max={260} step={1} onLive={(size) => edit.live({ size })} onDone={edit.done} />
      <div className="flex flex-wrap gap-1.5">
        <button type="button" className="icon-btn" aria-label="Bold" aria-pressed={o.weight >= 600} onClick={() => edit.set({ weight: o.weight >= 600 ? 400 : 800 })}><Icon name="Bold" size={16} /></button>
        <button type="button" className="icon-btn" aria-label="Italic" aria-pressed={o.italic} onClick={() => edit.set({ italic: !o.italic })}><Icon name="Italic" size={16} /></button>
        <span className="mx-1 w-0.5 bg-ink" />
        {(['left', 'center', 'right'] as const).map((align) => (
          <button key={align} type="button" className="icon-btn" aria-label={`Align ${align}`} aria-pressed={o.align === align} onClick={() => edit.set({ align })}><Icon name={align === 'left' ? 'AlignLeft' : align === 'center' ? 'AlignCenter' : 'AlignRight'} size={16} /></button>
        ))}
      </div>
      <ColorField label="Text color" value={o.color} swatches={swatches(api)} onPick={(color) => edit.set({ color, colorRole: undefined })} />
      <ColorField label="Panel color" value={o.background ?? '#FFFFFF'} swatches={swatches(api)} onPick={(background) => edit.set({ background, backgroundRole: undefined })} />
      {o.background && <button type="button" className="btn btn-sm" onClick={() => edit.set({ background: null, backgroundRole: undefined, outline: false })}>Remove panel</button>}
    </Section>
  );
}

function ImageFields({ api, o }: { api: EditorApi; o: ImageObject }) {
  const edit = useEdit(api, o.id);
  const crop = (patch: Partial<ImageObject['crop']>) => edit.live({ crop: { ...o.crop, ...patch } });
  return (
    <Section title="Photo">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-sm" onClick={() => api.setReplacing(true)}><Icon name="Replace" size={15} />Replace</button>
        <button type="button" className="btn btn-sm" onClick={() => api.engine()?.enterCrop(o.id)}><Icon name="Crop" size={15} />Reposition</button>
      </div>
      <Slider label="Zoom" value={o.crop.zoom} min={1} max={4} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onLive={(zoom) => crop({ zoom })} onDone={edit.done} />
      <div>
        <label className="field-label" htmlFor="frame-style">Frame</label>
        <select id="frame-style" className="field" value={o.frame.style} onChange={(e) => edit.set({ frame: { ...o.frame, style: e.target.value as FrameStyle, strokeWidth: e.target.value === 'none' ? 0 : 3 } })}>
          {FRAMES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
      </div>
      {(o.frame.style === 'mat' || o.frame.style === 'polaroid') && <ColorField label="Frame color" value={o.frame.color} swatches={swatches(api)} onPick={(color) => edit.set({ frame: { ...o.frame, color } })} />}
      <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" className="size-5 accent-violet-700" checked={o.frame.shadow} onChange={(e) => edit.set({ frame: { ...o.frame, shadow: e.target.checked } })} />Offset shadow</label>
    </Section>
  );
}

function StickerFields({ api, o }: { api: EditorApi; o: StickerObject }) {
  const edit = useEdit(api, o.id);
  return (
    <Section title={getSticker(o.sticker)?.label ?? 'Sticker'}>
      <ColorField label="Main color" value={o.color} swatches={swatches(api)} onPick={(color) => edit.set({ color, colorRole: undefined })} />
      <ColorField label="Second color" value={o.accent} swatches={swatches(api)} onPick={(accent) => edit.set({ accent, accentRole: undefined })} />
    </Section>
  );
}

function ShapeFields({ api, o }: { api: EditorApi; o: ShapeObject }) {
  const edit = useEdit(api, o.id);
  return <Section title="Color block"><ColorField label="Fill" value={o.fill} swatches={swatches(api)} onPick={(fill) => edit.set({ fill, fillRole: undefined })} /></Section>;
}

function Arrange({ api, o }: { api: EditorApi; o: SceneObject }) {
  const edit = useEdit(api, o.id);
  const engine = api.engine;
  return (
    <Section title="Arrange">
      <Slider label="Rotation" value={o.rotation} min={-180} max={180} step={1} format={(v) => `${Math.round(v)}°`} onLive={(rotation) => edit.live({ rotation })} onDone={edit.done} />
      <Slider label="Opacity" value={o.opacity} min={0.1} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onLive={(opacity) => edit.live({ opacity })} onDone={edit.done} />
      <div className="flex flex-wrap gap-1.5">
        <button type="button" className="icon-btn" aria-label="Bring to front" title="Bring to front" onClick={() => engine()?.layer(o.id, 'front')}><Icon name="BringToFront" size={16} /></button>
        <button type="button" className="icon-btn" aria-label="Move forward" title="Move forward" onClick={() => engine()?.layer(o.id, 'forward')}><Icon name="ArrowUp" size={16} /></button>
        <button type="button" className="icon-btn" aria-label="Move backward" title="Move backward" onClick={() => engine()?.layer(o.id, 'backward')}><Icon name="ArrowDown" size={16} /></button>
        <button type="button" className="icon-btn" aria-label="Send to back" title="Send to back" onClick={() => engine()?.layer(o.id, 'back')}><Icon name="SendToBack" size={16} /></button>
        <button type="button" className="icon-btn" aria-label="Duplicate" title="Duplicate" onClick={() => engine()?.duplicate(o.id)}><Icon name="Copy" size={16} /></button>
        <button type="button" className="icon-btn" aria-label={o.locked ? 'Unlock' : 'Lock'} title={o.locked ? 'Unlock' : 'Lock'} aria-pressed={Boolean(o.locked)} onClick={() => edit.set({ locked: !o.locked })}><Icon name={o.locked ? 'Lock' : 'Unlock'} size={16} /></button>
        <button type="button" className="icon-btn" aria-label="Delete" title="Delete" onClick={() => engine()?.remove(o.id)}><Icon name="Trash" size={16} /></button>
      </div>
    </Section>
  );
}

function BoardFields({ api }: { api: EditorApi }) {
  const { scene } = api;
  const theme = api.board.theme?.interpretation;
  const palettes = theme ? [paletteFromColors(theme.palette), ...PALETTES] : PALETTES;
  const setBackground = (patch: Partial<typeof scene.background>) => {
    const engine = api.engine();
    if (!engine) return;
    engine.scene.background = { ...engine.scene.background, ...patch };
    engine.commit();
    engine.requestRender();
    api.sync();
  };
  return (
    <>
      <Section title="Colors">
        <div role="radiogroup" aria-label="Palette" className="space-y-1.5">
          {palettes.map((p) => (
            <button key={p.id} type="button" role="radio" aria-checked={scene.meta.paletteId === p.id} onClick={() => api.setPalette(p)} className={`flex w-full items-center justify-between gap-2 border-2 border-ink px-2 py-1.5 text-left text-sm font-semibold hover:bg-blush ${scene.meta.paletteId === p.id ? 'bg-butter hover:bg-butter' : 'bg-white'}`}>
              <span className="truncate">{p.name}</span>
              <span className="flex flex-none">{[p.primary, p.secondary, p.accent].map((c, i) => <i key={i} className="block size-4 border-2 border-l-0 border-ink first:border-l-2" style={{ background: c }} />)}</span>
            </button>
          ))}
        </div>
      </Section>
      <Section title="Type">
        <label className="field-label" htmlFor="font-pair">Font style</label>
        <select id="font-pair" className="field" value={scene.meta.fontPairId} onChange={(e) => api.setFontPair(e.target.value)}>
          {FONT_PAIRS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Section>
      <Section title="Background">
        <label className="field-label" htmlFor="bg-kind">Style</label>
        <select id="bg-kind" className="field" value={scene.background.kind} onChange={(e) => setBackground({ kind: e.target.value as 'solid' | 'mesh' | 'tiles', colors: [api.palette.primary, api.palette.secondary, api.palette.accent] })}>
          <option value="solid">Solid color</option>
          <option value="mesh">Soft color bloom</option>
          <option value="tiles">Tiles</option>
        </select>
        <ColorField label="Base color" value={scene.background.base} swatches={swatches(api)} onPick={(base) => setBackground({ base })} />
      </Section>
    </>
  );
}

function Layers({ api }: { api: EditorApi }) {
  const list = [...api.scene.objects].reverse();
  return (
    <Section title="Layers">
      {list.length === 0 && <p className="text-sm text-ink-soft">The board is empty. Add a photo, sticker or text from the left.</p>}
      <ul className="space-y-1">
        {list.map((o) => (
          <li key={o.id}>
            <button type="button" aria-pressed={api.selectedId === o.id} onClick={() => api.engine()?.select(o.id)} className={`flex w-full items-center gap-2 border-2 px-2 py-1 text-left text-sm ${api.selectedId === o.id ? 'border-ink bg-lilac' : 'border-transparent hover:bg-blush'}`}>
              <Icon name={o.type === 'image' ? 'Image' : o.type === 'text' ? 'Type' : o.type === 'sticker' ? 'Sticker' : 'Square'} size={15} className="flex-none" />
              <span className="min-w-0 flex-1 truncate">{o.type === 'text' ? o.text : o.name}</span>
              {o.locked && <Icon name="Lock" size={13} className="flex-none" />}
            </button>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function Inspector({ api }: { api: EditorApi }) {
  const o = api.scene.objects.find((x) => x.id === api.selectedId) ?? null;
  return (
    <>
      {!o && <BoardFields api={api} />}
      {o?.type === 'text' && <TextFields key={o.id} api={api} o={o} />}
      {o?.type === 'image' && <ImageFields key={o.id} api={api} o={o} />}
      {o?.type === 'sticker' && <StickerFields key={o.id} api={api} o={o} />}
      {o?.type === 'shape' && <ShapeFields key={o.id} api={api} o={o} />}
      {o && <Arrange api={api} o={o} />}
      <Layers api={api} />
    </>
  );
}
