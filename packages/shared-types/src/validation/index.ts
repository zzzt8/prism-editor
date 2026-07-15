// M1-A: ajv-backed runtime validators for public Prism contracts.
//
// Each validator exposes a TypeScript-style assertion so consumers get both
// runtime validation and compile-time narrowing:
//
//     validateDesignState(input);  // throws on failure
//     const ds: DesignState = input; // narrowed by `asserts`
//
// Per PRISM_ARCHITECTURE_GUARDRAILS §3 the public contract is JSON-safe and
// JSON-Schema-validated; this file is the only one allowed to know both
// representations.
//
// M2-A additions:
// - `validateFlow(input)` / `validateFlowKey(input)` entries.
// - Custom ajv keywords `uniqueFlowKey` and `uniqueSlot`.
// - Post-validation: `Flow.explicitOutputs[].nodeId ∈ Flow.nodeRefs[].nodeId`
//   (error code `OUTPUT_NODE_NOT_FOUND`).
// - Post-validation: `RenderResult.templateVersion === designState.templateVersion`
//   and `RenderResult.outputs[].flowKey === designState.flowKey`.
//
// Implementation note:
//   The package is built with TypeScript `composite: true` and the schema
//   files live next to this source as JSON siblings. The runtime resolves
//   the schema directory from `package.json` so cross-package consumers
//   (vitest with `@fs` URL rewriting, node production, dev-tool vitest) all
//   see the same canonical path.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';

import type { DesignState } from '../design-state';
import type { Flow, FlowKey } from '../flow';
import type { RenderRequest } from '../render-request';
import type { RenderResult } from '../render-result';
import type { RuntimeTemplate } from '../runtime-template';

/** Re-export the ErrorObject type for consumers. */
export type { ErrorObject } from 'ajv';

/** Public error thrown by the validators. Carries JSON-Pointer-style paths. */
export class ValidationError extends Error {
  public readonly target: string;
  public readonly errors: ReadonlyArray<ErrorObject>;

  constructor(target: string, errors: ReadonlyArray<ErrorObject> | null | undefined) {
    const detail = (errors ?? [])
      .map((e) => `${e.instancePath || '/'} ${e.message ?? ''}`.trim())
      .join('; ');
    super(`Prism validation failed for ${target}: ${detail || 'no detail'}`);
    this.name = 'ValidationError';
    this.target = target;
    this.errors = Object.freeze(errors ? [...errors] : []);
  }
}

interface JsonSchema {
  readonly $id: string;
  readonly [key: string]: unknown;
}

/**
 * Resolve the directory containing the package's source `.schema.json` files.
 *
 * Works for both source invocations (`pnpm --filter @prism/shared-types test`)
 * and built-artefact invocations (consumers importing `@prism/shared-types`
 * from `dist/...`). It does so by walking up from the calling module to the
 * nearest `package.json` and then descending into `dist/src/validation` if
 * present, else `src/validation`.
 */
function resolveSchemaDir(): string {
  // ESM: derive `__dirname` from `import.meta.url`.
  // After tsc emits to dist/src/validation/index.js, dirname(...) gives
  // `.../dist/src/validation`. The JSON files live in the same directory.
  return dirname(fileURLToPath(import.meta.url));
}

const SCHEMA_DIR = resolveSchemaDir();

function loadSchema(name: string): JsonSchema {
  const path = join(SCHEMA_DIR, name);
  const raw = readFileSync(path, 'utf-8');
  return JSON.parse(raw) as JsonSchema;
}

const designStateSchema = loadSchema('design-state.schema.json');
const flowSchema = loadSchema('flow.schema.json');
const renderRequestSchema = loadSchema('render-request.schema.json');
const renderResultSchema = loadSchema('render-result.schema.json');
const runtimeTemplateSchema = loadSchema('runtime-template.schema.json');

// ajv instance is module-local; one instance keeps compiled validators cached.
const ajv = new Ajv({
  allErrors: true,
  strict: true,
  removeAdditional: false,
  useDefaults: true,
});

