// inlineExecutorRunner - manages Web Worker for sandboxed inline executor execution
// Provides Worker-based execution with timeout and error handling

import type { NodeExecutor } from '@prism/shared-types';

interface WorkerMessage {
  type: 'execute';
  executorId: string;
  code: string;
  inputs: Record<string, unknown>;
  params: Record<string, unknown>;
  context: {
    signal?: AbortSignal;
    nodeId: string;
  };
}

interface WorkerResponse {
  type: 'result' | 'error';
  executorId: string;
  result?: unknown;
  error?: string;
}

// Single worker instance shared across all inline executors
let worker: Worker | null = null;
let pendingCallbacks = new Map<string, { resolve: (value: unknown) => void; reject: (e: Error) => void }>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./inlineExecutorWorker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { executorId, type, result, error } = event.data;
      const callback = pendingCallbacks.get(executorId);
      if (!callback) return;

      pendingCallbacks.delete(executorId);
      if (type === 'result') {
        callback.resolve(result);
      } else {
        callback.reject(new Error(error ?? 'Unknown worker error'));
      }
    };
  }
  return worker;
}

export function createInlineExecutor(executorId: string, code: string): NodeExecutor {
  return async function inlineExecutor(inputs, params, context) {
    return new Promise((promiseResolve, promiseReject) => {
      const message: WorkerMessage = {
        type: 'execute',
        executorId,
        code,
        inputs,
        params,
        context,
      };

      const callback: { resolve: (v: unknown) => void; reject: (e: Error) => void } = {
        resolve: promiseResolve as (v: unknown) => void,
        reject: promiseReject,
      };
      pendingCallbacks.set(executorId, callback);
      getWorker().postMessage(message);

      // Handle abort signal
      if (context.signal) {
        context.signal.addEventListener('abort', () => {
          if (pendingCallbacks.has(executorId)) {
            pendingCallbacks.delete(executorId);
            promiseReject(new Error(`Executor "${executorId}" aborted`));
          }
        });
      }
    });
  };
}

export function terminateWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
    pendingCallbacks.clear();
  }
}