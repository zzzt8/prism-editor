// M2-B: Flow resolution error surface.
//
// Eight stable error codes surfaced by the engine's flow resolution &
// execution pipeline. The codes are public — `server/` (M2-C) translates
// them into HTTP statuses, `apps/dev-tool/` (M3+) renders them into
// editor UI affordances. Adding new codes requires bumping the engine's
// FLOW_RESOLVER_ERROR_CODES object literal; renaming / removing a code
// is a breaking change and must ship with a migration note.
//
// Mapping (per `openspec/changes/m2-b-workflow-core-explicit-flow-resolution/design.md`):
//
// | code                       | raised by                                          | trigger                              |
// |----------------------------|----------------------------------------------------|--------------------------------------|
// | FLOW_NOT_FOUND             | `resolveFlow`                                      | flowKey missing in templateVersion   |
// | DUPLICATE_FLOW_KEY         | `resolveFlow`                                      | 2+ flows share same flowKey          |
// | TEMPLATE_VERSION_NOT_FOUND | `resolveTemplateVersion`                           | catalog has no matching version      |
// | FLOW_OUTPUTS_MISSING       | `executeFlow` / ajv post-validation                | flow.explicitOutputs.length === 0    |
// | OUTPUT_SLOT_DUPLICATE      | ajv post-validation (in shared-types)              | flow.explicitOutputs[].slot unique   |
// | OUTPUT_NODE_NOT_FOUND      | ajv post-validation (in shared-types)              | explicitOutputs[].nodeId ∈ nodeRefs  |
// | OUTPUT_PORT_NOT_FOUND      | `executeFlow` + node-definitions                   | explicitOutputs[].port ∈ node defs  |
// | REQUESTED_OUTPUT_UNKNOWN   | `executeFlow`                                      | requestedOutputSlots contains unknown |
// | DECLARED_OUTPUT_NOT_PRODUCED| `executeFlow`                                     | explicit output slot has no produced image |

/**
 * Stable, exhaustive registry of flow-resolver error codes.
 *
 * `as const` makes this a literal-type registry; consumers can use
 * `keyof typeof FLOW_RESOLVER_ERROR_CODES` to derive a `FlowResolverErrorCode`
 * union at type level without a parallel manual declaration.
 *
 * Note: the eight codes listed in `design.md` Decision 6 cover the flow
 * execution path; `resolveTemplateVersion` errors come from the resolver
 * boundary and add the ninth code below — both groups are surfaced by
 * the same `FlowResolverError` class for unified downstream handling.
 */
export const FLOW_RESOLVER_ERROR_CODES = {
  FLOW_NOT_FOUND: 'FLOW_NOT_FOUND',
  DUPLICATE_FLOW_KEY: 'DUPLICATE_FLOW_KEY',
  TEMPLATE_VERSION_NOT_FOUND: 'TEMPLATE_VERSION_NOT_FOUND',
  FLOW_OUTPUTS_MISSING: 'FLOW_OUTPUTS_MISSING',
  OUTPUT_SLOT_DUPLICATE: 'OUTPUT_SLOT_DUPLICATE',
  OUTPUT_NODE_NOT_FOUND: 'OUTPUT_NODE_NOT_FOUND',
  OUTPUT_PORT_NOT_FOUND: 'OUTPUT_PORT_NOT_FOUND',
  REQUESTED_OUTPUT_UNKNOWN: 'REQUESTED_OUTPUT_UNKNOWN',
  DECLARED_OUTPUT_NOT_PRODUCED: 'DECLARED_OUTPUT_NOT_PRODUCED',
} as const;

/**
 * Compile-time union of every registered flow-resolver error code.
 * Derived from `FLOW_RESOLVER_ERROR_CODES` so the runtime registry and
 * the type system cannot drift.
 */
export type FlowResolverErrorCode =
  (typeof FLOW_RESOLVER_ERROR_CODES)[keyof typeof FLOW_RESOLVER_ERROR_CODES];

/**
 * Engine-layer error emitted by `resolveFlow` / `resolveTemplateVersion` /
 * `executeFlow`. Distinct from `ValidationError` (which is shared-types-level,
 * ajv-emitted, schema-relative). `FlowResolverError` carries a `code` plus
 * optional `context` (templateId / version / flowKey / slot / nodeId) for
 * downstream audit logs.
 */
export class FlowResolverError extends Error {
  /** Stable machine code; one of `FLOW_RESOLVER_ERROR_CODES`. */
  public readonly code: FlowResolverErrorCode;
  /** Diagnostic context (templateId / flowKey / slot / nodeId / port). */
  public readonly context: Record<string, unknown>;

  constructor(
    code: FlowResolverErrorCode,
    message: string,
    context: Record<string, unknown> = {},
  ) {
    super(`Prism flow resolver error [${code}]: ${message}`);
    this.name = 'FlowResolverError';
    this.code = code;
    this.context = Object.freeze({ ...context });
  }
}
