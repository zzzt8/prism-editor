// Lane selection strategy for workflow execution
// Determines whether a node should run on main-thread or worker lane

/**
 * Execution lanes available for node execution
 */
export type ExecutionLane = 'main-thread' | 'worker';

/**
 * Node types that should run on the main thread lane.
 * These typically involve DOM APIs, networking, or need immediate access to main thread resources.
 */
export const MAIN_THREAD_NODES = new Set<string>([
  'load-image',
  'load-mask',
  'export',
] as const);

/**
 * Node types that should run on the worker lane.
 * These are CPU-intensive image processing operations.
 */
export const WORKER_NODES = new Set<string>([
  'transform',
  'composite',
  'apply-mask',
] as const);

/**
 * All known node types that have lane preferences defined.
 */
export const KNOWN_NODE_TYPES = new Set([
  ...MAIN_THREAD_NODES,
  ...WORKER_NODES,
]);

/**
 * Get the preferred execution lane for a node type.
 *
 * Strategy:
 * - load-image/load-mask: must run on main thread (DOM Image, canvas, CORS fetch)
 * - export: main thread (Blob creation, download triggers)
 * - transform/composite/apply-mask: CPU-intensive → worker lane
 * - Unknown types: default to main-thread for safety
 *
 * @param nodeType - The type identifier of the node
 * @returns The recommended execution lane
 */
export function getLaneForNodeType(nodeType: string): ExecutionLane {
  if (WORKER_NODES.has(nodeType)) {
    return 'worker';
  }
  // Default to main-thread for load-image/load-mask/unknown types
  return 'main-thread';
}

/**
 * Check if a node type should run on the worker lane.
 */
export function isWorkerLaneNode(nodeType: string): boolean {
  return WORKER_NODES.has(nodeType);
}

/**
 * Check if a node type should run on the main thread lane.
 */
export function isMainThreadLaneNode(nodeType: string): boolean {
  return MAIN_THREAD_NODES.has(nodeType);
}

/**
 * Batch-split nodes by their execution lane.
 * Returns two arrays: [mainThreadNodes, workerNodes] preserving original order within each lane.
 */
export function splitByLane<T extends { type: string }>(nodes: T[]): [T[], T[]] {
  const mainThread: T[] = [];
  const worker: T[] = [];

  for (const node of nodes) {
    if (isWorkerLaneNode(node.type)) {
      worker.push(node);
    } else {
      mainThread.push(node);
    }
  }

  return [mainThread, worker];
}

/**
 * Lane selection configuration for advanced control.
 */
export interface LaneConfig {
  /**
   * Override to force all nodes to a specific lane.
   * Useful for testing or when workers are unavailable.
   */
  overrideLane?: ExecutionLane;
  /**
   * Whether to allow worker lane execution.
   * Set to false to disable offloading (e.g., no Web Worker support).
   */
  enableWorkerLane: boolean;
}

/**
 * Default lane configuration.
 */
export const DEFAULT_LANE_CONFIG: LaneConfig = {
  enableWorkerLane: true,
};

/**
 * Get the effective lane for a node considering config overrides.
 */
export function getEffectiveLane(
  nodeType: string,
  config: Partial<LaneConfig> = {}
): ExecutionLane {
  const effective = { ...DEFAULT_LANE_CONFIG, ...config };

  if (effective.overrideLane) {
    return effective.overrideLane;
  }

  if (!effective.enableWorkerLane) {
    return 'main-thread';
  }

  return getLaneForNodeType(nodeType);
}
