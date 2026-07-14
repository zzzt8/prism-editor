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

import type { ImageRef } from './image';
import type { DesignState } from './design-state';

/** Render end-status. */
export type RenderResultStatus = 'done' | 'error' | 'cancelled';

/**
 * Single rendered output frame.
 *
 * M1 contract: a `done` RenderResult exposes at least one output. The
 * multi-output / explicitOutputs model is M2 (see Guardrails §1.8).
 */
export interface RenderResultOutput {
  /** Stable output identifier (use for idempotency / caching / audit). */
  readonly id: string;
  /** Final-frame image reference (opaque to consumers). */
  readonly image: ImageRef;
  /**
   * Slot name (e.g. 'mockup', 'cutting-preview'). M1 single-slot semantics;
   * M2 will introduce `explicitOutputs`.
   */
  readonly slot: string;
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
 */
export interface RenderResult {
  /** Stable render id (UUID/ULID/structured). */
  readonly renderId: string;
  /** Mirror of the input DesignState, used to audit and re-derive inputs. */
  readonly designState: DesignState;
  /** Final status. */
  readonly status: RenderResultStatus;
  /** Output frames (≥1 when status === 'done'; 0..n otherwise). */
  readonly outputs: ReadonlyArray<RenderResultOutput>;
  /** Required only when status === 'error'. */
  readonly error?: RenderError;
  /** Required. */
  readonly timingMs: RenderTiming;
}
