// Worker Pool - Manages a fixed pool of Web Workers for image processing
// Uses Comlink for simplified worker communication

import * as Comlink from 'comlink';
import type { ImageWorker, WorkerStatus } from '../worker/imageWorker.worker';
import { registerImageDataTransferHandler } from '../comlink-image-data-transfer';

registerImageDataTransferHandler();

/**
 * Calculate the optimal number of workers based on device capabilities.
 * 
 * Formula: min(maxSize, max(minSize, hardwareConcurrency - 1))
 * Reserves 1 core for the main thread to avoid Worker and UI resource contention.
 */
export function calculateWorkerCount(
  hardwareConcurrency: number,
  maxSize: number = 4,
  minSize: number = 1
): number {
  const cores = hardwareConcurrency || 2;
  const calculated = Math.max(minSize, cores - 1);
  return Math.min(maxSize, calculated);
}

/**
 * Get the effective pool size based on config and device capabilities.
 * 
 * If dynamic is false, uses fixed size (size or baseSize).
 * If dynamic is true (default), calculates based on hardwareConcurrency.
 */
export function getEffectiveSize(config: WorkerPoolConfig): number {
  if (config.dynamic === false) {
    return config.size ?? config.baseSize ?? 2;
  }

  const maxSize = config.maxSize ?? 4;
  const minSize = config.minSize ?? 1;
  const cores = typeof navigator !== 'undefined'
    ? (navigator.hardwareConcurrency || 2)
    : 2;

  return calculateWorkerCount(cores, maxSize, minSize);
}

/**
 * Represents a single worker instance in the pool
 */
interface PooledWorker {
  id: string;
  instance: Worker | null;
  proxy: ImageWorker | null;
  status: 'initializing' | 'idle' | 'busy' | 'recovering' | 'error' | 'terminated';
  lastUsed: number;
  errorCount: number;
  lastError?: string;
}

/**
 * Task submitted to the worker pool
 */
export interface WorkerTask<T = unknown> {
  id: string;
  execute: () => Promise<T>;
  priority?: number;
}

/**
 * Pool configuration
 */
export interface WorkerPoolConfig {
  /** @deprecated Use baseSize or dynamic sizing instead */
  size?: number;
  /** Base number of workers (used when dynamic is false) */
  baseSize?: number;
  /** Maximum number of workers in the pool (default: 4) */
  maxSize?: number;
  /** Minimum number of workers in the pool (default: 1) */
  minSize?: number;
  /** Enable dynamic worker count based on hardwareConcurrency (default: true) */
  dynamic?: boolean;
  /** Maximum consecutive errors before worker is replaced */
  maxErrors: number;
  /** Timeout for worker initialization (ms) */
  initTimeout: number;
}

/**
 * Pool statistics
 */
export interface WorkerPoolStats {
  totalWorkers: number;
  idleWorkers: number;
  busyWorkers: number;
  errorWorkers: number;
  totalTasksProcessed: number;
  totalTasksFailed: number;
  averageWaitTime: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<WorkerPoolConfig> = {
  size: undefined!,
  baseSize: 2,
  maxSize: 4,
  minSize: 1,
  dynamic: true,
  maxErrors: 3,
  initTimeout: 5000,
};

/**
 * WorkerPool - Manages a fixed pool of Web Workers for image processing.
 * 
 * Features:
 * - Fixed pool size (default: 2 workers)
 * - Automatic worker recovery on errors
 * - Task queuing with priority support
 * - Round-robin task distribution
 */
export class WorkerPool {
  private workers: PooledWorker[] = [];
  private taskQueue: Array<{
    task: WorkerTask;
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    queuedAt: number;
  }> = [];
  private currentWorkerIndex = 0;
  private config: WorkerPoolConfig;
  private stats = {
    totalTasksProcessed: 0,
    totalTasksFailed: 0,
    totalWaitTime: 0,
    waitCount: 0,
  };
  private terminated = false;

