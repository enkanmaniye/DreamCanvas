import { useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
if (typeof window !== 'undefined') window.addEventListener('popstate', notify);

export function navigate(href: string): void {
  window.history.pushState(null, '', href);
  window.scrollTo(0, 0);
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useLocationKey(): string {
  return useSyncExternalStore(subscribe, () => window.location.pathname + window.location.search);
}

export function usePathname(): string {
  return useSyncExternalStore(subscribe, () => window.location.pathname);
}

const router = { push: navigate, replace: navigate, back: () => window.history.back() };
export function useRouter() {
  return router;
}

export function useParams<T>(): T {
  const path = usePathname();
  const match = /^\/board\/([^/]+)/.exec(path);
  return { id: match?.[1] ?? '' } as T;
}
