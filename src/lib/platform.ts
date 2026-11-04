/**
 * The few things that differ between the full Next.js app and the single-file hosted preview.
 * tools/offline-preview/preview/platform.ts replaces this file in the preview build.
 */
export function demoUrl(path: string): string {
  return path;
}

export function queryParam(name: string): string | null {
  return new URLSearchParams(window.location.search).get(name);
}

export async function saveFile(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