  constructor(config: Partial<WorkerPoolConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initialize();
  }

  /**
   * Initialize the worker pool with configured number of workers
   */
  private initialize(): void {
    const size = getEffectiveSize(this.config);
    for (let i = 0; i < size; i++) {
      this.createWorker(i);
    }
    console.log(`[WorkerPool] Initialized with ${size} workers`);
  }

  /**
   * Create a new worker and add it to the pool
   */
  private createWorker(index: number): PooledWorker {
    const id = `worker-${index}`;
    
    const pooledWorker: PooledWorker = {
      id,
      instance: null,
      proxy: null,
      status: 'initializing',
      lastUsed: 0,
      errorCount: 0,
    };

    try {
      const workerInstance = new Worker(new URL('../worker/imageWorker.worker.ts', import.meta.url), {
        type: 'module',
      });

      pooledWorker.instance = workerInstance;

      // Wrap with Comlink
      const proxy = Comlink.wrap<ImageWorker>(workerInstance) as unknown as ImageWorker;
      pooledWorker.proxy = proxy;

      // Set up error handlers
      workerInstance.onerror = (event) => {
        console.error(`[WorkerPool] ${id} error:`, event.error);
        pooledWorker.lastError = event.message || 'Unknown error';
        pooledWorker.errorCount++;
        pooledWorker.status = 'error';
      };

      workerInstance.onmessageerror = (event) => {
        console.error(`[WorkerPool] ${id} message error:`, event.data);
        pooledWorker.lastError = 'Message error';
        pooledWorker.errorCount++;
      };

      workerInstance.onmessage = (event) => {
        // Comlink handles its own message protocol
        // This is for any custom messages we might add later
      };

      // Mark as idle after a brief initialization delay
      setTimeout(() => {
        if (pooledWorker.status === 'initializing') {
          pooledWorker.status = 'idle';
        }
      }, 100);

      this.workers.push(pooledWorker);
    } catch (err) {
      console.error(`[WorkerPool] Failed to create ${id}:`, err);
      pooledWorker.status = 'error';
      pooledWorker.lastError = err instanceof Error ? err.message : 'Creation failed';
      pooledWorker.errorCount++;
      this.workers.push(pooledWorker);
    }

    return pooledWorker;
  }

  /**
   * Get the next available worker using round-robin
   */
  private selectWorker(): PooledWorker | null {
    const idleWorkers = this.workers.filter((w) => w.status === 'idle' && w.proxy);
    
    if (idleWorkers.length === 0) {
      return null;
    }

    // Round-robin selection
    let startIndex = this.currentWorkerIndex;
    do {
      const worker = idleWorkers[this.currentWorkerIndex % idleWorkers.length];
      this.currentWorkerIndex++;
      if (worker.status === 'idle' && worker.proxy) {
        return worker;
      }
      this.currentWorkerIndex++;
    } while (this.currentWorkerIndex % idleWorkers.length !== startIndex);

    return null;
  }

  /**
   * Process the next task in the queue
   */
  private processQueue(): void {
    if (this.taskQueue.length === 0) return;

    const worker = this.selectWorker();
    if (!worker) return;

    // Sort queue by priority (higher first) and then by queued time
    this.taskQueue.sort((a, b) => {
      const priorityDiff = (b.task.priority ?? 0) - (a.task.priority ?? 0);
      if (priorityDiff !== 0) return priorityDiff;
      return a.queuedAt - b.queuedAt;
    });

    const item = this.taskQueue.shift();
    if (!item) return;

    const waitTime = Date.now() - item.queuedAt;
    this.stats.totalWaitTime += waitTime;
    this.stats.waitCount++;

    this.executeOnWorker(worker, item);
  }