// M2-A: Custom keywords for cross-field uniqueness (Decision 8).
//
// `uniqueFlowKey`: applied to a `RuntimeTemplate.flows[]`-shaped array
// (each element has a `flowKey` field). Returns false if any two entries
// share the same `flowKey`. The same check is also performed as a
// post-validation step in higher-level aggregators (M2-B) to throw
// `ValidationError` with code `DUPLICATE_FLOW_KEY`.
//
// `uniqueSlot`: applied to a `Flow.explicitOutputs[]`-shaped array
// (each element has a `slot` field). Returns false on duplicate `slot`.
// The same check is also performed as a post-validation step in
// `validateFlow` to throw `ValidationError` with code `OUTPUT_SLOT_DUPLICATE`.
ajv.addKeyword({
  keyword: 'uniqueFlowKey',
  validate: function uniqueFlowKey(
    schemaValue: boolean,
    data: ReadonlyArray<unknown>,
  ): boolean {
    if (!schemaValue) return true;
    if (!Array.isArray(data)) return true;
    const seen = new Set<string>();
    for (const item of data) {
      if (item && typeof item === 'object' && 'flowKey' in item) {
        const fk = (item as { flowKey: unknown }).flowKey;
        if (typeof fk === 'string') {
          if (seen.has(fk)) return false;
          seen.add(fk);
        }
      }
    }
    return true;
  },
  errors: false,
});

ajv.addKeyword({
  keyword: 'uniqueSlot',
  validate: function uniqueSlot(
    schemaValue: boolean,
    data: ReadonlyArray<unknown>,
  ): boolean {
    if (!schemaValue) return true;
    if (!Array.isArray(data)) return true;
    const seen = new Set<string>();
    for (const item of data) {
      if (item && typeof item === 'object' && 'slot' in item) {
        const slot = (item as { slot: unknown }).slot;
        if (typeof slot === 'string') {
          if (seen.has(slot)) return false;
          seen.add(slot);
        }
      }
    }
    return true;
  },
  errors: false,
});

// Register each schema under its $id so cross-schema refs resolve.
ajv.addSchema(designStateSchema, designStateSchema.$id);
ajv.addSchema(flowSchema, flowSchema.$id);
ajv.addSchema(renderRequestSchema, renderRequestSchema.$id);
ajv.addSchema(renderResultSchema, renderResultSchema.$id);
ajv.addSchema(runtimeTemplateSchema, runtimeTemplateSchema.$id);

const validateDesignStateFn: ValidateFunction<DesignState> =
  ajv.getSchema(designStateSchema.$id) as ValidateFunction<DesignState>;
const validateFlowFn: ValidateFunction<Flow> =
  ajv.getSchema(flowSchema.$id) as ValidateFunction<Flow>;
const validateRenderRequestFn: ValidateFunction<RenderRequest> =
  ajv.getSchema(renderRequestSchema.$id) as ValidateFunction<RenderRequest>;
const validateRenderResultFn: ValidateFunction<RenderResult> =
  ajv.getSchema(renderResultSchema.$id) as ValidateFunction<RenderResult>;
const validateRuntimeTemplateFn: ValidateFunction<RuntimeTemplate> =
  ajv.getSchema(runtimeTemplateSchema.$id) as ValidateFunction<RuntimeTemplate>;

/**
 * Validate that `input` conforms to the DesignState JSON Schema.
 * Pure: does not mutate, does not stringify.
 * Throws `ValidationError` on failure; narrows `input` to `DesignState` on success.
 */
export function validateDesignState(input: unknown): asserts input is DesignState {
  const ok = validateDesignStateFn(input);
  if (!ok) throw new ValidationError('DesignState', validateDesignStateFn.errors);
}

/**
 * Validate a Flow. M2-A additions over plain schema validation:
 * - Post-validation: every `explicitOutputs[].slot` must be unique
 *   (error code `OUTPUT_SLOT_DUPLICATE`).
 * - Post-validation: every `explicitOutputs[].nodeId` must exist in
 *   `nodeRefs[].nodeId` (error code `OUTPUT_NODE_NOT_FOUND`).
 *
 * Throws `ValidationError` on failure; narrows `input` to `Flow` on success.
 */
