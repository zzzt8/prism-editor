import type { CacheConfig } from '@prism/shared-types';

// Execution result caching

export interface CacheEntry extends CacheConfig {
  /** Monotonically increasing counter — avoids floating-point precision issues
   * that make timestamp subtraction unreliable when entries are inserted
   * within the same millisecond. */
  accessCount: number;
}

export interface ExecutionCache {
  get(
    _workflowId: string,
    _nodeId: string,
    _inputsHash: string
  ): CacheEntry | undefined;
  set(
    _workflowId: string,
    _nodeId: string,
    _inputsHash: string,
    _result: Record<string, unknown>
  ): void;
  clear(): void;
  clearWorkflow(_workflowId: string): void;
}

export interface CacheOptions {
  maxAgeMs?: number;
  maxEntries?: number;
}

function makeKey(workflowId: string, nodeId: string, inputsHash: string): string {
  return `${workflowId}:${nodeId}:${inputsHash}`;
}

export function createCache(options: CacheOptions = {}): ExecutionCache {
  const store = new Map<string, { entry: CacheEntry; key: string }>();
  const maxAge = options.maxAgeMs ?? 5 * 60 * 1000; // 5 minutes default
  const maxEntries = options.maxEntries ?? 1000;
  let accessCounter = 0;

  function evictStale(now: number): void {
    for (const [k, v] of store) {
      if (now - v.entry.timestamp > maxAge) {
        store.delete(k);
      }
    }
  }

  function evictLRU(): void {
    // Evict when at or above capacity so the store never exceeds maxEntries after the insert.
    if (store.size >= maxEntries) {
      const toEvict = Math.max(1, Math.floor(store.size * 0.1));
      const oldest = [...store.values()]
        .sort((a, b) => a.entry.accessCount - b.entry.accessCount)
        .slice(0, toEvict);
      for (const v of oldest) {
        store.delete(v.key);
      }
    }
  }

  return {
    get(workflowId: string, nodeId: string, inputsHash: string): CacheEntry | undefined {
      const key = makeKey(workflowId, nodeId, inputsHash);
      const found = store.get(key);
      if (!found) return undefined;
      const now = Date.now();
      if (now - found.entry.timestamp > maxAge) {
        store.delete(key);
        return undefined;
      }
      found.entry.accessCount = ++accessCounter;
      return found.entry;
    },

    set(
      workflowId: string,
      nodeId: string,
      inputsHash: string,
      result: Record<string, unknown>
    ): void {
      const key = makeKey(workflowId, nodeId, inputsHash);
      const now = Date.now();
      evictStale(now);
      evictLRU();
      store.set(key, {
        entry: { result, timestamp: now, accessCount: ++accessCounter, inputsHash },
        key,
      });
    },

    clear(): void {
      store.clear();
    },

    clearWorkflow(workflowId: string): void {
      for (const key of store.keys()) {
        if (key.startsWith(`${workflowId}:`)) {
          store.delete(key);
        }
      }
    },
  };
}
