'use client';

import type { ReactNode } from 'react';

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="space-y-2.5 border-b-2 border-ink p-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** `onLive` fires while dragging and `onDone` once on release, so one drag is one undo step. */
export function Slider({ label, value, min, max, step, format, onLive, onDone }: { label: string; value: number; min: number; max: number; step: number; format?: (v: number) => string; onLive: (v: number) => void; onDone: () => void }) {
  return (
    <label className="block text-sm font-medium">
      <span className="flex justify-between"><span>{label}</span><span className="text-ink-soft">{format ? format(value) : Math.round(value)}</span></span>
      <input type="range" className="mt-1 w-full accent-violet-700" min={min} max={max} step={step} value={value} onChange={(e) => onLive(Number(e.target.value))} onPointerUp={onDone} onKeyUp={onDone} />
    </label>
  );
}

export function ColorField({ label, value, swatches, onPick }: { label: string; value: string; swatches: string[]; onPick: (color: string) => void }) {
  return (
    <div>
      <p className="mb-1 text-sm font-medium">{label}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {[...new Set(swatches)].map((color) => (
          <button key={color} type="button" className="size-8 border-2 border-ink" style={{ background: color, outline: color.toLowerCase() === value.toLowerCase() ? '3px solid #6F4DCE' : undefined, outlineOffset: 1 }} aria-label={`Use color ${color}`} aria-pressed={color.toLowerCase() === value.toLowerCase()} onClick={() => onPick(color)} />
        ))}
        <input type="color" aria-label={`${label}: custom color`} className="h-8 w-10 cursor-pointer border-2 border-ink bg-white p-0" value={value} onChange={(e) => onPick(e.target.value)} />
      </div>
    </div>
  );
}