export function validateFlow(input: unknown): asserts input is Flow {
  const ok = validateFlowFn(input);
  if (!ok) {
    throw new ValidationError('Flow', validateFlowFn.errors);
  }
  // Post-validation 1: slot uniqueness (Decision 8 → OUTPUT_SLOT_DUPLICATE).
  if (Array.isArray((input as Flow).explicitOutputs)) {
    const seen = new Map<string, number>();
    const dupes: Array<{ path: string; slot: string }> = [];
    (input as Flow).explicitOutputs.forEach((out, i) => {
      const prev = seen.get(out.slot);
      if (prev !== undefined) {
        dupes.push({ path: `/explicitOutputs/${i}/slot`, slot: out.slot });
      } else {
        seen.set(out.slot, i);
      }
    });
    if (dupes.length > 0) {
      const errors: ErrorObject[] = dupes.map((d) => ({
        instancePath: d.path,
        schemaPath: '#/definitions/flowOutput/properties/slot',
        keyword: 'OUTPUT_SLOT_DUPLICATE',
        params: { slot: d.slot },
        message: `duplicate explicitOutputs[].slot: ${d.slot}`,
      }));
      throw new ValidationError('Flow', errors);
    }
  }
  // Post-validation 2: nodeId reference integrity (Decision 8 → OUTPUT_NODE_NOT_FOUND).
  if (Array.isArray((input as Flow).explicitOutputs) && Array.isArray((input as Flow).nodeRefs)) {
    const nodeIds = new Set<string>(
      ((input as Flow).nodeRefs as ReadonlyArray<{ nodeId: string }>).map((n) => n.nodeId),
    );
    const offenders: Array<{ path: string; nodeId: string }> = [];
    (input as Flow).explicitOutputs.forEach((out, i) => {
      if (!nodeIds.has(out.nodeId)) {
        offenders.push({ path: `/explicitOutputs/${i}/nodeId`, nodeId: out.nodeId });
      }
    });
    if (offenders.length > 0) {
      const errors: ErrorObject[] = offenders.map((o) => ({
        instancePath: o.path,
        schemaPath: '#/definitions/flowOutput/properties/nodeId',
        keyword: 'OUTPUT_NODE_NOT_FOUND',
        params: { nodeId: o.nodeId, missingNodeId: o.nodeId },
        message: `explicitOutputs[].nodeId not found in nodeRefs: ${o.nodeId}`,
      }));
      throw new ValidationError('Flow', errors);
    }
  }
}

/**
 * Validate a FlowKey string. Pure shape check; pattern/length enforced by
 * the same `flow.schema.json` flowKey property rules.
 */
export function validateFlowKey(input: unknown): asserts input is FlowKey {
  // FlowKey is a string with the same constraints as the flowKey property in
  // flow.schema.json. We validate by re-running the schema on a synthetic
  // single-property object so the same pattern/length rules apply.
  const flowKeyProperty = (flowSchema as { properties?: { flowKey?: unknown } }).properties
    ?.flowKey;
  const wrapper = {
    type: 'object',
    additionalProperties: false,
    required: ['value'],
    properties: { value: flowKeyProperty ?? { type: 'string', minLength: 1 } },
  };
  const validate = ajv.compile(wrapper);
  if (!validate({ value: input })) {
    throw new ValidationError('FlowKey', validate.errors);
  }
}

/** Validate a RenderRequest. Pure, asserts-narrowing, throws `ValidationError`. */
export function validateRenderRequest(input: unknown): asserts input is RenderRequest {
  const ok = validateRenderRequestFn(input);
  if (!ok) {
    // If the only failure is the empty `requestedOutputSlots` array,
    // remap to a more specific `REQUESTED_OUTPUTS_EMPTY` code (Decision 8).
    const errs = validateRenderRequestFn.errors ?? [];
    const emptySlots = errs.find(
      (e) =>
        e.keyword === 'minItems' &&
        e.instancePath === '/requestedOutputSlots',
    );
    if (emptySlots && errs.length === 1) {
      throw new ValidationError('RenderRequest', [
        {
          instancePath: '/requestedOutputSlots',
          schemaPath: '#/properties/requestedOutputSlots/minItems',
          keyword: 'REQUESTED_OUTPUTS_EMPTY',
          params: { limit: 1 },
          message: 'requestedOutputSlots must contain at least one slot',
        },
      ]);
    }
    throw new ValidationError('RenderRequest', errs);
  }
}

