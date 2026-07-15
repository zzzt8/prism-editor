// M1-B: DesignState → Executor Params adapter.
//
// Architecture:
// - `designStateToExecutorParams` is the **single** place that knows how
//   to map `DesignState.inputs.params` into structured executor-param bundles
//   for the fixed 4-node pipeline (load-image → transform → composite → export).
// - The adapter is a pure function: no mutation of the inbound `DesignState`,
//   no platform API calls, no executor instantiation.
// - Errors are *fail-fast*: missing or wrongly-typed fields throw `AdapterError`
//   immediately with a JSON Pointer-like `path` for diagnosability.
// - The result bundle is keyed by stage name; the caller (typically the
//   integration test in `src/__tests__/m1/design-state-roundtrip.test.ts`)
//   spreads these params onto the constructed `Workflow`'s node `params`.
//
// Schema (M1-B only):
//   DesignState.inputs.params MUST contain at least these top-level keys:
//     - transformParams: { translateX, translateY, scaleX, scaleY, rotation, [cropX, cropY, cropWidth, cropHeight]? }
//     - compositeParams: { blendMode, opacity, canvasWidth, canvasHeight, overlayX, overlayY }
//   Each value MUST be a JSON-safe primitive; no Blob / function / DOM allowed
//   (already enforced by ajv at the DesignState contract layer).

import type { JsonValue } from '@prism/shared-types';
import type { DesignState } from '@prism/shared-types';

/**
 * Adapter-layer error. Carries a `path` field that points at the offending
 * location inside `DesignState.inputs.params` (e.g. `/inputs/params/transformParams/scaleX`).
 *
 * This is intentionally NOT a `ValidationError` from `@prism/shared-types` —
 * adapter-layer errors are a different concern from schema-level errors.
 */
export class AdapterError extends Error {
  public readonly path: string;

  constructor(path: string, message: string) {
    super(`Prism adapter error at ${path}: ${message}`);
    this.name = 'AdapterError';
    this.path = path;
  }
}

/**
 * Param bundle for the `transform` stage of the M1-B pipeline.
 *
 * Each field is required EXCEPT the four optional crop fields, matching the
 * `M0TransformParams` shape used by the M0 fixture (see
 * `packages/image-ops/_m0_evidence/shared/types.ts`).
 */
export interface TransformParams {
  readonly translateX: number;
  readonly translateY: number;
  readonly scaleX: number;
  readonly scaleY: number;
  readonly rotation: number;
  readonly cropX?: number;
  readonly cropY?: number;
  readonly cropWidth?: number;
  readonly cropHeight?: number;
}

/**
 * Param bundle for the `composite` stage of the M1-B pipeline. Mirrors
 * `M0CompositeParams` from the M0 fixture module.
 */
export interface CompositeParams {
  readonly blendMode: string;
  readonly opacity: number;
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  readonly overlayX: number;
  readonly overlayY: number;
}

/**
 * Result of `designStateToExecutorParams`. Each key is the node id in the
 * fixed M1-B pipeline (`load-image`, `transform`, `composite`, `export`).
 * `params` are node-level config; `inputs` are unused for now (reserved for
 * downstream stage wiring).
 */
export interface ExecutorParamsBundle {
  readonly [stageKey: string]: {
    readonly params: Record<string, unknown>;
    readonly inputs?: Record<string, unknown>;
  };
}

function asObject(value: JsonValue | undefined, path: string): Record<string, JsonValue> {
  if (value === undefined || value === null) {
    throw new AdapterError(path, 'expected an object, got ' + (value === undefined ? 'undefined' : 'null'));
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new AdapterError(path, `expected an object, got ${Array.isArray(value) ? 'array' : typeof value}`);
  }
  return value as Record<string, JsonValue>;
}

function asNumber(value: JsonValue | undefined, path: string): number {
  if (value === undefined) {
    throw new AdapterError(path, 'missing required number field');
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new AdapterError(path, `expected number, got ${typeof value}`);
  }
  return value;
}

function asString(value: JsonValue | undefined, path: string): string {
  if (value === undefined) {
    throw new AdapterError(path, 'missing required string field');
  }
  if (typeof value !== 'string') {
    throw new AdapterError(path, `expected string, got ${typeof value}`);
  }
  return value;
}

function asOptionalNumber(value: JsonValue | undefined, path: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new AdapterError(path, `expected optional number, got ${typeof value}`);
  }
  return value;
}

function readTransformParams(root: Record<string, JsonValue>, basePath: string): TransformParams {
  const obj = asObject(root['transformParams'], `${basePath}/transformParams`);
  const cropX      = asOptionalNumber(obj['cropX'],      `${basePath}/transformParams/cropX`);
  const cropY      = asOptionalNumber(obj['cropY'],      `${basePath}/transformParams/cropY`);
  const cropWidth  = asOptionalNumber(obj['cropWidth'],  `${basePath}/transformParams/cropWidth`);
  const cropHeight = asOptionalNumber(obj['cropHeight'], `${basePath}/transformParams/cropHeight`);

  const required = {
    translateX: asNumber(obj['translateX'], `${basePath}/transformParams/translateX`),
    translateY: asNumber(obj['translateY'], `${basePath}/transformParams/translateY`),
    scaleX:     asNumber(obj['scaleX'],     `${basePath}/transformParams/scaleX`),
    scaleY:     asNumber(obj['scaleY'],     `${basePath}/transformParams/scaleY`),
    rotation:   asNumber(obj['rotation'],   `${basePath}/transformParams/rotation`),
  };
  const optional = {
    ...(cropX      !== undefined && { cropX }),
    ...(cropY      !== undefined && { cropY }),
    ...(cropWidth  !== undefined && { cropWidth }),
    ...(cropHeight !== undefined && { cropHeight }),
  };
  return { ...required, ...optional };
}

function readCompositeParams(root: Record<string, JsonValue>, basePath: string): CompositeParams {
  const obj = asObject(root['compositeParams'], `${basePath}/compositeParams`);
  return {
    blendMode:    asString(obj['blendMode'],    `${basePath}/compositeParams/blendMode`),
    opacity:      asNumber(obj['opacity'],      `${basePath}/compositeParams/opacity`),
    canvasWidth:  asNumber(obj['canvasWidth'],  `${basePath}/compositeParams/canvasWidth`),
    canvasHeight: asNumber(obj['canvasHeight'], `${basePath}/compositeParams/canvasHeight`),
    overlayX:     asNumber(obj['overlayX'],     `${basePath}/compositeParams/overlayX`),
    overlayY:     asNumber(obj['overlayY'],     `${basePath}/compositeParams/overlayY`),
  };
}

/**
 * Convert a (validated) `DesignState` into an `ExecutorParamsBundle`.
 *
 * Pure: does not mutate `designState`, does not instantiate executors.
 * Throws `AdapterError` on any structural mismatch.
 *
 * @throws AdapterError
 */
export function designStateToExecutorParams(designState: DesignState): ExecutorParamsBundle {
  const inputs = designState.inputs;
  const params = asObject(inputs.params, '/inputs/params');

  const transformParams = readTransformParams(params, '/inputs/params');
  const compositeParams = readCompositeParams(params, '/inputs/params');

  return {
    'load-image': { params: {} },
    transform:    { params: { ...transformParams } },
    composite:    { params: { ...compositeParams } },
    export:       { params: {} },
  };
}
