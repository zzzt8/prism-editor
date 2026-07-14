import { describe, it, expect } from 'vitest';
import {
  ValidationError,
  validateFlow,
  validateFlowKey,
  validateRenderRequest,
  validateRenderResult,
  validateRuntimeTemplate,
} from '../../validation';
import type { Flow, FlowKey } from '../../flow';
import type { DesignState } from '../../design-state';
import type { RenderRequest } from '../../render-request';
import type { RenderResult } from '../../render-result';
import type { RuntimeTemplate } from '../../runtime-template';
import type { ImageRef } from '../../image';

const SAMPLE_DS: DesignState = {
  schemaVersion: 1,
  templateId: 'tmpl.basic-mockup',
  templateVersion: '1.0.0',
  flowKey: 'production.print' as FlowKey,
  inputs: { assets: [], params: {} },
  createdAt: '2026-07-14T13:30:00.000Z',
};

function makeFlow(over: Partial<Flow> = {}): Flow {
  return {
    schemaVersion: 1,
    flowKey: 'production.print' as FlowKey,
    nodeRefs: [
      { nodeId: 'load-base', nodeType: 'image-load' },
      { nodeId: 'compose', nodeType: 'image-compose' },
    ],
    explicitOutputs: [
      { slot: 'mockup', nodeId: 'compose', port: 'image', kind: 'image' },
      { slot: 'mask', nodeId: 'compose', port: 'mask', kind: 'mask' },
    ],
    ...over,
  };
}

const SAMPLE_IMAGE: ImageRef = {
  type: 'data-url',
  url: 'data:image/png;base64,XXX',
  width: 1024,
  height: 768,
  mimeType: 'image/png',
};

describe('validateFlow — M2-A semantic checks', () => {
  it('accepts a valid Flow', () => {
    expect(() => validateFlow(makeFlow())).not.toThrow();
  });

  it('rejects Flow with duplicate slot (OUTPUT_SLOT_DUPLICATE)', () => {
    const bad = makeFlow({
      explicitOutputs: [
        { slot: 'mockup', nodeId: 'compose', port: 'image', kind: 'image' },
        { slot: 'mockup', nodeId: 'load-base', port: 'image', kind: 'image' },
      ],
    });
    try {
      validateFlow(bad);
      throw new Error('expected ValidationError');
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).target).toBe('Flow');
      const codes = (err as ValidationError).errors.map((e) => e.keyword);
      expect(codes).toContain('OUTPUT_SLOT_DUPLICATE');
    }
  });

  it('rejects Flow with explicitOutputs referencing missing nodeId (OUTPUT_NODE_NOT_FOUND)', () => {
    const bad = makeFlow({
      explicitOutputs: [
        { slot: 'mockup', nodeId: 'unknown-node', port: 'image', kind: 'image' },
      ],
    });
    try {
      validateFlow(bad);
      throw new Error('expected ValidationError');
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).target).toBe('Flow');
      const codes = (err as ValidationError).errors.map((e) => e.keyword);
      expect(codes).toContain('OUTPUT_NODE_NOT_FOUND');
      // ajv error carries a JSON Pointer path.
      const nodeIdErr = (err as ValidationError).errors.find(
        (e) => e.keyword === 'OUTPUT_NODE_NOT_FOUND',
      );
      expect(nodeIdErr?.instancePath).toBe('/explicitOutputs/0/nodeId');
    }
  });

  it('rejects Flow with bad flowKey (does not match the format pattern)', () => {
    const bad = {
      schemaVersion: 1,
      flowKey: 'BadKey',
      nodeRefs: [{ nodeId: 'a', nodeType: 'b' }],
      explicitOutputs: [{ slot: 's', nodeId: 'a', port: 'p', kind: 'image' as const }],
    };
    expect(() => validateFlow(bad)).toThrowError(ValidationError);
  });
});

describe('validateFlowKey — M2-A shape check', () => {
  it('accepts valid flowKey strings', () => {
    expect(() => validateFlowKey('production.print')).not.toThrow();
    expect(() => validateFlowKey('preview')).not.toThrow();
    expect(() => validateFlowKey('production-batch')).not.toThrow();
  });

  it('rejects empty / uppercase / leading separator / over-length', () => {
    expect(() => validateFlowKey('')).toThrowError(ValidationError);
    expect(() => validateFlowKey('BadKey')).toThrowError(ValidationError);
    expect(() => validateFlowKey('.preview')).toThrowError(ValidationError);
    expect(() => validateFlowKey('a'.repeat(97))).toThrowError(ValidationError);
  });

  it('rejects non-string inputs', () => {
    expect(() => validateFlowKey(123)).toThrowError(ValidationError);
    expect(() => validateFlowKey(null)).toThrowError(ValidationError);
    expect(() => validateFlowKey(undefined)).toThrowError(ValidationError);
  });
});

