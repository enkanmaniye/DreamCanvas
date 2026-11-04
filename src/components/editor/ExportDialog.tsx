'use client';

import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { useApp } from '@/components/Providers';
import { Modal, Notice, Spinner } from '@/components/ui';
import { exportScene } from '@/lib/export';
import { exportFilename } from '@/lib/filename';
import { readDefaultExport } from '@/lib/prefs';
import type { ImageLookup } from '@/lib/scene/render';
import { EXPORT_SIZES, type Asset, type Scene } from '@/lib/scene/types';

export function ExportDialog({ scene, assets, lookup, onClose }: { scene: Scene; assets: Asset[]; lookup: ImageLookup; onClose: () => void }) {
  const { toast } = useApp();
  const landscape = scene.width > scene.height;
  const sizes = EXPORT_SIZES.filter((s) => (s.width > s.height) === landscape);
  const fallback = sizes.find((s) => s.id === readDefaultExport()) ?? sizes[sizes.length - 1];
  const [sizeId, setSizeId] = useState(fallback.id);
  const [format, setFormat] = useState<'png' | 'jpg'>('png');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const size = sizes.find((s) => s.id === sizeId) ?? fallback;
  const used = new Set(scene.objects.flatMap((o) => (o.type === 'image' ? [o.assetId] : [])));
  const credits = assets.filter((a) => a.credit && used.has(a.id));
  const creditText = credits.map((a) => `${a.credit?.title} by ${a.credit?.creator}, ${a.credit?.license}, ${a.credit?.sourceUrl}`).join('\n');

  async function download() {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const name = await exportScene(scene, lookup, { width: size.width, height: size.height, format });
      setDone(name);
      toast('Wallpaper downloaded.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The download failed. Try a smaller size.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Download wallpaper" onClose={onClose}>
      <div className="space-y-4">
        <fieldset>
          <legend className="field-label">Size</legend>
          <div className="space-y-1.5">
            {sizes.map((s) => (
              <label key={s.id} className={`flex cursor-pointer items-center gap-2 border-2 border-ink p-2.5 ${sizeId === s.id ? 'bg-butter' : ''}`}>
                <input type="radio" name="size" className="size-4 accent-violet-700" checked={sizeId === s.id} onChange={() => setSizeId(s.id)} />
                <span className="font-semibold">{s.label}</span>
                <span className="text-sm">{s.width} × {s.height}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="field-label">File type</legend>
          <div className="flex gap-2">
            <label className={`flex flex-1 cursor-pointer items-center gap-2 border-2 border-ink p-2.5 ${format === 'png' ? 'bg-butter' : ''}`}><input type="radio" name="format" className="size-4 accent-violet-700" checked={format === 'png'} onChange={() => setFormat('png')} />PNG (best quality)</label>
            <label className={`flex flex-1 cursor-pointer items-center gap-2 border-2 border-ink p-2.5 ${format === 'jpg' ? 'bg-butter' : ''}`}><input type="radio" name="format" className="size-4 accent-violet-700" checked={format === 'jpg'} onChange={() => setFormat('jpg')} />JPG (smaller file)</label>
          </div>
        </fieldset>
        <p className="break-all text-sm text-ink-soft">{exportFilename(scene.meta.title, size.width, size.height, format)}</p>
        {credits.length > 0 && (
          <Notice title="Credits for images on this board" action={<button type="button" className="btn btn-sm" onClick={() => void navigator.clipboard.writeText(creditText).then(() => toast('Credits copied.'))}><Icon name="Copy" size={15} />Copy credits</button>}>
            <ul className="mt-1 space-y-1">
              {credits.map((a) => <li key={a.id}><a className="underline" href={a.credit?.sourceUrl} target="_blank" rel="noreferrer noopener">{a.credit?.title}</a> by {a.credit?.creator}, {a.credit?.license}</li>)}
            </ul>
          </Notice>
        )}
        {error && <Notice tone="error">{error}</Notice>}
        {done && <Notice tone="ok" title="Downloaded">{done}</Notice>}
        <button type="button" className="btn btn-primary w-full text-lg" disabled={busy} onClick={() => void download()}>{busy ? <Spinner /> : <Icon name="Download" />}Download {format.toUpperCase()}</button>
      </div>
    </Modal>
  );
}
