'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { Notice } from '@/components/ui';
import { MAX_PHOTOS } from '@/lib/config';
import { ingestFile, IngestError } from '@/lib/images/ingest';
import { loadImage } from '@/lib/images/loader';
import { remainingSlots } from '@/lib/images/validate';
import type { Asset } from '@/lib/scene/types';

interface Failure { file: File; message: string }

function Thumb({ asset }: { asset: Asset }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    loadImage(asset).then((image) => { if (live) setSrc(image.src); }).catch(() => undefined);
    return () => { live = false; };
  }, [asset]);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt={asset.name} className="size-full object-cover" /> : <div className="skeleton size-full" />;
}

export function PhotoTray({ photos, onChange, onColors, onBusy }: { photos: Asset[]; onChange: (photos: Asset[]) => void; onColors: (colors: string[]) => void; onBusy: (busy: boolean) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [settle, setSettle] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [failures, setFailures] = useState<Failure[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const latest = useRef(photos);
  latest.current = photos;

  async function addFiles(files: File[]) {
    if (!files.length) return;
    setNotice(null);
    const room = remainingSlots(latest.current.length);
    const accepted = files.slice(0, room);
    if (files.length > room) setNotice(`A board can hold ${MAX_PHOTOS} photos, so ${files.length - room} weren’t added.`);
    setProgress({ done: 0, total: accepted.length });
    onBusy(true);
    const failed: Failure[] = [];
    for (const [i, file] of accepted.entries()) {
      try {
        const { asset, colors } = await ingestFile(file);
        latest.current = [...latest.current, asset];
        onChange(latest.current);
        onColors(colors);
      } catch (error) {
        failed.push({ file, message: error instanceof IngestError ? error.message : error instanceof Error ? error.message : `${file.name} couldn’t be added.` });
      }
      setProgress({ done: i + 1, total: accepted.length });
    }
    setFailures(failed);
    setProgress(null);
    onBusy(false);
    setSettle(true);
    setTimeout(() => setSettle(false), 360);
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= photos.length || from === to) return;
    const next = [...photos];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div
        className="dropzone border-2 border-dashed border-ink bg-blush p-6 text-center"
        data-over={over}
        data-settle={settle}
        data-testid="dropzone"
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); void addFiles([...e.dataTransfer.files]); }}
      >
        <Icon name="Images" size={30} className="mx-auto" />
        <p className="mt-2 font-semibold">Drop your photos here</p>
        <p className="text-sm text-ink-soft">JPG, PNG or WebP, up to 10 MB each. 4 to 12 photos work best.</p>
        <button type="button" className="btn btn-yellow mt-3" onClick={() => input.current?.click()}><Icon name="Upload" />Browse photos</button>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,.heic" multiple hidden data-testid="file-input" aria-label="Choose photos" onChange={(e) => { void addFiles([...(e.target.files ?? [])]); e.target.value = ''; }} />
      </div>

      {progress && (
        <div role="status">
          <p className="mb-1 text-sm font-medium">Preparing photo {Math.min(progress.done + 1, progress.total)} of {progress.total}</p>
          <div className="h-3 border-2 border-ink bg-white"><div className="h-full bg-pink transition-[width]" style={{ width: `${(progress.done / progress.total) * 100}%` }} /></div>
        </div>
      )}
      {notice && <Notice tone="warn">{notice}</Notice>}
      {failures.map((f) => (
        <Notice key={f.file.name} tone="error" action={<button type="button" className="btn btn-sm" onClick={() => { setFailures((list) => list.filter((x) => x !== f)); void addFiles([f.file]); }}><Icon name="RefreshCw" size={15} />Try again</button>}>{f.message}</Notice>
      ))}

      {photos.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium" data-testid="photo-count">{photos.length} of {MAX_PHOTOS} photos. The first one becomes the main image.</p>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {photos.map((asset, i) => (
              <li key={asset.id} draggable onDragStart={() => setDragIndex(i)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (dragIndex !== null) move(dragIndex, i); setDragIndex(null); }} className="border-2 border-ink bg-white">
                <div className="relative aspect-square cursor-grab bg-mist">
                  <Thumb asset={asset} />
                  {i === 0 && <span className="absolute left-0 top-0 border-b-2 border-r-2 border-ink bg-butter px-1.5 text-xs font-semibold">Main</span>}
                </div>
                <div className="flex border-t-2 border-ink">
                  <button type="button" className="grid h-8 flex-1 place-items-center hover:bg-blush disabled:opacity-30" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label={`Move ${asset.name} earlier`}><Icon name="ArrowLeft" size={15} /></button>
                  <button type="button" className="grid h-8 flex-1 place-items-center border-x-2 border-ink hover:bg-blush disabled:opacity-30" disabled={i === photos.length - 1} onClick={() => move(i, i + 1)} aria-label={`Move ${asset.name} later`}><Icon name="ArrowRight" size={15} /></button>
                  <button type="button" className="grid h-8 flex-1 place-items-center hover:bg-pink" onClick={() => onChange(photos.filter((p) => p.id !== asset.id))} aria-label={`Remove ${asset.name}`}><Icon name="X" size={15} /></button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
