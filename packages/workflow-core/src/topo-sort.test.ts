import { describe, it, expect } from 'vitest';
import { topologicalSort, wouldCreateCycle, getUpstreamNodes, getDownstreamNodes } from '../src/topo-sort';
import type { WorkflowNode, Connection } from '@prism/shared-types';

function makeNode(id: string): WorkflowNode {
  return { id, type: 'test', position: { x: 0, y: 0 }, params: {} };
}

function makeConnection(id: string, from: string, to: string): Connection {
  return { id, from: { nodeId: from, port: 'out' }, to: { nodeId: to, port: 'in' } };
}

describe('topologicalSort', () => {
  it('returns correct order for a linear chain', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')];
    const connections = [makeConnection('1', 'a', 'b'), makeConnection('2', 'b', 'c')];

    const result = topologicalSort(nodes, connections);

    expect(result.hasCycle).toBe(false);
    expect(result.order).toEqual(['a', 'b', 'c']);
  });

  it('returns correct order for a diamond dependency', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c'), makeNode('d')];
    const connections = [
      makeConnection('1', 'a', 'b'),
      makeConnection('2', 'a', 'c'),
      makeConnection('3', 'b', 'd'),
      makeConnection('4', 'c', 'd'),
    ];

    const result = topologicalSort(nodes, connections);

    expect(result.hasCycle).toBe(false);
    expect(result.order[0]).toBe('a');
    expect(result.order[3]).toBe('d');
    expect(new Set(result.order.slice(1, 3))).toEqual(new Set(['b', 'c']));
  });

  it('detects cycle in a self-loop', () => {
    const nodes = [makeNode('a')];
    const connections = [makeConnection('1', 'a', 'a')];

    const result = topologicalSort(nodes, connections);

    expect(result.hasCycle).toBe(true);
    expect(result.cycleNodes).toContain('a');
  });

  it('detects cycle in a two-node loop', () => {
    const nodes = [makeNode('a'), makeNode('b')];
    const connections = [makeConnection('1', 'a', 'b'), makeConnection('2', 'b', 'a')];

    const result = topologicalSort(nodes, connections);

    expect(result.hasCycle).toBe(true);
  });

  it('handles disconnected nodes', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')];
    const connections: Connection[] = [];

    const result = topologicalSort(nodes, connections);

    expect(result.hasCycle).toBe(false);
    expect(result.order).toHaveLength(3);
  });

  it('ignores connections with unknown node IDs', () => {
    const nodes = [makeNode('a'), makeNode('b')];
    const connections = [makeConnection('1', 'a', 'b'), makeConnection('2', 'a', 'unknown')];

    const result = topologicalSort(nodes, connections);

    expect(result.hasCycle).toBe(false);
    expect(result.order).toEqual(['a', 'b']);
  });
});

describe('wouldCreateCycle', () => {
  it('returns false when adding a non-cyclic connection', () => {
    const nodes = [makeNode('a'), makeNode('b')];
    const connections: Connection[] = [];

    const result = wouldCreateCycle(nodes, connections, 'a', 'b');

    expect(result).toBe(false);
  });

  it('returns true when adding a cyclic connection', () => {
    const nodes = [makeNode('a'), makeNode('b')];
    const connections = [makeConnection('1', 'b', 'a')];

    const result = wouldCreateCycle(nodes, connections, 'a', 'b');

    expect(result).toBe(true);
  });
});

describe('getUpstreamNodes', () => {
  it('returns direct upstream nodes', () => {
    const connections = [
      makeConnection('1', 'a', 'c'),
      makeConnection('2', 'b', 'c'),
    ];

    expect(getUpstreamNodes('c', connections)).toEqual(['a', 'b']);
  });

  it('returns empty array when no upstream nodes', () => {
    const connections: Connection[] = [];
    expect(getUpstreamNodes('a', connections)).toEqual([]);
  });
});

describe('getDownstreamNodes', () => {
  it('returns direct downstream nodes', () => {
    const connections = [
      makeConnection('1', 'a', 'b'),
      makeConnection('2', 'a', 'c'),
    ];

    expect(getDownstreamNodes('a', connections)).toEqual(['b', 'c']);
  });

  it('returns empty array when no downstream nodes', () => {
    const connections: Connection[] = [];
    expect(getDownstreamNodes('a', connections)).toEqual([]);
  });
});
