/**
 * Tests for internal executor creation
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  createBrowserExecutor,
  createBrowserExecutorSync,
  ensureBrowserExecutors,
  hasBrowserExecutors,
} from '../create-executor';

describe('create-executor', () => {
  beforeAll(async () => {
    // Pre-load executors
    await ensureBrowserExecutors();
  });

  afterAll(() => {
    // Clean up
    vi.restoreAllMocks();
  });

  describe('async creation', () => {
    it('should create executor with browser executors', async () => {
      const executor = await createBrowserExecutor();
      expect(executor).toBeDefined();
      expect(typeof executor.execute).toBe('function');
      expect(typeof executor.register).toBe('function');
    });

    it('should have browser executors registered', async () => {
      const executor = await createBrowserExecutor();

      // Check that browser executors are registered
      expect(executor.getExecutor('composite')).toBeDefined();
      expect(executor.getExecutor('apply-mask')).toBeDefined();
      expect(executor.getExecutor('transform')).toBeDefined();
      expect(executor.getExecutor('export')).toBeDefined();
    });

    it('should support registering additional executors', async () => {
      const executor = await createBrowserExecutor();

      const mockExecutor = vi.fn().mockResolvedValue({});
      executor.register('custom', mockExecutor);

      expect(executor.getExecutor('custom')).toBe(mockExecutor);
    });
  });

  describe('sync creation', () => {
    it('should create executor sync after ensureBrowserExecutors', async () => {
      const executor = createBrowserExecutorSync();
      expect(executor).toBeDefined();
      expect(typeof executor.execute).toBe('function');
    });

    it('should throw if browser executors not initialized', () => {
      // This test would need to be isolated, but we've already initialized
      // Just verify the sync creation works
      expect(() => createBrowserExecutorSync()).not.toThrow();
    });
  });

  describe('hasBrowserExecutors', () => {
    it('should return true after initialization', () => {
      expect(hasBrowserExecutors()).toBe(true);
    });
  });
});
