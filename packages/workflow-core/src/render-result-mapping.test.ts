/**
 * M1-B Task 2 unit tests — `ExecutorResult → RenderResult` mapping.
 *
 * Covers the 7 conversion branches:
 * 1. status === 'done'  → 1+ outputs, no error
 * 2. status === 'error' → error.code/message, no outputs
 * 3. status === 'cancelled' → no outputs, no error
 * 4. output.slot === designState.flowKey (M1 single-slot default)
 * 5. timingMs uses real unix-ms start/end
 * 6. RenderResult.designState mirrors the inbound reference
 * 7. error.code classifier ('timeout' → RENDER_TIMEOUT, etc.)
 */

import { describe, it, expect } from 'vitest';
import type { DesignState, FlowKey, RenderResult } from '@prism/shared-types';

import { mapExecutorResultToRenderResult } from './design-state-execution';
import type { ExecutorResult } from './executor';

const SAMPLE_DS: DesignState = {
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
    ],
    params: {},
  },
  createdAt: '2026-07-14T13:30:00.000Z',
};

const RENDER_ID = 'render-unit-test';
const STARTED_AT = 1_700_000_000_000; // fixed for determinism

function buildDoneExec(): ExecutorResult {
  return {
    workflowId: 'm1-b:tmpl.basic-mockup@1.0.0',
    status: 'done',
    results: {
      export: {
        dataUrl: 'data:image/png;base64,AAA',
        previewUrl: 'data:image/png;base64,AAA',
        format: 'image/png',
        dimensions: { width: 256, height: 192 },
      },
    },
  };
}

function buildErrorExec(message: string): ExecutorResult {
  return {
    workflowId: 'm1-b:tmpl.basic-mockup@1.0.0',
    status: 'error',
    results: {},
    error: message,
  };
}

function buildCancelledExec(): ExecutorResult {
  return {
    workflowId: 'm1-b:tmpl.basic-mockup@1.0.0',
    status: 'cancelled',
    results: {},
    cancelledNodes: ['composite'],
  };
}

describe('mapExecutorResultToRenderResult — branch coverage', () => {
  it('branch 1: status === "done" produces exactly 1 output derived from export.dataUrl', () => {
    const rr: RenderResult = mapExecutorResultToRenderResult(
      SAMPLE_DS,
      buildDoneExec(),
      RENDER_ID,
      STARTED_AT,
    );
    expect(rr.status).toBe('done');
    expect(rr.outputs).toHaveLength(1);
    expect(rr.outputs[0].slot).toBe('preview');
    expect(rr.outputs[0].image.type).toBe('data-url');
    expect(rr.outputs[0].image.width).toBe(256);
    expect(rr.outputs[0].image.height).toBe(192);
    expect(rr.error).toBeUndefined();
  });

  it('branch 2: status === "error" carries error.code + message, no outputs', () => {
    const rr = mapExecutorResultToRenderResult(
      SAMPLE_DS,
      buildErrorExec('transform input mismatch'),
      RENDER_ID,
      STARTED_AT,
    );
    expect(rr.status).toBe('error');
    expect(rr.outputs).toHaveLength(0);
    expect(rr.error?.code).toBe('RENDER_FAILED');
    expect(rr.error?.message).toContain('transform input mismatch');
  });

  it('branch 3: status === "cancelled" produces zero outputs, no error block', () => {
    const rr = mapExecutorResultToRenderResult(
      SAMPLE_DS,
      buildCancelledExec(),
      RENDER_ID,
      STARTED_AT,
    );
    expect(rr.status).toBe('cancelled');
    expect(rr.outputs).toHaveLength(0);
    expect(rr.error).toBeUndefined();
  });

  it('branch 4: output.slot is taken from designState.flowKey', () => {
    const dsWithCustomFlow = { ...SAMPLE_DS, flowKey: 'production-batch' as FlowKey };
    const rr = mapExecutorResultToRenderResult(
      dsWithCustomFlow,
      buildDoneExec(),
      RENDER_ID,
      STARTED_AT,
    );
    expect(rr.outputs[0].slot).toBe('production-batch');
  });

  it('branch 5: timingMs.startedAt equals caller value, endedAt is wall-clock', () => {
    const before = Date.now();
    const rr = mapExecutorResultToRenderResult(
      SAMPLE_DS,
      buildDoneExec(),
      RENDER_ID,
      STARTED_AT,
    );
    const after = Date.now();
    expect(rr.timingMs.startedAt).toBe(STARTED_AT);
    expect(rr.timingMs.endedAt).toBeGreaterThanOrEqual(before);
    expect(rr.timingMs.endedAt).toBeLessThanOrEqual(after);
  });

  it('branch 6: result.designState is the original reference (mirror)', () => {
    const rr = mapExecutorResultToRenderResult(
      SAMPLE_DS,
      buildDoneExec(),
      RENDER_ID,
      STARTED_AT,
    );
    expect(rr.designState).toBe(SAMPLE_DS);
  });

  it('branch 7: error.code classifier maps keyword → RENDER_* enum', () => {
    const cases: Array<[string, string]> = [
      ['unknown worker timeout exceeded', 'RENDER_TIMEOUT'],
      ['user cancelled the operation', 'RENDER_CANCELLED'],
      ['unexpected internal exception', 'RENDER_INTERNAL_ERROR'],
    ];
    for (const [msg, expected] of cases) {
      const rr = mapExecutorResultToRenderResult(
        SAMPLE_DS,
        buildErrorExec(msg),
        RENDER_ID,
        STARTED_AT,
      );
      expect(rr.error?.code).toBe(expected);
    }
  });
});
