import { describe, it, expect } from 'vitest';
import type { RenderResult, RenderResultOutput } from '../../render-result';
import type { DesignState } from '../../design-state';
import type { FlowKey } from '../../flow';
import type { ImageRef } from '../../image';

const SAMPLE_DS: DesignState = {
  schemaVersion: 1,
  templateId: 'tmpl.basic-mockup',
  templateVersion: '1.0.0',
  flowKey: 'production.print' as FlowKey,
  inputs: { assets: [], params: {} },
  createdAt: '2026-07-14T13:30:00.000Z',
};

const SAMPLE_IMAGE: ImageRef = {
  type: 'data-url',
  url: 'data:image/png;base64,XXX',
  width: 1024,
  height: 768,
  mimeType: 'image/png',
};

function makeOutput(over: Partial<RenderResultOutput> = {}): RenderResultOutput {
  return {
    id: 'out-1',
    slot: 'mockup',
    flowKey: SAMPLE_DS.flowKey,
    image: SAMPLE_IMAGE,
    ...over,
  };
}

function makeResult(over: Partial<RenderResult> = {}): RenderResult {
  return {
    schemaVersion: 2,
    renderId: 'render-001',
    designState: SAMPLE_DS,
    templateVersion: SAMPLE_DS.templateVersion,
    status: 'done',
    outputs: [makeOutput()],
    timingMs: { startedAt: 0, endedAt: 100 },
    ...over,
  };
}

describe('RenderResult — M2-A templateVersion + outputs[].flowKey', () => {
  it('round-trips a done result with two outputs through JSON', () => {
    const r = makeResult({
      outputs: [
        makeOutput({ id: 'out-1', slot: 'mockup' }),
        makeOutput({ id: 'out-2', slot: 'mask' }),
      ],
    });
    const round = JSON.parse(JSON.stringify(r)) as RenderResult;
    expect(round.schemaVersion).toBe(2);
    expect(round.templateVersion).toBe('1.0.0');
    expect(round.outputs).toHaveLength(2);
    expect(round.outputs[0].flowKey).toBe('production.print');
    expect(round.outputs[1].flowKey).toBe('production.print');
    expect(round.outputs[0].slot).toBe('mockup');
    expect(round.outputs[1].slot).toBe('mask');
  });

  it('templateVersion must be present and equal to designState.templateVersion', () => {
    const r = makeResult();
    expect(r.templateVersion).toBe(r.designState.templateVersion);
  });

  it('output flowKey must be present on every output (M2-A required)', () => {
    const r = makeResult();
    for (const o of r.outputs) {
      expect(o.flowKey).toBe('production.print');
    }
  });

  it('output.slot pattern matches RenderRequest.requestedOutputSlots constraint', () => {
    // Pin the documented constraint; M2-B will filter by requestedOutputSlots.
    const r = makeResult({
      outputs: [makeOutput({ slot: 'mockup' })],
    });
    const slot = r.outputs[0].slot;
    expect(slot).toMatch(/^[a-zA-Z][a-zA-Z0-9._-]{0,127}$/);
  });
});
