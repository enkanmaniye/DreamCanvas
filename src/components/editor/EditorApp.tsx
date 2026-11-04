'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/icon-data';
import { useApp } from '@/components/Providers';
import { Logo } from '@/components/Sticker';
import { Modal, Notice, Spinner } from '@/components/ui';
import { EditorEngine } from '@/lib/engine/editor';
import { renderThumbnail } from '@/lib/export';
import { loadImage } from '@/lib/images/loader';
import { canvasFont, ensureFonts } from '@/lib/scene/fonts';
import { applyFontPair, applyPalette, cloneScene, makeImage, sceneFonts } from '@/lib/scene/operations';
import { getPalette, paletteFromColors } from '@/lib/scene/palettes';
import { compose } from '@/lib/scene/templates';
import type { ImageLookup, ImageSource } from '@/lib/scene/render';
import type { Asset, BoardShape, Palette, Scene, SceneObject, TemplateId, TextObject } from '@/lib/scene/types';
import { deleteLocalPhoto } from '@/lib/store/local';
import type { BoardRecord } from '@/lib/store/types';
import { ExportDialog } from './ExportDialog';
import { Inspector } from './Inspector';
import { LeftPanel, type LeftTab } from './LeftPanel';
import type { EditorApi } from './types';

type SaveState = 'saved' | 'dirty' | 'saving' | 'error';

const TABS: { id: LeftTab; label: string; icon: IconName }[] = [
  { id: 'photos', label: 'Photos', icon: 'Images' },
  { id: 'stickers', label: 'Stickers', icon: 'Sticker' },
  { id: 'text', label: 'Text', icon: 'Type' },
  { id: 'layouts', label: 'Layouts', icon: 'LayoutGrid' },
];

function describe(object: SceneObject | null): string {
  if (!object) return 'Nothing selected';
  return `${object.type === 'text' ? object.text.slice(0, 40) : object.name} selected${object.locked ? ', locked' : ''}`;
}

