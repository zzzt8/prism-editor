// TemplateVersionRepository - implements ITemplateVersionRepository using dedicated IndexedDB store
// Dedicated store (template_versions) per design decision 1: Template is NOT a workflow alias.

import type { Template } from '@prism/shared-types';
import type { ITemplateVersionRepository, TemplateVersion } from './interfaces';

const DB_NAME = 'prism-editor';
const DB_VERSION = 4; // Bump to add template_versions store
const STORE_TEMPLATE_VERSIONS = 'template_versions';

interface IndexedDBVersion {
  id: string;
  templateId: string;
  version: string;
  content: string;
  createdBy: string | null;
  createdAt: string;
}

export class TemplateVersionRepository implements ITemplateVersionRepository {
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

        if (!db.objectStoreNames.contains(STORE_TEMPLATE_VERSIONS)) {
          const store = db.createObjectStore(STORE_TEMPLATE_VERSIONS, { keyPath: 'id' });
          store.createIndex('templateId', 'templateId', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });

    return this.dbInitPromise;
  }

  private async dbGet<T>(key: string): Promise<T | null> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_TEMPLATE_VERSIONS, 'readonly');
      const store = tx.objectStore(STORE_TEMPLATE_VERSIONS);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => reject(new Error(`Failed to get template version: ${key}`));
    });
  }

  private async dbGetAllByIndex(indexName: string, key: IDBValidKey): Promise<IndexedDBVersion[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_TEMPLATE_VERSIONS, 'readonly');
      const store = tx.objectStore(STORE_TEMPLATE_VERSIONS);
      const index = store.index(indexName);
      const req = index.getAll(key);
      req.onsuccess = () => resolve(req.result as IndexedDBVersion[]);
      req.onerror = () => reject(new Error(`Failed to get template versions by index`));
    });
  }

  private async dbPut(value: IndexedDBVersion): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_TEMPLATE_VERSIONS, 'readwrite');
      const store = tx.objectStore(STORE_TEMPLATE_VERSIONS);
      const req = store.put(value);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(new Error(`Failed to put template version`));
    });
  }

  private async dbRemove(key: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_TEMPLATE_VERSIONS, 'readwrite');
      const store = tx.objectStore(STORE_TEMPLATE_VERSIONS);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(new Error(`Failed to delete template version: ${key}`));
    });
  }

  private toTemplateVersion(v: IndexedDBVersion): TemplateVersion {
    return {
      id: v.id,
      version: v.version,
      createdBy: v.createdBy,
      createdAt: v.createdAt,
    };
  }

  async list(templateId: string): Promise<TemplateVersion[]> {
    const versions = await this.dbGetAllByIndex('templateId', templateId);
    return versions
      .map((v) => this.toTemplateVersion(v))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async get(templateId: string, versionId: string): Promise<Template> {
    const record = await this.dbGet<IndexedDBVersion>(versionId);
    if (!record) throw new Error(`Template version not found: ${versionId}`);
    if (record.templateId !== templateId) throw new Error(`Version ${versionId} does not belong to template ${templateId}`);
    return JSON.parse(record.content) as Template;
  }

  async create(templateId: string, content: Template): Promise<TemplateVersion> {
    const id = createId();
    const record: IndexedDBVersion = {
      id,
      templateId,
      version: content.version,
      content: JSON.stringify(content),
      createdBy: null,
      createdAt: new Date().toISOString(),
    };
    await this.dbPut(record);
    return this.toTemplateVersion(record);
  }

  async rollback(templateId: string, versionId: string): Promise<Template> {
    const version = await this.get(templateId, versionId);

    // Create a new version record for the rollback snapshot (before overwriting)
    await this.create(templateId, version);

    return version;
  }
}
