// Topological sort for node execution ordering

import type { Connection, WorkflowNode } from '@prism/shared-types';

export interface TopologicalSortResult {
  order: string[];
  hasCycle: boolean;
  cycleNodes?: string[];
}

/**
 * Perform topological sort on workflow nodes using Kahn's algorithm.
 * Returns the execution order and detects cycles.
 */
export function topologicalSort(
  nodes: WorkflowNode[],
  connections: Connection[]
): TopologicalSortResult {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  // Initialize
  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjList.set(node.id, []);
  }

  // Build adjacency list and in-degree map
  for (const conn of connections) {
    if (!nodeIds.has(conn.from.nodeId) || !nodeIds.has(conn.to.nodeId)) {
      continue;
    }
    adjList.get(conn.from.nodeId)!.push(conn.to.nodeId);
    inDegree.set(conn.to.nodeId, (inDegree.get(conn.to.nodeId) ?? 0) + 1);
  }

  // Find all nodes with no incoming edges
  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  const order: string[] = [];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);
    order.push(nodeId);

    for (const neighbor of adjList.get(nodeId) ?? []) {
      const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  // If not all nodes are visited, there's a cycle
  const hasCycle = order.length !== nodes.length;
  const cycleNodes = hasCycle
    ? nodes.filter((n) => !visited.has(n.id)).map((n) => n.id)
    : undefined;

  return { order, hasCycle, cycleNodes };
}

/**
 * Get topological levels (wavefront groups) for parallel execution.
 * Nodes within the same level have no dependencies on each other
 * and can execute in parallel.
 *
 * Level 0: nodes with no upstream dependencies
 * Level 1: nodes whose all upstream dependencies are in level 0
 * Level 2: nodes whose all upstream dependencies are in levels 0-1
 * ...and so on
 */
export function getTopologicalLevels(
  nodes: WorkflowNode[],
  connections: Connection[]
): { levels: string[][]; hasCycle: boolean; cycleNodes?: string[] } {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();
  const upstreamOf = new Map<string, Set<string>>();

  // Initialize
  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjList.set(node.id, []);
    upstreamOf.set(node.id, new Set());
  }

  // Build adjacency list, in-degree map, and upstream tracking
  for (const conn of connections) {
    if (!nodeIds.has(conn.from.nodeId) || !nodeIds.has(conn.to.nodeId)) {
      continue;
    }
    adjList.get(conn.from.nodeId)!.push(conn.to.nodeId);
    inDegree.set(conn.to.nodeId, (inDegree.get(conn.to.nodeId) ?? 0) + 1);
    upstreamOf.get(conn.to.nodeId)!.add(conn.from.nodeId);
  }

  const levels: string[][] = [];
  let processedCount = 0;
  let currentDegree = new Map(inDegree);

  while (processedCount < nodes.length) {
    const level: string[] = [];

    for (const node of nodes) {
      const id = node.id;
      if (currentDegree.get(id) === 0) {
        level.push(id);
      }
    }

    if (level.length === 0) {
      // No nodes with zero in-degree - there's a cycle
      const unprocessed = nodes.filter((n) => currentDegree.get(n.id)! > 0);
      return {
        levels: [],
        hasCycle: true,
        cycleNodes: unprocessed.map((n) => n.id),
      };
    }

    levels.push(level);

    // Reduce in-degree for all downstream nodes
    for (const nodeId of level) {
      currentDegree.set(nodeId, -1); // mark as processed
      processedCount++;

      for (const downstream of adjList.get(nodeId) ?? []) {
        currentDegree.set(downstream, (currentDegree.get(downstream) ?? 1) - 1);
      }
    }
  }

  return { levels, hasCycle: false };
}

/**
 * Detect if adding a connection would create a cycle.
 */
export function wouldCreateCycle(
  nodes: WorkflowNode[],
  connections: Connection[],
  fromNodeId: string,
  toNodeId: string
): boolean {
  const newConnections = [...connections, { id: 'temp', from: { nodeId: fromNodeId, port: '' }, to: { nodeId: toNodeId, port: '' } }];
  const result = topologicalSort(nodes, newConnections);
  return result.hasCycle;
}

/**
 * Get direct upstream nodes (dependencies) of a given node.
 */
export function getUpstreamNodes(
  nodeId: string,
  connections: Connection[]
): string[] {
  return connections
    .filter((c) => c.to.nodeId === nodeId)
    .map((c) => c.from.nodeId);
}

/**
 * Get direct downstream nodes (dependents) of a given node.
 */
export function getDownstreamNodes(
  nodeId: string,
  connections: Connection[]
): string[] {
  return connections
    .filter((c) => c.from.nodeId === nodeId)
    .map((c) => c.to.nodeId);
}
