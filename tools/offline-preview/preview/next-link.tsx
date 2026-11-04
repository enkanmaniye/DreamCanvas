import { createElement, type ReactNode } from 'react';
import { navigate } from './next-navigation';

export default function Link({ href, children, ...rest }: { href: string; children?: ReactNode; [key: string]: unknown }) {
  return createElement('a', { href: `#${href.replace(/[^a-z0-9]/gi, '-')}`, ...rest, onClick: (event: MouseEvent) => { event.preventDefault(); navigate(href); } }, children);
}
