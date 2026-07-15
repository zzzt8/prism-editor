// M2-B: DesignState → RenderResult round-trip mapping.
//
// Architecture:
// - `mapFlowResultToRenderResult(flow, designState, flowResult)` is the
//   single place that turns a `ExecuteFlowResult` (engine-internal: node
//   output bag + collected slot frames) into a public `RenderResult`.
// - Output order is fully determined by `flow.explicitOutputs` declaration
//   order (after `requestedOutputSlots` filtering inside `executeFlow`).
//   This is the audit-stable contract from M2-A / Guardrails §1.8 — no
//   `Object.keys(...).pop()`-style implicit selection lives in this file.
// - The legacy `buildWorkflowFromDesignState` (hard-coded 4-node pipeline)
//   and `mapExecutorResultToRenderResult` (single-output extractor) were
//   the M1-B shape; they were removed because they encode the M0 scenario
//   pipeline literally. M2-B drives a *real* per-template Flow (see
//   `flow-execution.ts`).

import type {
  DesignState,
  RenderResult,
  RenderResultOutput,
  RenderResultStatus,
} from '@prism/shared-types';
import { validateDesignState } from '@prism/shared-types';
import type { Flow } from '@prism/shared-types';

import type { ExecuteFlowResult } from './flow-execution';

/**
 * Map a `status` enum to the public `RenderResultStatus`
 * (`done | error | cancelled`). The two are aligned by design; this is a
 * structural cast with an exhaustiveness guard.
 */
function mapStatus(status: 'done' | 'error' | 'cancelled'): RenderResultStatus {
  switch (status) {
    case 'done':
    case 'error':
    case 'cancelled':
      return status;
    default: {
      const exhaustive: never = status;
      throw new Error(`Unknown ExecuteFlowResult status: ${String(exhaustive)}`);
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
 * Re-export the helper that downstream tests / adapters use to assert
 * on `DesignState` shape. The underlying ajv entry is unchanged.
 */
export { validateDesignState } from '@prism/shared-types';

/**
 * Assert-validate a `DesignState` (M1-A ajv entry). Pure pass-through;
 * throws `ValidationError` unchanged.
 */
export function assertValidDesignState(ds: unknown): asserts ds is DesignState {
  validateDesignState(ds);
}

/**
 * Build `RenderResult.outputs[]` from an `ExecuteFlowResult.outputs[]`.
 *
 * The list is already in `flow.explicitOutputs` declaration order
 * (filtered by `requestedOutputSlots`); this wrapper is mainly an
 * identity-with-narrowing for the public type. Tests verify here that
 * no implicit ordering step runs at this layer (Guardrails §1.8).
 *
 * Public; exported for downstream adapters / consumer tests.
 */
export function buildRenderResultOutputs(
  flowResult: ExecuteFlowResult,
): ReadonlyArray<RenderResultOutput> {
  return flowResult.outputs;
}

/**
 * Pack an `ExecuteFlowResult` into a public `RenderResult`.
 *
 * - `RenderResult.templateVersion` mirrors `designState.templateVersion`
 *   (Guardrails §2.2 / §2.4).
 * - `RenderResult.outputs[]` is already in `flow.explicitOutputs`
 *   declaration order — this function MUST NOT re-sort, re-filter, or
 *   walk `executorResult.results` (Guardrails §1.8).
 * - `timingMs.endedAt` is wall-clock at the time of mapping.
 *
 * Status mapping:
 * - `done`     → ≥1 output, no `error`
 * - `error`    → `error.code/message` derived from executor error string
 * - `cancelled`→ no outputs, no error
 */
export function mapFlowResultToRenderResult(
  flow: Flow,
  designState: DesignState,
  flowResult: ExecuteFlowResult,
): RenderResult {
  const endedAt = Date.now();
  const status = mapStatus(flowResult.executorResult.status);

  const base = {
    schemaVersion: 2 as const,
    renderId: flowResult.renderId,
    designState,
    templateVersion: designState.templateVersion,
    status,
    outputs: status === 'done' ? buildRenderResultOutputs(flowResult) : [],
    timingMs: { startedAt: flowResult.startedAt, endedAt },
  };

  if (status === 'error' && flowResult.executorResult.error) {
    return {
      ...base,
      error: {
        code: classifyErrorCode(flowResult.executorResult.error),
        message: flowResult.executorResult.error,
      },
    };
  }

  // Reference `flow` to satisfy linters; flow is part of the contract
  // surface even though it does not appear in `RenderResult` shape — the
  // audit trail is held together via `designState.flowKey === flow.flowKey`
  // (asserted by `validateRenderResult` post-validation in shared-types).
  void flow;

  return base as RenderResult;
}
