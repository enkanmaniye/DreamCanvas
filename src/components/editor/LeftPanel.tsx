'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { ImageFinder } from '@/components/ImageFinder';
import { useApp } from '@/components/Providers';
import { Sticker } from '@/components/Sticker';
import { Notice, Spinner } from '@/components/ui';
import { getStatus, requestQuotes, type AppStatus } from '@/lib/api';
import { DEMO_ASSETS } from '@/lib/assets/demo-library';
import { IngestError, ingestFile, ingestRemoteBlob } from '@/lib/images/ingest';
import { loadImage } from '@/lib/images/loader';
import { countQuotes, makeSticker, makeText, MAX_VISIBLE_QUOTES } from '@/lib/scene/operations';
import { searchStickers } from '@/lib/scene/stickers';
import { TEMPLATES } from '@/lib/scene/templates';
import type { Asset, TemplateId } from '@/lib/scene/types';
import { Section } from './controls';
import type { EditorApi } from './types';

export type LeftTab = 'photos' | 'stickers' | 'text' | 'layouts';

function AssetThumb({ asset }: { asset: Asset }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    loadImage(asset).then((image) => { if (live) setSrc(image.src); }).catch(() => undefined);
    return () => { live = false; };
  }, [asset]);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt="" loading="lazy" className="size-full object-cover" /> : <div className="skeleton size-full" />;
}

