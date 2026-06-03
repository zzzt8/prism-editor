// Worker loader — utilities for loading and managing remote executors via Web Workers

import type { NodeExecutor } from '@prism/shared-types';

const DEFAULT_TIMEOUT_MS = 30_000;

interface WorkerExecutorMessage {
  type: 'execute';
  id: string;
  inputs: Record<string, unknown>;
  params: Record<string, unknown>;
  context: Record<string, unknown>;
}

interface WorkerExecutorResponse {
  type: 'result' | 'error';
  id: string;
  result?: unknown;
  error?: string;
}

interface ExecutorWorker {
  worker: Worker;
  executorId: string;
  pendingRequests: Map<string, {
    resolve: (_value: unknown) => void;
    reject: (_error: Error) => void;
    timeoutId: ReturnType<typeof setTimeout>;
  }>;
}

// Map from URL to cached worker
const _workers = new Map<string, ExecutorWorker>();

/**
 * Create a worker executor that communicates via postMessage.
 *
 * The worker script should define a global `executor` function:
 * ```js
 * // my-executor.js
 * self.executor = async (inputs, params, context) => {
 *   // ... implementation
 *   return result;
 * };
 * ```
 */
async function createWorkerExecutor(url: string): Promise<Worker> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Worker loading timeout for: ${url}`));
    }, DEFAULT_TIMEOUT_MS);

    try {
      const worker = new Worker(url, { type: 'classic' });

      worker.onerror = (event) => {
        clearTimeout(timeoutId);
        reject(new Error(`Worker load error: ${event.message}`));
      };

      worker.onmessage = (_event) => {
        // Wait for 'ready' message before resolving
        if (_event.data?.type === 'ready') {
          clearTimeout(timeoutId);
          resolve(worker);
        }
      };

      // Set up a message listener to capture the ready signal
      worker.onmessageerror = () => {
        clearTimeout(timeoutId);
        reject(new Error(`Worker message error for: ${url}`));
      };
    } catch (err) {
      clearTimeout(timeoutId);
      reject(err);
    }
  });
}

/**
 * Load a remote executor from a URL.
 *
 * The remote script must define a function `executor(inputs, params, context)`
 * that returns a Promise resolving to the result.
 *
 * @param url - URL of the executor script
 * @param executorId - Identifier for logging/debugging
 * @param options - Options including timeout
 * @returns A NodeExecutor function that proxies to the worker
 */
export async function loadRemoteExecutor(
  url: string,
  executorId: string,
  options: { timeoutMs?: number } = {}
): Promise<NodeExecutor> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  // Check if we already have a worker for this URL
  let executorWorker = _workers.get(url);
  let isNewWorker = false;

  if (!executorWorker) {
    const worker = await createWorkerExecutor(url);
    executorWorker = {
      worker,
      executorId,
      pendingRequests: new Map(),
    };
    _workers.set(url, executorWorker);
    isNewWorker = true;
  }

  const { worker, pendingRequests } = executorWorker;

  // Set up message handler if this is a new worker
  if (isNewWorker) {
    worker.onmessage = (event: MessageEvent<WorkerExecutorResponse>) => {
      const { type, id, result, error } = event.data;
      const pending = pendingRequests.get(id);

      if (pending) {
        clearTimeout(pending.timeoutId);
        pendingRequests.delete(id);

        if (type === 'result') {
          pending.resolve(result);
        } else if (type === 'error') {
          pending.reject(new Error(error ?? 'Unknown worker error'));
        }
      }
    };
  }

  // Return an executor function that proxies to the worker
  const execute: NodeExecutor = async (inputs, params, context) => {
    return new Promise((resolve, reject) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const timeoutId = setTimeout(() => {
        pendingRequests.delete(id);
        reject(new Error(`Executor "${executorId}" timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      pendingRequests.set(id, { resolve: resolve as (_value: unknown) => void, reject, timeoutId });

      const _message: WorkerExecutorMessage = {
        type: 'execute',
        id,
        inputs,
        params,
        context: context as Record<string, unknown>,
      };

      worker.postMessage(_message);
    });
  };

  return execute;
}

/**
 * Terminate a worker for a specific URL.
 *
 * @param url - URL of the worker to terminate
 */
export function terminateWorker(url: string): void {
  const executorWorker = _workers.get(url);
  if (executorWorker) {
    executorWorker.worker.terminate();

    // Reject all pending requests
    for (const pending of executorWorker.pendingRequests.values()) {
      clearTimeout(pending.timeoutId);
      pending.reject(new Error(`Worker terminated: ${url}`));
    }

    executorWorker.pendingRequests.clear();
    _workers.delete(url);
  }
}

/**
 * Terminate all workers and clean up resources.
 */
export function terminateAllWorkers(): void {
  for (const url of _workers.keys()) {
    terminateWorker(url);
  }
}

/**
 * Get statistics about loaded workers.
 */
export function getWorkerStats(): {
  totalWorkers: number;
  workerUrls: string[];
} {
  return {
    totalWorkers: _workers.size,
    workerUrls: Array.from(_workers.keys()),
  };
}

/**
 * Check if a worker is loaded for a URL.
 */
export function isWorkerLoaded(url: string): boolean {
  return _workers.has(url);
}
