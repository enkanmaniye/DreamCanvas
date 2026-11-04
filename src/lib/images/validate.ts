import { MAX_FILE_BYTES, MAX_PHOTOS } from '../config';

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const ACCEPTED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

export type ImageProblem = 'too-large' | 'heic' | 'unsupported' | 'empty' | 'mismatch';

export function checkFileMeta(name: string, type: string, size: number): ImageProblem | null {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'heic' || ext === 'heif' || type === 'image/heic' || type === 'image/heif') return 'heic';
  if (size === 0) return 'empty';
  if (size > MAX_FILE_BYTES) return 'too-large';
  if (!ACCEPTED_EXTENSIONS.includes(ext)) return 'unsupported';
  if (type && !(ACCEPTED_TYPES as readonly string[]).includes(type)) return 'unsupported';
  return null;
}

/** Reads the file's first bytes. A renamed script or a fake .jpg fails here whatever its extension says. */
export function sniffImageType(bytes: Uint8Array): (typeof ACCEPTED_TYPES)[number] | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)) return 'image/png';
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp';
  return null;
}

export function problemMessage(problem: ImageProblem, name: string): string {
  switch (problem) {
    case 'heic': return `${name} is a HEIC photo, which browsers can’t read. Export it as JPG, or set your iPhone camera to Most Compatible.`;
    case 'too-large': return `${name} is over the 10 MB limit. Export a smaller copy and add it again.`;
    case 'empty': return `${name} is an empty file.`;
    case 'mismatch': return `${name} isn’t a real JPG, PNG or WebP image, even though its name says it is.`;
    default: return `${name} isn’t a JPG, PNG or WebP image.`;
  }
}

export function remainingSlots(current: number): number {
  return Math.max(0, MAX_PHOTOS - current);
}
