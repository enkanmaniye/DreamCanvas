import { createElement, type ReactNode } from 'react';
import { navigate } from './next-navigation';

export default function Link({ href, children, ...rest }: { href: string; children?: ReactNode; [key: string]: unknown }) {
  return createElement('a', { href, ...rest, onClick: (event: MouseEvent) => {
    if (event.metaKey || event.ctrlKey) return;
    event.preventDefault();
    navigate(href);
  } }, children);
}