describe('validateRuntimeTemplate — M2-A duplicate-flowKey post-validation', () => {
  it('rejects template with duplicate flowKeys (DUPLICATE_FLOW_KEY)', () => {
    const t: RuntimeTemplate = {
      id: 'tmpl.dup-flowkey',
      version: '1.0.0',
      schemaVersion: 2,
      displayName: 'Dup FlowKey',
      inputs: [],
      flows: [
        {
          flowKey: 'production.print' as FlowKey,
          nodes: [{ id: 'n1', type: 'load-image' }],
          explicitOutputs: [{ slot: 'mockup', kind: 'image' }],
        },
        {
          flowKey: 'production.print' as FlowKey,
          nodes: [{ id: 'n2', type: 'load-image' }],
          explicitOutputs: [{ slot: 'mask', kind: 'mask' }],
        },
      ],
      createdAt: '2026-07-14T13:30:00.000Z',
      updatedAt: '2026-07-14T13:30:00.000Z',
    };
    try {
      validateRuntimeTemplate(t);
      throw new Error('expected ValidationError');
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      const codes = (err as ValidationError).errors.map((e) => e.keyword);
      expect(codes).toContain('DUPLICATE_FLOW_KEY');
    }
  });
});

describe('validateRenderRequest — M2-A semantic checks', () => {
  it('accepts a valid RenderRequest with requestedOutputSlots', () => {
    const req: RenderRequest = {
      designState: SAMPLE_DS,
      requestedOutputSlots: ['mockup'],
    };
    expect(() => validateRenderRequest(req)).not.toThrow();
  });

  it('rejects empty requestedOutputSlots (REQUESTED_OUTPUTS_EMPTY)', () => {
    const req = {
      designState: SAMPLE_DS,
      requestedOutputSlots: [],
    } as RenderRequest;
    try {
      validateRenderRequest(req);
      throw new Error('expected ValidationError');
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).target).toBe('RenderRequest');
      const codes = (err as ValidationError).errors.map((e) => e.keyword);
      expect(codes).toContain('REQUESTED_OUTPUTS_EMPTY');
    }
  });

  it('rejects a slot violating the slot pattern', () => {
    const req = {
      designState: SAMPLE_DS,
      requestedOutputSlots: ['.bad-leading-dot'],
    } as RenderRequest;
    expect(() => validateRenderRequest(req)).toThrowError(ValidationError);
  });
});

describe('validateRenderResult — M2-A post-validation', () => {
  function makeResult(over: Partial<RenderResult> = {}): RenderResult {
    return {
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
          image: SAMPLE_IMAGE,
        },
      ],
      timingMs: { startedAt: 0, endedAt: 100 },
      ...over,
    };
  }

  it('accepts a valid RenderResult with matching templateVersion + flowKey', () => {
    expect(() => validateRenderResult(makeResult())).not.toThrow();
  });

  it('rejects templateVersion mismatch (TEMPLATE_VERSION_MISMATCH)', () => {
    const bad = makeResult({ templateVersion: '2.0.0' });
    try {
      validateRenderResult(bad);
      throw new Error('expected ValidationError');
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      const codes = (err as ValidationError).errors.map((e) => e.keyword);
      expect(codes).toContain('TEMPLATE_VERSION_MISMATCH');
    }
  });

  it('rejects outputs[].flowKey mismatch (OUTPUT_FLOW_KEY_MISMATCH)', () => {
    const bad = makeResult({
      outputs: [
        {
          id: 'out-1',
          slot: 'mockup',
          flowKey: 'preview' as FlowKey, // wrong flowKey
          image: SAMPLE_IMAGE,
        },
      ],
    });
    try {
      validateRenderResult(bad);
      throw new Error('expected ValidationError');
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      const codes = (err as ValidationError).errors.map((e) => e.keyword);
      expect(codes).toContain('OUTPUT_FLOW_KEY_MISMATCH');
    }
  });
});