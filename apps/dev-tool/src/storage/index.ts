// Storage adapters barrel export
// Phase 2: JWT token sync removed (PRD §6.3 mall trust mode).
// ApiStorageAdapter uses X-PRISM-SECRET header only.

import { ApiStorageAdapter } from './ApiStorageAdapter';

export { JsonFileAdapterImpl, jsonFileAdapter } from './JsonFileAdapter';
export { ApiStorageAdapter } from './ApiStorageAdapter';
export { IndexedDBStorageAdapter, indexedDBStorageAdapter } from './IndexedDBStorageAdapter';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

// Singleton instance - created eagerly at module load to avoid timer leaks.
const _instance = new ApiStorageAdapter(apiBaseUrl);

// Primary storage adapter (server-first: Save/New/Publish all go to server)
// IndexedDB is used as autosave cache only (for crash recovery)
export const activeStorageAdapter: InstanceType<typeof ApiStorageAdapter> = _instance;

// Cleanup function - call this on app unmount to prevent timer leaks
export function cleanupStorage(): void {
  // No-op: adapters no longer have cleanup requirements
}
