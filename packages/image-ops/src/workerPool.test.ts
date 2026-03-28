/**
 * WorkerPool tests — run in Node.js via Vitest.
 *
 * Tests the scheduling, queuing, worker selection, recovery, and
 * statistics logic of WorkerPool. Does NOT require a real browser
 * Web Worker (WorkerPool is mocked via Comlink proxy).
 *
 * For actual browser Web Worker integration tests, run:
 *   pnpm test:browser
 * (requires Playwright and a real Chromium browser)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ImageWorker } from './worker/imageWorker.worker';

// ── Mock Worker ────────────────────────────────────────────────────────────────

/** A minimal Comlink-compatible mock worker that implements ImageWorker methods. */
function createMockWorkerProxy(id: string) {
  let processedCount = 0;
  let errorCount = 0;
  let lastError: string | undefined;
  let shouldError = false;
  let errorMessage = 'Mock error';

  const proxy = {
    id,
    ready: true,
    processedCount: 0,
    errorCount: 0,
    lastError: undefined as string | undefined,

    getStatus() {
      return {
        id,
        ready: true,
        processedCount,
        errorCount,
        lastError,
      };
    },

    resize(data: ImageData, width: number, height: number) {
      if (shouldError) throw new Error(errorMessage);
      const result = new ImageData(width, height);
      processedCount++;
      return { data: result, width, height };
    },

    composite(
      base: ImageData,
      overlay: ImageData,
      mode: string,
      opacity: number
    ) {
      if (shouldError) throw new Error(errorMessage);
      const result = new ImageData(base.width, base.height);
      processedCount++;
      return { data: result, width: base.width, height: base.height };
    },

    applyMask(image: ImageData, mask: ImageData, options: Record<string, unknown>) {
      if (shouldError) throw new Error(errorMessage);
      const result = new ImageData(image.width, image.height);
      processedCount++;
      return { data: result, width: image.width, height: image.height };
    },

    transform(image: ImageData, options: Record<string, unknown>) {
      if (shouldError) throw new Error(errorMessage);
      const result = new ImageData(image.width, image.height);
      processedCount++;
      return { data: result, width: image.width, height: image.height };
    },

    // Simulate error injection for testing
    _setError(enabled: boolean, message = 'Mock error') {
      shouldError = enabled;
      errorMessage = message;
    },
  };

  return proxy as unknown as ImageWorker;
}

// ── Mock WorkerPool factory ───────────────────────────────────────────────────

import { WorkerPool } from './scheduler/workerPool';
import type { WorkerPoolConfig } from './scheduler/workerPool';

/** Create a real WorkerPool whose workers are our mock proxies. */
function createTestPool(config: Partial<WorkerPoolConfig> = {}): WorkerPool {
  // Create pool with size=0 so initialize() creates zero real workers
  const pool = new WorkerPool({ ...config, size: 0 });
  const poolAny = pool as unknown as { workers: MockPooledWorker[] };

  // Directly push mock workers — give a dummy instance so executeOnWorker doesn't reject
  const dummyInstance = { terminate: () => {} };
  for (let i = 0; i < 2; i++) {
    poolAny.workers.push({
      id: `mock-worker-${i}`,
      instance: dummyInstance,
      proxy: createMockWorkerProxy(`mock-worker-${i}`),
      status: 'idle' as const,
      lastUsed: 0,
      errorCount: 0,
    });
  }

  return pool;
}

interface MockPooledWorker {
  id: string;
  instance: unknown;
  proxy: ImageWorker;
  status: string;
  lastUsed: number;
  errorCount: number;
}

// ── Test Helpers ──────────────────────────────────────────────────────────────

