/**
 * M1-B Task 1 unit tests — `executeFromDesignState` ajv pre-validate coverage.
 *
 * Validates:
 * - valid DesignState passes (no throw)
 * - schemaVersion mismatch is rejected
 * - missing required field is rejected
 * - empty flowKey is rejected
 * - ValidationError (not generic Error) is thrown
 */

import { describe, it, expect } from 'vitest';
import {
  validateDesignState,
  ValidationError,
  type DesignState,
  type FlowKey,
} from '@prism/shared-types';

import { WorkflowExecutor } from './executor';

function makeValidDs(): DesignState {
  return {
    schemaVersion: 1,
    templateId: 'tmpl.basic-mockup',
    templateVersion: '1.0.0',
    flowKey: 'preview' as FlowKey,
    inputs: {
      assets: [
        {
          slot: 'base',
          asset: {
            id: 'asset-base-001',
            kind: 'inline',
            mimeType: 'image/png',
            checksum: 'a'.repeat(64),
            width: 256,
            height: 192,
          },
        },
        {
          slot: 'overlay',
          asset: {
            id: 'asset-overlay-001',
            kind: 'inline',
            mimeType: 'image/png',
            checksum: 'b'.repeat(64),
            width: 64,
            height: 40,
          },
        },
      ],
      params: { background: '#ffffff', padding: 12 },
    },
    createdAt: '2026-07-14T13:30:00.000Z',
  };
}

const SAMPLE_PARAMS = {
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
} as const;

describe('WorkflowExecutor.executeFromDesignState — ajv pre-validation', () => {
  it('accepts a minimal valid DesignState', async () => {
    const executor = new WorkflowExecutor({});
    const ds = makeValidDs();
    // No executor registered for `load-image`, so the first node fails —
    // but we only care that ajv validation passes through to the executor
    // (no ValidationError thrown for the input shape itself).
    await expect(
      executor.executeFromDesignState(ds, { params: SAMPLE_PARAMS }),
    ).resolves.toBeDefined();
  });

  it('rejects DesignState with schemaVersion !== 1', async () => {
    const executor = new WorkflowExecutor({});
    const ds = { ...makeValidDs(), schemaVersion: 2 } as unknown as DesignState;
    await expect(
      executor.executeFromDesignState(ds, { params: SAMPLE_PARAMS }),
    ).rejects.toThrow(ValidationError);
  });

  it('rejects DesignState with missing templateId', async () => {
    const executor = new WorkflowExecutor({});
    const bad = { ...makeValidDs(), templateId: undefined } as unknown as DesignState;
    await expect(
      executor.executeFromDesignState(bad, { params: SAMPLE_PARAMS }),
    ).rejects.toThrow(ValidationError);
  });

  it('rejects DesignState with empty flowKey', async () => {
    const executor = new WorkflowExecutor({});
    const bad = { ...makeValidDs(), flowKey: '' } as unknown as DesignState;
    await expect(
      executor.executeFromDesignState(bad, { params: SAMPLE_PARAMS }),
    ).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError (not generic Error) on bad input', () => {
    const bad = { ...makeValidDs(), schemaVersion: 99 } as unknown;
    expect(() => validateDesignState(bad)).toThrow(ValidationError);
    // Sanity check: ValidationError is the named class from shared-types.
    try {
      validateDesignState(bad);
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).target).toBe('DesignState');
    }
  });
});
