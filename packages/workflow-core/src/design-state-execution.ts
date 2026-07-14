// M1-B: DesignState → RenderResult round-trip entry helpers.
//
// Architecture:
// - `buildWorkflowFromDesignState(ds, params)` is **private to this package**.
//   It is NOT re-exported from `index.ts`, so the internal DAG shape never
//   leaks to consumers.
// - `mapExecutorResultToRenderResult(ds, execResult, renderId, startedAt)` is
//   part of the package-internal pipeline.
// - `executeFromDesignState` (defined as a method on `WorkflowExecutor`) calls
//   ajv `validateDesignState` from `@prism/shared-types`, then constructs a
//   runtime Workflow via the helpers above, calls `execute(workflow, ...)`, and
//   packs the result into a `RenderResult` from `@prism/shared-types`.
//
// Constraints honored:
// - Readonly inputs, no mutation of the inbound `DesignState`.
// - No new platform dependencies (no sharp / canvas at this level).
// - Cannot carry Blob / File / Canvas / ImageBitmap / DOM / Function across
//   the boundary; final output is always a `RenderResult` whose `outputs[].image`
//   is an `ImageRef` (json-safe).
//
// M1-B scope is the 5 fixed M0 fixture scenarios (identity / scale-2x /
// rotate-90 / scale-rotate / translate-scale). The internal workflow shape is
// a fixed 4-node pipeline: load-image → transform → composite → export.

import {
  validateDesignState,
  type DesignState,
  type RenderResult,
  type RenderResultOutput,
  type RenderResultStatus,
  type ImageRef,
} from '@prism/shared-types';
import type { Workflow, WorkflowNode, Connection } from '@prism/shared-types';
import type { ExecutorResult } from './executor';

/**
 * Public-but-package-internal helper. Holds the param bundle that the caller
 * provided (after M1-A ajv validation) so `buildWorkflowFromDesignState` can
 * spread it onto each node's `params`. The bundle shape is:
 *
 * ```ts
 * {
 *   transformParams: { translateX, translateY, scaleX, scaleY, rotation, cropX, cropY, cropWidth, cropHeight },
 *   compositeParams: { blendMode, opacity, canvasWidth, canvasHeight, overlayX, overlayY },
 * }
 * ```
 *
 * For now, M1-B callers (the round-trip integration test) build this bundle
 * explicitly from `M0_SCENARIOS` and pass it in. M2 will let `DesignState`
 * carry the params natively.
 */
export interface ExecuteFromDesignStateParams {
  readonly transformParams: {
    readonly translateX: number;
    readonly translateY: number;
    readonly scaleX: number;
    readonly scaleY: number;
    readonly rotation: number;
    readonly cropX?: number;
    readonly cropY?: number;
    readonly cropWidth?: number;
    readonly cropHeight?: number;
  };
  readonly compositeParams: {
    readonly blendMode: string;
    readonly opacity: number;
    readonly canvasWidth: number;
    readonly canvasHeight: number;
    readonly overlayX: number;
    readonly overlayY: number;
  };
}

const POSITION_ORIGIN = { x: 0, y: 0 } as const;

function makePosition(x: number): { readonly x: number; readonly y: number } {
  return { x, y: POSITION_ORIGIN.y };
}

function makeLoadImageNode(): WorkflowNode {
  return {
    id: 'load-image',
    type: 'load-image',
    position: makePosition(0),
    params: {},
  };
}

function makeTransformNode(params: ExecuteFromDesignStateParams['transformParams']): WorkflowNode {
  return {
    id: 'transform',
    type: 'transform',
    position: makePosition(1),
    params: { ...params },
  };
}

function makeCompositeNode(params: ExecuteFromDesignStateParams['compositeParams']): WorkflowNode {
  return {
    id: 'composite',
    type: 'composite',
    position: makePosition(2),
    params: { ...params },
  };
}

function makeExportNode(): WorkflowNode {
  return {
    id: 'export',
    type: 'export',
    position: makePosition(3),
    params: {},
  };
}

function makeConnection(fromNodeId: string, toNodeId: string, fromPort: string, toPort: string): Connection {
  return {
    id: `${fromNodeId}.${fromPort}->${toNodeId}.${toPort}`,
    from: { nodeId: fromNodeId, port: fromPort },
    to: { nodeId: toNodeId, port: toPort },
  };
}

/**
 * Build a runtime `Workflow` from a (validated) `DesignState`.
 *
 * M1-B: this is a fixed 4-node pipeline mirroring the M0 driver sequence.
 * The `flowKey` is folded into `workflow.name` for traceability.
 *
 * NOT exported from `@prism/workflow-core/src/index.ts`; the internal DAG
 * shape stays private.
 */
