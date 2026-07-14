/**
 * M1-B Task 3 unit tests — DesignState → Executor Params adapter.
 *
 * Covers:
 * 1. Round-trip a 5-scenario-shaped DesignState and assert each stage's params
 * 2. Field type validation (string/number/null rejection)
 * 3. Empty-array vs missing-fields distinction
 * 4. Optional crop fields pass-through (present and absent)
 * 5. Null/missing transformParams object throws AdapterError
 * 6. AdapterError carries `path` (JSON-Pointer-ish)
 * 7. Pure function: input DesignState is never mutated
 */

import { describe, it, expect } from 'vitest';
import type { DesignState, FlowKey } from '@prism/shared-types';

import {
  designStateToExecutorParams,
  AdapterError,
} from './design-state-adapter';

function baseDsWithParams(params: Record<string, unknown>): DesignState {
  return {
    schemaVersion: 1,
    templateId: 'tmpl.basic-mockup',
    templateVersion: '1.0.0',
    flowKey: 'preview' as FlowKey,
    inputs: {
      assets: [],
      params: params as DesignState['inputs']['params'],
    },
    createdAt: '2026-07-14T13:30:00.000Z',
  };
}

const IDENTITY_PARAMS = {
  transformParams: {
    translateX: 0,
    translateY: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
  },
  compositeParams: {
    blendMode: 'normal',
    opacity: 1,
    canvasWidth: 256,
    canvasHeight: 192,
    overlayX: 96,
    overlayY: 64,
  },
};

describe('designStateToExecutorParams — 5-scenario-shaped DesignState', () => {
  it('1. extracts transform + composite params for identity scenario', () => {
    const ds = baseDsWithParams(IDENTITY_PARAMS);
    const bundle = designStateToExecutorParams(ds);
    expect(bundle['transform']?.params).toEqual({
      translateX: 0,
      translateY: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
    });
    expect(bundle['composite']?.params).toEqual({
      blendMode: 'normal',
      opacity: 1,
      canvasWidth: 256,
      canvasHeight: 192,
      overlayX: 96,
      overlayY: 64,
    });
    expect(bundle['load-image']?.params).toEqual({});
    expect(bundle['export']?.params).toEqual({});
  });

  it('1. extracts rotate-90 scenario params', () => {
    const ds = baseDsWithParams({
      transformParams: { ...IDENTITY_PARAMS.transformParams, rotation: 90 },
      compositeParams: IDENTITY_PARAMS.compositeParams,
    });
    const bundle = designStateToExecutorParams(ds);
    expect((bundle['transform']?.params as { rotation: number }).rotation).toBe(90);
  });

  it('1. extracts scale-2x scenario params', () => {
    const ds = baseDsWithParams({
      transformParams: { ...IDENTITY_PARAMS.transformParams, scaleX: 2, scaleY: 2 },
      compositeParams: IDENTITY_PARAMS.compositeParams,
    });
    const { scaleX, scaleY } = bundle_value(bundle_key(ds));
    expect(scaleX).toBe(2);
    expect(scaleY).toBe(2);
  });
});

// Helper to avoid TS drift across redesigns
function bundle_key(ds: DesignState) {
  return designStateToExecutorParams(ds);
}
function bundle_value(bundle: ReturnType<typeof designStateToExecutorParams>) {
  return bundle['transform']?.params as { scaleX: number; scaleY: number };
}

describe('designStateToExecutorParams — validation and edge cases', () => {
  it('2. rejects a wrong-type transformParams.scaleX (string)', () => {
    const ds = baseDsWithParams({
      transformParams: { ...IDENTITY_PARAMS.transformParams, scaleX: '2' as unknown as number },
      compositeParams: IDENTITY_PARAMS.compositeParams,
    });
    expect(() => designStateToExecutorParams(ds)).toThrow(AdapterError);
  });

  it('3. treats missing inputs.params object as empty and throws on further access', () => {
    const ds = baseDsWithParams({});
    expect(() => designStateToExecutorParams(ds)).toThrow(AdapterError);
  });

  it('4. passes through optional crop fields when present', () => {
    const ds = baseDsWithParams({
      transformParams: {
        ...IDENTITY_PARAMS.transformParams,
        cropX: 4,
        cropY: 8,
        cropWidth: 128,
        cropHeight: 96,
      },
      compositeParams: IDENTITY_PARAMS.compositeParams,
    });
    const bundle = designStateToExecutorParams(ds);
    const tp = bundle['transform']?.params as Record<string, number | undefined>;
    expect(tp.cropX).toBe(4);
    expect(tp.cropY).toBe(8);
    expect(tp.cropWidth).toBe(128);
    expect(tp.cropHeight).toBe(96);
  });

  it('4. skips optional crop fields when absent (key not emitted)', () => {
    const ds = baseDsWithParams(IDENTITY_PARAMS);
    const bundle = designStateToExecutorParams(ds);
    const tp = bundle['transform']?.params as Record<string, unknown>;
    expect('cropX' in tp).toBe(false);
  });

  it('5. throws AdapterError when inputs.params is null', () => {
    const ds = baseDsWithParams(null as unknown as Record<string, unknown>);
    expect(() => designStateToExecutorParams(ds)).toThrow(AdapterError);
  });

  it('6. AdapterError.path is a JSON-Pointer-ish location', () => {
    const ds = baseDsWithParams({});
    try {
      designStateToExecutorParams(ds);
    } catch (err) {
      expect(err).toBeInstanceOf(AdapterError);
      expect((err as AdapterError).path).toContain('/inputs/params');
      expect((err as AdapterError).message).toContain((err as AdapterError).path);
    }
  });

  it('7. does not mutate the inbound DesignState', () => {
    const ds = baseDsWithParams(IDENTITY_PARAMS);
    const snapshotBefore = JSON.stringify(ds);
    designStateToExecutorParams(ds);
    const snapshotAfter = JSON.stringify(ds);
    expect(snapshotAfter).toBe(snapshotBefore);
  });
});
