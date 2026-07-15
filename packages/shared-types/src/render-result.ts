// RenderResult — public render output contract.
//
// Cross-runtime output shape. Both Browser Runtime and Production Runtime
// MUST emit this same shape for a given DesignState (Guardrails §1.5).
//
// RenderResult intentionally does NOT expose internal ExecutorOutput
// intermediate types (no `IRO`, no `BaseExecutorOutput` variants). Only the
// final rendered frame is published as `RenderResultOutput.image` (an
// `ImageRef`). This protects Mall consumers from leaking executor internals
// (Guardrails §2.1).
//
// M2-A refinement: `templateVersion` and `outputs[].flowKey` are required so
// consumers can audit a result without expanding the embedded DesignState.
// The runtime / executor MUST produce outputs in the order declared by the
// resolved Flow's `explicitOutputs` (filtered through `requestedOutputSlots`
// from the request). M2-A only validates the shape — the engine-side ordering
// is enforced in M2-B (workflow-core explicit flow resolution).

import type { ImageRef } from './image';
import type { DesignState } from './design-state';
import type { FlowKey } from './flow';

/** Render end-status. */
export type RenderResultStatus = 'done' | 'error' | 'cancelled';

/**
 * Single rendered output frame.
 *
 * M1 contract: a `done` RenderResult exposes at least one output. The
 * multi-output / explicitOutputs model is M2 (see Guardrails §1.8).
 *
 * M2-A: each output carries its own `flowKey` so consumers can audit
 * which flow produced it (== `designState.flowKey`); ordering is
 * enforced by the executor to match `Flow.explicitOutputs` (M2-B).
 */
export interface RenderResultOutput {
  /** Stable output identifier (use for idempotency / caching / audit). */
  readonly id: string;
  /** Final-frame image reference (opaque to consumers). */
  readonly image: ImageRef;
  /**
   * Public slot name (e.g. 'mockup', 'cutting-preview'). The runtime
   * MUST produce outputs in the order declared by the resolved
   * Flow's `explicitOutputs` (filtered by `RenderRequest.requestedOutputSlots`).
   */
  readonly slot: string;
  /**
   * Flow key this output came from (M2-A required; must equal
   * `designState.flowKey`). Allows consumers to audit which flow
   * produced this output without expanding the embedded DesignState.
   */
  readonly flowKey: FlowKey;
}

/** Error payload — present only when status === 'error'. */
export interface RenderError {
  readonly code: string;
  readonly message: string;
}

/** Timing sample for observability. */
export interface RenderTiming {
  /** Unix ms timestamp at scheduling. */
  readonly startedAt: number;
  /** Unix ms timestamp at terminal status. */
  readonly endedAt: number;
}

/**
 * RenderResult — emitted identically by Browser Runtime and Production Runtime
 * (Guardrails §1.5, §2.4). Contains the originating `designState` for audit
 * traceability (§2.2 / §2.4).
 *
 * M2-A: `templateVersion` is required and is verified equal to
 * `designState.templateVersion` (Decision 6 / §2.4 audit). This lets
 * consumers locate the template version that produced this result
 * without expanding the embedded DesignState. `schemaVersion` is bumped
 * to 2.
 */
export interface RenderResult {
  /** Protocol schema version. M1 = 1; M2-A = 2. */
  readonly schemaVersion: 2;
  /** Stable render id (UUID/ULID/structured). */
  readonly renderId: string;
  /** Mirror of the input DesignState, used to audit and re-derive inputs. */
  readonly designState: DesignState;
  /**
   * Template version that produced this result (M2-A required; must
   * equal `designState.templateVersion`). Allows consumers to locate
   * the template version without expanding the embedded DesignState.
   */
  readonly templateVersion: string;
  /** Final status. */
  readonly status: RenderResultStatus;
  /**
   * Output frames (≥1 when status === 'done'; 0..n otherwise).
   * Order is determined by the resolved Flow's `explicitOutputs`
   * declaration (filtered by `RenderRequest.requestedOutputSlots`).
   * M2-A only validates the shape; engine-side ordering is M2-B.
   */
  readonly outputs: ReadonlyArray<RenderResultOutput>;
  /** Required only when status === 'error'. */
  readonly error?: RenderError;
  /** Required. */
  readonly timingMs: RenderTiming;
}
