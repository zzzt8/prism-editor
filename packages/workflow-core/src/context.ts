// Execution context management
// This is the canonical source of ExecutionContext — import from here, not from @prism/shared-types.

import type {
  ImageRef,
  ExecutionProgress,
  NodeResult,
  ProgressCallback,
  AsyncTask,
} from '@prism/shared-types';

// Canonical ExecutionContext — matches the interface in @prism/shared-types
export interface ExecutionContext {
  workflowId: string;
  nodeId: string;
  inputs: Record<string, unknown>;
  params: Record<string, unknown>;
  imageRefs: Map<string, ImageRef>;
  results: Map<string, NodeResult>;
  progress: ExecutionProgress;
  signal?: AbortSignal;
  /** Register an async task and return a cancel function */
  registerAsyncTask?: (task: AsyncTask) => () => void;
  /** Check if an async task is still pending */
  isTaskPending?: (taskId: string) => boolean;
  /**
   * Assert a required input is present. Throws with a descriptive message if missing.
   * Use this at the top of any executor that has required input ports.
   */
  requireInput: <T>(key: string, nodeName: string) => T;
}

export interface ExecutionContextOptions {
  workflowId: string;
  totalNodes: number;
  onProgress?: ProgressCallback;
  signal?: AbortSignal;
}

export function createExecutionContext(
  options: ExecutionContextOptions
): ExecutionContext {
  const progress: ExecutionProgress = {
    workflowId: options.workflowId,
    totalNodes: options.totalNodes,
    completedNodes: 0,
    status: 'idle',
    results: [],
  };

  // Async task tracking
  const pendingTasks = new Set<string>();

  return {
    workflowId: options.workflowId,
    nodeId: '',
    inputs: {},
    params: {},
    imageRefs: new Map(),
    results: new Map(),
    progress,
    signal: options.signal,
    registerAsyncTask(task: AsyncTask): () => void {
      pendingTasks.add(task.taskId);
      return () => {
        pendingTasks.delete(task.taskId);
      };
    },
    isTaskPending(taskId: string): boolean {
      return pendingTasks.has(taskId);
    },
    requireInput<T>(key: string, nodeName: string): T {
      const value = this.inputs[key] as T | undefined;
      if (value === undefined || value === null) {
        throw new Error(`${key} input is required for ${nodeName} node`);
      }
      return value;
    },
  };
}

export function recordNodeResult(
  ctx: ExecutionContext,
  result: NodeResult
): void {
  ctx.results.set(result.nodeId, result);
  ctx.progress.results.push(result);
  ctx.progress.completedNodes = ctx.results.size;
}

export function checkAborted(ctx: ExecutionContext): boolean {
  return ctx.signal?.aborted ?? false;
}
