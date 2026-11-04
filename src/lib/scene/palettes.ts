import type { Palette, PaletteRole } from './types';

/** Names and hex values extend the PRD tokens with colours taken from the references folder. */
export const PALETTES: Palette[] = [
  { id: 'dream-pop', name: 'Dream pop', paper: '#FFF9F1', ink: '#241B32', primary: '#FF72B5', secondary: '#FFE36F', accent: '#BEA4FF', deep: '#6F4DCE' },
  { id: 'lilac-hour', name: 'Lilac hour', paper: '#F6F0FF', ink: '#241B32', primary: '#A77BFF', secondary: '#FFB9D1', accent: '#DCCEFF', deep: '#5B34C9' },
  { id: 'butter-sun', name: 'Butter sun', paper: '#FFF6D6', ink: '#2E1F2B', primary: '#FFC933', secondary: '#FF8FA3', accent: '#FFE36F', deep: '#D9437F' },
  { id: 'fuchsia-veil', name: 'Fuchsia veil', paper: '#F2E5F8', ink: '#2A1530', primary: '#CE4A8E', secondary: '#CD81FF', accent: '#BEDCFF', deep: '#8E2A66' },
  { id: 'froly-record', name: 'Froly record', paper: '#FFE6EF', ink: '#3A1622', primary: '#FC7785', secondary: '#FFB9D1', accent: '#FFE36F', deep: '#C93A55' },
  { id: 'petal-lagoon', name: 'Petal lagoon', paper: '#F3F6EF', ink: '#1F2E2C', primary: '#F58DA0', secondary: '#F6C28B', accent: '#8FBDB0', deep: '#3F7A72' },
];

export function getPalette(id: string): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}

export function roleColor(palette: Palette, role: PaletteRole): string {
  return palette[role];
}

const HEX = /^#[0-9a-f]{6}$/i;

function channels(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(rgb: [number, number, number]): string {
  return `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

export function mix(a: string, b: string, t: number): string {
  const ca = channels(a);
  const cb = channels(b);
  return toHex([ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t, ca[2] + (cb[2] - ca[2]) * t]);
}

export function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** The palette's ink or paper, whichever reads better on `background`. */
export function readableOn(background: string, palette: Palette): PaletteRole {
  return contrastRatio(background, palette.ink) >= contrastRatio(background, palette.paper) ? 'ink' : 'paper';
}

/** Turns colours suggested by AI into a full palette, keeping dark ink and pale paper so text stays readable. */
export function paletteFromColors(colors: string[]): Palette {
  const clean = colors.filter((c) => HEX.test(c)).map((c) => c.toUpperCase());
  const base = PALETTES[0];
  const primary = clean[0] ?? base.primary;
  const secondary = clean[1] ?? base.secondary;
  const accent = clean[2] ?? base.accent;
  return {
    id: 'custom',
    name: 'Suggested colors',
    paper: mix(primary, '#FFFFFF', 0.92),
    ink: base.ink,
    primary,
    secondary,
    accent,
    deep: mix(primary, base.ink, 0.45),
  };
}

export function isHexColor(value: string): boolean {
  return HEX.test(value);
}
