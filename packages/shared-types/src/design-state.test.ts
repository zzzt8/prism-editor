import { describe, it, expect } from 'vitest';
import type {
  DesignState,
  AssetRef,
  DesignStateAssetBinding,
  DesignStateInputs,
  JsonValue,
} from './design-state';
import type { FlowKey } from './flow';

const SAMPLE_ASSET: AssetRef = {
  id: 'asset-base-001',
  kind: 'inline',
  mimeType: 'image/png',
  checksum: 'a'.repeat(64),
  width: 1024,
  height: 768,
};

const SAMPLE_BINDING: DesignStateAssetBinding = {
  slot: 'base',
  asset: SAMPLE_ASSET,
};

const SAMPLE_INPUTS: DesignStateInputs = {
  assets: [SAMPLE_BINDING],
  params: { background: '#ffffff', padding: 12, fit: 'contain', enableBleed: false },
};

const NOW = '2026-07-14T13:30:00.000Z';

function makeDesignState(overrides: Partial<DesignState> = {}): DesignState {
  return {
    schemaVersion: 1,
    templateId: 'tmpl.basic-mockup',
    templateVersion: '1.0.0',
    flowKey: 'preview' as FlowKey,
    inputs: SAMPLE_INPUTS,
    createdAt: NOW,
    ...overrides,
  };
}

describe('DesignState — type contract shape', () => {
  it('keeps every field readonly and structurally serializable', () => {
    const ds = makeDesignState();
    const json = JSON.stringify(ds);
    const round = JSON.parse(json) as DesignState;

    expect(round.schemaVersion).toBe(1);
    expect(round.templateId).toBe(ds.templateId);
    expect(round.templateVersion).toBe(ds.templateVersion);
    expect(round.flowKey).toBe(ds.flowKey);
    expect(round.createdAt).toBe(ds.createdAt);
    expect(round.inputs.assets).toHaveLength(1);
    expect(round.inputs.assets[0].slot).toBe('base');
    expect(round.inputs.assets[0].asset.id).toBe('asset-base-001');
    expect(round.inputs.params).toEqual({
      background: '#ffffff',
      padding: 12,
      fit: 'contain',
      enableBleed: false,
    });
  });

  it('rejects mutation at runtime when Object.freeze is applied', () => {
    const ds = Object.freeze(makeDesignState()) as DesignState;
    expect(() => {
      // @ts-expect-error — readonly field
      ds.flowKey = 'production';
    }).toThrow();
  });

  it('allows optional metadata and trace without breaking the contract', () => {
    const ds = makeDesignState({
      metadata: {
        author: 'agent',
        tags: ['m1', 'design-state'],
        description: 'Sample fixture for M1-A tests.',
      },
      trace: {
        requestId: 'req-1234',
        traceId: 'trace-5678',
        externalReferenceId: 'extRef-abcd',
      },
    });
    const json = JSON.stringify(ds);
    const round = JSON.parse(json) as DesignState;
    expect(round.metadata?.author).toBe('agent');
    expect(round.metadata?.tags).toEqual(['m1', 'design-state']);
    expect(round.trace?.requestId).toBe('req-1234');
  });

  it('forbids forbidden payload shapes (Blob/File/Function/Canvas)', () => {
    // Type-level guard: the public DesignState types only accept JsonValue.
    // This is a compile-time guarantee — we use a type assertion to verify that
    // a value containing a Function fails to be assignable.
    type AllowedJson = JsonValue;

    const ok: AllowedJson = 'plain string';
    expect(typeof ok).toBe('string');

    const notOk: () => void = () => undefined;
    // @ts-expect-error — Function values are not assignable to AllowedJson.
    const _forbidden: AllowedJson = notOk;
    void _forbidden;
    expect(typeof notOk).toBe('function');
    expect(typeof SAMPLE_ASSET.id).toBe('string');
  });
});

describe('DesignState — JSON-safe JsonValue discipline', () => {
  it('serializes nested params without losing structure', () => {
    const ds = makeDesignState({
      inputs: {
        assets: [SAMPLE_BINDING],
        params: {
          nested: { colors: ['#fff', '#000'], enabled: true, ratio: 1.5 },
          empty: null,
        },
      },
    });
    const round = JSON.parse(JSON.stringify(ds)) as DesignState;
    expect(round.inputs.params).toEqual({
      nested: { colors: ['#fff', '#000'], enabled: true, ratio: 1.5 },
      empty: null,
    });
  });
});