function GeneratePhoto({ api }: { api: EditorApi }) {
  const { user, getToken, toast } = useApp();
  const [prompt, setPrompt] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    try {
      const response = await fetch('/api/images/generate', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${await getToken()}` }, body: JSON.stringify({ prompt, acceptedCost: true }) });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'No image came back. Try again.');
      }
      const blob = await response.blob();
      const bitmap = await createImageBitmap(blob);
      const asset = await ingestRemoteBlob(blob, { name: prompt.slice(0, 60), width: bitmap.width, height: bitmap.height }, 'generated');
      bitmap.close();
      await api.addAssetToBoard(asset);
    } catch (failure) {
      toast(failure instanceof Error ? failure.message : 'No image came back. Try again.', 'error');
    } finally {
      setBusy(false);
    }
  }

  if (!user) return <Notice>Log in to generate extra AI photos.</Notice>;
  return (
    <div className="space-y-2">
      <label className="field-label" htmlFor="gen-prompt">Describe the photo</label>
      <input id="gen-prompt" className="field" maxLength={300} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />I understand each photo costs money on the connected image service. Limit: 2 a day.</label>
      <button type="button" className="btn btn-sm" disabled={!accepted || prompt.trim().length < 3 || busy} onClick={() => void generate()}>{busy ? <Spinner size={15} /> : <Icon name="Wand" size={15} />}Generate photo</button>
    </div>
  );
}

function PhotosTab({ api }: { api: EditorApi }) {
  const input = useRef<HTMLInputElement>(null);
  const { toast } = useApp();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<AppStatus | null>(null);
  useEffect(() => { void getStatus().then(setStatus); }, []);

  const used = useMemo(() => new Set(api.scene.objects.flatMap((o) => (o.type === 'image' ? [o.assetId] : []))), [api.scene]);
  const pick = (asset: Asset) => { void (api.replacing ? api.replaceWith(asset) : api.placeAsset(asset)); };
  const bundled = DEMO_ASSETS.filter((a) => !api.assets.some((b) => b.id === a.id));

  async function upload(files: File[]) {
    setBusy(true);
    for (const file of files) {
      try {
        await api.addAssetToBoard((await ingestFile(file)).asset);
      } catch (error) {
        toast(error instanceof IngestError ? error.message : `${file.name} couldn’t be added.`, 'error');
      }
    }
    setBusy(false);
  }

  return (
    <>
      {api.replacing && (
        <div className="border-b-2 border-ink bg-butter p-3 text-sm font-medium">
          Choose the new photo.
          <button type="button" className="ml-2 underline" onClick={() => api.setReplacing(false)}>Cancel</button>
        </div>
      )}
      <Section title="This board" action={<button type="button" className="btn btn-sm" onClick={() => input.current?.click()} disabled={busy}>{busy ? <Spinner size={15} /> : <Icon name="Upload" size={15} />}Upload</button>}>
        <input ref={input} type="file" hidden multiple accept="image/jpeg,image/png,image/webp" data-testid="editor-file-input" aria-label="Upload photos" onChange={(e) => { void upload([...(e.target.files ?? [])]); e.target.value = ''; }} />
        {api.assets.length === 0 ? <p className="text-sm text-ink-soft">Nothing here yet. Upload a photo or add bundled art below.</p> : (
          <ul className="grid grid-cols-3 gap-2">
            {api.assets.map((asset) => (
              <li key={asset.id} className="group relative aspect-square border-2 border-ink bg-mist" data-testid="tray-asset">
                <button type="button" className="block size-full" aria-label={`${api.replacing ? 'Replace with' : 'Add to canvas:'} ${asset.name}`} title={asset.name} onClick={() => pick(asset)}><AssetThumb asset={asset} /></button>
                {!used.has(asset.id) && <span className="pointer-events-none absolute bottom-0 left-0 border-r-2 border-t-2 border-ink bg-butter px-1 text-[11px] font-semibold">Not placed</span>}
                <button type="button" className="absolute right-0 top-0 grid size-6 place-items-center border-b-2 border-l-2 border-ink bg-white hover:bg-pink" aria-label={`Delete ${asset.name} from this board`} onClick={() => api.deleteAsset(asset)}><Icon name="X" size={13} /></button>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Bundled art">
        <ul className="grid grid-cols-3 gap-2">
          {bundled.map((asset) => (
            <li key={asset.id} className="aspect-square border-2 border-ink bg-mist">
              <button type="button" className="block size-full" aria-label={`${api.replacing ? 'Replace with' : 'Add to canvas:'} ${asset.name}`} title={asset.name} onClick={() => pick(asset)}><AssetThumb asset={asset} /></button>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Open-license images">
        <ImageFinder initialQuery="" added={api.assets} onAdd={(asset) => void api.addAssetToBoard(asset)} />
      </Section>
      {status?.imageGeneration && <Section title="Extra AI photos (optional)"><GeneratePhoto api={api} /></Section>}
    </>
  );
}

function StickersTab({ api }: { api: EditorApi }) {
  const [query, setQuery] = useState('');
  const results = searchStickers(query);
  const count = api.scene.objects.filter((o) => o.type === 'sticker').length;
  return (
    <Section title="Stickers">
      <input className="field" aria-label="Search stickers" placeholder="Search: sun, travel, heart" value={query} onChange={(e) => setQuery(e.target.value)} />
      {results.length === 0 && <p className="text-sm text-ink-soft">No stickers match that word.</p>}
      <div className="grid grid-cols-3 gap-2">
        {results.map((s) => (
          <button key={s.key} type="button" className="grid aspect-square place-items-center border-2 border-ink bg-white p-2 hover:bg-blush" aria-label={`Add ${s.label} sticker`} title={s.label} onClick={() => { const o = makeSticker(api.scene, s.key, api.palette); if (o) api.engine()?.add(o); }}>
            <Sticker name={s.key} className="max-h-full w-full" color={api.palette.primary} accent={api.palette.secondary} />
          </button>
        ))}
      </div>
      {count > 5 && <p className="text-sm text-ink-soft">{count} stickers on the board. Boards usually look best with 2 to 5.</p>}
    </Section>
  );
}

function TextTab({ api }: { api: EditorApi }) {
  const { toast } = useApp();
  const theme = api.board.theme?.interpretation;
  const [options, setOptions] = useState<string[]>(theme?.quotes ?? []);
  const [offset, setOffset] = useState(3);
  const [busy, setBusy] = useState(false);
  const quoteCount = countQuotes(api.scene);
  const full = quoteCount >= MAX_VISIBLE_QUOTES;
  const onBoard = api.scene.objects.flatMap((o) => (o.type === 'text' ? [o.text] : []));

  async function regenerate() {
    setBusy(true);
    try {
      const fresh = await requestQuotes(theme?.themeCandidates[0]?.name ?? 'Personal vision', theme?.themeSummary ?? '', [...options, ...onBoard], offset);
      setOptions(fresh.quotes);
      setOffset((o) => o + 3);
    } catch (failure) {
      toast(failure instanceof Error ? failure.message : 'New quotes aren’t available.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Section title="Add text">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-sm" onClick={() => api.engine()?.add(makeText(api.scene, 'title', 'Your title', api.palette))}><Icon name="Type" size={15} />Title</button>
          <button type="button" className="btn btn-sm" onClick={() => api.engine()?.add(makeText(api.scene, 'caption', 'A small caption', api.palette))}><Icon name="Type" size={13} />Caption</button>
          <button type="button" className="btn btn-sm" disabled={full} onClick={() => api.engine()?.add(makeText(api.scene, 'quote', 'Write your own line here.', api.palette))}><Icon name="Quote" size={15} />Quote</button>
        </div>
      </Section>
      <Section title="Quote ideas" action={<button type="button" className="btn btn-sm" disabled={busy} onClick={() => void regenerate()}>{busy ? <Spinner size={15} /> : <Icon name="RefreshCw" size={15} />}New ideas</button>}>
        {full && <Notice>This board has {MAX_VISIBLE_QUOTES} quotes, which is the limit. Delete one to add another.</Notice>}
        {options.length === 0 && <p className="text-sm text-ink-soft">Press New ideas for a few original lines.</p>}
        {options.map((quote) => {
          const placed = onBoard.includes(quote);
          return (
            <button key={quote} type="button" disabled={full || placed} className="block w-full border-2 border-ink bg-white p-2.5 text-left text-lg italic leading-snug hover:bg-butter disabled:opacity-50" style={{ fontFamily: 'var(--font-serif)' }} onClick={() => api.engine()?.add(makeText(api.scene, 'quote', quote, api.palette))} aria-label={`Add quote: ${quote}`}>
              {quote}
            </button>
          );
        })}
      </Section>
    </>
  );
}

/** Small drawings of each layout, so choosing one doesn't depend on reading its name. */
const WIRE: Record<TemplateId, number[][]> = {
  'editorial-grid': [[3, 3, 40, 42], [45, 3, 22, 21], [45, 26, 22, 19], [3, 47, 40, 12], [70, 3, 27, 22], [70, 27, 27, 32]],
  'gallery-wall': [[6, 18, 20, 16], [30, 16, 24, 20], [58, 18, 18, 16], [14, 40, 24, 16], [42, 40, 18, 16], [64, 40, 22, 16]],
  'modern-scrapbook': [[6, 22, 34, 28], [44, 8, 22, 20], [70, 12, 22, 24], [46, 34, 20, 18], [68, 38, 24, 18]],
  'minimal-focus': [[50, 6, 44, 48], [8, 8, 34, 14], [8, 26, 28, 8]],
  'dream-magazine': [[0, 0, 100, 60], [0, 0, 100, 14], [76, 18, 20, 12], [76, 32, 20, 12], [5, 40, 40, 15]],
};

function LayoutsTab({ api }: { api: EditorApi }) {
  const current = api.scene.meta.templateId;
  return (
    <Section title="Layouts" action={<button type="button" className="btn btn-sm" onClick={() => api.switchLayout(current, Math.floor(Math.random() * 1e6))}><Icon name="Shuffle" size={15} />Shuffle</button>}>
      <div role="radiogroup" aria-label="Layouts" className="space-y-2">
        {TEMPLATES.map((t) => (
          <button key={t.id} type="button" role="radio" aria-checked={current === t.id} onClick={() => api.switchLayout(t.id)} className={`flex w-full gap-3 border-2 border-ink p-2 text-left hover:bg-blush ${current === t.id ? 'bg-lilac hover:bg-lilac' : 'bg-white'}`}>
            <svg viewBox="0 0 100 62" className="w-20 flex-none border-2 border-ink bg-cream" aria-hidden="true">
              {WIRE[t.id].map((r, i) => <rect key={i} x={r[0]} y={r[1]} width={r[2]} height={r[3]} fill={i === 0 ? '#FF72B5' : i % 2 ? '#FFE36F' : '#BEA4FF'} stroke="#241B32" strokeWidth="1.5" />)}
            </svg>
            <span className="min-w-0"><span className="block font-semibold">{t.name}</span><span className="block text-sm leading-snug">{t.description}</span></span>
          </button>
        ))}
      </div>
      <p className="text-sm text-ink-soft">Your text and photos carry over. Undo brings back your last version.</p>
    </Section>
  );
}

export function LeftPanel({ api, tab }: { api: EditorApi; tab: LeftTab }) {
  if (tab === 'photos') return <PhotosTab api={api} />;
  if (tab === 'stickers') return <StickersTab api={api} />;
  if (tab === 'text') return <TextTab api={api} />;
  return <LayoutsTab api={api} />;
}
