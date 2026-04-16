// SnippetRepository - implements ISnippetRepository using dedicated IndexedDB store
// Dedicated store (snippets) per design decision: SnippetFragment is NOT a template alias.

import type { SnippetFragment, SnippetSummary } from '@prism/shared-types';
import type { ISnippetRepository } from './interfaces';

const DB_NAME = 'prism-editor';
const DB_VERSION = 4; // Bump to add snippets store
const STORE_SNIPPETS = 'snippets';

export class SnippetRepository implements ISnippetRepository {
  private db: IDBDatabase | null = null;
  private dbInitPromise: Promise<IDBDatabase> | null = null;

  private async getDb(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    if (this.dbInitPromise) return this.dbInitPromise;

    this.dbInitPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(new Error(`Failed to open IndexedDB: ${request.error}`));

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORE_SNIPPETS)) {
          const store = db.createObjectStore(STORE_SNIPPETS, { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });

    return this.dbInitPromise;
  }

  private async dbGet<T>(key: string): Promise<T | null> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SNIPPETS, 'readonly');
      const store = tx.objectStore(STORE_SNIPPETS);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => reject(new Error(`Failed to get snippet: ${key}`));
    });
  }

  private async dbGetAll<T>(): Promise<T[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SNIPPETS, 'readonly');
      const store = tx.objectStore(STORE_SNIPPETS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => reject(new Error(`Failed to getAll snippets`));
    });
  }

  private async dbPut(value: unknown): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SNIPPETS, 'readwrite');
      const store = tx.objectStore(STORE_SNIPPETS);
      const req = store.put(value);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(new Error(`Failed to put snippet`));
    });
  }

  private async dbRemove(key: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SNIPPETS, 'readwrite');
      const store = tx.objectStore(STORE_SNIPPETS);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(new Error(`Failed to delete snippet: ${key}`));
    });
  }

  async list(): Promise<SnippetSummary[]> {
    const snippets = await this.dbGetAll<SnippetFragment>();
    return snippets
      .map((s) => this.toSummary(s))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async get(id: string): Promise<SnippetFragment> {
    const snippet = await this.dbGet<SnippetFragment>(id);
    if (!snippet) throw new Error(`Snippet not found: ${id}`);
    return snippet;
  }

  async save(fragment: SnippetFragment): Promise<string> {
    await this.dbPut(fragment);
    return fragment.id;
  }

  async delete(id: string): Promise<void> {
    await this.dbRemove(id);
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
}