  /**
   * Execute a task on a specific worker. On error-count threshold, the
   * worker is replaced and the task is re-tried on the replacement.
   */
  private async executeOnWorker(
    worker: PooledWorker,
    item: {
      task: WorkerTask;
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
    }
  ): Promise<void> {
    if (!worker.proxy || !worker.instance) {
      item.reject(new Error('Worker not available'));
      this.processQueue();
      return;
    }

    const workerIndex = this.workers.indexOf(worker);
    worker.status = 'busy';
    worker.lastUsed = Date.now();

    try {
      const result = await item.task.execute();
      worker.status = 'idle';
      this.stats.totalTasksProcessed++;
      item.resolve(result);
    } catch (err) {
      console.error(`[WorkerPool] Task ${item.task.id} failed on ${worker.id}:`, err);
      worker.errorCount++;
      worker.lastError = err instanceof Error ? err.message : 'Task failed';

      if (worker.errorCount >= this.config.maxErrors) {
        worker.status = 'error';
        await this.replaceWorker(worker);
        // After replacement, retry the task on the new worker (do NOT use the
        // old workerIndex since this.workers was mutated by replaceWorker).
        const fresh = this.selectWorker();
        if (fresh?.proxy) {
          fresh.status = 'busy';
          fresh.lastUsed = Date.now();
          try {
            const result = await item.task.execute();
            fresh.status = 'idle';
            this.stats.totalTasksProcessed++;
            item.resolve(result);
            this.processQueue();
            return;
          } catch (retryErr) {
            fresh.errorCount++;
            fresh.lastError = retryErr instanceof Error ? retryErr.message : 'Retry failed';
            fresh.status = 'idle';
            this.stats.totalTasksFailed++;
            item.reject(retryErr instanceof Error ? retryErr : new Error('Retry failed'));
          }
          return; // retry block handles queue via fresh going idle
        } else {
          this.stats.totalTasksFailed++;
          item.reject(new Error('Worker replacement failed'));
        }
      } else {
        worker.status = 'idle';
        this.stats.totalTasksFailed++;
        item.reject(err instanceof Error ? err : new Error('Task failed'));
      }
    }

    this.processQueue();
  }

