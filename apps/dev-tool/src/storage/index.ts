// Storage adapters barrel export

export { JsonFileAdapterImpl, jsonFileAdapter } from './JsonFileAdapter';
export { ApiStorageAdapter } from './ApiStorageAdapter';
export { IndexedDBStorageAdapter, indexedDBStorageAdapter } from './IndexedDBStorageAdapter';

// Environment-based adapter selection
import { ApiStorageAdapter } from './ApiStorageAdapter';
import { IndexedDBStorageAdapter, indexedDBStorageAdapter } from './IndexedDBStorageAdapter';
import { useAuthStore } from '../store/authStore';

const isProduction = import.meta.env.PROD;
const strictApi = import.meta.env.VITE_STRICT_API === 'true';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

// Single shared instance - avoid creating multiple instances with setInterval leaks
let _apiAdapterInstance: ApiStorageAdapter | null = null;
let _indexedDbAdapterInstance: IndexedDBStorageAdapter | null = null;

function getOrCreateApiAdapter(): ApiStorageAdapter {
  if (!_apiAdapterInstance) {
    _apiAdapterInstance = new ApiStorageAdapter(apiBaseUrl);
  }
  return _apiAdapterInstance;
}

function getOrCreateIndexedDbAdapter(): IndexedDBStorageAdapter {
  if (!_indexedDbAdapterInstance) {
    _indexedDbAdapterInstance = indexedDBStorageAdapter;
  }
  return _indexedDbAdapterInstance;
}

// Use IndexedDB as the primary local storage adapter (better than localStorage quota limits)
let activeStorageAdapter: import('@prism/shared-types').StorageAdapter;

if (isProduction || strictApi) {
  activeStorageAdapter = getOrCreateApiAdapter();
} else {
  // Use IndexedDB for local storage (no 5-10MB quota limit)
  activeStorageAdapter = getOrCreateIndexedDbAdapter();
}

// Token sync helper - call this after login/register to update adapter tokens
export function syncStorageTokens() {
  const state = useAuthStore.getState();
  if (activeStorageAdapter instanceof ApiStorageAdapter) {
    if (state.accessToken && state.isAuthenticated) {
      activeStorageAdapter.setTokens(state.accessToken, '');
    } else {
      activeStorageAdapter.clearTokens();
    }
  }
}

// Cleanup function - call this on app unmount to prevent timer leaks
export function cleanupStorage(): void {
  // No-op: adapters no longer have cleanup requirements
}

export { activeStorageAdapter };
