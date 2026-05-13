// graphSlice - manages graph state (nodes, edges, groups)
// Independent from UI state, focused on workflow structure
//
// NOTE: This is a type-only interface file. All actual operations are in
// useCanvasStore.ts. Node/edge ID generation is centralized in idCounter.ts.

import type { EditorCanvasNode, EditorCanvasEdge, EditorNodeGroup } from '@prism/shared-types';
import type { NodeChange, EdgeChange } from '@xyflow/react';
import type { Connection as RfConnection } from '@xyflow/react';

type ReactFlowConnection = RfConnection;

export interface ConnectionValidation {
  valid: boolean;
  reason?: string;
  sourceType?: unknown;
  targetType?: unknown;
}

export interface GraphSlice {
  // State
  nodes: EditorCanvasNode[];
  edges: EditorCanvasEdge[];
  groups: EditorNodeGroup[];

  // Node operations
  addNode: (type: string, position: { x: number; y: number }) => string | undefined;
  removeNode: (id: string) => void;
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;
  updateNodeData: (id: string, data: Partial<EditorCanvasNode['data']>) => void;
  setNodes: (nodes: EditorCanvasNode[]) => void;
  setEdges: (edges: EditorCanvasEdge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;

  // Connection validation
  onConnect: (connection: ReactFlowConnection) => ConnectionValidation;

  // Group operations
  addGroup: (label: string, nodeIds: string[]) => string;
  removeGroup: (groupId: string) => void;
  updateGroup: (groupId: string, updates: Partial<Omit<EditorNodeGroup, 'id'>>) => void;
  moveGroup: (groupId: string, deltaX: number, deltaY: number) => void;

  // Bulk operations (for loading workflow)
  loadGraph: (nodes: EditorCanvasNode[], edges: EditorCanvasEdge[], groups?: EditorNodeGroup[]) => void;
  clearGraph: () => void;
}