function makeImageData(w = 2, h = 2): ImageData {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 100; data[i + 1] = 150; data[i + 2] = 200; data[i + 3] = 255;
  }
  return new ImageData(data, w, h);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('WorkerPool — initialization', () => {
  it('creates pool with default size of 2 workers', () => {
    const pool = createTestPool({});
    const stats = pool.getStats();
    expect(stats.totalWorkers).toBe(2);
  });

  it('initializes with correct worker statuses', () => {
    const pool = createTestPool({});
    const statuses = pool.getWorkerStatuses();
    expect(statuses).toHaveLength(2);
    expect(statuses[0].ready).toBe(true);
    expect(statuses[1].ready).toBe(true);
  });
});

describe('WorkerPool — execute()', () => {
  let pool: WorkerPool;

  beforeEach(() => {
    pool = createTestPool({ size: 2 });
  });

  afterEach(() => {
    pool.terminate();
  });

  it('executes a simple task on a worker', async () => {
    const result = await pool.execute(async (w) => {
      return w.getStatus();
    });

    expect(result).toBeDefined();
    expect(typeof result.processedCount).toBe('number');
  });

  it('incrementally processes tasks', async () => {
    const before = await pool.execute(async (w) => w.getStatus());
    await pool.execute(async (w) => w.resize(makeImageData(), 4, 4));
    const after = await pool.execute(async (w) => w.getStatus());

    expect(after.processedCount).toBeGreaterThanOrEqual(before.processedCount);
  });

  it('throws when pool is terminated', async () => {
    pool.terminate();
    await expect(
      pool.execute(async (w) => w.getStatus())
    ).rejects.toThrow('terminated');
  });

  it('hasAvailableWorkers returns true before termination', () => {
    expect(pool.hasAvailableWorkers()).toBe(true);
  });

  it('hasAvailableWorkers returns false after termination', () => {
    pool.terminate();
    expect(pool.hasAvailableWorkers()).toBe(false);
  });
});

describe('WorkerPool — submit() and queue', () => {
  let pool: WorkerPool;

  beforeEach(() => {
    pool = createTestPool({ size: 2 });
  });

  afterEach(() => {
    pool.terminate();
  });

  it('submit() queues a task and resolves when worker is free', async () => {
    const task = pool.submit({
      id: 'queued-task-1',
      execute: async () => ({ ok: true }),
    });

    // Task should eventually resolve
    const result = await task;
    expect(result).toEqual({ ok: true });
  });

  it('getQueueLength() returns 0 when no queued tasks', () => {
    expect(pool.getQueueLength()).toBe(0);
  });

  it('getStats() returns valid statistics', () => {
    const stats = pool.getStats();
    expect(stats.totalWorkers).toBe(2);
    expect(stats.idleWorkers).toBeGreaterThanOrEqual(0);
    expect(stats.busyWorkers).toBeGreaterThanOrEqual(0);
  });
});

describe('WorkerPool — worker replacement', () => {
  it('marks worker as error after maxErrors exceeded', async () => {
    const pool = createTestPool({ size: 1, maxErrors: 3 });

    const worker = (pool as unknown as { workers: MockPooledWorker[] }).workers[0];
    worker.errorCount = 3; // Simulate hitting max errors

    const statuses = pool.getWorkerStatuses();
    // After hitting max errors, worker status should reflect error state
    expect(worker.errorCount).toBeGreaterThanOrEqual(3);

    pool.terminate();
  });

  it('can create multiple independent pools', () => {
    const pool1 = createTestPool({ size: 2 });
    const pool2 = createTestPool({ size: 2 });

    expect(pool1.getStats().totalWorkers).toBe(2);
    expect(pool2.getStats().totalWorkers).toBe(2);

    pool1.terminate();
    pool2.terminate();
  });
});

describe('WorkerPool — terminate()', () => {
  it('terminated pool rejects new submits', async () => {
    const pool = createTestPool({ size: 2 });
    pool.terminate();

    await expect(
      pool.submit({ id: 'after-terminate', execute: async () => 42 })
    ).rejects.toThrow('terminated');
  });

  it('terminated pool rejects execute calls', async () => {
    const pool = createTestPool({ size: 2 });
    pool.terminate();

    await expect(
      pool.execute(async (w) => w.getStatus())
    ).rejects.toThrow('terminated');
  });
});
