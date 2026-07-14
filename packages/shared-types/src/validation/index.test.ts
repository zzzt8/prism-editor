import { describe, it, expect } from 'vitest';
import {
  ValidationError,
  validateDesignState,
  validateRenderRequest,
  validateRenderResult,
  validateRuntimeTemplate,
  __schemas,
} from './index';
import type { DesignState } from '../design-state';
import type { FlowKey } from '../flow';
import type { RenderRequest } from '../render-request';
import type { RenderResult } from '../render-result';
import type { RuntimeTemplate } from '../runtime-template';

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
          width: 1024,
          height: 768,
        },
      },
    ],
    params: { background: '#ffffff', padding: 12 },
  },
  createdAt: '2026-07-14T13:30:00.000Z',
};

describe('validation/index — public validators', () => {
  it('exposes all four schemas via __schemas', () => {
    expect(__schemas.designState.$id).toMatch(/design-state/);
    expect(__schemas.renderRequest.$id).toMatch(/render-request/);
    expect(__schemas.renderResult.$id).toMatch(/render-result/);
    expect(__schemas.runtimeTemplate.$id).toMatch(/runtime-template/);
  });

  it('passes a minimal valid DesignState', () => {
    expect(() => validateDesignState(SAMPLE_DS)).not.toThrow();
    validateDesignState(SAMPLE_DS);
  });

  it('rejects DesignState with wrong schemaVersion', () => {
    const bad = { ...SAMPLE_DS, schemaVersion: 2 };
    expect(() => validateDesignState(bad)).toThrowError(ValidationError);
    try {
      validateDesignState(bad);
    } catch (err) {
      expect((err as ValidationError).target).toBe('DesignState');
    }
  });

  it('rejects DesignState with missing required field', () => {
    const bad = { ...SAMPLE_DS, templateId: undefined };
    expect(() => validateDesignState(bad)).toThrowError(ValidationError);
  });

  it('rejects DesignState with additional unknown field', () => {
    const bad = { ...SAMPLE_DS, mallUserId: 'should-not-appear' };
    expect(() => validateDesignState(bad)).toThrowError(ValidationError);
  });

  it('passes a valid RenderRequest', () => {
    const req: RenderRequest = {
      designState: SAMPLE_DS,
      requestedOutputSlots: ['mockup'],
    };
    expect(() => validateRenderRequest(req)).not.toThrow();
  });

  it('rejects RenderRequest when designState is missing', () => {
    expect(() => validateRenderRequest({})).toThrowError(ValidationError);
  });

  it('rejects RenderRequest when requestedOutputSlots is missing', () => {
    expect(() =>
      validateRenderRequest({ designState: SAMPLE_DS }),
    ).toThrowError(ValidationError);
  });

  it('rejects RenderRequest when requestedOutputSlots is empty', () => {
    expect(() =>
      validateRenderRequest({
        designState: SAMPLE_DS,
        requestedOutputSlots: [],
      }),
    ).toThrowError(ValidationError);
  });

  it('rejects RenderRequest when carrying a second flowKey', () => {
    // additionalProperties: false rejects unknown fields.
    const bad = {
      designState: SAMPLE_DS,
      requestedOutputSlots: ['mockup'],
      flowKey: 'production',
    } as unknown as RenderRequest;
    expect(() => validateRenderRequest(bad)).toThrowError(ValidationError);
  });

  it('passes a valid RenderResult (done)', () => {
    const r: RenderResult = {
      schemaVersion: 2,
      renderId: 'render-001',
      designState: SAMPLE_DS,
      templateVersion: SAMPLE_DS.templateVersion,
      status: 'done',
      outputs: [
        {
          id: 'out-1',
          slot: 'mockup',
          flowKey: SAMPLE_DS.flowKey,
          image: {
            type: 'data-url',
            url: 'data:image/png;base64,XXX',
            width: 1024,
            height: 768,
            mimeType: 'image/png',
          },
        },
      ],
      timingMs: { startedAt: 0, endedAt: 100 },
    };
    expect(() => validateRenderResult(r)).not.toThrow();
  });

  it('rejects RenderResult with unknown status', () => {
    const r = {
      schemaVersion: 2,
      renderId: 'render-001',
      designState: SAMPLE_DS,
      templateVersion: SAMPLE_DS.templateVersion,
      status: 'pending',
      outputs: [],
      timingMs: { startedAt: 0, endedAt: 100 },
    };
    expect(() => validateRenderResult(r)).toThrowError(ValidationError);
  });

  it('rejects RenderResult with missing templateVersion', () => {
    const r = {
      renderId: 'render-001',
      designState: SAMPLE_DS,
      status: 'done',
      outputs: [
        {
          id: 'out-1',
          slot: 'mockup',
          flowKey: SAMPLE_DS.flowKey,
          image: {
            type: 'data-url',
            url: 'data:image/png;base64,XXX',
            width: 1024,
            height: 768,
            mimeType: 'image/png',
          },
        },
      ],
      timingMs: { startedAt: 0, endedAt: 100 },
    };
    expect(() => validateRenderResult(r)).toThrowError(ValidationError);
  });

  it('rejects RenderResult with outputs missing flowKey', () => {
    const r = {
      schemaVersion: 2,
      renderId: 'render-001',
      designState: SAMPLE_DS,
      templateVersion: SAMPLE_DS.templateVersion,
      status: 'done',
      outputs: [
        {
          id: 'out-1',
          slot: 'mockup',
          image: {
            type: 'data-url',
            url: 'data:image/png;base64,XXX',
            width: 1024,
            height: 768,
            mimeType: 'image/png',
          },
        },
      ],
      timingMs: { startedAt: 0, endedAt: 100 },
    };
    expect(() => validateRenderResult(r)).toThrowError(ValidationError);
  });

  it('passes a minimal RuntimeTemplate', () => {
    const t: RuntimeTemplate = {
      id: 'tmpl.basic-mockup',
      version: '1.0.0',
      schemaVersion: 2,
      displayName: 'Basic Mockup',
      inputs: [
        {
          id: 'background',
          name: 'Background color',
          type: 'string',
          required: false,
          defaultValue: '#ffffff',
        },
      ],
      flows: [{
        flowKey: 'preview' as FlowKey,
        nodes: [{ id: 'n1', type: 'load-image' }],
        explicitOutputs: [{ slot: 'mockup', kind: 'image', mediaType: 'image/png' }],
      }],
      createdAt: '2026-07-14T13:30:00.000Z',
      updatedAt: '2026-07-14T13:30:00.000Z',
    };
    expect(() => validateRuntimeTemplate(t)).not.toThrow();
  });

  it('rejects RuntimeTemplate without flows', () => {
    const bad = {
      id: 'tmpl.empty',
      version: '1.0.0',
      schemaVersion: 2,
      displayName: 'Empty',
      inputs: [],
      flows: [],
      createdAt: '2026-07-14T13:30:00.000Z',
      updatedAt: '2026-07-14T13:30:00.000Z',
    };
    expect(() => validateRuntimeTemplate(bad)).toThrowError(ValidationError);
  });

  it('rejects RuntimeTemplate with empty explicitOutputs (Flow must declare outputs)', () => {
    const bad: RuntimeTemplate = {
      id: 'tmpl.no-outputs',
      version: '1.0.0',
      schemaVersion: 2,
      displayName: 'No Outputs',
      inputs: [],
      flows: [{
        flowKey: 'preview' as FlowKey,
        nodes: [{ id: 'n1', type: 'load-image' }],
        explicitOutputs: [],
      }],
      createdAt: '2026-07-14T13:30:00.000Z',
      updatedAt: '2026-07-14T13:30:00.000Z',
    };
    expect(() => validateRuntimeTemplate(bad)).toThrowError(ValidationError);
  });

  it('rejects RuntimeTemplate with schemaVersion !== 2', () => {
    const bad: RuntimeTemplate = {
      id: 'tmpl.old',
      version: '1.0.0',
      // @ts-expect-error — schemaVersion 1 not allowed in M2-A
      schemaVersion: 1,
      displayName: 'Old',
      inputs: [],
      flows: [{
        flowKey: 'preview' as FlowKey,
        nodes: [{ id: 'n1', type: 'load-image' }],
        explicitOutputs: [{ slot: 'mockup', kind: 'image' }],
      }],
      createdAt: '2026-07-14T13:30:00.000Z',
      updatedAt: '2026-07-14T13:30:00.000Z',
    };
    expect(() => validateRuntimeTemplate(bad)).toThrowError(ValidationError);
  });
});

describe('ValidationError', () => {
  it('carries the target and array of errors', () => {
    const err = new ValidationError('DesignState', [
      { instancePath: '/templateId', message: 'must be string' } as never,
    ]);
    expect(err.target).toBe('DesignState');
    expect(err.errors).toHaveLength(1);
    expect(err.message).toContain('DesignState');
  });
});