export function buildWorkflowFromDesignState(
  ds: DesignState,
  params: ExecuteFromDesignStateParams,
): Workflow {
  const nodes: WorkflowNode[] = [
    makeLoadImageNode(),
    makeTransformNode(params.transformParams),
    makeCompositeNode(params.compositeParams),
    makeExportNode(),
  ];

  const connections: Connection[] = [
    makeConnection('load-image', 'transform', 'image', 'image'),
    makeConnection('transform', 'composite', 'image', 'overlay'),
    makeConnection('composite', 'export', 'image', 'image'),
  ];

  return {
    id: `m1-b:${ds.templateId}@${ds.templateVersion}`,
    name: `flow:${ds.flowKey}`,
    version: ds.templateVersion,
    nodes,
    connections,
    inputs: [],
    outputs: [],
    metadata: {
      createdAt: ds.createdAt,
      updatedAt: ds.createdAt,
      description: `M1-B round-trip workflow (designState.flowKey=${ds.flowKey})`,
    },
  };
}

/**
 * Map a `status` enum from `ExecutorResult` (engine internal) to the public
 * `RenderResultStatus` (`done | error | cancelled`). The two are aligned by
 * design, so this is a structural cast with an exhaustiveness guard.
 */
function mapStatus(status: ExecutorResult['status']): RenderResultStatus {
  switch (status) {
    case 'done':
    case 'error':
    case 'cancelled':
      return status;
    default: {
      const exhaustive: never = status;
      throw new Error(`Unknown ExecutorResult status: ${String(exhaustive)}`);
    }
  }
}

function classifyErrorCode(message: string): 'RENDER_FAILED' | 'RENDER_TIMEOUT' | 'RENDER_CANCELLED' | 'RENDER_INTERNAL_ERROR' {
  const lower = message.toLowerCase();
  if (lower.includes('timeout')) return 'RENDER_TIMEOUT';
  if (lower.includes('cancel')) return 'RENDER_CANCELLED';
  if (lower.includes('input')) return 'RENDER_FAILED';
  return 'RENDER_INTERNAL_ERROR';
}

/**
 * Best-effort extraction of the final output image from the executor's node
 * result bag. M1-B's fixed 4-stage pipeline ends at the `export` node which
 * returns `{ dataUrl, previewUrl, format, dimensions }` per
 * `ExportExecutorOutput`. We accept any string-shaped preview/dataUrl and
 * synthesize an `ImageRef`. If the result shape is non-conforming, returns
 * `null` so the caller can decide error semantics.
 */
function extractFinalImage(execResult: ExecutorResult, workflowId: string): ImageRef | null {
  const exportOutputs = execResult.results['export'];
  if (!exportOutputs) return null;

  const dataUrl = (exportOutputs['dataUrl'] ?? exportOutputs['previewUrl']) as string | undefined;
  if (typeof dataUrl !== 'string') return null;

  const dims = exportOutputs['dimensions'] as { width: number; height: number } | undefined;
  const format = (exportOutputs['format'] as string | undefined) ?? 'image/png';

  if (dataUrl.startsWith('data:')) {
    return {
      type: 'data-url',
      url: dataUrl,
      width: dims?.width ?? 0,
      height: dims?.height ?? 0,
      mimeType: format,
    };
  }
  if (dataUrl.startsWith('blob:')) {
    return {
      type: 'blob-url',
      url: dataUrl,
      width: dims?.width ?? 0,
      height: dims?.height ?? 0,
      mimeType: format,
    };
  }
  return {
    type: 'cross-origin-url',
    url: dataUrl,
    width: dims?.width ?? 0,
    height: dims?.height ?? 0,
    mimeType: format,
  };
}

/**
 * Pack an `ExecutorResult` into a public `RenderResult`.
 *
 * Status mapping:
 * - `done`     → at least 1 output, no `error`
 * - `error`    → `error.code` derived from message keywords; no outputs
 * - `cancelled`→ no outputs, no error (caller may inspect downstream)
 *
 * `renderId` is provided by the caller (typically derived from `DesignState.trace.requestId`).
 * `startedAt` is the wall-clock ms when scheduling began (caller-recorded).
 */
export function mapExecutorResultToRenderResult(
  ds: DesignState,
  execResult: ExecutorResult,
  renderId: string,
  startedAt: number,
): RenderResult {
  const endedAt = Date.now();
  const status = mapStatus(execResult.status);

  const outputs: ReadonlyArray<RenderResultOutput> =
    status === 'done'
      ? (() => {
          const image = extractFinalImage(execResult, ds.templateId);
          if (!image) {
            return [] as ReadonlyArray<RenderResultOutput>;
          }
          return [
            {
              id: `${renderId}-output-0`,
              image,
              slot: ds.flowKey,
            },
          ];
        })()
      : [];

  const base = {
    renderId,
    designState: ds,
    status,
    outputs,
    timingMs: { startedAt, endedAt },
  };

  if (status === 'error' && execResult.error) {
    return {
      ...base,
      error: {
        code: classifyErrorCode(execResult.error),
        message: execResult.error,
      },
    };
  }

  return base;
}

/**
 * Validate a `DesignState` (M1-A ajv entry) and throw on failure.
 * Pure pass-through; throws `ValidationError` unchanged.
 */
export function assertValidDesignState(ds: unknown): asserts ds is DesignState {
  validateDesignState(ds);
}
