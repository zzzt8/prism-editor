// idCounter - centralized node/edge ID generation
// Single source of truth for nodeCounter and edgeCounter across the editor store.
// All ID creation goes through this module to prevent ID collisions.

let nodeCounter = 0;
let edgeCounter = 0;

/**
 * Generate a unique node ID.
 */
export function createNodeId(): string {
  return `node-${++nodeCounter}`;
}

/**
 * Generate a unique edge ID.
 */
export function createEdgeId(): string {
  return `edge-${++edgeCounter}`;
}

/**
 * Get current node counter value.
 */
export function getNodeCounter(): number {
  return nodeCounter;
}

/**
 * Set node counter value (used when loading workflows to sync counters).
 */
export function setNodeCounter(value: number): void {
  nodeCounter = value;
}

/**
 * Get current edge counter value.
 */
export function getEdgeCounter(): number {
  return edgeCounter;
}

/**
 * Set edge counter value (used when loading workflows to sync counters).
 */
export function setEdgeCounter(value: number): void {
  edgeCounter = value;
}

/**
 * Reset all counters to zero. Call when creating a new workflow.
 */
export function resetCounters(): void {
  nodeCounter = 0;
  edgeCounter = 0;
}

/**
 * Sync counters from loaded workflow data.
 * Parses max IDs from workflow nodes and connections.
 */
export function syncCountersFromWorkflow(
  nodeIds: string[],
  edgeIds: string[]
): void {
  if (nodeIds.length > 0) {
    const maxNode = Math.max(
      0,
      ...nodeIds.map((id) => {
        const match = id.match(/^node-(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
    );
    nodeCounter = maxNode;
  }

  if (edgeIds.length > 0) {
    const maxEdge = Math.max(
      0,
      ...edgeIds.map((id) => {
        const match = id.match(/^edge-(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
    );
    edgeCounter = maxEdge;
  }
}
