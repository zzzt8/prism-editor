import { describe, it, expect } from 'vitest';
import type { DesignState } from './design-state';
import type { FlowKey } from './flow';
import type { ImageRef } from './image';
import type {
  RenderResult,
  RenderResultOutput,
  RenderError,
  RenderTiming,
} from './render-result';

const SAMPLE_DS: DesignState = {
  schemaVersion: 1,
  templateId: 'tmpl.basic-mockup',
  templateVersion: '1.0.0',
  flowKey: 'production' as FlowKey,
  inputs: {
    assets: [],
    params: {},
  },
  createdAt: '2026-07-14T13:30:00.000Z',
};

const SAMPLE_IMAGE_REF: ImageRef = {
  type: 'data-url',
  url: 'data:image/png;base64,iVBORw0KGgo=',
  width: 1024,
  height: 768,
  mimeType: 'image/png',
};

function makeRenderResult(over: Partial<RenderResult> = {}): RenderResult {
  const out: RenderResultOutput = {
    id: 'out-001',
    image: SAMPLE_IMAGE_REF,
    slot: 'mockup',
    flowKey: SAMPLE_DS.flowKey,
  };
  const timing: RenderTiming = { startedAt: 100, endedAt: 250 };
  return {
    schemaVersion: 2,
    renderId: 'render-001',
    designState: SAMPLE_DS,
    templateVersion: SAMPLE_DS.templateVersion,
    status: 'done',
    outputs: [out],
    timingMs: timing,
    ...over,
  };
}

describe('RenderResult — type contract shape', () => {
  it('round-trips a done result with one output through JSON', () => {
    const r = makeRenderResult();
    const round = JSON.parse(JSON.stringify(r)) as RenderResult;
    expect(round.schemaVersion).toBe(2);
    expect(round.status).toBe('done');
    expect(round.outputs).toHaveLength(1);
    expect(round.outputs[0].id).toBe('out-001');
    expect(round.outputs[0].image.width).toBe(1024);
    expect(round.timingMs.endedAt).toBeGreaterThanOrEqual(round.timingMs.startedAt);
    expect(round.designState.templateId).toBe('tmpl.basic-mockup');
  });

  it('allows error status with required error block', () => {
    const err: RenderError = {
      code: 'RENDER_TIMEOUT',
      message: 'Render exceeded 30s budget',
    };
    const r = makeRenderResult({ status: 'error', error: err, outputs: [] });
    const round = JSON.parse(JSON.stringify(r)) as RenderResult;
    expect(round.status).toBe('error');
    expect(round.error?.code).toBe('RENDER_TIMEOUT');
    expect(round.outputs).toEqual([]);
  });

  it('allows cancelled status', () => {
    const r = makeRenderResult({ status: 'cancelled', outputs: [] });
    const round = JSON.parse(JSON.stringify(r)) as RenderResult;
    expect(round.status).toBe('cancelled');
  });

  it('mirrors the input DesignState for audit traceability', () => {
    const ds: DesignState = { ...SAMPLE_DS, flowKey: 'preview' as FlowKey };
    const r = makeRenderResult({ designState: ds, templateVersion: ds.templateVersion });
    expect(r.designState).toBe(ds);
    expect(r.designState.flowKey).toBe('preview');
  });
});
