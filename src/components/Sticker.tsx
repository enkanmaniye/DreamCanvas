import { getSticker, type StickerPart } from '@/lib/scene/stickers';

function paint(value: StickerPart['fill'], color: string, accent: string): string {
  switch (value) {
    case 'color': return color;
    case 'accent': return accent;
    case 'paper': return '#FFFFFF';
    case 'ink': return '#241B32';
    default: return 'none';
  }
}

export function Sticker({ name, color = '#FF72B5', accent = '#FFE36F', className, style, title }: { name: string; color?: string; accent?: string; className?: string; style?: React.CSSProperties; title?: string }) {
  const def = getSticker(name);
  if (!def) return null;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={className} style={{ aspectRatio: String(def.aspect), ...style }} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {def.parts.map((part, i) => (
        <path key={i} d={part.d} fill={paint(part.fill, color, accent)} stroke={paint(part.stroke, color, accent)} strokeWidth={part.width ?? 2} strokeDasharray={part.dash?.join(' ')} strokeLinecap="round" strokeLinejoin="round" opacity={part.opacity} />
      ))}
    </svg>
  );
}

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display text-xl font-extrabold tracking-tight ${className}`} style={{ fontFamily: 'var(--font-display)' }}>
      <span className="grid size-8 place-items-center border-2 border-ink bg-pink" aria-hidden="true">
        <svg viewBox="0 0 100 100" className="size-5"><path d="M50 3C53 33 67 47 97 50C67 53 53 67 50 97C47 67 33 53 3 50C33 47 47 33 50 3Z" fill="#FFE36F" stroke="#241B32" strokeWidth="6" /></svg>
      </span>
      DreamCanvas
    </span>
  );
}
