// Storage adapters barrel export

export { JsonFileAdapterImpl, jsonFileAdapter } from './JsonFileAdapter';
export { ApiStorageAdapter } from './ApiStorageAdapter';
export { IndexedDBStorageAdapter, indexedDBStorageAdapter } from './IndexedDBStorageAdapter';
export { ProductTemplateApiAdapter } from './ProductTemplateApiAdapter';

// Environment-based adapter selection
import { ApiStorageAdapter, ProductTemplateApiAdapter } from './index';
import { useAuthStore } from '../store/authStore';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

// Single shared instance - avoid creating multiple instances with setInterval leaks
let _apiAdapterInstance: ApiStorageAdapter | null = null;
let _productTemplateApiAdapterInstance: ProductTemplateApiAdapter | null = null;

function getOrCreateApiAdapter(): ApiStorageAdapter {
  if (!_apiAdapterInstance) {
    _apiAdapterInstance = new ApiStorageAdapter(apiBaseUrl);
  }
  return _apiAdapterInstance;
}

function getOrCreateProductTemplateApiAdapter(): ProductTemplateApiAdapter {
  if (!_productTemplateApiAdapterInstance) {
    _productTemplateApiAdapterInstance = new ProductTemplateApiAdapter();
  }
  return _productTemplateApiAdapterInstance;
}

export const productTemplateApiAdapter = getOrCreateProductTemplateApiAdapter();

// Use ApiStorageAdapter as the primary storage (server-first: Save/New/Publish all go to server)
// IndexedDB is used as autosave cache only (for crash recovery)
let activeStorageAdapter: import('@prism/shared-types').StorageAdapter;

activeStorageAdapter = getOrCreateApiAdapter();

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
  if (_productTemplateApiAdapterInstance) {
    if (state.accessToken && state.isAuthenticated) {
      _productTemplateApiAdapterInstance.setAccessToken(state.accessToken);
    } else {
      _productTemplateApiAdapterInstance.setAccessToken(null);
    }
  }
}

// Cleanup function - call this on app unmount to prevent timer leaks
export function cleanupStorage(): void {
  // No-op: adapters no longer have cleanup requirements
}

export { activeStorageAdapter };
