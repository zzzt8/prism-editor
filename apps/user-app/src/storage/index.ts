// User app storage adapters barrel export

import { IndexedDBStorageAdapter } from './IndexedDBStorageAdapter';
export type { PublishedWorkflowMeta } from '../modules/repositories/interfaces';

// IndexedDB-based storage: offline-first, no server required.
// Importing a JSON workflow writes to local IndexedDB.
export const userAppStorage = new IndexedDBStorageAdapter();
