'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { ImageFinder } from '@/components/ImageFinder';
import { useApp } from '@/components/Providers';
import { PageShell } from '@/components/SiteChrome';
import { Sticker } from '@/components/Sticker';
import { Notice, Spinner, Stages } from '@/components/ui';
import { requestQuotes, getStatus, type AppStatus } from '@/lib/api';
import { fontPairForStyle } from '@/lib/compose-board';
import { createBoard } from '@/lib/create-board';
import { PALETTES, paletteFromColors } from '@/lib/scene/palettes';
import { STICKERS } from '@/lib/scene/stickers';
import { TEMPLATES } from '@/lib/scene/templates';
import type { Asset, Palette, TemplateId } from '@/lib/scene/types';
import { clearDraft, loadDraft, type Draft } from '@/lib/store/draft';

const BUILD_STAGES = ['Composing the wallpaper', 'Polishing details'];

/** Palette rows with a sparkle tile beside each name, after the swatch cards in references/nynatrema.jpg. */
function SwatchRow({ palette, selected, onSelect }: { palette: Palette; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" role="radio" aria-checked={selected} onClick={onSelect} className={`flex w-full items-stretch border-2 border-ink text-left transition-shadow ${selected ? 'shadow-[4px_4px_0_#241B32]' : ''}`}>
      <span className="grid w-12 flex-none place-items-center border-r-2 border-ink" style={{ background: palette.primary }}><Sticker name="sparkle" color={palette.secondary} className="w-6" /></span>
      <span className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-2" style={{ background: palette.paper, color: palette.ink }}>
        <span className="truncate font-semibold">{palette.name}</span>
        <span className="flex flex-none">{[palette.primary, palette.secondary, palette.accent, palette.deep].map((c) => <i key={c} className="block size-5 border-2 border-l-0 border-ink first:border-l-2" style={{ background: c }} />)}</span>
      </span>
    </button>
  );
}

