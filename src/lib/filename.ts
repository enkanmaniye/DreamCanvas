export function sanitizeFilename(title: string): string {
  const slug = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
  return slug || 'wallpaper';
}

export function exportFilename(title: string, width: number, height: number, ext: 'png' | 'jpg'): string {
  return `dreamcanvas-${sanitizeFilename(title)}-${width}x${height}.${ext}`;
}
