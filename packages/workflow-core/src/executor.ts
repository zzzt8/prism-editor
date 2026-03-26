// Workflow executor - orchestrates node execution

import type {
  Workflow,
  NodeExecutor,
  ExecutorOptions,
  NodeResult,
} from '@prism/shared-types';
import { topologicalSort } from './topo-sort';
import { createExecutionContext, recordNodeResult, checkAborted } from './context';
import type { ExecutionContext } from './context';
import { createCache } from './cache';
import type { ExecutionCache } from './cache';

export interface ExecutorResult {
  workflowId: string;
  status: 'done' | 'error' | 'cancelled';
  results: Record<string, Record<string, unknown>>;
  error?: string;
  cancelledNodes?: string[];
}

export interface WorkflowExecutorOptions extends ExecutorOptions {
  cache?: ExecutionCache;
  enableCache?: boolean;
}

function hashInputs(inputs: Record<string, unknown>): string {
  return JSON.stringify(inputs, Object.keys(inputs).sort());
}

export class WorkflowExecutor {
  private executors: Map<string, NodeExecutor>;

  constructor(executors: Record<string, NodeExecutor> = {}) {
    this.executors = new Map(Object.entries(executors));
  }

  register(type: string, executor: NodeExecutor): void {
    this.executors.set(type, executor);
  }

  getExecutor(type: string): NodeExecutor | undefined {
    return this.executors.get(type);
  }

  async execute(
    workflow: Workflow,
    options: WorkflowExecutorOptions = {}
  ): Promise<ExecutorResult> {
    // Topological sort
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
    const resultsMap = new Map<string, NodeResult>();

    // Execute in topological order
    for (const nodeId of sortResult.order) {
      if (checkAborted(ctx)) {
        cancelledNodes.push(nodeId);
        continue;
      }

      const node = nodeById.get(nodeId)!;
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
        resultsMap.set(nodeId, result);
        nodeResults.set(nodeId, {});
        ctx.progress.currentNodeId = nodeId;
        if (options.onProgress) options.onProgress(ctx.progress);
        continue;
      }

      ctx.nodeId = nodeId;
      ctx.progress.currentNodeId = nodeId;
      if (options.onProgress) options.onProgress(ctx.progress);

      // Gather inputs from upstream nodes
      const nodeInputs: Record<string, unknown> = {};
      const incomingConns = connectionsByTo.get(nodeId) ?? [];
      for (const conn of incomingConns) {
        const sourceResult = nodeResults.get(conn.from.nodeId);
        if (sourceResult && conn.from.port in sourceResult) {
          nodeInputs[conn.to.port] = sourceResult[conn.from.port];
        }
      }

      // Cache lookup
      const inputsHash = hashInputs(nodeInputs);
      if (cache) {
        const cached = cache.get(workflow.id, nodeId, inputsHash);
        if (cached) {
          nodeResults.set(nodeId, cached.result);
          const result: NodeResult = {
            nodeId,
            status: 'done',
            outputs: cached.result,
            startTime: Date.now(),
            endTime: Date.now(),
          };
          recordNodeResult(ctx, result);
          resultsMap.set(nodeId, result);
          ctx.progress.currentNodeId = nodeId;
          if (options.onProgress) options.onProgress(ctx.progress);
          continue;
        }
      }

      const startTime = Date.now();

      try {
        // Pass concrete ExecutionContext — aligned with @prism/shared-types definition
        const outputs = await executor(nodeInputs, node.params, ctx as ExecutionContext);

        nodeResults.set(nodeId, outputs);

        if (cache) {
          cache.set(workflow.id, nodeId, inputsHash, outputs);
        }

        const result: NodeResult = {
          nodeId,
          status: 'done',
          outputs,
          startTime,
          endTime: Date.now(),
        };
        recordNodeResult(ctx, result);
        resultsMap.set(nodeId, result);
      } catch (err) {
        nodeResults.set(nodeId, {});
        const result: NodeResult = {
          nodeId,
          status: 'error',
          outputs: {},
          error: err instanceof Error ? err.message : String(err),
          startTime,
          endTime: Date.now(),
        };
        recordNodeResult(ctx, result);
        resultsMap.set(nodeId, result);
      }
    }

    if (checkAborted(ctx)) {
      ctx.progress.status = 'cancelled';
      if (options.onProgress) options.onProgress(ctx.progress);
      return {
        workflowId: workflow.id,
        status: 'cancelled',
        results: Object.fromEntries(nodeResults),
        cancelledNodes,
      };
    }

    const hasError = [...ctx.results.values()].some((r) => r.status === 'error');
    ctx.progress.status = hasError ? 'error' : 'done';
    if (options.onProgress) options.onProgress(ctx.progress);

    return {
      workflowId: workflow.id,
      status: hasError ? 'error' : 'done',
      results: Object.fromEntries(nodeResults),
    };
  }
}
