import type {
  ProductTemplate,
  ProductTemplateSummary,
  ProductTemplateSummaryMetadata,
} from '@prism/shared-types';
import type { IProductTemplateRepository } from './interfaces';

const DB_NAME = 'prism-editor';
const DB_VERSION = 4;
const STORE_PRODUCT_TEMPLATES = 'productTemplates';

interface ProductTemplateRecord extends ProductTemplate {
  summary: ProductTemplateSummary;
}

function toSummary(template: ProductTemplate): ProductTemplateSummary {
  const metadata: ProductTemplateSummaryMetadata = {
    inputCount: template.inputs.length,
    designParamCount: template.designParams.length,
    assetCount: template.assets.length,
    publishedWorkflowId: template.publishState?.publishedWorkflowId,
    lastPublishedAt: template.publishState?.publishedAt,
  };

  return {
    id: template.id,
    name: template.name,
    description: template.description,
    version: template.version,
    updatedAt: template.updatedAt ?? new Date().toISOString(),
    createdAt: template.createdAt ?? new Date().toISOString(),
    metadata,
  };
}

function normalizeTemplate(template: ProductTemplate): ProductTemplateRecord {
  const now = new Date().toISOString();
  const createdAt = template.createdAt ?? now;
  const updatedAt = now;

  const normalized: ProductTemplate = {
    ...template,
    description: template.description?.trim() || undefined,
    createdAt,
    updatedAt,
  };

  return {
    ...normalized,
    summary: toSummary(normalized),
  };
}

export class ProductTemplateRepository implements IProductTemplateRepository {
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
        if (!db.objectStoreNames.contains(STORE_PRODUCT_TEMPLATES)) {
          const store = db.createObjectStore(STORE_PRODUCT_TEMPLATES, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
          store.createIndex('name', 'name', { unique: false });
        }
      };
    });

    return this.dbInitPromise;
  }

  private async getStore(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    const db = await this.getDb();
    return db.transaction(STORE_PRODUCT_TEMPLATES, mode).objectStore(STORE_PRODUCT_TEMPLATES);
  }

  async save(template: ProductTemplate): Promise<ProductTemplate> {
    const record = normalizeTemplate(template);
    const store = await this.getStore('readwrite');

    await new Promise<void>((resolve, reject) => {
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save product template'));
    });

    return record;
  }

  async load(id: string): Promise<ProductTemplate> {
    const store = await this.getStore('readonly');

    const record = await new Promise<ProductTemplateRecord | undefined>((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result as ProductTemplateRecord | undefined);
      request.onerror = () => reject(new Error(`Failed to load product template: ${id}`));
    });

    if (!record) {
      throw new Error(`Product template not found: ${id}`);
    }

    const { summary: _summary, ...template } = record;
    return template;
  }

  async list(): Promise<ProductTemplateSummary[]> {
    const store = await this.getStore('readonly');

    const records = await new Promise<ProductTemplateRecord[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve((request.result as ProductTemplateRecord[]) ?? []);
      request.onerror = () => reject(new Error('Failed to list product templates'));
    });

    return records
      .map((record) => record.summary ?? toSummary(record))
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
  }

  async delete(id: string): Promise<void> {
    const store = await this.getStore('readwrite');

    await new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to delete product template: ${id}`));
    });
  }
}
