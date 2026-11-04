'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { useApp } from './Providers';
import { Logo } from './Sticker';

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return <Link href={href} aria-current={active ? 'page' : undefined} className={`border-b-[3px] px-1 py-1 font-semibold hover:border-pink ${active ? 'border-ink' : 'border-transparent'}`}>{children}</Link>;
}

export function SiteHeader() {
  const { accountsConfigured, user, authLoading } = useApp();
  return (
    <header className="relative z-20 border-b-2 border-ink bg-cream">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" aria-label="DreamCanvas home"><Logo /></Link>
        <nav aria-label="Main" className="flex items-center gap-3 sm:gap-5">
          <NavLink href="/dashboard"><span className="hidden sm:inline">My boards</span><span className="sm:hidden">Boards</span></NavLink>
          {!accountsConfigured ? (
            <span className="hidden items-center gap-1.5 border-2 border-ink bg-butter px-2 py-1 text-sm font-semibold md:inline-flex" title="No accounts on this copy. Boards are saved in this browser only.">
              <Icon name="HardDrive" size={15} />Local demo
            </span>
          ) : authLoading ? null : user ? (
            <Link href="/settings" className="btn btn-sm"><Icon name="User" size={16} />Account</Link>
          ) : (
            <Link href="/login" className="btn btn-sm">Log in</Link>
          )}
          <Link href="/create" className="btn btn-sm btn-primary"><Icon name="Plus" size={16} />New board</Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t-2 border-ink bg-ink text-cream">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-sm sm:px-6">
        <p>Your dreams, on your screen.</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-5">
          <Link className="underline underline-offset-4" href="/create">Make a board</Link>
          <Link className="underline underline-offset-4" href="/settings">Settings</Link>
          <Link className="underline underline-offset-4" href="/privacy">Privacy and image credits</Link>
        </nav>
      </div>
    </footer>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="main" className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
