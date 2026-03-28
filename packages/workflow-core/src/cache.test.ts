import { describe, it, expect, beforeEach } from 'vitest';
import { createCache } from '../src/cache';
import type { ExecutionCache } from '../src/cache';

function makeCache(): ExecutionCache {
  return createCache({ maxAgeMs: 1000, maxEntries: 10 });
}

describe('ExecutionCache', () => {
  let cache: ExecutionCache;

  beforeEach(() => {
    cache = makeCache();
  });

  describe('get/set', () => {
    it('stores and retrieves an entry', () => {
      const result = { foo: 'bar' };
      cache.set('wf1', 'node1', 'hash1', result);

      const entry = cache.get('wf1', 'node1', 'hash1');
      expect(entry).not.toBeUndefined();
      expect(entry!.result).toEqual(result);
    });

    it('returns undefined for missing entry', () => {
      expect(cache.get('wf1', 'node1', 'hash1')).toBeUndefined();
    });

    it('returns undefined for different hash', () => {
      cache.set('wf1', 'node1', 'hash1', { value: 1 });
      expect(cache.get('wf1', 'node1', 'hash2')).toBeUndefined();
    });

    it('returns undefined for different workflow', () => {
      cache.set('wf1', 'node1', 'hash1', { value: 1 });
      expect(cache.get('wf2', 'node1', 'hash1')).toBeUndefined();
    });

    it('returns undefined for different node', () => {
      cache.set('wf1', 'node1', 'hash1', { value: 1 });
      expect(cache.get('wf1', 'node2', 'hash1')).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('clears all entries', () => {
      cache.set('wf1', 'node1', 'hash1', { a: 1 });
      cache.set('wf2', 'node2', 'hash2', { b: 2 });

      cache.clear();

      expect(cache.get('wf1', 'node1', 'hash1')).toBeUndefined();
      expect(cache.get('wf2', 'node2', 'hash2')).toBeUndefined();
    });
  });

  describe('clearWorkflow', () => {
    it('clears only entries for a specific workflow', () => {
      cache.set('wf1', 'node1', 'hash1', { a: 1 });
      cache.set('wf1', 'node2', 'hash2', { b: 2 });
      cache.set('wf2', 'node3', 'hash3', { c: 3 });

      cache.clearWorkflow('wf1');

      expect(cache.get('wf1', 'node1', 'hash1')).toBeUndefined();
      expect(cache.get('wf1', 'node2', 'hash2')).toBeUndefined();
      expect(cache.get('wf2', 'node3', 'hash3')).not.toBeUndefined();
    });
  });

  describe('maxAge', () => {
    it('evicts expired entries', async () => {
      const fastCache = createCache({ maxAgeMs: 50 });
      fastCache.set('wf1', 'node1', 'hash1', { value: 1 });

      await new Promise((r) => setTimeout(r, 80));

      expect(fastCache.get('wf1', 'node1', 'hash1')).toBeUndefined();
    });

    it('returns valid entries before expiry', async () => {
      const fastCache = createCache({ maxAgeMs: 200 });
      fastCache.set('wf1', 'node1', 'hash1', { value: 1 });

      await new Promise((r) => setTimeout(r, 50));

      expect(fastCache.get('wf1', 'node1', 'hash1')).not.toBeUndefined();
    });
  });

  describe('maxEntries (LRU eviction)', () => {
    it('evicts LRU entries when capacity is exceeded', () => {
      const cache = createCache({ maxEntries: 10 });

      for (let i = 0; i < 10; i++) {
        cache.set('wf1', `node${i}`, 'hash1', { value: i });
      }

      // Insert 11th — triggers eviction of the LRU entry (node0, accessCount=1, never accessed after insertion)
      cache.set('wf1', 'node10', 'hash1', { value: 10 });

      expect(cache.get('wf1', 'node10', 'hash1')).not.toBeUndefined(); // newest, highest accessCount
      expect(cache.get('wf1', 'node0', 'hash1')).toBeUndefined(); // LRU: inserted first, never accessed
      expect(cache.get('wf1', 'node1', 'hash1')).not.toBeUndefined();  // still present
    });

    it('LRU eviction targets least-recently accessed entries by accessCount', () => {
      const cache = createCache({ maxEntries: 10 });

      for (let i = 0; i < 10; i++) {
        cache.set('wf1', `node${i}`, 'hash1', { value: i });
      }

      // Access node0 and node2 — increments their accessCount past all other entries
      cache.get('wf1', 'node0', 'hash1');
      cache.get('wf1', 'node2', 'hash1');

      // Insert 11th entry — should evict node1 (LRU: inserted second, never accessed after)
      cache.set('wf1', 'node10', 'hash1', { value: 10 });

      expect(cache.get('wf1', 'node0', 'hash1')).not.toBeUndefined(); // accessed after insertion
      expect(cache.get('wf1', 'node2', 'hash1')).not.toBeUndefined(); // accessed after insertion
      expect(cache.get('wf1', 'node1', 'hash1')).toBeUndefined(); // LRU: never accessed
      expect(cache.get('wf1', 'node10', 'hash1')).not.toBeUndefined(); // newest
    });

    it('LRU eviction targets least-recently accessed entries, not oldest by insertion time', () => {
      const cache = createCache({ maxEntries: 10 });

      for (let i = 0; i < 10; i++) {
        cache.set('wf1', `node${i}`, 'hash1', { value: i });
      }

      // Access node0 and node2 — makes them recently used
      cache.get('wf1', 'node0', 'hash1');
      cache.get('wf1', 'node2', 'hash1');

      // Insert 11th entry — should evict node1 (LRU), not node0
      cache.set('wf1', 'node10', 'hash1', { value: 10 });

      expect(cache.get('wf1', 'node0', 'hash1')).not.toBeUndefined(); // was accessed
      expect(cache.get('wf1', 'node2', 'hash1')).not.toBeUndefined(); // was accessed
      expect(cache.get('wf1', 'node1', 'hash1')).toBeUndefined(); // was never accessed, LRU
      expect(cache.get('wf1', 'node10', 'hash1')).not.toBeUndefined(); // newest
    });
  });
});
