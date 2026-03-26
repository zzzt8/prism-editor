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
