// canvasToWorkflow - 将画布状态转换为 Workflow 格式
// 用于编辑器保存和持久化

import type { Workflow, WorkflowNode, Connection } from '@prism/shared-types';
import type { EditorCanvasNode, EditorCanvasEdge, EditorWorkflowMeta } from '@prism/shared-types';

/**
 * 将画布节点转换为 WorkflowNode 格式
 */
function mapCanvasNodeToWorkflowNode(canvasNode: EditorCanvasNode): WorkflowNode {
  return {
    id: canvasNode.id,
    type: canvasNode.data.nodeType,
    position: canvasNode.position,
    params: canvasNode.data.params,
  };
}

/**
 * 将画布边转换为 Workflow 连接格式
 */
function mapCanvasEdgeToConnection(canvasEdge: EditorCanvasEdge): Connection {
  return {
    id: canvasEdge.id,
    from: {
      nodeId: canvasEdge.source,
      port: canvasEdge.sourceHandle ?? '',
    },
    to: {
      nodeId: canvasEdge.target,
      port: canvasEdge.targetHandle ?? '',
    },
  };
}

/**
 * 将编辑器状态转换为 Workflow 格式
 *
 * @param nodes - 画布节点数组
 * @param edges - 画布边数组
 * @param workflowMeta - 工作流元数据
 * @param existingWorkflow - 可选：已有工作流（用于保留 createdAt 时间戳）
 * @returns Workflow 对象
 */
export function canvasToWorkflow(
  nodes: EditorCanvasNode[],
  edges: EditorCanvasEdge[],
  workflowMeta: EditorWorkflowMeta,
  existingWorkflow?: Workflow
): Workflow {
  const now = new Date().toISOString();
  const createdAt = existingWorkflow?.metadata.createdAt ?? now;

  return {
    id: workflowMeta.id,
    name: workflowMeta.name,
    version: workflowMeta.version,
    nodes: nodes.map(mapCanvasNodeToWorkflowNode),
    connections: edges.map(mapCanvasEdgeToConnection),
    inputs: existingWorkflow?.inputs ?? [],
    outputs: existingWorkflow?.outputs ?? [],
    metadata: {
      createdAt,
      updatedAt: now,
    },
  };
}

/**
 * 验证画布节点数组是否为空
 */
export function isEmptyCanvas(nodes: EditorCanvasNode[]): boolean {
  return nodes.length === 0;
}