export function Review() {
  const router = useRouter();
  const { repo, toast, getToken } = useApp();
  const [draft, setDraft] = useState<Draft | null | undefined>(undefined);
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [theme, setTheme] = useState<string>('');
  const [moods, setMoods] = useState('');
  const [keywords, setKeywords] = useState('');
  const [quotes, setQuotes] = useState<string[]>([]);
  const [picked, setPicked] = useState<number[]>([0]);
  const [stickers, setStickers] = useState<string[]>([]);
  const [template, setTemplate] = useState<TemplateId>('editorial-grid');
  const [paletteId, setPaletteId] = useState('custom');
  const [extra, setExtra] = useState<Asset[]>([]);
  const [quoteOffset, setQuoteOffset] = useState(3);
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [stage, setStage] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getStatus().then(setStatus);
    loadDraft().catch(() => null).then((saved) => {
      setDraft(saved?.result ? saved : null);
      if (!saved?.result) return;
      const i = saved.result.interpretation;
      setTitle(i.boardTitle);
      setSummary(i.themeSummary);
      setTheme(i.themeCandidates[0].name);
      setMoods(i.mood.join(', '));
      setKeywords(i.searchQueries.join(', '));
      setQuotes(i.quotes);
      setStickers(i.stickerTags.filter((t) => STICKERS.some((s) => s.key === t)).slice(0, 5));
      setTemplate(i.recommendedLayout);
    });
  }, []);

  if (draft === undefined) return <PageShell><div className="mx-auto max-w-5xl space-y-4 p-6"><div className="skeleton h-14 w-2/3" /><div className="skeleton h-64" /></div></PageShell>;
  if (draft === null || !draft.result) {
    return (
      <PageShell>
        <div className="mx-auto max-w-xl px-4 py-16 text-center">
          <h1 className="text-4xl font-extrabold">Nothing to review yet</h1>
          <p className="mt-3 text-ink-soft">Start with your photos or a few words, and your suggested theme will show up here.</p>
          <Link className="btn btn-primary mt-6" href="/create">Start a new board</Link>
        </div>
      </PageShell>
    );
  }

  const { result } = draft;
  const interpretation = result.interpretation;
  const isAi = result.provider !== 'rules';
  const suggested = paletteFromColors(interpretation.palette);

  function togglePick(index: number) {
    setPicked((list) => {
      if (list.includes(index)) return list.filter((i) => i !== index);
      return list.length >= 2 ? [list[1], index] : [...list, index];
    });
  }

  async function refreshQuotes() {
    setQuoteBusy(true);
    try {
      const fresh = await requestQuotes(theme, summary, quotes, quoteOffset);
      setQuotes(fresh.quotes);
      setPicked([0]);
      setQuoteOffset((o) => o + 3);
    } catch (failure) {
      toast(failure instanceof Error ? failure.message : 'New quotes aren’t available.', 'error');
    } finally {
      setQuoteBusy(false);
    }
  }

  async function create() {
    setError(null);
    const chosen = picked.map((i) => quotes[i]?.trim()).filter(Boolean);
    try {
      const adjusted = { ...result, interpretation: { ...interpretation, boardTitle: title, themeSummary: summary, searchQueries: keywords.split(',').map((k) => k.trim()).filter(Boolean), mood: moods.split(',').map((m) => m.trim()).filter(Boolean), quotes } };
      const { board, unplaced, failed } = await createBoard({
        title, quotes: chosen, stickerTags: stickers, templateId: template, paletteId, moods: [...draft!.moods, ...adjusted.interpretation.mood], shape: draft!.shape,
        photos: draft!.mode === 'words' ? [] : draft!.photos, extraAssets: extra, exclude: draft!.exclude, result: adjusted,
      }, repo, setStage, await getToken());
      if (unplaced) toast(`${unplaced} photos didn’t fit this layout. They’re waiting in the Photos tab.`);
      if (failed) toast(`${failed} photos couldn’t be loaded.`, 'error');
      await clearDraft().catch(() => undefined);
      router.push(`/board/${board.id}`);
    } catch (failure) {
      setStage(null);
      setError(failure instanceof Error ? failure.message : 'This board couldn’t be created. Your choices are still here, so try again.');
    }
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold sm:text-5xl">Does this feel right?</h1>
            <p className="mt-2 max-w-2xl text-lg text-ink-soft">This is just a suggestion. Change anything before your wallpaper is made.</p>
          </div>
          <Link href="/create" className="btn btn-sm"><Icon name="ArrowLeft" size={16} />Back to my inputs</Link>
        </div>

        <div className="mt-5 space-y-3">
          {isAi ? (
            <Notice icon="Wand" title={`Suggested by AI (${result.model})`}>Based on {draft.mode === 'words' ? 'your words' : 'what’s visible in your photos and anything you wrote'}. It can be wrong.</Notice>
          ) : (
            <Notice icon="Info" title="Not AI: suggested by simple keyword rules">{draft.mode === 'photos' ? 'These rules can’t see inside your photos, so they’re working from file names and colors. Treat this as a starting point.' : 'These rules matched words in your description.'}</Notice>
          )}
          {result.notice && <Notice tone="warn">{result.notice}</Notice>}
          {interpretation.clarificationQuestion && <Notice icon="Info" title="One question">{interpretation.clarificationQuestion}</Notice>}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="panel space-y-4 p-5" aria-labelledby="r-theme">
            <h2 id="r-theme" className="text-2xl font-bold">Your theme</h2>
            <div>
              <label className="field-label" htmlFor="title">Board title</label>
              <input id="title" className="field text-lg font-semibold" maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <p className="field-label" id="theme-label">{draft.mode === 'words' ? 'This sounds like' : 'These suggest'}</p>
              <div role="radiogroup" aria-labelledby="theme-label" className="flex flex-wrap gap-2">
                {interpretation.themeCandidates.map((c) => (
                  <button key={c.name} type="button" role="radio" aria-checked={theme === c.name} className="chip" onClick={() => setTheme(c.name)}>{c.name}</button>
                ))}
                {interpretation.themeCandidates.length > 1 && <button type="button" role="radio" aria-checked={theme === 'Blend'} className="chip" onClick={() => setTheme('Blend')}>Blend these dreams</button>}
              </div>
            </div>
            <div>
              <label className="field-label" htmlFor="summary">In a sentence</label>
              <textarea id="summary" className="field min-h-20" maxLength={240} value={summary} onChange={(e) => setSummary(e.target.value)} />
            </div>
            <div>
              <label className="field-label" htmlFor="moods">Mood</label>
              <input id="moods" className="field" value={moods} onChange={(e) => setMoods(e.target.value)} />
            </div>
            <div>
              <label className="field-label" htmlFor="keywords">Image keywords</label>
              <input id="keywords" className="field" value={keywords} onChange={(e) => setKeywords(e.target.value)} />
              <p className="field-hint">Used to pick bundled art and search open images. Separate with commas.</p>
            </div>
          </section>

          <section className="panel space-y-3 p-5" aria-labelledby="r-quotes">
            <div className="flex items-center justify-between gap-3">
              <h2 id="r-quotes" className="text-2xl font-bold">Quotes</h2>
              <button type="button" className="btn btn-sm" onClick={() => void refreshQuotes()} disabled={quoteBusy}>{quoteBusy ? <Spinner size={15} /> : <Icon name="RefreshCw" size={15} />}New quotes</button>
            </div>
            <p className="text-sm text-ink-soft">Pick one or two for your board. Edit them however you like.</p>
            {quotes.map((quote, i) => (
              <div key={i} className={`flex items-start gap-3 border-2 border-ink p-3 ${picked.includes(i) ? 'bg-butter' : 'bg-white'}`}>
                <input type="checkbox" aria-label={`Use quote ${i + 1}`} className="mt-1.5 size-5 flex-none accent-violet-700" checked={picked.includes(i)} onChange={() => togglePick(i)} />
                <textarea aria-label={`Quote ${i + 1}`} rows={2} maxLength={130} className="w-full resize-none bg-transparent text-xl italic leading-snug outline-none" style={{ fontFamily: 'var(--font-serif)' }} value={quote} onChange={(e) => setQuotes((list) => list.map((q, n) => (n === i ? e.target.value : q)))} />
              </div>
            ))}
          </section>

          <section className="panel space-y-3 p-5" aria-labelledby="r-colors">
            <h2 id="r-colors" className="text-2xl font-bold">Colors</h2>
            <div role="radiogroup" aria-labelledby="r-colors" className="space-y-2">
              <SwatchRow palette={suggested} selected={paletteId === 'custom'} onSelect={() => setPaletteId('custom')} />
              {PALETTES.map((p) => <SwatchRow key={p.id} palette={p} selected={paletteId === p.id} onSelect={() => setPaletteId(p.id)} />)}
            </div>
          </section>

          <div className="space-y-6">
            <section className="panel space-y-3 p-5" aria-labelledby="r-layout">
              <h2 id="r-layout" className="text-2xl font-bold">Layout</h2>
              <div role="radiogroup" aria-labelledby="r-layout" className="space-y-2">
                {TEMPLATES.map((t) => (
                  <button key={t.id} type="button" role="radio" aria-checked={template === t.id} onClick={() => setTemplate(t.id)} className={`block w-full border-2 border-ink p-2.5 text-left hover:bg-blush ${template === t.id ? 'bg-lilac hover:bg-lilac' : ''}`}>
                    <span className="block font-semibold">{t.name}</span>
                    <span className="block text-sm">{t.description}</span>
                  </button>
                ))}
              </div>
            </section>
            <section className="panel space-y-3 p-5" aria-labelledby="r-stickers">
              <h2 id="r-stickers" className="text-2xl font-bold">Stickers</h2>
              <div className="grid grid-cols-6 gap-2" role="group" aria-labelledby="r-stickers">
                {STICKERS.filter((s) => s.key !== 'tape').map((s) => {
                  const on = stickers.includes(s.key);
                  return <button key={s.key} type="button" aria-pressed={on} aria-label={s.label} title={s.label} onClick={() => setStickers((list) => (on ? list.filter((k) => k !== s.key) : [...list.slice(-4), s.key]))} className={`grid aspect-square place-items-center border-2 p-1.5 ${on ? 'border-ink bg-butter' : 'border-transparent hover:bg-blush'}`}><Sticker name={s.key} className="max-h-full w-full" /></button>;
                })}
              </div>
            </section>
          </div>
        </div>

        <section className="panel mt-6 space-y-3 p-5" aria-labelledby="r-images">
          <h2 id="r-images" className="text-2xl font-bold">Add open-license images (optional)</h2>
          <p className="text-sm text-ink-soft">Your own photos always come first. These are public-domain images found through Openverse, and each one keeps its source details.</p>
          <ImageFinder initialQuery={keywords.split(',')[0]?.trim() ?? ''} added={extra} onAdd={(asset) => setExtra((list) => [...list, asset])} />
          {extra.length > 0 && <p className="text-sm font-medium">{extra.length} added to this board.</p>}
          {status?.imageGeneration && <Notice icon="Info" title="Extra AI photos are available">You can generate up to 2 a day from the Photos tab in the editor. Each one costs money on the image service you connected.</Notice>}
        </section>

        <div className="sticky bottom-0 z-10 -mx-4 mt-6 border-t-2 border-ink bg-cream px-4 py-3 sm:mx-0">
          {error && <div className="mb-3"><Notice tone="error">{error}</Notice></div>}
          {stage !== null ? <Stages stages={BUILD_STAGES} current={stage} label="Progress" /> : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-ink-soft">{template ? `${TEMPLATES.find((t) => t.id === template)?.name}, ${fontPairForStyle(draft.moods, template)} type` : ''}{picked.length === 0 ? '. No quote picked.' : ''}</p>
              <button type="button" className="btn btn-primary text-lg" disabled={!title.trim()} onClick={() => void create()}><Icon name="Wand" />Create my wallpaper</button>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
