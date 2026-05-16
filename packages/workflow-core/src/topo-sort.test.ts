import { describe, it, expect } from 'vitest';
import { topologicalSort, wouldCreateCycle, getUpstreamNodes, getDownstreamNodes, getTopologicalLevels } from '../src/topo-sort';
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

describe('getTopologicalLevels', () => {
  it('returns single level for linear chain', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')];
    const connections = [makeConnection('1', 'a', 'b'), makeConnection('2', 'b', 'c')];

    const result = getTopologicalLevels(nodes, connections);

    expect(result.hasCycle).toBe(false);
    expect(result.levels).toEqual([['a'], ['b'], ['c']]);
  });

  it('groups parallel nodes into same level (diamond)', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c'), makeNode('d')];
    const connections = [
      makeConnection('1', 'a', 'b'),
      makeConnection('2', 'a', 'c'),
      makeConnection('3', 'b', 'd'),
      makeConnection('4', 'c', 'd'),
    ];

    const result = getTopologicalLevels(nodes, connections);

    expect(result.hasCycle).toBe(false);
    expect(result.levels).toHaveLength(3);
    expect(result.levels[0]).toEqual(['a']);
    expect(new Set(result.levels[1])).toEqual(new Set(['b', 'c']));
    expect(result.levels[2]).toEqual(['d']);
  });

  it('groups independent nodes into level 0', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')];
    const connections: Connection[] = [];

    const result = getTopologicalLevels(nodes, connections);

    expect(result.hasCycle).toBe(false);
    expect(result.levels).toHaveLength(1);
    expect(new Set(result.levels[0])).toEqual(new Set(['a', 'b', 'c']));
  });

  it('detects cycle and returns cycle nodes', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')];
    const connections = [
      makeConnection('1', 'a', 'b'),
      makeConnection('2', 'b', 'c'),
      makeConnection('3', 'c', 'a'),
    ];

    const result = getTopologicalLevels(nodes, connections);

    expect(result.hasCycle).toBe(true);
    expect(result.levels).toEqual([]);
    expect(result.cycleNodes).toBeDefined();
  });

  it('returns empty levels on self-loop', () => {
    const nodes = [makeNode('a')];
    const connections = [makeConnection('1', 'a', 'a')];

    const result = getTopologicalLevels(nodes, connections);

    expect(result.hasCycle).toBe(true);
    expect(result.levels).toEqual([]);
  });

  it('handles complex multi-level graph', () => {
    //     a
    //    / \
    //   b   c
    //    \ /
    //     d
    //    / \
    //   e   f
    //    \ /
    //     g
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c'), makeNode('d'), makeNode('e'), makeNode('f'), makeNode('g')];
    const connections = [
      makeConnection('1', 'a', 'b'),
      makeConnection('2', 'a', 'c'),
      makeConnection('3', 'b', 'd'),
      makeConnection('4', 'c', 'd'),
      makeConnection('5', 'd', 'e'),
      makeConnection('6', 'd', 'f'),
      makeConnection('7', 'e', 'g'),
      makeConnection('8', 'f', 'g'),
    ];

    const result = getTopologicalLevels(nodes, connections);

    expect(result.hasCycle).toBe(false);
    expect(result.levels).toHaveLength(5);
    expect(result.levels[0]).toEqual(['a']);
    expect(new Set(result.levels[1])).toEqual(new Set(['b', 'c']));
    expect(result.levels[2]).toEqual(['d']);
    expect(new Set(result.levels[3])).toEqual(new Set(['e', 'f']));
    expect(result.levels[4]).toEqual(['g']);
  });
});
