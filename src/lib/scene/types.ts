export const SCENE_VERSION = 1;

export type PaletteRole = 'ink' | 'paper' | 'primary' | 'secondary' | 'accent' | 'deep';
export type TemplateId = 'editorial-grid' | 'gallery-wall' | 'modern-scrapbook' | 'minimal-focus' | 'dream-magazine';
export type FontKey = 'bricolage' | 'space-grotesk' | 'dm-sans' | 'instrument-serif' | 'caveat';
export type FrameStyle = 'none' | 'outline' | 'mat' | 'polaroid';
export type TextRole = 'title' | 'quote' | 'caption';

export interface Credit {
  title: string;
  creator: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
}

/** An image the board may use. `src` is `/demo/...`, `idb:<key>` or an authenticated `/api/assets/file` path. */
export interface Asset {
  id: string;
  kind: 'upload' | 'demo' | 'openverse' | 'generated';
  src: string;
  name: string;
  width: number;
  height: number;
  /** Most visually busy point of the image, 0–1. Crops stay centred on it. */
  focus: { x: number; y: number };
  credit?: Credit;
}

interface ObjectBase {
  id: string;
  name: string;
  /** Top-left corner before rotation, in scene units. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Degrees, clockwise, around the object's centre. */
  rotation: number;
  opacity: number;
  locked?: boolean;
}

export interface ImageObject extends ObjectBase {
  type: 'image';
  assetId: string;
  crop: { focusX: number; focusY: number; zoom: number };
  frame: { style: FrameStyle; color: string; colorRole?: PaletteRole; stroke: string; strokeWidth: number; shadow: boolean };
}

export interface TextObject extends ObjectBase {
  type: 'text';
  role: TextRole;
  text: string;
  font: FontKey;
  size: number;
  weight: number;
  italic: boolean;
  color: string;
  colorRole?: PaletteRole;
  align: 'left' | 'center' | 'right';
  lineHeight: number;
  background: string | null;
  backgroundRole?: PaletteRole;
  padding: number;
  outline?: boolean;
}

export interface StickerObject extends ObjectBase {
  type: 'sticker';
  sticker: string;
  color: string;
  colorRole?: PaletteRole;
  accent: string;
  accentRole?: PaletteRole;
}

export interface ShapeObject extends ObjectBase {
  type: 'shape';
  fill: string;
  fillRole?: PaletteRole;
  stroke: string | null;
  strokeWidth: number;
  shadow: boolean;
}

export type SceneObject = ImageObject | TextObject | StickerObject | ShapeObject;

export interface SceneBackground {
  kind: 'solid' | 'mesh' | 'tiles';
  base: string;
  colors: string[];
  seed: number;
}

export interface Scene {
  version: number;
  width: number;
  height: number;
  background: SceneBackground;
  objects: SceneObject[];
  meta: {
    title: string;
    templateId: TemplateId;
    paletteId: string;
    fontPairId: string;
    seed: number;
  };
}

export interface Palette {
  id: string;
  name: string;
  paper: string;
  ink: string;
  primary: string;
  secondary: string;
  accent: string;
  deep: string;
}

export interface ExportSize {
  id: string;
  label: string;
  width: number;
  height: number;
}

export const EXPORT_SIZES: ExportSize[] = [
  { id: 'fhd', label: 'Full HD', width: 1920, height: 1080 },
  { id: 'qhd', label: 'QHD', width: 2560, height: 1440 },
  { id: 'uhd', label: '4K', width: 3840, height: 2160 },
  { id: 'portrait', label: 'Phone', width: 1080, height: 1920 },
];

export type BoardShape = 'landscape' | 'portrait';

export const BASE_SIZE: Record<BoardShape, { width: number; height: number }> = {
  landscape: { width: 1920, height: 1080 },
  portrait: { width: 1080, height: 1920 },
};
