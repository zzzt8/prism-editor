// SnippetRepository - implements ISnippetRepository using IndexedDB
//
// Uses a SEPARATE IndexedDB ("prism-snippets") from the main app DB ("prism-editor")
// to avoid version-number conflicts between repositories. Each DB manages its own
// schema independently.

import type { SnippetFragment, SnippetSummary } from '@prism/shared-types';
import type { ISnippetRepository } from './interfaces';

const SNIPPET_DB_NAME = 'prism-snippets';
const SNIPPET_DB_VERSION = 1;
const STORE_SNIPPETS = 'snippets';

let _snippetDb: IDBDatabase | null = null;
let _snippetDbPromise: Promise<IDBDatabase> | null = null;

async function getSnippetDb(): Promise<IDBDatabase> {
  if (_snippetDb) return _snippetDb;
  if (_snippetDbPromise) return _snippetDbPromise;

  _snippetDbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(SNIPPET_DB_NAME, SNIPPET_DB_VERSION);

    req.onerror = () => reject(new Error(`[SnippetRepo] open failed: ${req.error}`));
    req.onsuccess = () => {
      _snippetDb = req.result;
      resolve(_snippetDb);
    };

    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_SNIPPETS)) {
        const store = db.createObjectStore(STORE_SNIPPETS, { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    req.onblocked = () => {
      console.warn('[SnippetRepo] DB open blocked by another tab with a higher version.');
    };
  });

  return _snippetDbPromise;
}

export class SnippetRepository implements ISnippetRepository {
  async list(): Promise<SnippetSummary[]> {
    const db = await getSnippetDb();
    const all = await this.dbGetAll<SnippetFragment>(db);
    return all.map((s) => this.toSummary(s)).sort((a, b) => a.name.localeCompare(b.name));
  }

  async get(id: string): Promise<SnippetFragment> {
    const db = await getSnippetDb();
    const fragment = await this.dbGet<SnippetFragment>(db, id);
    if (!fragment) throw new Error(`Snippet not found: ${id}`);
    return fragment;
  }

  async save(fragment: SnippetFragment): Promise<string> {
    const db = await getSnippetDb();
    await this.dbPut(db, fragment);
    return fragment.id;
  }

  async delete(id: string): Promise<void> {
    const db = await getSnippetDb();
    await this.dbDelete(db, id);
  }

  private toSummary(fragment: SnippetFragment): SnippetSummary {
    return {
      id: fragment.id,
      name: fragment.name,
      description: fragment.description,
      createdAt: fragment.createdAt,
      nodeCount: fragment.nodes.length,
      edgeCount: fragment.edges.length,
    };
  }

  private dbGet<T>(db: IDBDatabase, key: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SNIPPETS, 'readonly');
      const req = tx.objectStore(STORE_SNIPPETS).get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => reject(new Error(`[SnippetRepo] get failed: ${req.error}`));
    });
  }

  private dbGetAll<T>(db: IDBDatabase): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SNIPPETS, 'readonly');
      const req = tx.objectStore(STORE_SNIPPETS).getAll();
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => reject(new Error(`[SnippetRepo] getAll failed: ${req.error}`));
    });
  }

  private dbPut(db: IDBDatabase, value: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SNIPPETS, 'readwrite');
      const req = tx.objectStore(STORE_SNIPPETS).put(value);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(new Error(`[SnippetRepo] put failed: ${req.error}`));
    });
  }

  private dbDelete(db: IDBDatabase, key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SNIPPETS, 'readwrite');
      const req = tx.objectStore(STORE_SNIPPETS).delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(new Error(`[SnippetRepo] delete failed: ${req.error}`));
    });
  }
}
