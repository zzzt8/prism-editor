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

/**
 * Lightweight cache configuration — the stable part of a cache entry,
 * shared between the execution contract and workflow-core's LRU cache.
 *
 * The `accessCount` field is workflow-core specific (LRU eviction) and lives
 * in packages/workflow-core/src/cache.ts.
 */
export interface CacheConfig {
  result: Record<string, unknown>;
  timestamp: number;
  inputsHash: string;
}

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

export interface ExecutionCache {
  get(workflowId: string, nodeId: string, inputsHash: string): CacheConfig | undefined;
  set(workflowId: string, nodeId: string, inputsHash: string, result: Record<string, unknown>): void;
  clear(): void;
  clearWorkflow(workflowId: string): void;
}

// ─── Executor Output Types ───────────────────────────────────────────────────
// Standardized output shapes for each built-in node type.
// All outputs include previewUrl / width / height for canvas rendering.
// The `type` discriminator enables discriminated union narrowing at runtime.

/**
 * Position of an image within a canvas coordinate space.
 * Used when image dimensions differ from the canvas they are placed in.
 */
export interface ImagePosition {
  x: number;
  y: number;
}

/**
 * Unified image runtime contract (R2 — Mandatory Rule).
 *
 * All image node outputs must conform to this shape. The `data` field holds
 * the canonical pixel data (ImageData for processing nodes, Blob for Export).
 *
 * The `canvasWidth` / `canvasHeight` / `position` fields model the image's
 * placement within a shared canvas coordinate system (used by Composite).
 * When absent the image fills its own dimensions at (0, 0).
 *
 * Design: openspec/changes/node-editor-comfyui-refactor/design.md §10
 */
export interface ImageRuntimeObject {
  /** Pixel data for inter-node transmission.
   * - Image processing nodes (LoadImage, Transform, etc.): ImageData
   * - Export node: Blob (the exported file) */
  data: ImageData | Blob;
  /** Native width of the pixel data */
  width: number;
  /** Native height of the pixel data */
  height: number;
  /** Width of the canvas this image occupies (>= width). Defaults to width. */
  canvasWidth?: number;
  /** Height of the canvas this image occupies (>= height). Defaults to height. */
  canvasHeight?: number;
  /** Top-left offset of the image within its canvas. Defaults to (0, 0). */
  position?: ImagePosition;
  /** Blob URL for UI preview (managed by ImageMemoryManager lifecycle) */
  previewUrl: string;
  /** Optional: source file name (populated by LoadImage) */
  sourceFileName?: string;
}

/** Base fields present on every executor output */
export interface BaseExecutorOutput {
  previewUrl: string;
  width: number;
  height: number;
}

// ─── IRO format helpers ───────────────────────────────────────────────────
// These helpers allow UI code to read executor output regardless of whether
// the executor uses the new ImageRuntimeObject format or the old raw ImageData format.
// Backward compatibility: both old and new formats are supported.

/** Type guard: true when value is ImageRuntimeObject (has data + previewUrl) */
function isImageRuntimeObject(v: unknown): v is ImageRuntimeObject {
  return typeof v === 'object' && v !== null && 'previewUrl' in v && 'data' in v;
}

/** Type guard: true when value has a `width` property */
function hasWidthProp(v: unknown): v is { width: number } {
  return typeof v === 'object' && v !== null && 'width' in v;
}

/** Type guard: true when value has a `height` property */
function hasHeightProp(v: unknown): v is { height: number } {
  return typeof v === 'object' && v !== null && 'height' in v;
}

/**
 * Read image pixel data from executor output.
 * - New format: `image: ImageRuntimeObject` ({ data: ImageData, width, height, previewUrl })
 * - Old format: `image: ImageData` (raw ImageData)
 * Returns undefined for Export nodes (where `data` is a Blob).
 */
export function unwrapImageData(
  value: ImageData | ImageRuntimeObject | undefined
): ImageData | undefined {
  if (!value) return undefined;
  if (isImageRuntimeObject(value)) {
    // value is ImageRuntimeObject — extract data field, check it's ImageData (not Blob)
    const d = value.data;
    if (hasWidthProp(d) && hasHeightProp(d)) return d as ImageData;
    return undefined; // Blob (Export node)
  }
  // value is raw ImageData (old format)
  return value as ImageData;
}

/**
 * Read previewUrl from executor output.
 * - Export format: top-level `previewUrl` field (Blob URL)
 * - New format: ImageRuntimeObject.previewUrl
 * - Old format: returns fallback (no previewUrl field)
 */
export function unwrapPreviewUrl(
  value: ImageData | ImageRuntimeObject | undefined,
  fallback: string | undefined
): string | undefined {
  if (!value) return fallback;

  // Export format: direct previewUrl field on the result object
  if (typeof value === 'object' && 'previewUrl' in value) {
    const v = value as { previewUrl?: string };
    return v.previewUrl ?? fallback;
  }

  if (isImageRuntimeObject(value)) return (value as ImageRuntimeObject).previewUrl;
  return fallback;
}

/** Read width — supports both old (ImageData) and new (IRO) formats */
export function unwrapWidth(
  value: ImageData | ImageRuntimeObject | undefined,
  fallback: number | undefined
): number | undefined {
  if (!value) return fallback;
  if (hasWidthProp(value)) return value.width;
  return fallback;
}

/** Read height — supports both old (ImageData) and new (IRO) formats */
export function unwrapHeight(
  value: ImageData | ImageRuntimeObject | undefined,
  fallback: number | undefined
): number | undefined {
  if (!value) return fallback;
  if (hasHeightProp(value)) return value.height;
  return fallback;
}

/** Read canvasWidth — falls back to regular width for backward compat */
export function unwrapCanvasWidth(value: ImageRuntimeObject | undefined, fallback: number): number {
  if (!value) return fallback;
  return value.canvasWidth ?? value.width;
}

/** Read canvasHeight — falls back to regular height for backward compat */
export function unwrapCanvasHeight(value: ImageRuntimeObject | undefined, fallback: number): number {
  if (!value) return fallback;
  return value.canvasHeight ?? value.height;
}

/** Read image position within canvas — defaults to (0, 0) */
export function unwrapPosition(value: ImageRuntimeObject | undefined): ImagePosition {
  return value?.position ?? { x: 0, y: 0 };
}

export interface LoadImageExecutorOutput extends BaseExecutorOutput {
  type: 'load-image';
  image: ImageRuntimeObject;
  crossOriginWarning?: string;
}

export interface LoadMaskExecutorOutput extends BaseExecutorOutput {
  type: 'load-mask';
  mask: ImageRuntimeObject;
  previewUrl: string;
  width: number;
  height: number;
}

export interface ApplyMaskExecutorOutput extends BaseExecutorOutput {
  type: 'apply-mask';
  image: ImageRuntimeObject;
}

export interface CompositeExecutorOutput extends BaseExecutorOutput {
  type: 'composite';
  image: ImageRuntimeObject;
}

export interface TransformExecutorOutput extends BaseExecutorOutput {
  type: 'transform';
  image: ImageRuntimeObject;
}

export interface ExportExecutorOutput extends BaseExecutorOutput {
  type: 'export';
  previewUrl: string;
  width: number;
  height: number;
  mimeType: string;
  dataUrl: string;
}

/** Discriminated union of all executor outputs */
export type ExecutorOutput =
  | LoadImageExecutorOutput
  | LoadMaskExecutorOutput
  | ApplyMaskExecutorOutput
  | CompositeExecutorOutput
  | TransformExecutorOutput
  | ExportExecutorOutput;
