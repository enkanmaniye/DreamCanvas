'use client';

import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { isSupabaseConfigured } from '@/lib/config';
import { CloudBoardRepository } from '@/lib/store/cloud';
import { LocalBoardRepository } from '@/lib/store/local';
import type { BoardRepository } from '@/lib/store/types';
import { getBrowserClient } from '@/lib/supabase/client';
import { Icon } from './Icon';

export interface SessionUser {
  id: string;
  email: string | null;
  displayName: string | null;
  verified: boolean;
}

interface AppContextValue {
  accountsConfigured: boolean;
  user: SessionUser | null;
  authLoading: boolean;
  repo: BoardRepository;
  getToken: () => Promise<string | null>;
  toast: (message: string, tone?: 'ok' | 'error') => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside Providers');
  return value;
}

interface Toast { id: number; message: string; tone: 'ok' | 'error' }

/** A quick color wipe on navigation. It never blocks the page and is skipped on the first load. */
function RouteWipe() {
  const pathname = usePathname();
  const first = useRef(true);
  const [key, setKey] = useState(0);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setKey((k) => k + 1);
  }, [pathname]);
  if (!key) return null;
  return <div key={key} className="route-wipe" aria-hidden="true"><i /><i /><i /></div>;
}

export function Providers({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let unsubscribe = () => {};
    let cancelled = false;
    void (async () => {
      const supabase = await getBrowserClient();
      if (!supabase || cancelled) return;
      type AuthSession = { user: { id: string; email?: string; email_confirmed_at?: string; user_metadata?: Record<string, unknown> } } | null;
      const apply = (session: AuthSession) => {
        setUser(session ? { id: session.user.id, email: session.user.email ?? null, displayName: (session.user.user_metadata?.display_name as string) ?? null, verified: Boolean(session.user.email_confirmed_at) } : null);
      };
      const { data } = await supabase.auth.getSession();
      apply(data.session);
      setAuthLoading(false);
      const { data: listener } = supabase.auth.onAuthStateChange((_event: string, session: AuthSession) => apply(session));
      unsubscribe = () => listener.subscription.unsubscribe();
    })();
    return () => { cancelled = true; unsubscribe(); };
  }, []);

  const getToken = useCallback(async () => {
    const supabase = await getBrowserClient();
    const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
    return data.session?.access_token ?? null;
  }, []);

  const toast = useCallback((message: string, tone: 'ok' | 'error' = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { id, message, tone }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), tone === 'error' ? 7000 : 3500);
  }, []);

  const repo = useMemo<BoardRepository>(() => (user ? new CloudBoardRepository(getToken) : new LocalBoardRepository()), [user, getToken]);
  const value = useMemo(() => ({ accountsConfigured: isSupabaseConfigured, user, authLoading, repo, getToken, toast }), [user, authLoading, repo, getToken, toast]);

  return (
    <AppContext.Provider value={value}>
      {children}
      <RouteWipe />
      <div className="fixed bottom-4 left-1/2 z-50 flex w-[min(92vw,26rem)] -translate-x-1/2 flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast-in flex items-start gap-2 border-2 border-ink p-3 text-sm font-medium shadow-[4px_4px_0_#241B32] ${t.tone === 'error' ? 'bg-blush' : 'bg-butter'}`}>
            <Icon name={t.tone === 'error' ? 'AlertTriangle' : 'Check'} className="mt-0.5 flex-none" />
            {t.message}
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
}
