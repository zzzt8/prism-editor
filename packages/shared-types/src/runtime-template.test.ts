import { describe, it, expect } from 'vitest';
import type {
  RuntimeTemplate,
  RuntimeTemplateInputField,
  RuntimeTemplateFlow,
} from './runtime-template';
import type { FlowKey } from './flow';

const SAMPLE_FIELD: RuntimeTemplateInputField = {
  id: 'background',
  name: 'Background color',
  type: 'string',
  required: false,
  defaultValue: '#ffffff',
};

const SAMPLE_FLOW: RuntimeTemplateFlow = {
  flowKey: 'preview' as FlowKey,
  nodes: [{ id: 'n1', type: 'load-image' }],
};

function makeTemplate(over: Partial<RuntimeTemplate> = {}): RuntimeTemplate {
  return {
    id: 'tmpl.basic-mockup',
    version: '1.0.0',
    schemaVersion: 1,
    displayName: 'Basic Mockup',
    inputs: [SAMPLE_FIELD],
    flows: [SAMPLE_FLOW],
    createdAt: '2026-07-14T13:30:00.000Z',
    updatedAt: '2026-07-14T13:30:00.000Z',
    ...over,
  };
}

describe('RuntimeTemplate — type contract shape', () => {
  it('round-trips a minimal template through JSON', () => {
    const t = makeTemplate();
    const round = JSON.parse(JSON.stringify(t)) as RuntimeTemplate;
    expect(round.id).toBe('tmpl.basic-mockup');
    expect(round.version).toBe('1.0.0');
    expect(round.schemaVersion).toBe(1);
    expect(round.inputs).toHaveLength(1);
    expect(round.flows).toHaveLength(1);
  });

  it('exposes minimal node projection (id, type) — no positions, no params', () => {
    const t = makeTemplate();
    const node = t.flows[0].nodes[0];
    expect(node.id).toBe('n1');
    expect(node.type).toBe('load-image');
    // RuntimeTemplate node projection must NOT include `position` or `params`
    const keys = Object.keys(node).sort();
    expect(keys).toEqual(['id', 'type']);
  });

  it('coexists with the legacy Template type without sharing members', () => {
    // Compile-time: neither type references the other.
    // Runtime-time shape parity: RuntimeTemplate.id (string) vs Template.id (string) are independent.
    const t = makeTemplate();
    expect(t.id).toBe('tmpl.basic-mockup');
  });
});
