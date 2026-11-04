'use client';

import { useState, type FormEvent } from 'react';
import { Icon } from './Icon';
import { useApp } from './Providers';
import { Notice, Spinner } from './ui';
import { searchImages, type LicensedResult } from '@/lib/api';
import { ingestRemoteBlob } from '@/lib/images/ingest';
import type { Asset } from '@/lib/scene/types';

/** Searches Openverse for public-domain images. The server re-checks each license before copying the file. */
export function ImageFinder({ initialQuery, added, onAdd }: { initialQuery: string; added: Asset[]; onAdd: (asset: Asset) => void }) {
  const { toast } = useApp();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<LicensedResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function search(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    setBusy(true);
    setError(null);
    try {
      setResults(await searchImages(query));
    } catch (failure) {
      setResults(null);
      setError(failure instanceof Error ? failure.message : 'Image search isn’t reachable right now.');
    } finally {
      setBusy(false);
    }
  }

  async function add(result: LicensedResult) {
    setAdding(result.id);
    try {
      const response = await fetch(`/api/assets/proxy?id=${result.id}`);
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'This image couldn’t be added. Pick another one.');
      }
      onAdd(await ingestRemoteBlob(await response.blob(), { name: result.title, width: result.width, height: result.height, credit: result.credit }));
    } catch (failure) {
      toast(failure instanceof Error ? failure.message : 'This image couldn’t be added.', 'error');
    } finally {
      setAdding(null);
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={search} className="flex gap-2" role="search">
        <input className="field" aria-label="Search open images" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Beach at sunset" />
        <button className="btn btn-sm flex-none" disabled={busy}>{busy ? <Spinner size={15} /> : <Icon name="Search" size={15} />}Search</button>
      </form>
      {error && <Notice tone="warn">{error}</Notice>}
      {results && results.length === 0 && <Notice>No public-domain images matched. Try a simpler word.</Notice>}
      {results && results.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {results.map((r) => {
            const done = added.some((a) => a.credit?.sourceUrl === r.credit.sourceUrl);
            return (
              <li key={r.id} className="border-2 border-ink bg-mist">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.thumbnail} alt={r.title} loading="lazy" referrerPolicy="no-referrer" className="aspect-square w-full object-cover" />
                <button type="button" className="flex min-h-9 w-full items-center justify-center gap-1 border-t-2 border-ink bg-white text-sm font-semibold hover:bg-butter disabled:opacity-50" disabled={done || adding === r.id} onClick={() => void add(r)}>
                  {adding === r.id ? <Spinner size={14} /> : <Icon name={done ? 'Check' : 'Plus'} size={14} />}{done ? 'Added' : 'Add'}
                </button>
                <p className="truncate px-1.5 py-1 text-xs" title={`${r.credit.creator}, ${r.credit.license}`}>{r.credit.license}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
