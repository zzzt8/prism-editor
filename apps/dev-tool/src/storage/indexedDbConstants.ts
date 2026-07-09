// IndexedDB schema constants and types for IndexedDBStorageAdapter.
// Extracted from IndexedDBStorageAdapter.ts (split-tiles-service-layer T1).

export const DB_NAME = 'prism-editor';
export const DB_VERSION = 2; // Bump version for new stores
export const STORE_WORKFLOWS = 'workflows';
export const STORE_META = 'meta';
export const STORE_INDEX = 'index';
export const STORE_VERSIONS = 'versions';
export const MAX_VERSION_RECORDS = 50;

// Version data structure
export interface VersionRecord {
  id: string;
  workflowId: string;
  version: string;
  content: string;
  createdBy: string | null;
  createdAt: string;
}