// In-memory router: a hosted page can't change its own address.
import { useSyncExternalStore } from 'react';

let path = '/';
const listeners = new Set<() => void>();

export function navigate(href: string): void {
  const [pathname, search] = href.split('?');
  path = pathname;
  window.__memorySearch = search ?? '';
  document.scrollingElement?.scrollTo(0, 0);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePathname(): string {
  return useSyncExternalStore(subscribe, () => path);
}

const router = { push: navigate, replace: navigate, back: () => navigate('/') };
export function useRouter() {
  return router;
}

export function useParams<T>(): T {
  const current = usePathname();
  return { id: /^\/board\/([^/]+)/.exec(current)?.[1] ?? '' } as T;
}
