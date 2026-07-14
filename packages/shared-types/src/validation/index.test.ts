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
import type { RenderRequest } from '../render-request';
import type { RenderResult } from '../render-result';
import type { RuntimeTemplate } from '../runtime-template';

const SAMPLE_DS: DesignState = {
  schemaVersion: 1,
  templateId: 'tmpl.basic-mockup',
  templateVersion: '1.0.0',
  flowKey: 'preview',
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
    const req: RenderRequest = { designState: SAMPLE_DS };
    expect(() => validateRenderRequest(req)).not.toThrow();
  });

  it('rejects RenderRequest when designState is missing', () => {
    expect(() => validateRenderRequest({})).toThrowError(ValidationError);
  });

  it('passes a valid RenderResult (done)', () => {
    const r: RenderResult = {
      renderId: 'render-001',
      designState: SAMPLE_DS,
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
    expect(() => validateRenderResult(r)).not.toThrow();
  });

  it('rejects RenderResult with unknown status', () => {
    const r = {
      renderId: 'render-001',
      designState: SAMPLE_DS,
      status: 'pending',
      outputs: [],
      timingMs: { startedAt: 0, endedAt: 100 },
    };
    expect(() => validateRenderResult(r)).toThrowError(ValidationError);
  });

  it('passes a minimal RuntimeTemplate', () => {
    const t: RuntimeTemplate = {
      id: 'tmpl.basic-mockup',
      version: '1.0.0',
      schemaVersion: 1,
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
      flows: [{ flowKey: 'preview', nodes: [{ id: 'n1', type: 'load-image' }] }],
      createdAt: '2026-07-14T13:30:00.000Z',
      updatedAt: '2026-07-14T13:30:00.000Z',
    };
    expect(() => validateRuntimeTemplate(t)).not.toThrow();
  });

  it('rejects RuntimeTemplate without flows', () => {
    const bad = {
      id: 'tmpl.empty',
      version: '1.0.0',
      schemaVersion: 1,
      displayName: 'Empty',
      inputs: [],
      flows: [],
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
