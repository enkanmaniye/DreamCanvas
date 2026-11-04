const DB_NAME = 'dreamcanvas';
const DB_VERSION = 1;
export type StoreName = 'boards' | 'blobs' | 'drafts';

let opening: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (!opening) {
    opening = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('This browser can’t save locally. Private windows often block it.'));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        for (const name of ['boards', 'blobs', 'drafts']) {
          if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        opening = null;
        reject(new Error('This browser blocked local storage, so nothing can be saved here.'));
      };
    });
  }
  return opening;
}

function run<T>(store: StoreName, mode: IDBTransactionMode, action: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then((db) => new Promise<T>((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const request = action(tx.objectStore(store));
    tx.oncomplete = () => resolve(request.result);
    const fail = () => {
      const quota = tx.error?.name === 'QuotaExceededError' || request.error?.name === 'QuotaExceededError';
      reject(new Error(quota ? 'This browser’s storage is full. Delete an old board or some photos and try again.' : 'Saving to this browser failed. Try again.'));
    };
    tx.onerror = fail;
    tx.onabort = fail;
  }));
}

export const idbGet = <T>(store: StoreName, key: string) => run<T | undefined>(store, 'readonly', (s) => s.get(key));
export const idbPut = (store: StoreName, key: string, value: unknown) => run(store, 'readwrite', (s) => s.put(value, key));
export const idbDelete = (store: StoreName, key: string) => run(store, 'readwrite', (s) => s.delete(key));
export const idbAll = <T>(store: StoreName) => run<T[]>(store, 'readonly', (s) => s.getAll());
export const idbKeys = (store: StoreName) => run<IDBValidKey[]>(store, 'readonly', (s) => s.getAllKeys());
export const idbClear = (store: StoreName) => run(store, 'readwrite', (s) => s.clear());