  /**
   * Replace a failed worker with a new instance.
   * Marks old worker as recovering to block new task assignments during replacement.
   */
  private async replaceWorker(oldWorker: PooledWorker): Promise<void> {
    const index = this.workers.indexOf(oldWorker);
    if (index === -1) return;

    // Mark as recovering so selectWorker() skips this worker
    oldWorker.status = 'recovering';

    // Terminate old worker and clear references
    oldWorker.instance?.terminate();
    oldWorker.instance = null;
    oldWorker.proxy = null;

    // Create replacement at the same index
    const newWorker = this.createWorker(parseInt(oldWorker.id.split('-')[1], 10));
    this.workers[index] = newWorker;

    // Wait for the new worker to reach 'idle' state before replacement is considered done
    await new Promise<void>((resolve) => {
      const check = () => {
        const fresh = this.workers[index];
        if (fresh && fresh.status === 'idle' && fresh.proxy) {
          resolve();
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  }

  /**
   * Submit a task to the pool for execution
   */
  async submit<T>(task: WorkerTask<T>): Promise<T> {
    if (this.terminated) {
      throw new Error('WorkerPool has been terminated');
    }

    return new Promise((resolve, reject) => {
      const item = {
        task,
        resolve: resolve as (value: unknown) => void,
        reject,
        queuedAt: Date.now(),
      };

      const worker = this.selectWorker();
      if (worker) {
        this.executeOnWorker(worker, item);
      } else {
        this.taskQueue.push(item);
      }
    });
  }

  /**
   * Execute a function on the next available worker.
   * This is the main method used to call worker methods directly.
   * Polls until an idle worker is available.
   * Uses Comlink.transfer() to move ImageData buffers without copying.
   */
  async execute<T>(fn: (worker: ImageWorker) => Promise<T>): Promise<T> {
    if (this.terminated) {
      throw new Error('WorkerPool has been terminated');
    }

    const MAX_ATTEMPTS = 200; // 10 seconds max wait
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const worker = this.selectWorker();
      if (worker?.proxy) {
        worker.status = 'busy';
        worker.lastUsed = Date.now();
        try {
          const result = await fn(worker.proxy);
          // Transfer any ImageData in the result (moves buffer ownership, no copy)
          return this.transferResult(result);
        } finally {
          worker.status = 'idle';
        }
      }
      await new Promise<void>((r) => setTimeout(r, 50));
    }

    throw new Error('No available workers after waiting');
  }

  /**
   * Wrap a result object with Comlink.transfer() if it contains ImageData,
   * so the underlying ArrayBuffer is transferred (not copied) to the main thread.
   */
  private transferResult<T>(result: T): T {
    if (result && typeof result === 'object') {
      const imageDataFields = new Set<string>();
      // Collect ImageData fields from the result object
      for (const key of Object.keys(result as Record<string, unknown>)) {
        const val = (result as Record<string, unknown>)[key];
        if (val instanceof ImageData) {
          imageDataFields.add(key);
        }
      }
      if (imageDataFields.size > 0) {
        const buffers: ArrayBuffer[] = [];
        for (const field of imageDataFields) {
          const id = (result as Record<string, ImageData>)[field];
          buffers.push(id.data.buffer);
        }
        return Comlink.transfer(result as T, buffers);
      }
    }
    return result;
  }

  /**
   * Get the status of all workers
   */
  getWorkerStatuses(): WorkerStatus[] {
    return this.workers
      .filter((w) => w.proxy)
      .map((w) => ({
        id: w.id,
        ready: w.status === 'idle' || w.status === 'busy',
        processedCount: 0, // Workers track their own count
        errorCount: w.errorCount,
        lastError: w.lastError,
      }));
  }

  /**
   * Get pool statistics
   */
  getStats(): WorkerPoolStats {
    return {
      totalWorkers: this.workers.length,
      idleWorkers: this.workers.filter((w) => w.status === 'idle').length,
      busyWorkers: this.workers.filter((w) => w.status === 'busy').length,
      errorWorkers: this.workers.filter((w) => w.status === 'error').length,
      totalTasksProcessed: this.stats.totalTasksProcessed,
      totalTasksFailed: this.stats.totalTasksFailed,
      averageWaitTime: this.stats.waitCount > 0 
        ? this.stats.totalWaitTime / this.stats.waitCount 
        : 0,
    };
  }

  /**
   * Check if the pool has available workers
   */
  hasAvailableWorkers(): boolean {
    return this.workers.some((w) => w.status === 'idle' && w.proxy);
  }

  /**
   * Get the pool size (number of initialized workers)
   */
  getPoolSize(): number {
    return this.workers.filter((w) => w.proxy).length;
  }

  /**
   * Get the number of queued tasks
   */
  getQueueLength(): number {
    return this.taskQueue.length;
  }

  /**
   * Terminate all workers and clean up
   */
  terminate(): void {
    this.terminated = true;
    
    for (const worker of this.workers) {
      if (worker.instance) {
        worker.instance.terminate();
        worker.status = 'terminated';
      }
    }

    // Reject all pending tasks
    for (const item of this.taskQueue) {
      item.reject(new Error('WorkerPool terminated'));
    }
    this.taskQueue = [];
  }
}

// Singleton instance
let _poolInstance: WorkerPool | null = null;

/**
 * Get or create the singleton WorkerPool instance
 */
export function getWorkerPool(config?: Partial<WorkerPoolConfig>): WorkerPool {
  if (!_poolInstance) {
    _poolInstance = new WorkerPool(config);
  }
  return _poolInstance;
}

/**
 * Create a new WorkerPool instance (for testing or multiple pools)
 */
export function createWorkerPool(config?: Partial<WorkerPoolConfig>): WorkerPool {
  return new WorkerPool(config);
}
