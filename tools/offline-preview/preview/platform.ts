// Hosted preview version of src/lib/platform.ts. Art is embedded, and files save through the host's confirmation.
declare const __DEMO_IMAGES__: Record<string, string>;

declare global {
  interface Window {
    claude?: { use(name: string): Promise<{ save(input: { filename: string; data: Blob }): Promise<unknown> } | null> };
    __memorySearch?: string;
  }
}

export function demoUrl(path: string): string {
  return __DEMO_IMAGES__[path] ?? path;
}

export function queryParam(name: string): string | null {
  return new URLSearchParams(window.__memorySearch ?? '').get(name);
}

export async function saveFile(blob: Blob, filename: string): Promise<void> {
  const downloads = await window.claude?.use('downloads');
  if (downloads) {
    try {
      await downloads.save({ filename, data: blob });
    } catch (failure) {
      const code = (failure as { code?: string }).code;
      throw new Error(code === 'declined' ? 'The download was cancelled.' : 'The download didn’t go through. Try again.');
    }
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
