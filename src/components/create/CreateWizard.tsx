'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BoardPreview } from '@/components/BoardPreview';
import { Icon } from '@/components/Icon';
import { useApp } from '@/components/Providers';
import { PageShell } from '@/components/SiteChrome';
import { Notice, Stages } from '@/components/ui';
import { interpretWithRules } from '@/lib/ai/rules';
import { getStatus, requestAnalysis, type AppStatus } from '@/lib/api';
import { chooseAssets, fontPairForStyle, resolvePalette } from '@/lib/compose-board';
import { createBoard } from '@/lib/create-board';
import { aiThumbnail } from '@/lib/images/ingest';
import { queryParam } from '@/lib/platform';
import { compose } from '@/lib/scene/templates';
import type { BoardShape } from '@/lib/scene/types';
import { clearDraft, EMPTY_DRAFT, loadDraft, saveDraft, type CreateMode, type Draft } from '@/lib/store/draft';
import { PhotoTray } from './PhotoTray';

const MODES: { id: CreateMode; label: string }[] = [
  { id: 'photos', label: 'Upload photos' },
  { id: 'words', label: 'Describe a dream' },
  { id: 'both', label: 'Both' },
];
const TOPICS = ['Career', 'Travel', 'Wellness', 'Study', 'Creativity', 'Lifestyle'];
const MOODS = ['Sunny', 'Pastel', 'Editorial', 'Cozy', 'Bold', 'Dreamy', 'Minimal'];
const EXAMPLES = ['A peaceful summer in Bali and the Maldives', 'Running my own design studio in a bright city office', 'Finishing my degree and moving into my first apartment'];
const STAGES = ['Reading your inspiration', 'Finding the mood'];
const BUILD_STAGES = ['Composing the wallpaper', 'Polishing details'];

function Chips({ options, value, onChange, label }: { options: string[]; value: string[]; onChange: (next: string[]) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const on = value.includes(option);
        return <button key={option} type="button" className="chip" aria-pressed={on} onClick={() => onChange(on ? value.filter((v) => v !== option) : [...value, option])}>{option}</button>;
      })}
    </div>
  );
}

