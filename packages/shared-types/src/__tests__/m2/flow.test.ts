import { describe, it, expect } from 'vitest';
import type {
  Flow,
  FlowKey,
  FlowKind,
  FlowNodeRef,
  FlowOutput,
  FlowOutputSlot,
} from '../../flow';

const SAMPLE_NODE_REFS: ReadonlyArray<FlowNodeRef> = [
  { nodeId: 'load-base', nodeType: 'image-load' },
  { nodeId: 'compose', nodeType: 'image-compose' },
  { nodeId: 'export', nodeType: 'image-export' },
];

const SAMPLE_OUTPUTS: ReadonlyArray<FlowOutput> = [
  {
    slot: 'mockup',
    nodeId: 'compose',
    port: 'image',
    kind: 'image',
    mediaType: 'image/png',
  },
  {
    slot: 'mask',
    nodeId: 'compose',
    port: 'mask',
    kind: 'mask',
  },
];

function makeFlow(over: Partial<Flow> = {}): Flow {
  return {
    schemaVersion: 1,
    flowKey: 'production.print' as FlowKey,
    nodeRefs: SAMPLE_NODE_REFS,
    explicitOutputs: SAMPLE_OUTPUTS,
    ...over,
  };
}

describe('Flow — type contract shape (M2-A)', () => {
  it('round-trips through JSON with all fields intact', () => {
    const f = makeFlow();
    const round = JSON.parse(JSON.stringify(f)) as Flow;
    expect(round.schemaVersion).toBe(1);
    expect(round.flowKey).toBe('production.print');
    expect(round.nodeRefs).toHaveLength(3);
    expect(round.nodeRefs[0].nodeId).toBe('load-base');
    expect(round.nodeRefs[0].nodeType).toBe('image-load');
    expect(round.explicitOutputs).toHaveLength(2);
    expect(round.explicitOutputs[0].slot).toBe('mockup');
    expect(round.explicitOutputs[0].nodeId).toBe('compose');
    expect(round.explicitOutputs[0].port).toBe('image');
    expect(round.explicitOutputs[0].kind).toBe('image');
    expect(round.explicitOutputs[0].mediaType).toBe('image/png');
    expect(round.explicitOutputs[1].slot).toBe('mask');
    expect(round.explicitOutputs[1].kind).toBe('mask');
  });

  it('keeps every field readonly and structurally serializable', () => {
    const f = Object.freeze(makeFlow()) as Flow;
    expect(() => {
      // @ts-expect-error — readonly field
      f.flowKey = 'production.mask' as FlowKey;
    }).toThrow();
  });

  it('FlowOutputSlot is the public projection (no nodeId / port)', () => {
    const slot: FlowOutputSlot = {
      slot: 'mockup',
      kind: 'image',
      mediaType: 'image/png',
    };
    const round = JSON.parse(JSON.stringify(slot)) as FlowOutputSlot;
    expect(round.slot).toBe('mockup');
    expect(round.kind).toBe('image');
    expect(round.mediaType).toBe('image/png');
    // Compile-time: FlowOutputSlot has no nodeId / port.
    // Runtime check: keys are exactly { slot, kind, mediaType? }.
    const keys = Object.keys(slot).sort();
    expect(keys).toEqual(['kind', 'mediaType', 'slot']);
  });

  it('exposes FlowKind as the four-value union', () => {
    const kinds: ReadonlyArray<FlowKind> = ['image', 'mask', 'json', 'metadata'];
    expect(kinds).toHaveLength(4);
  });

  it('FlowKey is a string brand (structural, not nominal at runtime)', () => {
    const k: FlowKey = 'preview.main' as FlowKey;
    expect(typeof k).toBe('string');
    expect(k).toBe('preview.main');
  });
});
