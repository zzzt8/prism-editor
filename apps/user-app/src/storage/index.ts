// User app storage adapters barrel export

export { IndexedDBStorageAdapter } from './IndexedDBStorageAdapter';
export { type PublishedWorkflowMeta } from './IndexedDBStorageAdapter';

import { IndexedDBStorageAdapter } from './IndexedDBStorageAdapter';

export const userAppStorage = new IndexedDBStorageAdapter();
