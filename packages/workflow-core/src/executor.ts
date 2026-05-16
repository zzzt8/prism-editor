// Workflow executor - orchestrates node execution

import type {
  Workflow,
  NodeExecutor,
  ExecutorOptions,
  NodeResult,
  NodeDefinition,
} from '@prism/shared-types';
import type { LaneConfig } from '@prism/shared-types';
import { topologicalSort, getTopologicalLevels } from './topo-sort';
import { createExecutionContext, recordNodeResult, checkAborted } from './context';
import type { ExecutionContext } from './context';
import { createCache } from './cache';
import type { ExecutionCache } from './cache';
import { TypeValidator, TypeMismatchError, type TypeCheckingOptions } from './type-validator';

export interface ExecutorResult {
  workflowId: string;
  status: 'done' | 'error' | 'cancelled';
  results: Record<string, Record<string, unknown>>;
  error?: string;
  cancelledNodes?: string[];
  /** Nodes that failed due to type mismatch (populated when type checking is enabled) */
  typeErrors?: string[];
}

export interface WorkflowExecutorOptions extends ExecutorOptions {
  cache?: ExecutionCache;
  enableCache?: boolean;
  /**
   * Node definitions for type validation and auto-conversion.
   * When provided, the executor will validate PipelineData types before
   * passing inputs to each node executor.
   */
  nodeDefinitions?: NodeDefinition[];
  /**
   * Feature flag options for port type checking.
   * @default { enabled: true, autoConvert: true }
   */
  typeChecking?: TypeCheckingOptions;
  /**
   * Lane configuration for execution strategy.
   * Controls whether nodes run on main-thread or worker lane.
   */
  laneConfig?: LaneConfig;
}

function hashInputs(inputs: Record<string, unknown>): string {
  return JSON.stringify(inputs, Object.keys(inputs).sort());
}

export class WorkflowExecutor {
  private executors: Map<string, NodeExecutor>;
  private typeValidator: TypeValidator | null = null;

  constructor(executors: Record<string, NodeExecutor> = {}) {
    this.executors = new Map(Object.entries(executors));
  }

  register(type: string, executor: NodeExecutor): void {
    this.executors.set(type, executor);
  }

  getExecutor(type: string): NodeExecutor | undefined {
    return this.executors.get(type);
  }

  /**
   * Execute a single node and record its result.
   * Returns the node result and outputs.
   *
   * For parallel execution, each node gets an isolated context copy to avoid
   * race conditions when multiple nodes run concurrently.
   */
  private async executeNode(
    nodeId: string,
    node: Workflow['nodes'][0],
    nodeInputs: Record<string, unknown>,
    ctx: ExecutionContext,
    options: WorkflowExecutorOptions,
    cache: ExecutionCache | null,
    typeErrors: string[]
  ): Promise<{ outputs: Record<string, unknown>; failed: boolean }> {
    // Create isolated context for this node to avoid race conditions in parallel execution.
    // Only inputs, nodeId, and progress.currentNodeId are per-node; everything else is shared.
    const isolatedCtx: ExecutionContext = {
      ...ctx,
      nodeId,
      inputs: nodeInputs,
      progress: {
        ...ctx.progress,
        currentNodeId: nodeId,
      },
    };

    const executor = this.executors.get(node.type);

    if (!executor) {
      const result: NodeResult = {
        nodeId,
        status: 'error',
        outputs: {},
        error: `No executor registered for node type: ${node.type}`,
        startTime: Date.now(),
        endTime: Date.now(),
      };
      recordNodeResult(ctx, result);
      return { outputs: {}, failed: true };
    }

    // Type validation and auto-conversion
    if (this.typeValidator) {
      try {
        const validated = await this.typeValidator.validateInputs(nodeId, node.type, nodeInputs);
        Object.assign(nodeInputs, validated);
      } catch (err) {
        if (err instanceof TypeMismatchError) {
          typeErrors.push(err.nodeId);
          const result: NodeResult = {
            nodeId,
            status: 'error',
            outputs: {},
            error: err.message,
            startTime: Date.now(),
            endTime: Date.now(),
          };
          recordNodeResult(ctx, result);
          return { outputs: {}, failed: true };
        }
        throw err;
      }
    }

    // Cache lookup
    const inputsHash = hashInputs(nodeInputs);
    if (cache) {
      const cached = cache.get(ctx.workflowId, nodeId, inputsHash);
      if (cached) {
        const result: NodeResult = {
          nodeId,
          status: 'done',
          outputs: cached.result,
          startTime: Date.now(),
          endTime: Date.now(),
        };
        recordNodeResult(ctx, result);
        return { outputs: cached.result, failed: false };
      }
    }

    const startTime = Date.now();

    try {
      const outputs = await executor(nodeInputs, node.params, ctx as ExecutionContext);

      if (cache) {
        cache.set(ctx.workflowId, nodeId, inputsHash, outputs);
      }

      const result: NodeResult = {
        nodeId,
        status: 'done',
        outputs,
        startTime,
        endTime: Date.now(),
      };
      recordNodeResult(ctx, result);
      return { outputs, failed: false };
    } catch (err) {
      const result: NodeResult = {
        nodeId,
        status: 'error',
        outputs: {},
        error: err instanceof Error ? err.message : String(err),
        startTime,
        endTime: Date.now(),
      };
      recordNodeResult(ctx, result);
      return { outputs: {}, failed: true };
    }
  }

