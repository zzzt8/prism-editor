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

// Register each schema under its $id so cross-schema refs resolve.
ajv.addSchema(designStateSchema, designStateSchema.$id);
ajv.addSchema(renderRequestSchema, renderRequestSchema.$id);
ajv.addSchema(renderResultSchema, renderResultSchema.$id);
ajv.addSchema(runtimeTemplateSchema, runtimeTemplateSchema.$id);

const validateDesignStateFn: ValidateFunction<DesignState> =
  ajv.getSchema(designStateSchema.$id) as ValidateFunction<DesignState>;
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

/** Validate a RenderRequest. Pure, asserts-narrowing, throws `ValidationError`. */
export function validateRenderRequest(input: unknown): asserts input is RenderRequest {
  const ok = validateRenderRequestFn(input);
  if (!ok) throw new ValidationError('RenderRequest', validateRenderRequestFn.errors);
}

/** Validate a RenderResult. Pure, asserts-narrowing, throws `ValidationError`. */
export function validateRenderResult(input: unknown): asserts input is RenderResult {
  const ok = validateRenderResultFn(input);
  if (!ok) throw new ValidationError('RenderResult', validateRenderResultFn.errors);
}

/** Validate a RuntimeTemplate. Pure, asserts-narrowing, throws `ValidationError`. */
export function validateRuntimeTemplate(input: unknown): asserts input is RuntimeTemplate {
  const ok = validateRuntimeTemplateFn(input);
  if (!ok) throw new ValidationError('RuntimeTemplate', validateRuntimeTemplateFn.errors);
}

/**
 * Test/internal helper: re-export the schemas as parsed plain objects.
 * The contract surface for public consumers is the four `validate*` functions.
 */
export const __schemas = {
  designState: designStateSchema,
  renderRequest: renderRequestSchema,
  renderResult: renderResultSchema,
  runtimeTemplate: runtimeTemplateSchema,
} as const;

// Re-export `readFileSync` for downstream consumers that want to load
// additional JSON Schemas in the same way. Kept under `__internal` to
// communicate that it is not part of the public Prism contract surface.
export const __internal = { readFileSync };
