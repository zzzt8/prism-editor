// RuntimeTemplate — runtime template definition contract.
//
// Distinct from `Template` in `./template.ts` (which captures EditorDraft
// snapshots including nodes/edges/groups — used for editor round-tripping).
// `RuntimeTemplate` is the public, render-time contract: a versioned list
// of inputs and flows that the Runtime consumes.
//
// Consumers (M2+):
// - @prism/server reads RuntimeTemplate from storage and exposes it to Mall.
// - Browser Runtime reads it via fetch (M5) or direct import (M6+).
// - Production Runtime reads it on render-call path.
//
// M1 scope: declaration only. `nodes` per-flow is a minimal projection.

import type { JsonValue } from './design-state';

/**
 * Editor-exposed field metadata for a single input slot.
 *
 * `editableSchema` is a JSON Schema Draft-07 fragment describing UI edit
 * constraints (numeric ranges, enums, etc.). It is NOT used by the runtime
 * to validate DesignState — runtime validation uses `validation/*.schema.json`.
 */
export interface RuntimeTemplateInputField {
  /** Stable field identifier (matches DesignState.inputs.params key). */
  readonly id: string;
  /** Human-readable label for editor UI. */
  readonly name: string;
  /**
   * Public port-data-type tag. Mirrors `PortDataType` from
   * `./port-data-types.ts`. The string form lets RuntimeTemplate stay
   * decoupled from enum identity (for cross-language consumers).
   */
  readonly type: string;
  /** When true, the runtime rejects RenderRequest if the field is missing. */
  readonly required: boolean;
  /**
   * Default value used when `DesignState.inputs.params[id]` is absent.
   * Must be JSON-serializable (see `JsonValue`).
   */
  readonly defaultValue?: JsonValue;
  /**
   * Optional UI-only schema. Plain object so consumers may rewrite/forward
   * without coupling to a specific schema runtime.
   */
  readonly editableSchema?: Record<string, unknown>;
}

/**
 * A single flow entry inside RuntimeTemplate.
 *
 * `nodes` is a minimal projection (`{id, type}` only) — it is NOT the
 * full DAG. The full Workflow graph is constructed at runtime by the
 * executor (M1-B / M2+). Public consumers MUST NOT depend on the
 * internal DAG shape (Guardrails §2.1).
 */
export interface RuntimeTemplateFlow {
  /** Stable flow identifier (M2 will constrain to enum). */
  readonly flowKey: string;
  /** Minimal node projection: id + type, no positions, no params. */
  readonly nodes: ReadonlyArray<{ readonly id: string; readonly type: string }>;
}

/**
 * RuntimeTemplate — public, versioned, render-time template description.
 *
 * Independent of `Template` / `EditorDraft` (legacy snapshot model). Created
 * via the runtime build pipeline (M2+); NOT authored directly by users.
 */
export interface RuntimeTemplate {
  /** Stable template identifier. */
  readonly id: string;
  /** Immutable per-template version (Guardrails §2.2). */
  readonly version: string;
  /** Protocol schema version. M1 = 1. */
  readonly schemaVersion: 1;
  /** Human-readable display name for editor / debug. */
  readonly displayName: string;
  /** Public input field declarations. */
  readonly inputs: ReadonlyArray<RuntimeTemplateInputField>;
  /** Declared flows (at least one). */
  readonly flows: ReadonlyArray<RuntimeTemplateFlow>;
  /** ISO-8601 creation timestamp. */
  readonly createdAt: string;
  /** ISO-8601 last-update timestamp. */
  readonly updatedAt: string;
}
