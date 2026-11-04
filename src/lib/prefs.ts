const KEY = 'dreamcanvas.export.default';

export function readDefaultExport(): string {
  try {
    return window.localStorage.getItem(KEY) ?? 'uhd';
  } catch {
    return 'uhd';
  }
}

export function writeDefaultExport(id: string): void {
  try {
    window.localStorage.setItem(KEY, id);
  } catch {
    // The choice just won't persist in this browser.
  }
}
