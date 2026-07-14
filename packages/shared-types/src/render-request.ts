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
 * Consumers MUST `validateDesignState(designState)` before scheduling
 * execution; this type does not embed the validation result.
 */
export interface RenderRequest {
  /** The validated DesignState snapshot driving this render. */
  readonly designState: DesignState;
  /** Optional tracing fields, opaque to Prism. */
  readonly trace?: RenderRequestTrace;
  /** Optional runtime options; defaults applied by the executor. */
  readonly options?: RenderRequestOptions;
}
