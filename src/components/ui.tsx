'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from './icon-data';

export function Notice({ tone = 'info', title, children, icon, action }: { tone?: 'info' | 'warn' | 'error' | 'ok'; title?: string; children: ReactNode; icon?: IconName; action?: ReactNode }) {
  const styles = { info: 'bg-mist', warn: 'bg-butter', error: 'bg-blush', ok: 'bg-[#DFF5E6]' }[tone];
  const fallback: IconName = tone === 'error' || tone === 'warn' ? 'AlertTriangle' : tone === 'ok' ? 'Check' : 'Info';
  return (
    <div className={`flex gap-3 border-2 border-ink p-3 text-sm leading-snug ${styles}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon name={icon ?? fallback} className="mt-0.5 flex-none" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        <div>{children}</div>
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}

export function Modal({ title, onClose, children, width = 'max-w-lg' }: { title: string; onClose: () => void; children: ReactNode; width?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);
  return (
    <dialog ref={ref} aria-label={title} onCancel={(e) => { e.preventDefault(); onClose(); }} className={`m-auto w-[calc(100%-2rem)] ${width} border-2 border-ink bg-white p-0 text-ink shadow-[8px_8px_0_#241B32] backdrop:bg-ink/50`}>
      <div className="flex items-center justify-between gap-3 border-b-2 border-ink bg-butter px-4 py-3">
        <h2 className="text-xl font-bold">{title}</h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="X" /></button>
      </div>
      <div className="p-4">{children}</div>
    </dialog>
  );
}

export function Spinner({ size = 18 }: { size?: number }) {
  return <Icon name="Loader" size={size} className="spin" />;
}

export function Stages({ stages, current, label }: { stages: string[]; current: number; label: string }) {
  return (
    <ol className="space-y-2" aria-label={label} aria-live="polite">
      {stages.map((stage, i) => (
        <li key={stage} className={`flex items-center gap-2 text-sm font-medium ${i > current ? 'text-ink-soft' : ''}`} aria-current={i === current ? 'step' : undefined}>
          <span className={`grid size-6 flex-none place-items-center border-2 border-ink ${i < current ? 'bg-pink' : i === current ? 'bg-butter' : 'bg-white'}`}>
            {i < current ? <Icon name="Check" size={14} /> : i === current ? <Spinner size={14} /> : null}
          </span>
          {stage}
        </li>
      ))}
    </ol>
  );
}

export function PageHeading({ title, lead, children }: { title: string; lead?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-extrabold leading-none sm:text-5xl">{title}</h1>
        {lead && <p className="mt-3 text-lg text-ink-soft">{lead}</p>}
      </div>
      {children}
    </div>
  );
}
