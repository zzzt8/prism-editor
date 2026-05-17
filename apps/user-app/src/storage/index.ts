// User app storage adapters barrel export

import { UserAppStorageAdapter } from './ApiStorageAdapter';
import type { PublishedWorkflowMeta } from './ApiStorageAdapter';

// API-based storage: reads from GET /api/published (no auth required).
// The canonical source of truth is always the server.
export const userAppStorage = new UserAppStorageAdapter();

// Re-export IndexedDB for cache-only operations if needed
export { IndexedDBStorageAdapter } from './IndexedDBStorageAdapter';

export type { PublishedWorkflowMeta } from '../modules/repositories/interfaces';
