// workflowToPublished - 将 Workflow 转换为 PublishedWorkflow 格式
// 用于发布工作流到用户端

import type {
  Workflow,
  PublishedWorkflow,
  PublishedConfig,
  PublishedInput,
  PublishedOutput,
  Connection,
} from '@prism/shared-types';
import { PortDataType } from '@prism/shared-types';
import { globalRegistry } from '@prism/core';

interface SourceNode {
  nodeId: string;
  label: string;
  type: 'image' | 'mask' | 'string';
}

interface OutputNode {
  nodeId: string;
  label: string;
  format: 'png' | 'jpeg' | 'webp';
}

/**
 * 检测 Workflow 中的 source 节点（没有输入连接的节点）
 */
function detectSourceNodes(workflow: Workflow): SourceNode[] {
  const connectedNodeIds = new Set<string>();
  for (const conn of workflow.connections) {
    connectedNodeIds.add(conn.to.nodeId);
  }

  return workflow.nodes
    .filter((node) => !connectedNodeIds.has(node.id))
    .map((node) => {
      const def = globalRegistry.getNode(node.type);
      return {
        nodeId: node.id,
        label: def?.label ?? node.type,
        type: 'image' as const,
      };
    });
}

/**
 * 检测 Workflow 中的 output 节点（没有输出连接的节点）
 */
function detectOutputNodes(workflow: Workflow): OutputNode[] {
  const connectedNodeIds = new Set<string>();
  for (const conn of workflow.connections) {
    connectedNodeIds.add(conn.from.nodeId);
  }

  return workflow.nodes
    .filter((node) => !connectedNodeIds.has(node.id))
    .map((node) => {
      const def = globalRegistry.getNode(node.type);
      return {
        nodeId: node.id,
        label: def?.label ?? node.type,
        format: 'png' as const,
      };
    });
}

/**
 * 构建 nodeIndexMap（拓扑顺序索引）
 */
function buildNodeIndexMap(workflow: Workflow): Record<string, string> {
  const indexMap: Record<string, string> = {};
  // 简单的拓扑排序：按 BFS 顺序给节点分配索引
  const visited = new Set<string>();
  const queue: string[] = [];

  // 从 source 节点开始
  const connectedNodeIds = new Set<string>();
  for (const conn of workflow.connections) {
    connectedNodeIds.add(conn.to.nodeId);
  }

  for (const node of workflow.nodes) {
    if (!connectedNodeIds.has(node.id)) {
      queue.push(node.id);
    }
  }

  let index = 0;
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);
    indexMap[nodeId] = String(index++);

    // 找到该节点的直接下游节点
    for (const conn of workflow.connections) {
      if (conn.from.nodeId === nodeId) {
        queue.push(conn.to.nodeId);
      }
    }
  }

  // 处理孤立节点
  for (const node of workflow.nodes) {
    if (!indexMap[node.id]) {
      indexMap[node.id] = String(index++);
    }
  }

  return indexMap;
}

/**
 * 将 Workflow 转换为 PublishedWorkflow 格式
 *
 * @param workflow - 工作流对象
 * @param options - 发布选项
 * @returns PublishedWorkflow 对象
 */
export function workflowToPublished(
  workflow: Workflow,
  options: {
    sourceName: string;
    name?: string;
    description?: string;
    hideInternalParams?: boolean;
  } = { sourceName: 'workflow' }
): PublishedWorkflow {
  const {
    sourceName,
    name = workflow.name,
    description = undefined,
    hideInternalParams = true,
  } = options;

  // 构建 nodeTypes（使用 nodeId UUID 作为 key）
  const nodeTypes: Record<string, string> = {};
  for (const node of workflow.nodes) {
    nodeTypes[node.id] = node.type;
  }

  // 构建 nodeIndexMap
  const nodeIndexMap = buildNodeIndexMap(workflow);

  // 构建 nodeConfigs
  const nodeConfigs: Record<string, { params: Record<string, unknown>; _internalParams?: Record<string, unknown> }> = {};
  for (const node of workflow.nodes) {
    if (hideInternalParams) {
      const { params, _internalParams } = splitParams(node.params);
      nodeConfigs[node.id] = { params, _internalParams };
    } else {
      nodeConfigs[node.id] = { params: node.params };
    }
  }

  // 检测 inputs 和 outputs
  const sourceNodes = detectSourceNodes(workflow);
  const outputNodes = detectOutputNodes(workflow);

  const inputs: PublishedInput[] = sourceNodes.map((src) => ({
    id: src.nodeId,
    name: src.label,
    type: 'image' as const,
    required: true,
    description: undefined,
    visible: true,
  }));

  const outputs: PublishedOutput[] = outputNodes.map((out) => ({
    id: out.nodeId,
    name: out.label,
    type: 'image' as const,
    description: undefined,
  }));

  const publishedConfig: PublishedConfig = {
    nodeTypes,
    nodeIndexMap,
    nodeConfigs,
    internalParams: {},
    inputs: sourceNodes.map((src) => ({
      nodeId: src.nodeId,
      label: src.label,
      type: src.type,
    })),
    exposedParams: [],
    outputs: outputNodes.map((out) => ({
      nodeId: out.nodeId,
      label: out.label,
      format: out.format,
    })),
  };

  return {
    id: workflow.id,
    sourceId: workflow.id,
    name,
    description,
    sourceName,
    version: workflow.version,
    inputs,
    outputs,
    config: publishedConfig,
    publishedAt: new Date().toISOString(),
  };
}

/**
 * 分离普通参数和内部参数
 */
function splitParams(
  params: Record<string, unknown>
): { params: Record<string, unknown>; _internalParams: Record<string, unknown> } {
  const resultParams: Record<string, unknown> = {};
  const internalParams: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(params)) {
    if (key.startsWith('_')) {
      internalParams[key] = value;
    } else {
      resultParams[key] = value;
    }
  }

  return { params: resultParams, _internalParams: internalParams };
}
