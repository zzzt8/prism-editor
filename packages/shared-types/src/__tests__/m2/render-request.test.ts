import { describe, it, expect } from 'vitest';
import type { RenderRequest } from '../../render-request';
import type { DesignState } from '../../design-state';
import type { FlowKey } from '../../flow';

const SAMPLE_DS: DesignState = {
  schemaVersion: 1,
  templateId: 'tmpl.basic-mockup',
  templateVersion: '1.0.0',
  flowKey: 'production.print' as FlowKey,
  inputs: { assets: [], params: {} },
  createdAt: '2026-07-14T13:30:00.000Z',
};

function makeRequest(over: Partial<RenderRequest> = {}): RenderRequest {
  return {
    designState: SAMPLE_DS,
    requestedOutputSlots: ['mockup'],
    ...over,
  };
}

describe('RenderRequest — M2-A requestedOutputSlots required', () => {
  it('minimal valid request: one slot', () => {
    const r = makeRequest();
    const round = JSON.parse(JSON.stringify(r)) as RenderRequest;
    expect(round.requestedOutputSlots).toEqual(['mockup']);
    expect(round.designState.flowKey).toBe('production.print');
  });

  it('round-trips multi-slot requests (max 64)', () => {
    const slots = Array.from({ length: 5 }, (_, i) => `slot.${i}`);
    const r = makeRequest({ requestedOutputSlots: slots });
    const round = JSON.parse(JSON.stringify(r)) as RenderRequest;
    expect(round.requestedOutputSlots).toEqual(slots);
  });

  it('requestedOutputSlots input order does not affect round-trip equality', () => {
    const a = makeRequest({ requestedOutputSlots: ['mockup', 'mask', 'meta'] });
    const b = makeRequest({ requestedOutputSlots: ['meta', 'mask', 'mockup'] });
    const aRound = JSON.parse(JSON.stringify(a)) as RenderRequest;
    const bRound = JSON.parse(JSON.stringify(b)) as RenderRequest;
    // Order is preserved as a wire contract; the engine sorts by
    // Flow.explicitOutputs declaration order in M2-B.
    expect(aRound.requestedOutputSlots).toEqual(['mockup', 'mask', 'meta']);
    expect(bRound.requestedOutputSlots).toEqual(['meta', 'mask', 'mockup']);
  });

  it('RenderRequest does not have a flowKey field (compile-time guard)', () => {
    const r: RenderRequest = makeRequest();
    // Compile-time: there is no `flowKey` property on RenderRequest.
    type _Check = RenderRequest;
    // @ts-expect-error — flowKey is not part of RenderRequest (Decision 5)
    const _bad: _Check = { ...r, flowKey: 'preview' };
    void _bad;
  });
});
