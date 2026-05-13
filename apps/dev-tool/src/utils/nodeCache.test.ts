// Tests for nodeCache utility
// Tests moved here from dev-tool/utils/nodeCache.test.ts
// The actual implementation lives in apps/user-app/src/storage/nodeCache.ts

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getNodePackageFromCache,
  storeNodePackageInCache,
  removeNodePackageFromCache,
  clearNodePackageCache,
} from '../../../user-app/src/storage/nodeCache';
import type { NodePackageManifest } from '@prism/shared-types';

const TEST_URL = 'https://example.com/test-package.json';
const TEST_MANIFEST: NodePackageManifest = {
  name: 'test-nodes',
  version: '1.0.0',
  definitions: [],
  executors: [],
};

function resetStorage() {
  clearNodePackageCache();
}

describe('nodeCache', () => {
  beforeEach(() => {
    resetStorage();
  });

  describe('storeNodePackageInCache', () => {
    it('stores a package in cache', () => {
      storeNodePackageInCache(TEST_URL, TEST_MANIFEST);
      const cached = getNodePackageFromCache(TEST_URL);
      expect(cached).not.toBeNull();
      expect(cached?.manifest.name).toBe('test-nodes');
    });
  });

  describe('getNodePackageFromCache', () => {
    it('returns null for non-existent package', () => {
      const cached = getNodePackageFromCache('nonexistent-url');
      expect(cached).toBeNull();
    });

    it('returns cached package when it exists', () => {
      storeNodePackageInCache(TEST_URL, TEST_MANIFEST);
      const cached = getNodePackageFromCache(TEST_URL);
      expect(cached?.manifest.name).toBe('test-nodes');
    });
  });

  describe('removeNodePackageFromCache', () => {
    it('removes a cached package', () => {
      storeNodePackageInCache(TEST_URL, TEST_MANIFEST);
      const removed = removeNodePackageFromCache(TEST_URL);
      expect(removed).toBe(true);

      const cached = getNodePackageFromCache(TEST_URL);
      expect(cached).toBeNull();
    });

    it('returns false when package does not exist', () => {
      const removed = removeNodePackageFromCache('nonexistent');
      expect(removed).toBe(false);
    });
  });

  describe('clearNodePackageCache', () => {
    it('clears all cached packages', () => {
      storeNodePackageInCache('url1', TEST_MANIFEST);
      storeNodePackageInCache('url2', TEST_MANIFEST);

      clearNodePackageCache();

      expect(getNodePackageFromCache('url1')).toBeNull();
      expect(getNodePackageFromCache('url2')).toBeNull();
    });
  });
});
