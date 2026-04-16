// TemplateRepository - implements ITemplateRepository using dedicated IndexedDB store
// Dedicated store (templates) per design decision 1: Template is NOT a workflow alias.

import type { Template, TemplateSummary } from '@prism/shared-types';
import type { ITemplateRepository } from './interfaces';

const DB_NAME = 'prism-editor';
const DB_VERSION = 3; // Bump to add templates store
const STORE_TEMPLATES = 'templates';

export class TemplateRepository implements ITemplateRepository {
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

        // Templates store - independent from workflows store
        if (!db.objectStoreNames.contains(STORE_TEMPLATES)) {
          const store = db.createObjectStore(STORE_TEMPLATES, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
          store.createIndex('name', 'name', { unique: false });
        }
      };
    });

    return this.dbInitPromise;
  }

  private async get<T>(key: string): Promise<T | null> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_TEMPLATES, 'readonly');
      const store = tx.objectStore(STORE_TEMPLATES);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => reject(new Error(`Failed to get template: ${key}`));
    });
  }

  private async getAll<T>(): Promise<T[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_TEMPLATES, 'readonly');
      const store = tx.objectStore(STORE_TEMPLATES);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => reject(new Error(`Failed to getAll templates`));
    });
  }

  private async put(value: unknown): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_TEMPLATES, 'readwrite');
      const store = tx.objectStore(STORE_TEMPLATES);
      const req = store.put(value);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(new Error(`Failed to put template`));
    });
  }

  private async remove(key: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_TEMPLATES, 'readwrite');
      const store = tx.objectStore(STORE_TEMPLATES);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(new Error(`Failed to delete template: ${key}`));
    });
  }

  async list(): Promise<TemplateSummary[]> {
    const templates = await this.getAll<Template>();
    return templates
      .map((t) => this.toSummary(t))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async get(id: string): Promise<Template> {
    const template = await this.get<Template>(id);
    if (!template) throw new Error(`Template not found: ${id}`);
    return template;
  }

  async save(template: Template): Promise<void> {
    await this.put(template);
  }

  async delete(id: string): Promise<void> {
    await this.remove(id);
  }

  async exists(id: string): Promise<boolean> {
    const t = await this.get<Template>(id);
    return t !== null;
  }

  private toSummary(template: Template): TemplateSummary {
    return {
      id: template.id,
      name: template.name,
      version: template.version,
      metadata: template.metadata,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      nodeCount: template.nodes.length,
      edgeCount: template.edges.length,
    };
  }
}
