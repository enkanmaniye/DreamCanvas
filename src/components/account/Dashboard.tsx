'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { useApp } from '@/components/Providers';
import { PageShell } from '@/components/SiteChrome';
import { Sticker } from '@/components/Sticker';
import { Modal, Notice, PageHeading } from '@/components/ui';
import type { BoardSummary } from '@/lib/store/types';

function when(date: string): string {
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(date));
}

export function Dashboard() {
  const { repo, user, accountsConfigured, authLoading, toast } = useApp();
  const [boards, setBoards] = useState<BoardSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<BoardSummary | null>(null);
  const [name, setName] = useState('');
  const [deleting, setDeleting] = useState<BoardSummary | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setBoards(await repo.list());
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Your boards couldn’t be loaded.');
    }
  }, [repo]);

  useEffect(() => {
    if (!authLoading) void refresh();
  }, [authLoading, refresh]);

  async function act(action: () => Promise<unknown>, done: string) {
    try {
      await action();
      toast(done);
      await refresh();
    } catch (failure) {
      toast(failure instanceof Error ? failure.message : 'That didn’t work. Try again.', 'error');
    }
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <PageHeading title="My boards" lead={user ? 'Saved privately to your account.' : 'Saved in this browser only. Clearing your browsing data removes them.'} />
        <div className="space-y-3">
          {!user && accountsConfigured && !authLoading && (
            <Notice icon="Cloud" title="Keep boards across devices" action={<Link href="/signup" className="btn btn-sm">Create an account</Link>}>You’re in guest mode. Boards made here stay in this browser.</Notice>
          )}
          {error && <Notice tone="error" action={<button type="button" className="btn btn-sm" onClick={() => void refresh()}>Try again</button>}>{error}</Notice>}
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/create" data-testid="new-board" className="group relative flex min-h-56 flex-col justify-between overflow-hidden border-2 border-ink bg-pink p-5 shadow-[4px_4px_0_#241B32] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5">
            <Sticker name="sparkle" color="#FFE36F" className="absolute -right-6 -top-6 w-36 transition-transform duration-300 group-hover:rotate-12" />
            <Icon name="Plus" size={32} />
            <span>
              <span className="block text-3xl font-extrabold" style={{ fontFamily: 'var(--font-display)' }}>New dream board</span>
              <span className="mt-1 block">From photos, words or both.</span>
            </span>
          </Link>

          {boards === null && !error && [0, 1].map((i) => <div key={i} className="skeleton min-h-56 border-2 border-ink" />)}

          {boards?.map((board) => (
            <article key={board.id} className="panel flex flex-col shadow-[4px_4px_0_#241B32]" data-testid="board-card">
              <Link href={`/board/${board.id}`} className="checker block aspect-video overflow-hidden border-b-2 border-ink" aria-label={`Open ${board.title}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {board.thumbnail && <img src={board.thumbnail} alt="" className="size-full object-contain" />}
              </Link>
              <div className="flex items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold">{board.title}</h2>
                  <p className="text-sm text-ink-soft">Edited {when(board.updatedAt)}</p>
                </div>
                <div className="flex flex-none gap-1">
                  <button type="button" className="icon-btn" aria-label={`Rename ${board.title}`} onClick={() => { setRenaming(board); setName(board.title); }}><Icon name="Pencil" size={16} /></button>
                  <button type="button" className="icon-btn" aria-label={`Duplicate ${board.title}`} onClick={() => void act(() => repo.duplicate(board.id), 'Board duplicated.')}><Icon name="Copy" size={16} /></button>
                  <button type="button" className="icon-btn" aria-label={`Delete ${board.title}`} onClick={() => setDeleting(board)}><Icon name="Trash" size={16} /></button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {boards?.length === 0 && <p className="mt-6 max-w-md text-ink-soft">No boards yet. Your first one takes a couple of minutes, and you don’t need any photos to start.</p>}
      </div>

      {renaming && (
        <Modal title="Rename board" onClose={() => setRenaming(null)}>
          <form onSubmit={(e) => { e.preventDefault(); const target = renaming; setRenaming(null); void act(() => repo.rename(target.id, name.trim()), 'Board renamed.'); }} className="space-y-4">
            <div>
              <label className="field-label" htmlFor="rename">Board name</label>
              <input id="rename" className="field" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <button className="btn btn-primary" disabled={!name.trim()}>Rename board</button>
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal title="Delete this board?" onClose={() => setDeleting(null)}>
          <p>“{deleting.title}” and the photos only it uses will be removed. This can’t be undone.</p>
          <div className="mt-4 flex gap-3">
            <button type="button" className="btn btn-primary" onClick={() => { const target = deleting; setDeleting(null); void act(() => repo.remove(target.id), 'Board deleted.'); }}><Icon name="Trash" />Delete board</button>
            <button type="button" className="btn" onClick={() => setDeleting(null)}>Keep board</button>
          </div>
        </Modal>
      )}
    </PageShell>
  );
}