  async execute(
    workflow: Workflow,
    options: WorkflowExecutorOptions = {}
  ): Promise<ExecutorResult> {
    // Initialize type validator if node definitions are provided
    const typeErrors: string[] = [];
    if (options.nodeDefinitions) {
      this.typeValidator = new TypeValidator(options.nodeDefinitions, options.typeChecking);
    }

    // Topological levels for parallel execution
    const levelResult = getTopologicalLevels(workflow.nodes, workflow.connections);
    if (levelResult.hasCycle) {
      return {
        workflowId: workflow.id,
        status: 'error',
        results: {},
        error: `Cycle detected involving nodes: ${levelResult.cycleNodes?.join(', ')}`,
      };
    }

    // Also keep the order-based sort for the legacy single-threaded path
    const sortResult = topologicalSort(workflow.nodes, workflow.connections);
    if (sortResult.hasCycle) {
      return {
        workflowId: workflow.id,
        status: 'error',
        results: {},
        error: `Cycle detected involving nodes: ${sortResult.cycleNodes?.join(', ')}`,
      };
    }

    // Build maps for quick lookup
    const nodeById = new Map(workflow.nodes.map((n) => [n.id, n]));
    const connectionsByTo = new Map<string, typeof workflow.connections>();
    for (const conn of workflow.connections) {
      if (!connectionsByTo.has(conn.to.nodeId)) {
        connectionsByTo.set(conn.to.nodeId, []);
      }
      connectionsByTo.get(conn.to.nodeId)!.push(conn);
    }

    // Cache setup
    const cache = options.enableCache && options.cache
      ? options.cache
      : null;

    // Create execution context
    const ctx = createExecutionContext({
      workflowId: workflow.id,
      totalNodes: workflow.nodes.length,
      onProgress: options.onProgress,
      signal: options.signal,
    });
    ctx.progress.status = 'running';

    if (options.onProgress) {
      options.onProgress(ctx.progress);
    }

    const nodeResults = new Map<string, Record<string, unknown>>();
    const cancelledNodes: string[] = [];

    // ─── Parallel execution by levels ─────────────────────────────────────────
    for (const level of levelResult.levels) {
      if (checkAborted(ctx)) {
        for (const nodeId of level) {
          cancelledNodes.push(nodeId);
        }
        continue;
      }

      // Gather inputs and fire all nodes in this level concurrently
      const promises: Promise<{ nodeId: string; outputs: Record<string, unknown>; failed: boolean }>[] = [];

      for (const nodeId of level) {
        const node = nodeById.get(nodeId)!;

        // Gather inputs from upstream nodes
        const nodeInputs: Record<string, unknown> = {};
        const incomingConns = connectionsByTo.get(nodeId) ?? [];
        for (const conn of incomingConns) {
          const sourceResult = nodeResults.get(conn.from.nodeId);
          if (sourceResult && conn.from.port in sourceResult) {
            nodeInputs[conn.to.port] = sourceResult[conn.from.port];
          }
        }

        ctx.nodeId = nodeId;
        ctx.progress.currentNodeId = nodeId;
        ctx.inputs = nodeInputs;

        if (options.onProgress) {
          options.onProgress(ctx.progress);
        }

        promises.push(
          this.executeNode(nodeId, node, nodeInputs, ctx, options, cache, typeErrors).then(
            ({ outputs, failed }) => ({ nodeId, outputs, failed })
          )
        );
      }

      // Wait for all nodes in this level to complete
      const levelResults = await Promise.all(promises);

      // Record results
      for (const { nodeId, outputs, failed } of levelResults) {
        nodeResults.set(nodeId, outputs);

        // Update currentNodeId for progress tracking (point to last node in level)
        ctx.progress.currentNodeId = nodeId;
        if (options.onProgress) {
          options.onProgress(ctx.progress);
        }
      }
    }

    if (checkAborted(ctx)) {
      ctx.progress.status = 'cancelled';
      if (options.onProgress) {
        options.onProgress(ctx.progress);
      }
      return {
        workflowId: workflow.id,
        status: 'cancelled',
        results: Object.fromEntries(nodeResults),
        cancelledNodes,
      };
    }

    const hasError = [...ctx.results.values()].some((r) => r.status === 'error');
    ctx.progress.status = hasError ? 'error' : 'done';
    if (options.onProgress) {
      options.onProgress(ctx.progress);
    }

    return {
      workflowId: workflow.id,
      status: hasError ? 'error' : 'done',
      results: Object.fromEntries(nodeResults),
      ...(typeErrors.length > 0 && { typeErrors }),
    };
  }
}
