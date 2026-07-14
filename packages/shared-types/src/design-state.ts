// DesignState — cross-runtime design input snapshot.
//
// M1 contract (§PRISM_TARGET_ARCHITECTURE §4, §PRISM_ARCHITECTURE_GUARDRAILS §1.5, §3):
// - Versioned, JSON-serializable, independent of React/DOM/Zustand/executor.
// - Forbidden payload types: Blob, File, Canvas, ImageBitmap, DOM nodes,
//   Functions, Store references, blob URLs (see §3 of Guardrails).
//
// Consumers:
// - @prism/workflow-core (executeFromDesignState entry)
// - @prism/image-ops (design-state-adapter)
// - @prism/server (Mall-facing render endpoints)
// - apps/dev-tool / apps/composer-sdk
//
// M2-A refinement: `flowKey` is tightened from `string` to the `FlowKey` brand
// declared in `./flow.ts`. `FlowKey` is a format-constrained stable string —
// NOT a closed enum. New flowKeys can be added by configuring new templates
// and Flows; this package does not need to be updated (Guardrails §1.9).
// Pure field-additive, so DesignState.schemaVersion stays at 1.

import type { FlowKey } from './flow';

export type { FlowKey } from './flow';

/** Recursive JSON-safe value union. No functions, no class instances. */
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

/**
 * Stable asset reference carried inside `DesignState.inputs.assets`.
 *
 * Resolution is opaque to Prism — AssetRef is a stable id (or content hash)
 * and optional checksum, not a blob URL or DOM resource.
 */
export interface AssetRef {
  /** Stable reference id; opaque to the runtime. */
  readonly id: string;
  /** Reference kind discriminator. */
  readonly kind: 'inline' | 'remote' | 'prism-asset';
  /** MIME type of the underlying asset, when known. */
  readonly mimeType?: string;
  /** Content checksum (sha256 hex) when kind === 'inline' or 'remote'. */
  readonly checksum?: string;
  /** Original dimensions for image-style assets. */
  readonly width?: number;
  readonly height?: number;
}

export interface DesignStateAssetBinding {
  /** Slot name (e.g. 'base', 'overlay') referenced by the template. */
  readonly slot: string;
  readonly asset: AssetRef;
}

/** Flat parameter bag for the template's declared `inputs`. */
export interface DesignStateParams {
  readonly [parameterKey: string]: JsonValue;
}

/** Input bundle referenced by the template. */
export interface DesignStateInputs {
  /** Ordered asset bindings; ordering is a public convention, not load order. */
  readonly assets: ReadonlyArray<DesignStateAssetBinding>;
  /** Free-form key/value parameters; values must be JSON-serializable. */
  readonly params: DesignStateParams;
}

/** Optional designer/UI metadata; not interpreted by the runtime. */
export interface DesignStateMetadata {
  readonly author?: string;
  readonly tags?: ReadonlyArray<string>;
  readonly description?: string;
}

/**
 * Opaque tracing fields. M1 does not validate the meaning of these values,
 * only their presence as optional strings. They MUST NOT participate in
 * runtime selection logic (per Guardrails §1.3 / §4.1).
 */
export interface DesignStateTrace {
  readonly requestId?: string;
  readonly traceId?: string;
  readonly externalReferenceId?: string;
}

/**
 * DesignState — the public, versioned, JSON-serializable input snapshot shared
 * across Browser Runtime and Production Runtime (Prism Target Architecture §4).
 *
 * Schema-version policy (see design.md Decision 1):
 * - Pure additive field changes keep `schemaVersion = 1`.
 * - Renaming / removing / retyping fields requires `schemaVersion` bump.
 * - `templateVersion` is the template's content version, independent of `schemaVersion`.
 */
export interface DesignState {
  /** Protocol schema version. M1 = 1 (literal type). */
  readonly schemaVersion: 1;
  /** Runtime template id (matches `RuntimeTemplate.id`). */
  readonly templateId: string;
  /** Immutable template version (matches `RuntimeTemplate.version`). */
  readonly templateVersion: string;
  /**
   * Explicit flow key (M2-A). `FlowKey` is a format-constrained stable string
   * (pattern: `^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$`, maxLength 96); it is
   * NOT a closed enum — adding a new flowKey only requires configuring a
   * new template and Flow, never a shared-types change (Guardrails §1.7,
   * §1.9).
   */
  readonly flowKey: FlowKey;
  /** Template-bound inputs. */
  readonly inputs: DesignStateInputs;
  /** ISO-8601 timestamp when this snapshot was assembled. */
  readonly createdAt: string;
  /** Optional designer metadata. */
  readonly metadata?: DesignStateMetadata;
  /** Optional opaque tracing fields. */
  readonly trace?: DesignStateTrace;
}

/**
 * Compile-time guard: a value is `DesignState` iff it is one (used by
 * runtime validators to provide a precise `asserts input is DesignState`
 * overload).
 */
export type DesignStateInput = DesignState;
