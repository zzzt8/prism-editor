// User app storage adapters barrel export

import { UserAppStorageAdapter } from './ApiStorageAdapter';
import { IndexedDBStorageAdapter } from './IndexedDBStorageAdapter';
export type { PublishedWorkflowMeta } from '../modules/repositories/interfaces';

// Server-first storage: published workflow list/detail are loaded from the public API.
// IndexedDB adapter is kept in the codebase for future caching/debug use, but is not
// the primary data source.
export const userAppStorage = new UserAppStorageAdapter();
export const indexedDbUserAppStorage = new IndexedDBStorageAdapter();
