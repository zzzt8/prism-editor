// workflowToCanvas - 将 Workflow 转换为画布状态
// 用于从存储加载工作流

import type { Workflow, WorkflowNode } from '@prism/shared-types';
import type { EditorCanvasNode, EditorCanvasEdge, EditorWorkflowMeta, EditorDraft } from '@prism/shared-types';
import { globalRegistry } from '@prism/core';
import {
  createNodeId,
  createEdgeId,
  setNodeCounter,
  setEdgeCounter,
} from '../stores/idCounter';

/**
 * 获取并递增节点计数器
 */
export function getNextNodeId(): string {
  return createNodeId();
}

/**
 * 获取并递增边计数器
 */
export function getNextEdgeId(): string {
  return createEdgeId();
}

/**
 * 重置计数器（用于加载工作流后同步）
 * @param maxNodeId - 从 workflow.nodes 解析的最大节点编号
 * @param maxEdgeId - 从 workflow.connections 解析的最大边编号
 */
export function resetCounters(maxNodeId: number, maxEdgeId: number): void {
  setNodeCounter(maxNodeId);
  setEdgeCounter(maxEdgeId);
}

/**
 * 将 WorkflowNode 转换为 CanvasNode
 * 从 globalRegistry 获取 NodeDefinition
 */
function mapWorkflowNodeToCanvasNode(workflowNode: WorkflowNode): EditorCanvasNode {
  const definition = globalRegistry.getNode(workflowNode.type);

  return {
    id: workflowNode.id,
    type: 'prismNode',
    position: workflowNode.position,
    data: {
      label: definition?.label ?? workflowNode.type,
      nodeType: workflowNode.type,
      params: workflowNode.params,
      definition,
    },
  };
}

/**
 * 将 Workflow 连接转换为 CanvasEdge
 */
function mapConnectionToCanvasEdge(
  connection: { id: string; from: { nodeId: string; port: string }; to: { nodeId: string; port: string } }
): EditorCanvasEdge {
  return {
    id: connection.id,
    source: connection.from.nodeId,
    sourceHandle: connection.from.port,
    target: connection.to.nodeId,
    targetHandle: connection.to.port,
    type: 'default',
  };
}

/**
 * 解析 workflow.nodes 中的最大节点编号
 */
function parseMaxNodeId(nodes: WorkflowNode[]): number {
  if (nodes.length === 0) return 0;
  return Math.max(
    0,
    ...nodes.map((n) => {
      const match = n.id.match(/^node-(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
  );
}

/**
 * 解析 workflow.connections 中的最大边编号
 */
function parseMaxEdgeId(connections: { id: string }[]): number {
  if (connections.length === 0) return 0;
  return Math.max(
    0,
    ...connections.map((c) => {
      const match = c.id.match(/^edge-(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
  );
}

/**
 * 将 Workflow 转换为 EditorDraft 格式
 *
 * @param workflow - 工作流对象
 * @returns EditorDraft 对象（isDirty = false）
 */
export function workflowToCanvas(workflow: Workflow): EditorDraft {
  // 同步计数器
  const maxNodeId = parseMaxNodeId(workflow.nodes);
  const maxEdgeId = parseMaxEdgeId(workflow.connections);
  resetCounters(maxNodeId, maxEdgeId);

  const nodes: EditorCanvasNode[] = workflow.nodes.map(mapWorkflowNodeToCanvasNode);
  const edges: EditorCanvasEdge[] = workflow.connections.map(mapConnectionToCanvasEdge);

  return {
    nodes,
    edges,
    groups: [],
    workflowMeta: {
      id: workflow.id,
      name: workflow.name,
      version: workflow.version,
    },
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

/**
 * 检查工作流是否为空（无节点）
 */
export function isEmptyWorkflow(workflow: Workflow): boolean {
  return workflow.nodes.length === 0;
}
