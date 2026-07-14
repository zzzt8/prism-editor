// RenderRequest — public render invocation contract.
//
// Wraps a `DesignState` snapshot with optional opaque tracing fields and a
// request-scoped options bag. The runtime (Browser / Node) MUST validate the
// embedded DesignState before scheduling execution (see M1-A `validation/`).
//
// Per PRISM_TARGET_ARCHITECTURE §4 and PRISM_ARCHITECTURE_GUARDRAILS §1.5:
// - The same `DesignState` (and thus the same `RenderRequest`) is valid input
//   to both Browser Runtime and Production Runtime.
// - Mall business IDs (userId / skuId / orderId) MUST NOT appear as new fields
//   here. Tracing identifiers stay opaque.
//
// M2-A refinement: `requestedOutputSlots` is now a required non-empty array
// (was implicit before; Guardrails §1.8). The Flow selection happens via
// `DesignState.flowKey`; this request only declares which slots to collect
// and MUST NOT carry a second `flowKey` (schema `additionalProperties: false`).

import type { DesignState } from './design-state';

/** Optional opaque trace field set. M1 does not interpret these. */
export interface RenderRequestTrace {
  readonly requestId?: string;
  readonly traceId?: string;
  readonly externalReferenceId?: string;
}

/** Render-call runtime options. */
export interface RenderRequestOptions {
  /** Hard timeout in milliseconds. 0 / undefined means no timeout. */
  readonly timeoutMs?: number;
  /** When true, run stages may run in parallel where the executor allows it. */
  readonly preferParallel?: boolean;
  /**
   * Target lane override. When absent, the runtime picks the lane
   * naturally. M1 does not choose by side-effect — explicit only.
   */
  readonly targetLane?: 'preview' | 'production';
  /** Cooperative cancel signal. */
  readonly signal?: never; // signal cannot cross JSON; pass via runtime, not payload.
}

/**
 * RenderRequest — wraps a validated DesignState for either Browser Runtime
 * (preview) or Production Runtime (render). The same payload is valid in
 * both runtimes (Guardrails §1.5).
 *
 * M2-A contract:
 * - `requestedOutputSlots` is required and must be non-empty
 *   (Guardrails §1.8 — outputs must be explicitly declared).
 * - `flowKey` MUST NOT appear here; `DesignState.flowKey` is the single
 *   authoritative selector (Decision 5 in design.md). The schema's
 *   `additionalProperties: false` rejects any attempt to carry a second
 *   flowKey.
 * - Slot pattern: `^[a-zA-Z][a-zA-Z0-9._-]{0,127}$` (matches the
 *   `Flow.explicitOutputs[].slot` and `RuntimeTemplateFlow.explicitOutputs[].slot`
 *   constraints).
 * - Max 64 slots per request to bound the render fan-out.
 *
 * Consumers MUST `validateDesignState(designState)` before scheduling
 * execution; this type does not embed the validation result.
 */
export interface RenderRequest {
  /** The validated DesignState snapshot driving this render. */
  readonly designState: DesignState;
  /**
   * Public output slot names requested from this render (M2-A required).
   * Must be a non-empty subset of the slots declared by the resolved
   * Flow's `explicitOutputs`. The runtime MUST reject requests whose
   * requestedOutputSlots is empty (`REQUESTED_OUTPUTS_EMPTY`).
   */
  readonly requestedOutputSlots: ReadonlyArray<string>;
  /** Optional tracing fields, opaque to Prism. */
  readonly trace?: RenderRequestTrace;
  /** Optional runtime options; defaults applied by the executor. */
  readonly options?: RenderRequestOptions;
}
