// PublishedWorkflowExecutor - executes a PublishedWorkflow with user-provided inputs
//
// This class bridges the gap between a PublishedWorkflow (which contains only
// the developer-configured subset of a full Workflow) and the WorkflowExecutor
// (which expects a complete Workflow). It:
//  1. Reconstructs a Workflow from the PublishedWorkflow + user inputs
//  2. Injects user input values into the appropriate nodes
//  3. Delegates execution to WorkflowExecutor

import { topologicalSort } from './topo-sort';
import type {
  PublishedWorkflow,
  Workflow,
  WorkflowNode,
  Connection,
  NodeExecutor,
  ExecutorOptions,
  NodeExecutorMap,
} from '@prism/shared-types';
import { WorkflowExecutor, type ExecutorResult } from './executor';

export class PublishedWorkflowExecutorVersionError extends Error {
  constructor() {
    super(
      '此工作流数据格式过旧（缺少 nodeTypes），请在开发者工具中重新发布此工作流。'
    );
    this.name = 'PublishedWorkflowExecutorVersionError';
  }
}

export interface PublishedExecutorOptions extends ExecutorOptions {
  /**
   * Mapping from PublishedInput.id → user-provided value.
   * The key format is "{nodeId}:{portId}" — e.g. "canvas-abc123:image".
   *
   * Example:
   *   { "canvas-abc123:image": "blob:https://..." }
   */
  inputs: Record<string, unknown>;
  /**
   * Mapping from nodeId → paramId → user-provided exposed param value.
   *
   * Example:
   *   { "canvas-xyz789": { "opacity": 0.8, "mode": "multiply" } }
   */
  exposedParams?: Record<string, Record<string, unknown>>;
}

export class PublishedWorkflowExecutor {
  private executor: WorkflowExecutor;

  constructor(executors: NodeExecutorMap = {}) {
    this.executor = new WorkflowExecutor(executors);
  }

  register(type: string, fn: NodeExecutor): void {
    this.executor.register(type, fn);
  }

  /**
   * Execute a PublishedWorkflow with user-provided inputs.
   *
   * @param pw       The published workflow to run
   * @param options  User inputs and executor options
   */
  async execute(pw: PublishedWorkflow, options: PublishedExecutorOptions): Promise<ExecutorResult> {
    let workflow: Workflow;
    try {
      workflow = this.reconstruct(pw, options.inputs, options.exposedParams);
    } catch (err) {
      // PublishedWorkflowExecutorVersionError: re-throw so the promise rejects
      if (err instanceof PublishedWorkflowExecutorVersionError) {
        throw err;
      }
      return {
        workflowId: pw.id,
        status: 'error',
        results: {},
        error: err instanceof Error ? err.message : String(err),
      };
    }
    return this.executor.execute(workflow, {
      signal: options.signal,
      onProgress: options.onProgress,
    });
  }

  /**
   * Reconstruct a runnable Workflow from a PublishedWorkflow + user inputs.
   *
   * Strategy (all keys = canvas nodeId UUID):
   *  1. nodeTypes, nodeConfigs: keyed by canvas nodeId — stable across re-publishes.
   *  2. Connections from/to: already use canvas nodeIds — no remapping needed.
   *  3. Sort nodes in topological order for execution.
   *  4. Inject user inputs into load-image nodes via PublishedInput.id matching
   *     "{nodeId}:{portId}" prefix.
   */
  private reconstruct(
    pw: PublishedWorkflow,
    userInputs: Record<string, unknown>,
    exposedParams: Record<string, Record<string, unknown>> = {}
  ): Workflow {
    // nodeTypes keys are canvas node IDs (UUIDs) — stable identifiers.
    const nodeTypesEntries = pw.config?.nodeTypes ?? {};
    const nodeConfigMap = pw.config?.nodeConfigs ?? {};

    // Missing nodeTypes means old published data — emit a warning and attempt
    // legacy reconstruction using pw.inputs[].id format "{nodeId}:{portId}".
    if (Object.keys(nodeTypesEntries).length === 0) {
      console.warn(
        '[PublishedWorkflowExecutor] Legacy published workflow detected (no nodeTypes). ' +
        'Consider re-publishing this workflow for full V2 support.'
      );
    }

    const nodeIds = Object.keys(nodeTypesEntries);

    // Build WorkflowNode array for each canvas nodeId.
    const nodes: WorkflowNode[] = nodeIds.map((nodeId) => {
      const nodeType = nodeTypesEntries[nodeId];
      const nodeConfig = nodeConfigMap[nodeId];

      // Merge order: _internalParams (developer-locked) → params (exposed defaults) → exposedParams (user override)
      const mergedParams = {
        ...(nodeConfig?.params ?? {}),
        ...(nodeConfig?._internalParams ?? {}),
        ...(exposedParams[nodeId] ?? {}),
      };

      // Inject user-supplied URL for load-image and load-mask nodes.
      if (nodeType === 'load-image' || nodeType === 'load-mask') {
        // Legacy format: pw.inputs[].id is "{nodeId}:{portId}"
        // Use exact match with ":" separator to avoid partial ID collisions
        // (e.g., "abc" should NOT match "abcd:out")
        const prefix = `${nodeId}:`;
        for (const inp of pw.inputs) {
          if (inp.id.startsWith(prefix) && inp.id.length > prefix.length) {
            const userValue = userInputs[inp.id];
            if (userValue !== undefined && userValue !== null) {
              mergedParams.url = userValue;
            }
          }
        }
        // v2 format: config.inputs[].nodeId is a bare UUID; input key is "{nodeId}:out"
        for (const ci of (pw.config.inputs ?? [])) {
          if (ci.nodeId === nodeId) {
            const inputKey = `${ci.nodeId}:out`;
            const userValue = userInputs[inputKey];
            if (userValue !== undefined && userValue !== null) {
              mergedParams.url = userValue;
            }
          }
        }
      }

      return {
        id: nodeId,
        type: nodeType,
        position: { x: 0, y: 0 },
        params: mergedParams,
      };
    });

    // Sort nodes in topological order so the executor runs them correctly.
    const topoResult = topologicalSort(nodes, pw.config.connections ?? []);
    if (topoResult.hasCycle) {
      throw new Error(
        `Cycle detected in published workflow: ${(topoResult.cycleNodes ?? []).join(', ')}`
      );
    }
    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    const sortedNodes: WorkflowNode[] = topoResult.order.map((id) => nodeById.get(id)!);

    // Connections: from/to already use canvas node IDs — pass through unchanged.
    const resolvedConnections: Connection[] = (pw.config.connections ?? []).map((conn) => ({
      id: conn.id,
      from: { nodeId: String(conn.from.nodeId), port: conn.from.port },
      to: { nodeId: String(conn.to.nodeId), port: conn.to.port },
    }));

    const workflow: Workflow = {
      id: pw.id,
      name: pw.name,
      version: pw.version,
      nodes: sortedNodes,
      connections: resolvedConnections,
      inputs: [],
      outputs: [],
      metadata: {
        createdAt: pw.publishedAt,
        updatedAt: new Date().toISOString(),
      },
    };

    return workflow;
  }
}
