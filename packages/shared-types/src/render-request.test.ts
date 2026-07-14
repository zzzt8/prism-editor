import { describe, it, expect } from 'vitest';
import type { DesignState } from './design-state';
import type {
  RenderRequest,
  RenderRequestTrace,
  RenderRequestOptions,
} from './render-request';

const SAMPLE_DS: DesignState = {
  schemaVersion: 1,
  templateId: 'tmpl.basic-mockup',
  templateVersion: '1.0.0',
  flowKey: 'production',
  inputs: {
    assets: [
      {
        slot: 'base',
        asset: {
          id: 'asset-base-001',
          kind: 'inline',
          mimeType: 'image/png',
          checksum: 'a'.repeat(64),
          width: 1024,
          height: 768,
        },
      },
    ],
    params: { background: '#ffffff' },
  },
  createdAt: '2026-07-14T13:30:00.000Z',
};

describe('RenderRequest — type contract shape', () => {
  it('round-trips through JSON with the embedded DesignState intact', () => {
    const trace: RenderRequestTrace = {
      requestId: 'req-1',
      traceId: 'trace-1',
    };
    const options: RenderRequestOptions = {
      timeoutMs: 30_000,
      preferParallel: true,
      targetLane: 'production',
    };
    const req: RenderRequest = {
      designState: SAMPLE_DS,
      trace,
      options,
    };
    const round = JSON.parse(JSON.stringify(req)) as RenderRequest;
    expect(round.designState.schemaVersion).toBe(1);
    expect(round.designState.templateId).toBe('tmpl.basic-mockup');
    expect(round.designState.flowKey).toBe('production');
    expect(round.trace?.requestId).toBe('req-1');
    expect(round.options?.timeoutMs).toBe(30_000);
    expect(round.options?.preferParallel).toBe(true);
    expect(round.options?.targetLane).toBe('production');
  });

  it('allows trace and options to be omitted (minimal request)', () => {
    const req: RenderRequest = { designState: SAMPLE_DS };
    const round = JSON.parse(JSON.stringify(req)) as RenderRequest;
    expect(round.designState.templateId).toBe('tmpl.basic-mockup');
    expect(round.trace).toBeUndefined();
    expect(round.options).toBeUndefined();
  });

  it('embeds DesignState by reference, treating it as the single source of truth', () => {
    const req: RenderRequest = { designState: SAMPLE_DS };
    expect(req.designState).toBe(SAMPLE_DS);
  });
});
