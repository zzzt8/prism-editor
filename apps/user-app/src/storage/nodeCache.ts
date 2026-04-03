// Node package cache — memory and localStorage caching for loaded node packages

import type { NodePackageManifest, LoadedNodePackage } from '@prism/shared-types';

const STORAGE_PREFIX = 'prism:node-pkg:';
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_MEMORY_CACHE_SIZE = 50; // LRU eviction when exceeding this

// In-memory cache with LRU tracking
const _memoryCache = new Map<string, LoadedNodePackage>();
// Track access order for LRU eviction
const _accessOrder: string[] = [];

interface CacheEntry {
  manifest: NodePackageManifest;
  loadedAt: string;
  checksum?: string;
}

// Cache statistics for debugging
const stats = { hits: 0, misses: 0, evictions: 0 };

/**
 * Evict oldest entries from memory cache when exceeding MAX_MEMORY_CACHE_SIZE.
 * Uses LRU: removes least recently accessed entries first.
 */
function evictIfNeeded(): void {
  while (_memoryCache.size >= MAX_MEMORY_CACHE_SIZE && _accessOrder.length > 0) {
    const oldest = _accessOrder.shift();
    if (oldest) {
      _memoryCache.delete(oldest);
      stats.evictions++;
    }
  }
}

/**
 * Update LRU access order — move URL to end (most recently used).
 */
function touchAccessOrder(url: string): void {
  const idx = _accessOrder.indexOf(url);
  if (idx !== -1) {
    _accessOrder.splice(idx, 1);
  }
  _accessOrder.push(url);
}

/**
 * Get a node package from cache (memory first, then localStorage).
 *
 * @param url - URL or identifier for the package
 * @returns The cached package or null if not found/expired
 */
export function getNodePackageFromCache(url: string): LoadedNodePackage | null {
  const memoryEntry = _memoryCache.get(url);
  if (memoryEntry && !isExpired(memoryEntry.loadedAt)) {
    touchAccessOrder(url);
    stats.hits++;
    return memoryEntry;
  }

  // Remove expired entry from memory cache
  if (memoryEntry) {
    _memoryCache.delete(url);
    const idx = _accessOrder.indexOf(url);
    if (idx !== -1) _accessOrder.splice(idx, 1);
  }

  try {
    const stored = localStorage.getItem(STORAGE_PREFIX + url);
    if (stored) {
      const entry: CacheEntry = JSON.parse(stored);
      if (!isExpired(entry.loadedAt)) {
        _memoryCache.set(url, entry);
        touchAccessOrder(url);
        stats.hits++;
        return entry;
      } else {
        // Remove expired entry from localStorage
        localStorage.removeItem(STORAGE_PREFIX + url);
      }
    }
  } catch {
    // localStorage access failed
  }

  stats.misses++;
  return null;
}

/**
 * Store a node package in cache (both memory and localStorage).
 *
 * @param url - URL or identifier for the package
 * @param manifest - The validated node package manifest
 * @param options - Optional settings (checksum, ttlMs)
 */
export function storeNodePackageInCache(
  url: string,
  manifest: NodePackageManifest,
  options: { checksum?: string; ttlMs?: number } = {}
): void {
  const entry: CacheEntry = {
    manifest,
    loadedAt: new Date().toISOString(),
    checksum: options.checksum,
  };

  // Evict if needed before adding new entry
  evictIfNeeded();

  _memoryCache.set(url, entry);
  touchAccessOrder(url);

  try {
    localStorage.setItem(STORAGE_PREFIX + url, JSON.stringify(entry));
  } catch {
    // localStorage might be full or disabled
  }
}

/**
 * Check if a cached entry is expired.
 *
 * @param loadedAt - ISO timestamp when the package was loaded
 * @returns true if the entry has expired
 */
function isExpired(loadedAt: string): boolean {
  const loadTime = new Date(loadedAt).getTime();
  const now = Date.now();
  return now - loadTime > DEFAULT_TTL_MS;
}

/**
 * Remove a specific package from cache.
 *
 * @param url - URL or identifier for the package
 * @returns true if something was removed
 */
export function removeNodePackageFromCache(url: string): boolean {
  let removed = false;

  if (_memoryCache.has(url)) {
    _memoryCache.delete(url);
    const idx = _accessOrder.indexOf(url);
    if (idx !== -1) _accessOrder.splice(idx, 1);
    removed = true;
  }

  try {
    if (localStorage.getItem(STORAGE_PREFIX + url)) {
      localStorage.removeItem(STORAGE_PREFIX + url);
      removed = true;
    }
  } catch {
    // ignore
  }

  return removed;
}

/**
 * Clear all node packages from cache.
 */
export function clearNodePackageCache(): void {
  _memoryCache.clear();
  _accessOrder.length = 0;

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}

/**
 * Get cache statistics for debugging.
 */
export function getCacheStats(): { hits: number; misses: number; evictions: number; size: number } {
  return {
    hits: stats.hits,
    misses: stats.misses,
    evictions: stats.evictions,
    size: _memoryCache.size,
  };
}
