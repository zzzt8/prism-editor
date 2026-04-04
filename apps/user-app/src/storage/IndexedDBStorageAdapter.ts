/**
 * IndexedDB storage adapter for user-app published workflows.
 * Provides offline-first storage without requiring a backend API server.
 */

import type { PublishedWorkflow } from '@prism/shared-types';
import type { ValidatedPublishedWorkflow } from '../utils/workflowImport';

const DB_NAME = 'prism-user-app';
const DB_VERSION = 1;
const STORE_NAME = 'published-workflows';

export interface PublishedWorkflowMeta {
  sourceId: string;
  name: string;
  description?: string;
  sourceName: string;
  version: string;
  publishedAt: string;
  inputCount: number;
  outputCount: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'sourceId' });
        store.createIndex('publishedAt', 'publishedAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class IndexedDBStorageAdapter {
  async listPublished(): Promise<PublishedWorkflowMeta[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        console.log('[IndexedDB] listPublished results:', request.result);
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

  async loadPublished(sourceId: string): Promise<PublishedWorkflow> {
    console.log('[IndexedDB] loadPublished sourceId:', sourceId);
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(sourceId);

      request.onsuccess = () => {
        const result = request.result as PublishedWorkflow | undefined;
        console.log('[IndexedDB] loadPublished result:', result ? 'found' : 'NOT FOUND', result?.name);
        if (!result) {
          reject(new Error('Published workflow not found'));
        } else {
          resolve(result);
        }
      };
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  }

  async importWorkflow(workflow: PublishedWorkflow | ValidatedPublishedWorkflow): Promise<{ id: string }> {
    console.log('[IndexedDB] importWorkflow:', workflow.name, 'sourceId:', workflow.sourceId);
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record: PublishedWorkflow = {
        ...workflow,
        id: workflow.sourceId,
      } as PublishedWorkflow;
      const request = store.put(record);

      request.onsuccess = () => {
        console.log('[IndexedDB] importWorkflow SUCCESS, id:', workflow.sourceId);
        resolve({ id: workflow.sourceId });
      };
      request.onerror = () => {
        console.error('[IndexedDB] importWorkflow FAILED:', request.error);
        reject(request.error);
      };
      tx.oncomplete = () => db.close();
    });
  }

  async deletePublished(sourceId: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(sourceId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  }
}
