export function useRouter(): { push(href: string): void; replace(href: string): void; back(): void };
export function usePathname(): string;
export function useParams<T>(): T;