export function EditorApp() {
  const params = useParams<{ id: string }>();
  const boardId = params.id;
  const { repo, authLoading, getToken, toast } = useApp();

  const [board, setBoard] = useState<BoardRecord | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [scene, setScene] = useState<Scene | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [failedPhotos, setFailedPhotos] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState({ canUndo: false, canRedo: false });
  const [zoom, setZoom] = useState(0.5);
  const [tab, setTab] = useState<LeftTab>('photos');
  const [mobileEdit, setMobileEdit] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState<Asset | null>(null);
  const [replacing, setReplacing] = useState(false);
  const [editingText, setEditingText] = useState<string | null>(null);
  const [cropping, setCropping] = useState(false);
  const [draftText, setDraftText] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<EditorEngine | null>(null);
  const images = useRef(new Map<string, HTMLImageElement>());
  const boardRef = useRef<BoardRecord | null>(null);
  const assetsRef = useRef<Asset[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoFit = useRef(true);

  const lookup = useMemo<ImageLookup>(() => (id) => images.current.get(id) as ImageSource | undefined, []);
  const engine = useCallback(() => engineRef.current, []);
  const sync = useCallback(() => {
    if (engineRef.current) setScene(cloneScene(engineRef.current.scene));
  }, []);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    void (async () => {
      try {
        const record = await repo.get(boardId);
        if (cancelled) return;
        if (!record?.scene) {
          setMissing(true);
          return;
        }
        const token = await getToken();
        const results = await Promise.allSettled(record.assets.map(async (asset) => images.current.set(asset.id, await loadImage(asset, token))));
        await ensureFonts(sceneFonts(record.scene));
        if (cancelled) return;
        setFailedPhotos(results.filter((r) => r.status === 'rejected').length);
        boardRef.current = record;
        assetsRef.current = record.assets;
        setAssets(record.assets);
        setBoard(record);
        setScene(cloneScene(record.scene));
      } catch (failure) {
        if (!cancelled) setLoadError(failure instanceof Error ? failure.message : 'This board couldn’t be opened.');
      }
    })();
    return () => { cancelled = true; };
  }, [boardId, repo, authLoading, getToken]);

  const saveNow = useCallback(async () => {
    const eng = engineRef.current;
    const current = boardRef.current;
    if (!eng || !current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState('saving');
    setSaveError(null);
    try {
      const snapshot = cloneScene(eng.scene);
      const saved = await repo.save({ ...current, title: snapshot.meta.title, scene: snapshot, assets: assetsRef.current, thumbnail: renderThumbnail(snapshot, lookup) });
      boardRef.current = saved;
      if (saved.assets.length) assetsRef.current = saved.assets;
      setSaveState('saved');
    } catch (failure) {
      setSaveState('error');
      setSaveError(failure instanceof Error ? failure.message : 'This board couldn’t be saved.');
    }
  }, [repo, lookup]);

  const scheduleSave = useCallback(() => {
    setSaveState('dirty');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void saveNow(), 1200);
  }, [saveNow]);

  const fit = useCallback(() => {
    const stage = stageRef.current;
    if (stage) engineRef.current?.fit(stage.clientWidth - 40, stage.clientHeight - 40);
  }, []);

  const boardLoaded = board !== null;
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!boardLoaded || !canvas || !boardRef.current) return;
    const eng = new EditorEngine(canvas, cloneScene(boardRef.current.scene), lookup, {
      onSelection: (id) => {
        setSelectedId(id);
        setReplacing(false);
        if (id) setMobileEdit(true);
      },
      onCommit: (next) => {
        setScene(cloneScene(next));
        scheduleSave();
      },
      onHistory: (canUndo, canRedo) => setHistory({ canUndo, canRedo }),
      onEditText: (id) => {
        const object = eng.scene.objects.find((o) => o.id === id) as TextObject | undefined;
        setDraftText(object?.text ?? '');
        setEditingText(id);
      },
      onCropMode: (id) => setCropping(Boolean(id)),
      onZoom: setZoom,
    });
    engineRef.current = eng;
    const stage = stageRef.current;
    const observer = new ResizeObserver(() => { if (autoFit.current) fit(); });
    if (stage) observer.observe(stage);
    fit();
    return () => {
      observer.disconnect();
      eng.dispose();
      engineRef.current = null;
    };
  }, [boardLoaded, lookup, fit, scheduleSave]);

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (saveState === 'dirty' || saveState === 'saving' || saveState === 'error') event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [saveState]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const eng = engineRef.current;
      const target = event.target as HTMLElement;
      if (!eng || target.closest('input, textarea, select, dialog')) return;
      const meta = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (meta && key === 'z') { event.preventDefault(); if (event.shiftKey) eng.redo(); else eng.undo(); return; }
      if (meta && key === 'y') { event.preventDefault(); eng.redo(); return; }
      if (meta && key === 's') { event.preventDefault(); void saveNow(); return; }
      const id = eng.selectedId;
      if (meta && key === 'd' && id) { event.preventDefault(); eng.duplicate(id); return; }
      if (key === 'escape') { if (eng.cropId) eng.exitCrop(); else eng.select(null); return; }
      if (!id) return;
      if (target.tagName === 'BUTTON' && (key === ' ' || key === 'enter')) return;
      if ((key === 'delete' || key === 'backspace') && !eng.selected?.locked) { event.preventDefault(); eng.remove(id); return; }
      if (key === 'enter' && eng.selected?.type === 'text') { event.preventDefault(); eng.startTextEdit(id); return; }
      const step = event.shiftKey ? 20 : 2;
      const moves: Record<string, [number, number]> = { arrowleft: [-step, 0], arrowright: [step, 0], arrowup: [0, -step], arrowdown: [0, step] };
      if (moves[key] && target.tagName === 'CANVAS') { event.preventDefault(); eng.nudge(moves[key][0], moves[key][1]); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saveNow]);

  const palette: Palette = useMemo(() => {
    const id = scene?.meta.paletteId ?? 'dream-pop';
    return id === 'custom' ? paletteFromColors(board?.theme?.interpretation.palette ?? []) : getPalette(id);
  }, [scene?.meta.paletteId, board]);

  const addAssetToBoard = useCallback(async (asset: Asset) => {
    if (!assetsRef.current.some((a) => a.id === asset.id)) {
      assetsRef.current = [...assetsRef.current, asset];
      setAssets(assetsRef.current);
    }
    images.current.set(asset.id, await loadImage(asset, await getToken()));
    engineRef.current?.requestRender();
    scheduleSave();
  }, [getToken, scheduleSave]);

  const api: EditorApi | null = !scene || !board ? null : {
    engine, scene, board, assets, palette, selectedId, sync, replacing, setReplacing,
    addAssetToBoard,
    placeAsset: async (asset) => {
      await addAssetToBoard(asset);
      const eng = engineRef.current;
      if (eng) eng.add(makeImage(eng.scene, asset, palette));
    },
    replaceWith: async (asset) => {
      await addAssetToBoard(asset);
      const eng = engineRef.current;
      if (eng?.selectedId) eng.update(eng.selectedId, { assetId: asset.id, crop: { focusX: asset.focus.x, focusY: asset.focus.y, zoom: 1 } });
      setReplacing(false);
    },
    deleteAsset: setDeleting,
    switchLayout: (templateId: TemplateId, seed?: number) => {
      const eng = engineRef.current;
      if (!eng) return;
      const current = eng.scene;
      const placed = current.objects.flatMap((o) => (o.type === 'image' ? [o.assetId] : []));
      const ordered = [...placed.map((id) => assetsRef.current.find((a) => a.id === id)).filter((a): a is Asset => Boolean(a)), ...assetsRef.current.filter((a) => !placed.includes(a.id))];
      const unique = ordered.filter((a, i) => ordered.findIndex((b) => b.id === a.id) === i);
      const texts = current.objects.filter((o): o is TextObject => o.type === 'text');
      const title = texts.find((t) => t.role === 'title');
      const stickers = current.objects.flatMap((o) => (o.type === 'sticker' && o.sticker !== 'tape' ? [o.sticker] : []));
      const titleText = title ? (current.meta.templateId === 'dream-magazine' ? current.meta.title : title.text) : current.meta.title;
      const { scene: next, unplaced } = compose({
        templateId, shape: (current.width > current.height ? 'landscape' : 'portrait') as BoardShape, assets: unique, title: titleText,
        quotes: texts.filter((t) => t.role === 'quote').map((t) => t.text), stickerTags: stickers.length ? stickers : board.theme?.interpretation.stickerTags ?? [],
        palette, fontPairId: current.meta.fontPairId, seed: seed ?? current.meta.seed,
      });
      eng.replaceScene(next);
      setScene(cloneScene(next));
      if (unplaced.length) toast(`${unplaced.length} photos didn’t fit this layout. They’re still in the Photos tab.`);
    },
    setPalette: (next: Palette) => { const eng = engineRef.current; if (eng) eng.replaceScene(applyPalette(eng.scene, next)); },
    setFontPair: (id: string) => {
      const eng = engineRef.current;
      if (!eng) return;
      const next = applyFontPair(eng.scene, id);
      void ensureFonts(sceneFonts(next)).then(() => eng.requestRender());
      eng.replaceScene(next);
    },
  };

  function renameBoard(title: string) {
    const eng = engineRef.current;
    if (!eng) return;
    eng.scene.meta.title = title;
    sync();
  }

  function finishText() {
    const eng = engineRef.current;
    if (!eng || !editingText) return;
    const id = editingText;
    setEditingText(null);
    eng.endTextEdit();
    eng.update(id, { text: draftText });
    eng.canvasFocus();
  }

  function confirmDeletePhoto() {
    const asset = deleting;
    const eng = engineRef.current;
    setDeleting(null);
    if (!asset || !eng) return;
    eng.scene.objects.filter((o) => o.type === 'image' && o.assetId === asset.id).forEach((o) => eng.remove(o.id));
    assetsRef.current = assetsRef.current.filter((a) => a.id !== asset.id);
    setAssets(assetsRef.current);
    images.current.delete(asset.id);
    scheduleSave();
    void (async () => {
      if (asset.src.startsWith('idb:')) await deleteLocalPhoto(asset.src.slice(4), boardId);
      else if (asset.src.startsWith('/api/assets/file')) await fetch(asset.src, { method: 'DELETE', headers: { authorization: `Bearer ${await getToken()}` } });
    })().catch(() => toast('The original file couldn’t be deleted. Try again from Settings.', 'error'));
  }

  if (missing || loadError) {
    return (
      <main className="grid min-h-screen place-items-center p-6 text-center">
        <div className="max-w-md">
          <h1 className="text-4xl font-extrabold">{missing ? 'This board isn’t here' : 'This board couldn’t be opened'}</h1>
          <p className="mt-3 text-ink-soft">{loadError ?? 'It may have been deleted, or it may be saved in a different browser or account.'}</p>
          <Link className="btn btn-primary mt-6" href="/dashboard">Go to my boards</Link>
        </div>
      </main>
    );
  }

  const textObject = editingText ? (scene?.objects.find((o) => o.id === editingText) as TextObject | undefined) : undefined;
  const textBox = editingText ? engineRef.current?.textBox(editingText) : null;
  const selected = scene?.objects.find((o) => o.id === selectedId) ?? null;
  const saveLabel = { saved: boardRef.current?.location === 'cloud' ? 'Saved to your account' : 'Saved in this browser', dirty: 'Unsaved changes', saving: 'Saving…', error: 'Not saved' }[saveState];

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-cream">
      <header className="z-10 flex flex-none flex-wrap items-center gap-2 border-b-2 border-ink bg-white px-2 py-1.5 sm:gap-3 sm:px-3">
        <Link href="/dashboard" aria-label="Back to my boards" className="flex-none"><span className="hidden lg:inline"><Logo /></span><span className="icon-btn lg:hidden"><Icon name="ArrowLeft" /></span></Link>
        <input aria-label="Board title" data-testid="board-title" className="field min-h-9 w-36 min-w-0 flex-1 py-1 font-semibold sm:max-w-72" maxLength={120} value={scene?.meta.title ?? ''} onChange={(e) => renameBoard(e.target.value)} onBlur={() => engineRef.current?.commit()} />
        <div className="flex gap-1">
          <button type="button" className="icon-btn" aria-label="Undo" title="Undo (Ctrl+Z)" disabled={!history.canUndo} onClick={() => engineRef.current?.undo()}><Icon name="Undo" size={17} /></button>
          <button type="button" className="icon-btn" aria-label="Redo" title="Redo (Ctrl+Shift+Z)" disabled={!history.canRedo} onClick={() => engineRef.current?.redo()}><Icon name="Redo" size={17} /></button>
        </div>
        <span className="hidden items-center gap-1.5 text-sm text-ink-soft md:flex" role="status" data-testid="save-status">
          {saveState === 'saving' ? <Spinner size={14} /> : <Icon name={saveState === 'error' ? 'AlertTriangle' : boardRef.current?.location === 'cloud' ? 'Cloud' : 'HardDrive'} size={14} />}{saveLabel}
        </span>
        <div className="ml-auto flex gap-2">
          <button type="button" className="btn btn-sm" onClick={() => void saveNow()} disabled={saveState === 'saving'}><Icon name="Save" size={15} /><span className="hidden sm:inline">Save</span><span className="sr-only sm:hidden">Save</span></button>
          <button type="button" className="btn btn-sm btn-primary" onClick={() => setExporting(true)} disabled={!scene}><Icon name="Download" size={15} />Download</button>
        </div>
      </header>

      {(saveError || failedPhotos > 0) && (
        <div className="flex-none space-y-1 border-b-2 border-ink p-2">
          {saveError && <Notice tone="error" action={<button type="button" className="btn btn-sm" onClick={() => void saveNow()}>Try saving again</button>}>{saveError}</Notice>}
          {failedPhotos > 0 && <Notice tone="warn">{failedPhotos} photos couldn’t be loaded and show as blank frames. Replace them, or check they’re still in this browser.</Notice>}
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,44fr)_minmax(0,56fr)] lg:grid-cols-[316px_minmax(0,1fr)_288px] lg:grid-rows-1">
        <div className={`row-start-2 min-h-0 flex-col border-t-2 border-ink bg-white lg:row-start-1 lg:flex lg:border-r-2 lg:border-t-0 ${mobileEdit ? 'hidden' : 'flex'}`}>
          <div role="tablist" aria-label="Add to board" className="flex flex-none border-b-2 border-ink">
            {TABS.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`flex flex-1 flex-col items-center gap-0.5 border-r-2 border-ink py-1.5 text-xs font-semibold last:border-r-0 ${tab === t.id ? 'bg-pink' : 'hover:bg-blush'}`}><Icon name={t.icon} size={17} />{t.label}</button>
            ))}
            <button type="button" className="flex flex-1 flex-col items-center gap-0.5 border-l-2 border-ink py-1.5 text-xs font-semibold lg:hidden" onClick={() => setMobileEdit(true)}><Icon name="Settings" size={17} />Edit</button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{api ? <LeftPanel api={api} tab={tab} /> : <div className="skeleton m-3 h-40" />}</div>
        </div>

        <div className="relative row-start-1 flex min-h-0 min-w-0 flex-col lg:col-start-2">
          <div ref={stageRef} className="checker relative flex min-h-0 flex-1 overflow-auto p-5" data-testid="stage">
            <div className="relative m-auto flex-none shadow-[6px_6px_0_#241B32] outline-2 outline-ink">
              {!scene && <div className="grid h-64 w-96 place-items-center bg-white"><Spinner size={28} /></div>}
              <canvas ref={canvasRef} tabIndex={0} role="application" aria-label={`Wallpaper canvas. ${describe(selected)}. Choose items from the Layers list, use arrow keys to move them, Delete to remove.`} data-testid="canvas" className="block touch-none bg-white" />
              {editingText && textObject && textBox && (
                <textarea
                  autoFocus aria-label="Edit text" data-testid="text-overlay" value={draftText} onChange={(e) => setDraftText(e.target.value)} onBlur={finishText}
                  onKeyDown={(e) => { if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); e.currentTarget.blur(); } }}
                  className="absolute resize-none border-2 border-violet bg-white/90 p-0 outline-none"
                  style={{ left: textBox.left, top: textBox.top, width: textBox.width, height: textBox.height, transform: `rotate(${textBox.rotation}deg)`, font: canvasFont(textObject.font, textObject.size * zoom, textObject.weight, textObject.italic), lineHeight: textObject.lineHeight, color: '#241B32', textAlign: textObject.align, padding: textObject.padding * zoom }}
                />
              )}
            </div>
          </div>
          {cropping && (
            <div className="absolute inset-x-0 top-0 flex items-center justify-center gap-3 border-b-2 border-ink bg-butter px-3 py-1.5 text-sm font-medium">
              Drag the photo to reposition it.
              <button type="button" className="btn btn-sm" onClick={() => engineRef.current?.exitCrop()}>Done</button>
            </div>
          )}
          <div className="flex flex-none items-center justify-center gap-1 border-t-2 border-ink bg-white p-1">
            <button type="button" className="icon-btn" aria-label="Zoom out" onClick={() => { autoFit.current = false; engineRef.current?.setZoom(zoom / 1.2); }}><Icon name="ZoomOut" size={16} /></button>
            <span className="w-14 text-center text-sm font-medium" data-testid="zoom">{Math.round(zoom * 100)}%</span>
            <button type="button" className="icon-btn" aria-label="Zoom in" onClick={() => { autoFit.current = false; engineRef.current?.setZoom(zoom * 1.2); }}><Icon name="ZoomIn" size={16} /></button>
            <button type="button" className="btn btn-sm ml-2" onClick={() => { autoFit.current = true; fit(); }}><Icon name="Maximize" size={15} />Fit</button>
          </div>
        </div>

        <aside aria-label="Properties" className={`row-start-2 min-h-0 flex-col border-t-2 border-ink bg-white lg:col-start-3 lg:row-start-1 lg:flex lg:border-l-2 lg:border-t-0 ${mobileEdit ? 'flex' : 'hidden'}`}>
          <button type="button" className="flex flex-none items-center gap-1.5 border-b-2 border-ink p-2 text-sm font-semibold lg:hidden" onClick={() => setMobileEdit(false)}><Icon name="ArrowLeft" size={16} />Back to photos, stickers and text</button>
          <div className="min-h-0 flex-1 overflow-y-auto">{api ? <Inspector api={api} /> : <div className="skeleton m-3 h-40" />}</div>
        </aside>
      </div>

      <p className="sr-only" aria-live="polite">{describe(selected)}</p>

      {exporting && scene && <ExportDialog scene={engineRef.current?.scene ?? scene} assets={assets} lookup={lookup} onClose={() => setExporting(false)} />}
      {deleting && (
        <Modal title="Delete this photo?" onClose={() => setDeleting(null)}>
          <p>“{deleting.name}” will be removed from this board{deleting.kind === 'upload' ? ', and its stored file will be deleted' : ''}. This can’t be undone.</p>
          <div className="mt-4 flex gap-3">
            <button type="button" className="btn btn-primary" onClick={confirmDeletePhoto}><Icon name="Trash" />Delete photo</button>
            <button type="button" className="btn" onClick={() => setDeleting(null)}>Keep photo</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
