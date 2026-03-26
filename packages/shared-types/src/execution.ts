// ExecutionContext and execution-related types

import type { ImageRef } from './image';

// ImageData is a browser built-in — re-export for use in executor output types
// eslint-disable-next-line @typescript-eslint/no-redeclare
type ImageData = globalThis.ImageData;

export type NodeStatus = 'pending' | 'running' | 'done' | 'error';

export interface NodeResult {
  nodeId: string;
  status: NodeStatus;
  outputs: Record<string, unknown>;
  error?: string;
  startTime?: number;
  endTime?: number;
}

export interface ExecutionProgress {
  workflowId: string;
  totalNodes: number;
  completedNodes: number;
  currentNodeId?: string;
  status: 'idle' | 'running' | 'done' | 'error' | 'cancelled';
  results: NodeResult[];
  error?: string;
}

// NOTE: ExecutionContext is defined in @prism/workflow-core/src/context.ts
// to keep it co-located with the factory functions. Import it from there.
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

export type ProgressCallback = (progress: ExecutionProgress) => void;

export interface ExecutorOptions {
  onProgress?: ProgressCallback;
  signal?: AbortSignal;
}

// NodeExecutor is the contract that all node executors must implement.
// The third parameter (ctx) is an ExecutionContext; import ExecutionContext
// from '@prism/workflow-core' for the concrete type.
export interface NodeExecutor {
  (
    inputs: Record<string, unknown>,
    params: Record<string, unknown>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ctx: any
  ): Promise<Record<string, unknown>>;
}

export type NodeExecutorMap = Record<string, NodeExecutor>;

export interface TopologicalSortResult {
  order: string[];
  hasCycle: boolean;
  cycleNodes?: string[];
}

export interface CacheEntry {
  result: Record<string, unknown>;
  timestamp: number;
  inputsHash: string;
}

export interface ExecutionCache {
  get(workflowId: string, nodeId: string, inputsHash: string): CacheEntry | undefined;
  set(workflowId: string, nodeId: string, inputsHash: string, result: Record<string, unknown>): void;
  clear(): void;
  clearWorkflow(workflowId: string): void;
}

// ─── Executor Output Types ───────────────────────────────────────────────────
// Standardized output shapes for each built-in node type.
// All outputs include previewUrl / width / height for canvas rendering.
// The `type` discriminator enables discriminated union narrowing at runtime.

/** Base fields present on every executor output */
export interface BaseExecutorOutput {
  previewUrl: string;
  width: number;
  height: number;
}

export interface LoadImageExecutorOutput extends BaseExecutorOutput {
  type: 'load-image';
  image: ImageData;
  crossOriginWarning?: string;
}

export interface ApplyMaskExecutorOutput extends BaseExecutorOutput {
  type: 'apply-mask';
  result: ImageData;
}

export interface CompositeExecutorOutput extends BaseExecutorOutput {
  type: 'composite';
  result: ImageData;
}

export interface TransformExecutorOutput extends BaseExecutorOutput {
  type: 'transform';
  result: ImageData;
}

export interface ExportExecutorOutput extends BaseExecutorOutput {
  type: 'export';
  result: Blob;
  dataUrl: string;
  mimeType: string;
}

/** Discriminated union of all executor outputs */
export type ExecutorOutput =
  | LoadImageExecutorOutput
  | ApplyMaskExecutorOutput
  | CompositeExecutorOutput
  | TransformExecutorOutput
  | ExportExecutorOutput;