export function CreateWizard() {
  const router = useRouter();
  const { repo, toast, getToken } = useApp();
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [colors, setColors] = useState<string[]>([]);
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [stage, setStage] = useState<number | null>(null);
  const [buildStage, setBuildStage] = useState<number | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    void getStatus().then(setStatus);
    const wanted = queryParam('mode') as CreateMode | null;
    loadDraft().catch(() => null).then((saved) => {
      setDraft((current) => ({ ...current, ...saved, result: null, mode: wanted && MODES.some((m) => m.id === wanted) ? wanted : saved?.mode ?? current.mode }));
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => { saveDraft(draft).catch(() => undefined); }, 300);
    return () => clearTimeout(timer);
  }, [draft, loaded]);

  const patch = (next: Partial<Draft>) => setDraft((d) => ({ ...d, ...next }));
  const usesPhotos = draft.mode !== 'words';
  const usesWords = draft.mode !== 'photos';
  const photos = useMemo(() => (usesPhotos ? draft.photos : []), [usesPhotos, draft.photos]);
  const text = usesWords ? draft.text : '';
  const ready = photos.length > 0 || text.trim().length >= 3;
  const needsConsent = Boolean(status?.ai.sendsPhotosToThirdParty && photos.length > 0);
  const busy = stage !== null || buildStage !== null;

  const analyzeInput = useMemo(() => ({
    text, topics: usesWords ? draft.topics : [], moods: draft.moods, styleTags: [], exclude: draft.exclude, language: draft.language,
    photoNames: photos.map((p) => p.name), photoColors: colors.slice(0, 8),
  }), [text, usesWords, draft.topics, draft.moods, draft.exclude, draft.language, photos, colors]);

  const preview = useMemo(() => {
    const rules = interpretWithRules(analyzeInput);
    const assets = chooseAssets(photos, rules, [], draft.exclude);
    const scene = compose({ templateId: rules.recommendedLayout, shape: draft.shape, assets, title: rules.boardTitle, quotes: rules.quotes.slice(0, 1), stickerTags: rules.stickerTags, palette: resolvePalette('custom', rules.palette), fontPairId: fontPairForStyle(draft.moods, rules.recommendedLayout), seed: 12 }).scene;
    return { scene, assets };
  }, [analyzeInput, photos, draft.exclude, draft.shape, draft.moods]);

  async function understand() {
    setError(null);
    if (!ready) {
      setError('Add a photo or describe your dream first.');
      return;
    }
    if (needsConsent && !draft.consent) {
      setError('Tick the box to send small copies of your photos, or choose “Build it without suggestions”.');
      return;
    }
    setStage(0);
    try {
      const sendImages = (status?.ai.provider === 'ollama') || (status?.ai.provider === 'gemini' && draft.consent);
      const images = sendImages ? (await Promise.all(photos.slice(0, 8).map(aiThumbnail))).filter((i) => i !== null) : [];
      setStage(1);
      const result = await requestAnalysis({ ...analyzeInput, images, consent: draft.consent });
      await saveDraft({ ...draft, photos, text, result });
      router.push('/create/review');
    } catch (failure) {
      setStage(null);
      setError(failure instanceof Error ? failure.message : 'That didn’t work. Your photos and words are still here, so try again.');
    }
  }

  async function buildWithoutSuggestions() {
    setError(null);
    try {
      const interpretation = interpretWithRules(analyzeInput);
      const { board } = await createBoard({
        title: interpretation.boardTitle, quotes: interpretation.quotes.slice(0, 1), stickerTags: interpretation.stickerTags, templateId: interpretation.recommendedLayout, paletteId: 'custom', moods: draft.moods, shape: draft.shape, photos, extraAssets: [], exclude: draft.exclude,
        result: { interpretation, provider: 'rules', model: null, notice: null },
      }, repo, setBuildStage, await getToken());
      await clearDraft().catch(() => undefined);
      router.push(`/board/${board.id}`);
    } catch (failure) {
      setBuildStage(null);
      const message = failure instanceof Error ? failure.message : 'This board couldn’t be created. Try again.';
      setError(message);
      toast(message, 'error');
    }
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="text-4xl font-extrabold sm:text-5xl">Start a new board</h1>
        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <form className="min-w-0 space-y-6" onSubmit={(e) => { e.preventDefault(); void understand(); }}>
            <div role="tablist" aria-label="How to start" className="tab-strip">
              {MODES.map((m) => <button key={m.id} type="button" role="tab" aria-selected={draft.mode === m.id} onClick={() => patch({ mode: m.id })}>{m.label}</button>)}
            </div>

            {usesPhotos && <PhotoTray photos={draft.photos} onChange={(next) => patch({ photos: next })} onColors={(c) => setColors((list) => [...list, ...c])} onBusy={setPreparing} />}

            {usesWords && (
              <div className="space-y-4">
                <div>
                  <label className="field-label" htmlFor="dream">{draft.mode === 'both' ? 'What do these photos mean to you?' : 'What do you want your life to look like?'}</label>
                  <textarea id="dream" ref={textRef} className="field min-h-32 text-lg" maxLength={1000} value={draft.text} onChange={(e) => patch({ text: e.target.value })} placeholder="I want to spend a slow, sunny summer by the sea." />
                  <p className="field-hint">{draft.text.length} of 1000 characters. Write in any language.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLES.map((example) => <button key={example} type="button" className="text-left text-sm underline decoration-pink decoration-2 underline-offset-4" onClick={() => { patch({ text: example }); textRef.current?.focus(); }}>{example}</button>)}
                </div>
                <fieldset>
                  <legend className="field-label">Topics (optional)</legend>
                  <Chips label="Topics" options={TOPICS} value={draft.topics} onChange={(topics) => patch({ topics })} />
                </fieldset>
              </div>
            )}

            <fieldset>
              <legend className="field-label">Style (optional)</legend>
              <Chips label="Style" options={MOODS} value={draft.moods} onChange={(moods) => patch({ moods })} />
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-3">
              <fieldset>
                <legend className="field-label">Screen</legend>
                <div className="tab-strip" role="radiogroup" aria-label="Screen">
                  {(['landscape', 'portrait'] as BoardShape[]).map((shape) => (
                    <button key={shape} type="button" role="radio" aria-checked={draft.shape === shape} aria-selected={draft.shape === shape} onClick={() => patch({ shape })}>{shape === 'landscape' ? 'Desktop' : 'Phone'}</button>
                  ))}
                </div>
              </fieldset>
              <div>
                <label className="field-label" htmlFor="exclude">Leave out (optional)</label>
                <input id="exclude" className="field" maxLength={200} value={draft.exclude} onChange={(e) => patch({ exclude: e.target.value })} placeholder="Cities, mountains" />
              </div>
              <div>
                <label className="field-label" htmlFor="language">Quote language (optional)</label>
                <input id="language" className="field" maxLength={40} value={draft.language} onChange={(e) => patch({ language: e.target.value })} placeholder="Same as my words" />
              </div>
            </div>

            {status?.ai.provider === 'rules' && (
              <Notice icon="Info" title="Local Demo Mode: no AI">Suggestions come from simple keyword rules that read your words and file names. They can’t see inside your photos. {usesWords || 'Adding a description gives better results.'}</Notice>
            )}
            {status?.ai.provider === 'ollama' && <Notice icon="Shield" title="Private AI">Suggestions come from {status.ai.model} running on this computer. Your photos stay here.</Notice>}
            {needsConsent && (
              <label className="flex cursor-pointer gap-3 border-2 border-ink bg-mist p-3 text-sm leading-snug">
                <input type="checkbox" className="mt-0.5 size-5 flex-none accent-violet-700" checked={draft.consent} onChange={(e) => patch({ consent: e.target.checked })} />
                <span>
                  <strong>Send small copies of my photos to Google Gemini</strong> so it can suggest a theme.
                  {status?.ai.freeTierDataUse ? ' This copy uses Gemini’s free tier, where Google may use what you send to improve its products and people may review it. Don’t send photos you want to keep private.' : ' Full-size originals aren’t sent.'}
                </span>
              </label>
            )}

            {error && <Notice tone="error">{error}</Notice>}

            {stage !== null ? (
              <div className="panel p-4"><Stages stages={STAGES} current={stage} label="Progress" /></div>
            ) : buildStage !== null ? (
              <div className="panel p-4"><Stages stages={BUILD_STAGES} current={buildStage} label="Progress" /></div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="submit" className="btn btn-primary text-lg" disabled={busy || preparing}><Icon name="Wand" />Understand my dream</button>
                <button type="button" className="btn" disabled={busy || preparing} onClick={() => void buildWithoutSuggestions()}>Build it without suggestions</button>
              </div>
            )}
          </form>

          <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start" aria-label="Live preview">
            <div className="panel panel-lift">
              <div className={`mx-auto ${draft.shape === 'portrait' ? 'max-w-[50%]' : ''}`}>
                <BoardPreview scene={preview.scene} assets={preview.assets} label="Live preview of your board" />
              </div>
              <p className="border-t-2 border-ink bg-butter px-3 py-2 text-sm">A rough sketch that updates as you go. You’ll choose the details next.</p>
            </div>
            <p className="mt-5 text-sm text-ink-soft">
              {photos.length ? 'Your photos are prepared on this device, and location data is removed.' : 'No photos yet? Bundled artwork fills the board until you add your own.'}{' '}
              <Link href="/privacy" className="underline">How your photos are handled</Link>
            </p>
          </aside>
        </div>
      </div>
    </PageShell>
  );
}
