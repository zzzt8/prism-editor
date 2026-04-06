// PublishRepository - implements IPublishRepository using IndexedDB
// Phase 1: Stores published workflows in local IndexedDB, no API calls

import type { PublishedWorkflow } from '@prism/shared-types';
import type { IPublishRepository, PublishedWorkflowMeta } from './interfaces';

const DB_NAME = 'prism-editor-published';
const DB_VERSION = 1;
const STORE_PUBLISHED = 'published';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_PUBLISHED)) {
        const store = db.createObjectStore(STORE_PUBLISHED, { keyPath: 'sourceId' });
        store.createIndex('publishedAt', 'publishedAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class PublishRepository implements IPublishRepository {
  async publish(workflowId: string, published: PublishedWorkflow): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PUBLISHED, 'readwrite');
      const store = tx.objectStore(STORE_PUBLISHED);
      const record: PublishedWorkflow = { ...published, sourceId: workflowId };
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  }

  async unpublish(workflowId: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PUBLISHED, 'readwrite');
      const store = tx.objectStore(STORE_PUBLISHED);
      const request = store.delete(workflowId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  }

  async getPublished(sourceId: string): Promise<PublishedWorkflow | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PUBLISHED, 'readonly');
      const store = tx.objectStore(STORE_PUBLISHED);
      const request = store.get(sourceId);
      request.onsuccess = () => resolve((request.result as PublishedWorkflow) ?? null);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  }

  async listPublished(): Promise<PublishedWorkflowMeta[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PUBLISHED, 'readonly');
      const store = tx.objectStore(STORE_PUBLISHED);
      const request = store.getAll();
      request.onsuccess = () => {
        const results: PublishedWorkflowMeta[] = (request.result as PublishedWorkflow[]).map((w) => ({
          sourceId: w.sourceId,
          name: w.name,
          description: w.description,
          sourceName: w.sourceName,
          version: w.version,
          publishedAt: w.publishedAt,
          inputCount: w.config?.inputs?.length ?? w.inputs?.length ?? 0,
          outputCount: w.config?.outputs?.length ?? w.outputs?.length ?? 0,
        }));
        results.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
        resolve(results);
      };
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  }
}
