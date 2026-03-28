import { describe, it, expect } from 'vitest';
import type { PortType, NodeDefinition } from '@prism/shared-types';
import { PortDataType } from '@prism/shared-types';
import {
  canConnect,
  validateConnection,
  getPortsByDirection,
  findCompatiblePorts,
  buildPortRef,
  PORT_COMPATIBILITY,
} from '@prism/shared-types';

const makeNode = (
  inputs: Array<{ id: string; type: PortType; dataType: PortDataType }>,
  outputs: Array<{ id: string; type: PortType; dataType: PortDataType }>
): NodeDefinition => ({
  type: 'test-node',
  category: 'transform',
  label: 'Test Node',
  inputs: inputs.map((i) => ({ id: i.id, name: i.id, type: i.type, dataType: i.dataType, required: true })),
  outputs: outputs.map((o) => ({ id: o.id, name: o.id, type: o.type, dataType: o.dataType, required: false })),
  params: [],
});

describe('PORT_COMPATIBILITY matrix', () => {
  it('maps each PortType to itself only', () => {
    const types: PortType[] = ['image', 'mask', 'number', 'string', 'boolean'];
    for (const t of types) {
      expect(PORT_COMPATIBILITY[t]).toBeDefined();
      expect(Array.isArray(PORT_COMPATIBILITY[t])).toBe(true);
      expect(PORT_COMPATIBILITY[t].length).toBe(1);
      expect(PORT_COMPATIBILITY[t][0]).toBe(t);
    }
  });

  it('no type accepts a different type', () => {
    const types: PortType[] = ['image', 'mask', 'number', 'string', 'boolean'];
    for (const src of types) {
      for (const dst of types) {
        if (src !== dst) {
          expect(PORT_COMPATIBILITY[src].includes(dst)).toBe(false);
        }
      }
    }
  });
});

describe('canConnect()', () => {
  it('returns true for matching types', () => {
    const pairs: Array<[PortType, PortType]> = [
      ['image', 'image'],
      ['mask', 'mask'],
      ['number', 'number'],
      ['string', 'string'],
      ['boolean', 'boolean'],
    ];
    for (const [src, dst] of pairs) {
      expect(canConnect(src, dst)).toBe(true);
    }
  });

  it('returns false for mismatched types', () => {
    const pairs: Array<[PortType, PortType]> = [
      ['image', 'mask'],
      ['mask', 'image'],
      ['image', 'number'],
      ['string', 'boolean'],
      ['number', 'string'],
      ['boolean', 'number'],
    ];
    for (const [src, dst] of pairs) {
      expect(canConnect(src, dst)).toBe(false);
    }
  });
});

describe('validateConnection()', () => {
  it('returns valid for compatible ports', () => {
    const result = validateConnection(
      { nodeId: 'n1', portId: 'img', direction: 'source', type: 'image' },
      { nodeId: 'n2', portId: 'img', direction: 'target', type: 'image' }
    );
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('returns invalid with reason for type mismatch', () => {
    const result = validateConnection(
      { nodeId: 'n1', portId: 'img', direction: 'source', type: 'image' },
      { nodeId: 'n2', portId: 'mask', direction: 'target', type: 'mask' }
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Type mismatch');
    expect(result.sourceType).toBe('image');
    expect(result.targetType).toBe('mask');
  });

  it('returns invalid when source port is not a source', () => {
    const result = validateConnection(
      { nodeId: 'n1', portId: 'img', direction: 'target', type: 'image' },
      { nodeId: 'n2', portId: 'img', direction: 'target', type: 'image' }
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('not a source port');
  });

  it('returns invalid when target port is not a target', () => {
    const result = validateConnection(
      { nodeId: 'n1', portId: 'img', direction: 'source', type: 'image' },
      { nodeId: 'n2', portId: 'img', direction: 'source', type: 'image' }
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('not a target port');
  });
});

describe('getPortsByDirection()', () => {
  it('returns input ports for direction=input', () => {
    const node = makeNode(
      [{ id: 'img', type: 'image', dataType: PortDataType.IMAGE }, { id: 'num', type: 'number', dataType: PortDataType.NUMBER }],
      [{ id: 'out', type: 'image', dataType: PortDataType.IMAGE }]
    );
    const inputs = getPortsByDirection(node, 'input');
    expect(inputs).toHaveLength(2);
    expect(inputs.find((p) => p.portId === 'img')?.type).toBe('image');
    expect(inputs.find((p) => p.portId === 'num')?.type).toBe('number');
  });

  it('returns output ports for direction=output', () => {
    const node = makeNode(
      [{ id: 'img', type: 'image', dataType: PortDataType.IMAGE }],
      [{ id: 'out', type: 'image', dataType: PortDataType.IMAGE }]
    );
    const outputs = getPortsByDirection(node, 'output');
    expect(outputs).toHaveLength(1);
    expect(outputs[0].portId).toBe('out');
    expect(outputs[0].type).toBe('image');
  });
});

describe('findCompatiblePorts()', () => {
  it('returns ports matching source type', () => {
    const node = makeNode(
      [{ id: 'img', type: 'image', dataType: PortDataType.IMAGE }, { id: 'msk', type: 'mask', dataType: PortDataType.MASK }, { id: 'num', type: 'number', dataType: PortDataType.NUMBER }],
      []
    );
    const compatible = findCompatiblePorts(node, 'target', 'image');
    expect(compatible).toEqual(['img']);
  });

  it('returns empty array when no ports match', () => {
    const node = makeNode([{ id: 'num', type: 'number', dataType: PortDataType.NUMBER }], []);
    const compatible = findCompatiblePorts(node, 'target', 'image');
    expect(compatible).toEqual([]);
  });

  it('returns empty array when node has no input ports', () => {
    const node = makeNode([], []);
    const compatible = findCompatiblePorts(node, 'target', 'image');
    expect(compatible).toEqual([]);
  });
});

describe('buildPortRef()', () => {
  it('builds valid source port ref from node definition', () => {
    const node = makeNode([], [{ id: 'img', type: 'image', dataType: PortDataType.IMAGE }]);
    const ref = buildPortRef(node, 'n1', 'img', 'source');
    expect(ref).toEqual({
      nodeId: 'n1',
      portId: 'img',
      direction: 'source',
      type: 'image',
    });
  });

  it('builds valid target port ref from node definition', () => {
    const node = makeNode([{ id: 'img', type: 'image', dataType: PortDataType.IMAGE }], []);
    const ref = buildPortRef(node, 'n1', 'img', 'target');
    expect(ref).toEqual({
      nodeId: 'n1',
      portId: 'img',
      direction: 'target',
      type: 'image',
    });
  });

  it('throws when port does not exist', () => {
    const node = makeNode([], []);
    expect(() => buildPortRef(node, 'n1', 'nonexistent', 'source'))
      .toThrow("Port 'nonexistent' not found on node 'n1'");
  });
});
