import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import { MAX_FILE_BYTES, STORAGE_BUCKET } from '@/lib/config';
import { checkFileMeta, sniffImageType } from '@/lib/images/validate';
import { json, problem, rateLimit, tooLarge } from '@/lib/server/http';
import { requireUser } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const context = await requireUser(request);
  if (context instanceof Response) return context;
  if (tooLarge(request, MAX_FILE_BYTES + 4096)) return problem(413, 'That image is over the 10 MB limit.');
  if (!rateLimit(`upload:${context.user.id}`, 200, 60 * 60 * 1000)) return problem(429, 'You’ve reached the hourly upload limit. Try again later.', 'rate_limited');

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return problem(400, 'No image was attached.');
  const metaProblem = checkFileMeta(file.name, file.type, file.size);
  if (metaProblem) return problem(415, 'Upload a JPG, PNG or WebP image under 10 MB.', metaProblem);

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!sniffImageType(bytes)) return problem(415, 'That file isn’t a real image.', 'mismatch');

  // Decoding and re-encoding proves the image is valid and removes EXIF data such as GPS location.
  let output: Buffer;
  let width = 0;
  let height = 0;
  try {
    const { default: sharp } = await import('sharp');
    const result = await sharp(bytes, { limitInputPixels: 80_000_000 }).rotate().resize({ width: 3840, height: 3840, fit: 'inside', withoutEnlargement: true }).webp({ quality: 90 }).toBuffer({ resolveWithObject: true });
    output = result.data;
    width = result.info.width;
    height = result.info.height;
  } catch {
    return problem(415, 'That image is damaged and couldn’t be read.', 'decode_failed');
  }

  const path = `${context.user.id}/uploads/${randomUUID()}.webp`;
  const { error } = await context.db.storage.from(STORAGE_BUCKET).upload(path, output, { contentType: 'image/webp' });
  if (error) return problem(507, 'Your storage is full or unavailable. Delete an old board and try again.', 'storage_failed');
  return json({ path, src: `/api/assets/file?path=${encodeURIComponent(path)}`, width, height }, 201);
}
