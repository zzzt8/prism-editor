// ExecutionContext and execution-related types

import type { ImageRef } from './image';

// ImageData is a browser built-in — re-export for use in executor output types
// eslint-disable-next-line @typescript-eslint/no-redeclare
type ImageData = globalThis.ImageData;

export type NodeStatus = 'pending' | 'running' | 'done' | 'error';

/** Task execution mode — controls how the executor schedules this task */
export enum TaskType {
  /** Task executes synchronously within the same tick (default for most image ops) */
  SYNC = 'sync',
  /** Task is dispatched to a Web Worker for off-thread execution */
  ASYNC = 'async',
  /** Task requires polling until it signals completion */
  POLL = 'poll',
}

/** An async task that requires a Web Worker */
export interface AsyncTask {
  type: TaskType.ASYNC;
  /** Task identifier used for cancellation */
  taskId: string;
  /** Short description for progress reporting */
  label: string;
}

/** A polling task that checks external state until done */
export interface PollTask {
  type: TaskType.POLL;
  taskId: string;
  label: string;
  /** Initial poll interval in ms */
  interval?: number;
  /** Maximum poll attempts before timeout */
  maxAttempts?: number;
}

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
  /** Register an async task and return a cancel function */
  registerAsyncTask?: (task: AsyncTask) => () => void;
  /** Check if an async task is still pending */
  isTaskPending?: (taskId: string) => boolean;
  /**
   * Assert a required input is present. Throws if the input is missing.
   * @param key      The input port name
   * @param nodeName Human-readable node name for error messages
   */
  requireInput: <T>(key: string, nodeName: string) => T;
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
