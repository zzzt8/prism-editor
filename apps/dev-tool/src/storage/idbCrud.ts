// IndexedDB CRUD primitives — split from IndexedDBStorageAdapter.ts (lines 22-112).
// These are the low-level getDb / getStore / getAll / get / put / remove primitives.
// All store names and DB config come from indexedDbConstants.

export type DbGetter = () => Promise<IDBDatabase>;

export async function idbGetDb(): Promise<IDBDatabase> {
  // NOTE: The actual DB open logic stays in IndexedDBStorageAdapter.ts to keep
  // the onupgradeneeded handler (schema migration) centralized.
  // Callers must set up the adapter first.
  throw new Error('idbGetDb: call setIdbCrudAdapter(getDb) first');
}

let _getDb: DbGetter = idbGetDb;
export function setIdbCrudAdapter(getDb: DbGetter): void {
  _getDb = getDb;
}

async function getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
  const db = await _getDb();
  const transaction = db.transaction(storeName, mode);
  return transaction.objectStore(storeName);
}

export async function idbGetAll<T>(storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    getStore(storeName).then((store) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(new Error(`Failed to getAll from ${storeName}`));
    }).catch(reject);
  });
}

export async function idbGet<T>(storeName: string, key: string): Promise<T | null> {
  return new Promise((resolve, reject) => {
    getStore(storeName).then((store) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result as T | null);
      request.onerror = () => reject(new Error(`Failed to get ${key} from ${storeName}`));
    }).catch(reject);
  });
}

export async function idbPut(storeName: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    getStore(storeName, 'readwrite').then((store) => {
      const request = store.put(value);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to put into ${storeName}`));
    }).catch(reject);
  });
}

export async function idbRemove(storeName: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    getStore(storeName, 'readwrite').then((store) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to delete ${key} from ${storeName}`));
    }).catch(reject);
  });
}
