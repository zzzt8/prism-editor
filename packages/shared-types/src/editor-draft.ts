// EditorDraft - 编辑器持久化状态的类型定义
// 包含编辑器状态但不含运行时状态 (executionResult, executionError 等)
// 注：EditorNodeData 和 EditorCanvasNode 在 store 中包含运行时状态，
// 通过 index signature 支持扩展字段。

import type { PortDataType } from './port-data-types';
import type { NodeDefinition } from './node';

/**
 * CanvasNode 数据的持久化子集（不含运行时状态）
 * 注意：此类型在运行时 store 中会扩展包含 executionResult, executionError 等字段
 */
export interface EditorNodeData {
  label: string;
  nodeType: string;
  params: Record<string, unknown>;
  definition?: NodeDefinition;
  /** 动态添加的输入端口 */
  extraInputs?: Array<{ id: string; name: string; type: 'image'; dataType: PortDataType }>;
  /** 动态添加的输出端口 */
  extraOutputs?: Array<{ id: string; name: string; type: 'image'; dataType: PortDataType }>;
  /** 是否绕过执行 */
  bypassed?: boolean;
  /** 是否最小化显示 */
  minimized?: boolean;
  /** 是否锁定 */
  pinned?: boolean;
  /** 索引签名支持扩展字段（executionResult, executionError 等） */
  [key: string]: unknown;
}

/**
 * CanvasNode 的持久化版本（不含运行时状态）
 */
export interface EditorCanvasNode {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: EditorNodeData;
}

/**
 * CanvasEdge 的持久化版本
 */
export interface EditorCanvasEdge {
  id: string;
  source: string;
  sourceHandle?: string | null;
  target: string;
  targetHandle?: string | null;
  type?: string;
  data?: { color?: string };
}

/**
 * NodeGroup 的持久化版本
 */
export interface EditorNodeGroup {
  id: string;
  label: string;
  color: string;
  nodeIds: string[];
  bounds: { x: number; y: number; width: number; height: number };
}

/**
 * 编辑器元数据
 */
export interface EditorWorkflowMeta {
  id: string;
  name: string;
  version: string;
}

/**
 * EditorDraft - 编辑器的持久化状态
 * 用于 canvasStore 和持久化层之间的契约。
 * 不包含运行时状态：executionResult, executionError, _executingNodeId, _executionStatus, isDirty 等。
 */
export interface EditorDraft {
  nodes: EditorCanvasNode[];
  edges: EditorCanvasEdge[];
  groups: EditorNodeGroup[];
  workflowMeta: EditorWorkflowMeta;
  viewport: { x: number; y: number; zoom: number };
}
