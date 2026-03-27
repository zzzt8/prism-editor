// PublishedWorkflowExecutor - executes a PublishedWorkflow with user-provided inputs
//
// This class bridges the gap between a PublishedWorkflow (which contains only
// the developer-configured subset of a full Workflow) and the WorkflowExecutor
// (which expects a complete Workflow). It:
//  1. Reconstructs a Workflow from the PublishedWorkflow + user inputs
//  2. Injects user input values into the appropriate nodes
//  3. Delegates execution to WorkflowExecutor

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
   * The key format matches what was configured in PublishDialog:
   *   "{nodeIndex}:{portId}"
   *
   * Example:
   *   { "0:image": "https://example.com/photo.jpg" }
   */
  inputs: Record<string, unknown>;
  /**
   * Mapping from nodeIndex → paramId → user-provided exposed param value.
   * Only params with visibility === 'visible' are included here.
   *
   * Example:
   *   { "1": { "opacity": 0.8, "mode": "multiply" } }
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
    const workflow = this.reconstruct(pw, options.inputs, options.exposedParams);
    return this.executor.execute(workflow, {
      signal: options.signal,
      onProgress: options.onProgress,
    });
  }

  /**
   * Reconstruct a runnable Workflow from a PublishedWorkflow + user inputs.
   *
   * Strategy:
   *  1. Read nodeTypes (index-keyed, stable across re-publishes).
   *     If missing → throw PublishedWorkflowExecutorVersionError (old data).
   *  2. Read nodeIndexMap (canvasId → index) and connections (canvas IDs).
   *     Resolve connection endpoints: canvasId → index via nodeIndexMap.
   *     If nodeIndexMap missing, fall back to canvas ID (old data compatibility).
   *  3. Build WorkflowNode for each index: merge exposed params + _internalParams.
   *  4. Inject user-supplied input values for load-image nodes.
   */
  private reconstruct(
    pw: PublishedWorkflow,
    userInputs: Record<string, unknown>,
    exposedParams: Record<string, Record<string, unknown>> = {}
  ): Workflow {
    const nodeTypes = pw.config.nodeTypes;

    // Bug 7: No nodeTypes → old data, can't reconstruct
    if (!nodeTypes || Object.keys(nodeTypes).length === 0) {
      throw new PublishedWorkflowExecutorVersionError();
    }

    const nodeIndexMap = pw.config.nodeIndexMap ?? {};
    const nodeConfigMap = pw.config.nodeConfigs ?? {};

    // Build index-keyed node records.
    //
    // Strategy:
    //   - PublishedWorkflow stores nodeTypes/configs under topological index strings ("0", "1"...).
    //     These are stable and deterministic regardless of canvas ID changes.
    //   - Old / migrated data may have canvas IDs as keys (e.g. "canvas-0", "canvas-1").
    //     We detect this by checking whether all keys are numeric.
    //     In that case we use the original string keys directly — the executor will look up
    //     the registered executors by the actual node.type string (e.g. "load-image"), not the key.
    const rawKeys = Object.keys(nodeTypes);
    const allNumeric = rawKeys.every((k) => !isNaN(Number(k)));
    const sortedIndices = allNumeric
      ? rawKeys.map(Number).sort((a, b) => a - b).map(String)
      : rawKeys; // canvas UUIDs: preserve insertion order (same as canvas node creation order)

    const nodes: WorkflowNode[] = sortedIndices.map((idx) => {
      const nodeKey = idx;
      const nodeType = nodeTypes[nodeKey];
      const nodeConfig = nodeConfigMap[nodeKey];

      // Merge order: _internalParams (developer-locked) → params (exposed defaults) → exposedParams (user override)
      const mergedParams = {
        ...(nodeConfig?.params ?? {}),
        ...(nodeConfig?._internalParams ?? {}),
        ...(exposedParams[nodeKey] ?? {}),
      };

      // Inject user-supplied URL for load-image nodes
      if (nodeType === 'load-image') {
        for (const inp of pw.inputs) {
          if (inp.id.startsWith(`${nodeKey}:`)) {
            const userValue = userInputs[inp.id];
            if (userValue !== undefined) {
              mergedParams.url = userValue;
            }
          }
        }
      }

      return {
        id: nodeKey,   // Use stable index as node ID
        type: nodeType,
        position: { x: 0, y: 0 },
        params: mergedParams,
      };
    });

    // Resolve connections: convert canvas IDs → index keys via nodeIndexMap
    // For old data without nodeIndexMap, keep canvas IDs as-is
    const resolvedConnections: Connection[] = (pw.config.connections ?? []).map((conn) => {
      const fromIdx = nodeIndexMap[conn.from.nodeId] ?? conn.from.nodeId;
      const toIdx   = nodeIndexMap[conn.to.nodeId]   ?? conn.to.nodeId;
      return {
        id: conn.id,
        from: { nodeId: String(fromIdx), port: conn.from.port },
        to:   { nodeId: String(toIdx),   port: conn.to.port },
      };
    });

    const workflow: Workflow = {
      id: pw.id,
      name: pw.name,
      version: pw.version,
      nodes,
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
