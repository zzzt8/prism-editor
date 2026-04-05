// publishedToWorkflow - 从 PublishedWorkflow 重建 Workflow 格式
// 用于 runtime 端加载已发布的工作流进行执行

import type {
  PublishedWorkflow,
  Workflow,
  WorkflowNode,
  Connection,
  PublishedConfig,
} from '@prism/shared-types';
import { globalRegistry } from '@prism/core';

/**
 * 从 PublishedConfig 重建 Workflow 节点
 * 根据 nodeIndexMap 进行拓扑排序
 */
function rebuildNodes(config: PublishedConfig): WorkflowNode[] {
  const nodes: WorkflowNode[] = [];

  // 从 nodeIndexMap 按索引顺序构建节点
  const nodeIndexMap = config.nodeIndexMap ?? {};
  const sortedEntries = Object.entries(nodeIndexMap).sort(([, a], [, b]) => {
    return parseInt(a, 10) - parseInt(b, 10);
  });

  for (const [nodeId, index] of sortedEntries) {
    const nodeType = config.nodeTypes?.[nodeId];
    if (!nodeType) continue;

    const nodeConfig = config.nodeConfigs?.[nodeId];
    const mergedParams = {
      ...(nodeConfig?._internalParams ?? {}),
      ...(nodeConfig?.params ?? {}),
    };

    nodes.push({
      id: nodeId,
      type: nodeType,
      position: { x: 0, y: 0 }, // 位置信息不用于执行
      params: mergedParams,
    });
  }

  return nodes;
}

/**
 * 重建 connections
 * 从 config.connections 或根据 nodeIndexMap 拓扑关系重建
 */
function rebuildConnections(config: PublishedConfig): Connection[] {
  if (config.connections && config.connections.length > 0) {
    return config.connections;
  }

  // 如果没有 connections，使用空数组
  // 实际连接由 runtime 根据 nodeIndexMap 和数据流自动推断
  return [];
}

/**
 * 从 PublishedWorkflow 重建 Workflow 格式
 *
 * @param published - 已发布的工作流
 * @returns Workflow 对象
 */
export function publishedToWorkflow(published: PublishedWorkflow): Workflow {
  const nodes = rebuildNodes(published.config);
  const connections = rebuildConnections(published.config);

  return {
    id: published.sourceId,
    name: published.name,
    version: published.version,
    nodes,
    connections,
    inputs: published.inputs.map((input) => ({
      id: input.id,
      name: input.name,
      type: input.type as 'image' | 'mask' | 'number' | 'string' | 'boolean',
      required: input.required,
      defaultValue: input.defaultValue,
    })),
    outputs: published.outputs.map((output) => ({
      id: output.id,
      name: output.name,
      type: output.type as 'image' | 'mask' | 'number' | 'string' | 'boolean',
    })),
    metadata: {
      createdAt: published.publishedAt,
      updatedAt: published.publishedAt,
    },
  };
}

/**
 * 验证 PublishedWorkflow 是否可以重建为有效的 Workflow
 */
export function validatePublishedWorkflow(published: PublishedWorkflow): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!published.sourceId) {
    errors.push('Missing sourceId');
  }

  if (!published.config) {
    errors.push('Missing config');
    return { valid: false, errors };
  }

  if (!published.config.nodeTypes || Object.keys(published.config.nodeTypes).length === 0) {
    errors.push('Missing or empty nodeTypes in config');
  }

  if (!published.config.nodeConfigs || Object.keys(published.config.nodeConfigs).length === 0) {
    errors.push('Missing or empty nodeConfigs in config');
  }

  // 验证每个节点类型是否存在
  if (published.config.nodeTypes) {
    for (const [nodeId, nodeType] of Object.entries(published.config.nodeTypes)) {
      const def = globalRegistry.getNode(nodeType);
      if (!def) {
        errors.push(`Node type '${nodeType}' for node '${nodeId}' not found in registry`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
