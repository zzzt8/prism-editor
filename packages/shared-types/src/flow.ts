// Flow — authoritative runtime flow definition (M2-A).
//
// A `Flow` is the immutable, version-time-defined structure that maps
// `flowKey` → nodeRefs → `explicitOutputs`. It is the single source of truth
// for:
//   - which nodes participate in a flow (FlowNodeRef)
//   - which (nodeId, port) pairs are exposed as output slots (FlowOutput)
//   - the public, audit-stable order of outputs (Flow.explicitOutputs array order)
//
// `Flow` is internal to the engine / server. Mall-facing protocols
// (`RuntimeTemplate.flows[]`) only project the public subset `FlowOutputSlot`.
//
// Per PRISM_ARCHITECTURE_GUARDRAILS §1.7 / §1.8:
//   - Flow selection happens by `flowKey` (no `findFirst`).
//   - Output selection happens by `Flow.explicitOutputs` declaration order
//     (no implicit traversal of executor results).
//
// Per PRISM_MIGRATION_ROADMAP §2 M2:
//   `flowKey` is a format-constrained stable string (non-enum). The pattern
//   and length live in `validation/flow.schema.json` (ajv).
//
// Consumers:
//   - @prism/workflow-core (M2-B: explicit flow resolution)
//   - @prism/server (M2-C: deterministic render entry)
//   - apps/dev-tool (template authoring / Flow editor)

/**
 * Stable `flowKey` brand.
 *
 * Format constraints (enforced by `flow.schema.json`):
 *   - pattern: `^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$`
 *   - minLength: 1, maxLength: 96
 *
 * NOTE: This is NOT a closed enum. New flowKeys can be added by configuring
 * new templates and Flows; the shared-types package does not need to be
 * updated. This is required by Guardrails §1.9 (new categories must not
 * require Mall frontend changes).
 */
export type FlowKey = string & { readonly __brand: 'FlowKey' };

/**
 * Output kind discriminator.
 *
 * Public — Mall can use it to drive UI affordances (preview vs mask vs metadata).
 * Not a closed enum at the wire level; the schema restricts it to the four
 * known values for forward compatibility.
 */
export type FlowKind = 'image' | 'mask' | 'json' | 'metadata';

/**
 * Single entry inside a Flow's `explicitOutputs`.
 *
 * Carries the internal `(nodeId, port)` binding that the executor uses to
 * collect the output, plus the public projection fields (`slot`, `kind`,
 * `mediaType`). Only consumed by engine / server; never leaks to Mall.
 */
export interface FlowOutput {
  /**
   * Public output slot name. Must be unique within a single Flow.
   * Pattern: `^[a-zA-Z][a-zA-Z0-9._-]{0,127}$` (matches the
   * `RenderRequest.requestedOutputSlots` constraint; enforced by ajv).
   */
  readonly slot: string;
  /** Flow-internal node id (must exist in `Flow.nodeRefs`). */
  readonly nodeId: string;
  /** Output port name on the node (engine-side validation in M2-B). */
  readonly port: string;
  /** Output type semantic. */
  readonly kind: FlowKind;
  /** Optional MIME/format metadata (e.g. `image/png`, `application/json`). */
  readonly mediaType?: string;
}

/**
 * Public projection of a Flow output slot.
 *
 * What Mall can see / consume via `RuntimeTemplate.flows[].explicitOutputs`.
 * Does NOT include `nodeId` or `port` (Guardrails §2.1).
 */
export interface FlowOutputSlot {
  /** Public output slot name. */
  readonly slot: string;
  /** Public type semantic. */
  readonly kind: FlowKind;
  /** Optional MIME/format metadata (public). */
  readonly mediaType?: string;
}

/**
 * Reference to a node participating in a Flow.
 *
 * Carries only the stable id + type. Position / params / internal DAG
 * details are NOT part of `Flow` (they belong to the engine-internal
 * `Workflow` shape).
 */
export interface FlowNodeRef {
  /** Stable node id (matches `WorkflowNode.id` in the engine). */
  readonly nodeId: string;
  /** Stable node type discriminator (matches `NodeDefinition.type`). */
  readonly nodeType: string;
}

/**
 * Flow — authoritative, immutable definition of a single runtime flow.
 *
 * Schema version policy:
 *   - `schemaVersion: 1` is the M2-A initial version.
 *   - Pure additive field changes → keep `1`.
 *   - Renaming / removing / retyping → must bump to `2`.
 */
export interface Flow {
  /** Protocol schema version. M2-A = 1 (literal type). */
  readonly schemaVersion: 1;
  /** Stable flow selector (Guardrails §1.7). */
  readonly flowKey: FlowKey;
  /** Nodes participating in this flow. Order is informational, not load order. */
  readonly nodeRefs: ReadonlyArray<FlowNodeRef>;
  /**
   * Authoritative output map. Order is the audit-stable output order
   * (Guardrails §1.8). Each `nodeId` must exist in `nodeRefs` (validated
   * by `validateFlow` post-validation in `validation/index.ts`).
   */
  readonly explicitOutputs: ReadonlyArray<FlowOutput>;
}
