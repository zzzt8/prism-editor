// Execution context management
// This is the canonical source of ExecutionContext — import from here, not from @prism/shared-types.

import type { ImageRef, ExecutionProgress, NodeResult, ProgressCallback } from '@prism/shared-types';

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

  return {
    workflowId: options.workflowId,
    nodeId: '',
    inputs: {},
    params: {},
    imageRefs: new Map(),
    results: new Map(),
    progress,
    signal: options.signal,
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