/** Validate a RenderResult. Pure, asserts-narrowing, throws `ValidationError`. */
export function validateRenderResult(input: unknown): asserts input is RenderResult {
  const ok = validateRenderResultFn(input);
  if (!ok) {
    throw new ValidationError('RenderResult', validateRenderResultFn.errors);
  }
  // M2-A post-validation: `templateVersion` must equal
  // `designState.templateVersion` (Decision 6 / Guardrails §2.4).
  if (
    typeof (input as RenderResult).templateVersion === 'string' &&
    (input as RenderResult).designState &&
    typeof (input as RenderResult).designState.templateVersion === 'string' &&
    (input as RenderResult).templateVersion !==
      (input as RenderResult).designState.templateVersion
  ) {
    const errors: ErrorObject[] = [
      {
        instancePath: '/templateVersion',
        schemaPath: '#/properties/templateVersion',
        keyword: 'TEMPLATE_VERSION_MISMATCH',
        params: {
          expected: (input as RenderResult).designState.templateVersion,
          actual: (input as RenderResult).templateVersion,
        },
        message: `templateVersion must equal designState.templateVersion`,
      },
    ];
    throw new ValidationError('RenderResult', errors);
  }
  // M2-A post-validation: every `outputs[].flowKey` must equal
  // `designState.flowKey` (Decision 6 / Guardrails §1.7).
  if (Array.isArray((input as RenderResult).outputs)) {
    const dsFlow = (input as RenderResult).designState.flowKey;
    const offenders: Array<{ path: string; flowKey: string }> = [];
    (input as RenderResult).outputs.forEach((out, i) => {
      if (out.flowKey !== dsFlow) {
        offenders.push({ path: `/outputs/${i}/flowKey`, flowKey: out.flowKey });
      }
    });
    if (offenders.length > 0) {
      const errors: ErrorObject[] = offenders.map((o) => ({
        instancePath: o.path,
        schemaPath: '#/definitions/output/properties/flowKey',
        keyword: 'OUTPUT_FLOW_KEY_MISMATCH',
        params: { expected: dsFlow, actual: o.flowKey },
        message: `outputs[].flowKey must equal designState.flowKey`,
      }));
      throw new ValidationError('RenderResult', errors);
    }
  }
}

/** Validate a RuntimeTemplate. Pure, asserts-narrowing, throws `ValidationError`. */
export function validateRuntimeTemplate(input: unknown): asserts input is RuntimeTemplate {
  const ok = validateRuntimeTemplateFn(input);
  if (!ok) {
    throw new ValidationError('RuntimeTemplate', validateRuntimeTemplateFn.errors);
  }
  // M2-A post-validation: every `flows[].flowKey` must be unique within
  // the template (Decision 8 → DUPLICATE_FLOW_KEY).
  if (Array.isArray((input as RuntimeTemplate).flows)) {
    const seen = new Map<string, number>();
    const dupes: Array<{ path: string; flowKey: string }> = [];
    (input as RuntimeTemplate).flows.forEach((f, i) => {
      const prev = seen.get(f.flowKey);
      if (prev !== undefined) {
        dupes.push({ path: `/flows/${i}/flowKey`, flowKey: f.flowKey });
      } else {
        seen.set(f.flowKey, i);
      }
    });
    if (dupes.length > 0) {
      const errors: ErrorObject[] = dupes.map((d) => ({
        instancePath: d.path,
        schemaPath: '#/definitions/flow/properties/flowKey',
        keyword: 'DUPLICATE_FLOW_KEY',
        params: { flowKey: d.flowKey },
        message: `duplicate flows[].flowKey: ${d.flowKey}`,
      }));
      throw new ValidationError('RuntimeTemplate', errors);
    }
  }
}

/**
 * Test/internal helper: re-export the schemas as parsed plain objects.
 * The contract surface for public consumers is the five `validate*` functions.
 */
export const __schemas = {
  designState: designStateSchema,
  flow: flowSchema,
  renderRequest: renderRequestSchema,
  renderResult: renderResultSchema,
  runtimeTemplate: runtimeTemplateSchema,
} as const;

// Re-export `readFileSync` for downstream consumers that want to load
// additional JSON Schemas in the same way. Kept under `__internal` to
// communicate that it is not part of the public Prism contract surface.
export const __internal = { readFileSync };
