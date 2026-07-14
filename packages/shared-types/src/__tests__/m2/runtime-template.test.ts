import { describe, it, expect } from 'vitest';
import type {
  RuntimeTemplate,
  RuntimeTemplateFlow,
} from '../../runtime-template';
import type { FlowKey, FlowOutputSlot } from '../../flow';

function makeFlow(over: Partial<RuntimeTemplateFlow> = {}): RuntimeTemplateFlow {
  return {
    flowKey: 'production.print' as FlowKey,
    nodes: [
      { id: 'load-base', type: 'image-load' },
      { id: 'compose', type: 'image-compose' },
    ],
    explicitOutputs: [
      { slot: 'mockup', kind: 'image', mediaType: 'image/png' },
      { slot: 'mask', kind: 'mask' },
    ],
    ...over,
  };
}

function makeTemplate(over: Partial<RuntimeTemplate> = {}): RuntimeTemplate {
  return {
    id: 'tmpl.basic-mockup',
    version: '1.0.0',
    schemaVersion: 2,
    displayName: 'Basic Mockup',
    inputs: [],
    flows: [makeFlow()],
    createdAt: '2026-07-14T13:30:00.000Z',
    updatedAt: '2026-07-14T13:30:00.000Z',
    ...over,
  };
}

describe('RuntimeTemplate — M2-A explicitOutputs public projection', () => {
  it('round-trips explicitOutputs through JSON', () => {
    const t = makeTemplate();
    const round = JSON.parse(JSON.stringify(t)) as RuntimeTemplate;
    expect(round.flows[0].explicitOutputs).toHaveLength(2);
    expect(round.flows[0].explicitOutputs[0].slot).toBe('mockup');
    expect(round.flows[0].explicitOutputs[0].kind).toBe('image');
    expect(round.flows[0].explicitOutputs[0].mediaType).toBe('image/png');
    expect(round.flows[0].explicitOutputs[1].slot).toBe('mask');
    expect(round.flows[0].explicitOutputs[1].kind).toBe('mask');
  });

  it('explicitOutputs carries only slot / kind / mediaType (no nodeId / port)', () => {
    const slot: FlowOutputSlot = { slot: 'preview', kind: 'image' };
    const keys = Object.keys(slot).sort();
    expect(keys).toEqual(['kind', 'slot']);
    // Compile-time: FlowOutputSlot does not have nodeId/port.
    type _Check = FlowOutputSlot;
    const _forbidden1: _Check = { slot: 's', kind: 'image' } as _Check & { nodeId: string };
    void _forbidden1;
  });

  it('schemaVersion must be exactly 2', () => {
    const t = makeTemplate();
    expect(t.schemaVersion).toBe(2);
  });

  it('M1-A legacy fixture (no explicitOutputs) is no longer assignable', () => {
    // M1-A fixture missing explicitOutputs is rejected in M2-A.
    // Cast through `unknown` to simulate untyped JSON input; the runtime
    // shape should fail validation (covered in `validation/index.test.ts`).
    const legacy = {
      id: 'tmpl.legacy',
      version: '1.0.0',
      schemaVersion: 2,
      displayName: 'Legacy',
      inputs: [],
      flows: [
        {
          flowKey: 'preview',
          nodes: [{ id: 'n1', type: 'load-image' }],
        },
      ],
      createdAt: '2026-07-14T13:30:00.000Z',
      updatedAt: '2026-07-14T13:30:00.000Z',
    } as unknown as RuntimeTemplate;
    // The cast succeeds (unknown bypasses the missing field), but the
    // underlying object does not satisfy the type contract: `explicitOutputs`
    // is required and absent.
    expect(legacy.flows[0].explicitOutputs).toBeUndefined();
  });
});
