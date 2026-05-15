// executionService - handles workflow execution
// Extracted from canvasStore

import type { EditorWorkflowMeta, EditorCanvasNode, EditorCanvasEdge, ExecutionProgress } from '@prism/shared-types';

export interface ExecutionResult {
  status: 'done' | 'error' | 'cancelled';
  error?: string;
}

export type ExecutionLane = 'main-thread' | 'worker';

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

export const DEFAULT_LANE_CONFIG: LaneConfig = {
  enableWorkerLane: true,
};

export interface ExecuteOptions {
  onProgress: (progress: ExecutionProgress) => void;
  signal: AbortSignal;
  laneConfig?: Partial<LaneConfig>;
}

export interface ExecutionService {
  execute: (
    workflowMeta: EditorWorkflowMeta,
    nodes: EditorCanvasNode[],
    edges: EditorCanvasEdge[],
    options: ExecuteOptions
  ) => Promise<ExecutionResult>;
  cancel: () => void;
}

export function createExecutionService(): ExecutionService {
  let activeController: AbortController | null = null;

  return {
    async execute(_workflowMeta, _nodes, _edges, options) {
      // Create a fresh AbortController for this execution run
      activeController = new AbortController();
      const { onProgress, signal, laneConfig } = options;
      const { globalRegistry } = await import('@prism/core');
      const { WorkflowExecutor } = await import('@prism/workflow-core');

      // Initialize globalRegistry
      try {
        globalRegistry.initialize();
      } catch (initError) {
        return {
          status: 'error' as const,
          error: initError instanceof Error ? initError.message : 'Failed to initialize node registry',
        };
      }

      // Get executors
      let executors: ReturnType<typeof globalRegistry.getExecutors>;
      try {
        executors = globalRegistry.getExecutors();
      } catch (execError) {
        return {
          status: 'error' as const,
          error: execError instanceof Error ? execError.message : 'Failed to get executors',
        };
      }

      const executor = new WorkflowExecutor(executors);
      const _workflow = {
        id: workflowMeta.id,
        name: workflowMeta.name,
        version: workflowMeta.version,
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.data.nodeType,
          position: n.position,
          params: n.data.params,
        })),
        connections: edges
          .filter((e) => e.sourceHandle && e.targetHandle)
          .map((e) => ({
            id: e.id,
            from: {
              nodeId: e.source,
              port: e.sourceHandle!,
            },
            to: {
              nodeId: e.target,
              port: e.targetHandle!,
            },
          })),
        inputs: [],
        outputs: [],
        metadata: { createdAt: '', updatedAt: '' },
      };

      const effectiveLaneConfig = { ...DEFAULT_LANE_CONFIG, ...laneConfig };
      const result = await executor.execute(_workflow, {
        signal,
        onProgress,
        laneConfig: effectiveLaneConfig,
      });

      return {
        status: result.status as 'done' | 'error' | 'cancelled',
        error: result.error,
      };
    },

    cancel() {
      activeController?.abort();
    },
  };
}

// Singleton instance for backward compatibility
let _serviceInstance: ExecutionService | null = null;

export function getExecutionService(): ExecutionService {
  if (!_serviceInstance) {
    _serviceInstance = createExecutionService();
  }
  return _serviceInstance;
}

// Default instance (lazy initialization)
export const executionService: ExecutionService = {
  async execute(workflowMeta, nodes, edges, options) {
    const svc = getExecutionService();
    return svc.execute(workflowMeta, nodes, edges, options);
  },
  cancel() {
    const svc = getExecutionService();
    svc.cancel();
  },
};
