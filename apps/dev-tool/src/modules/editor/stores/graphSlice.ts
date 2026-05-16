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
  addNode: (_type: string, _position: { x: number; y: number }) => string | undefined;
  removeNode: (_id: string) => void;
  updateNodePosition: (_id: string, _position: { x: number; y: number }) => void;
  updateNodeData: (_id: string, _data: Partial<EditorCanvasNode['data']>) => void;
  setNodes: (_nodes: EditorCanvasNode[]) => void;
  setEdges: (_edges: EditorCanvasEdge[]) => void;
  onNodesChange: (_changes: NodeChange[]) => void;
  onEdgesChange: (_changes: EdgeChange[]) => void;

  // Connection validation
  onConnect: (_connection: ReactFlowConnection) => ConnectionValidation;

  // Group operations
  addGroup: (_label: string, _nodeIds: string[]) => string;
  removeGroup: (_groupId: string) => void;
  updateGroup: (_groupId: string, _updates: Partial<Omit<EditorNodeGroup, 'id'>>) => void;
  moveGroup: (_groupId: string, _deltaX: number, _deltaY: number) => void;

  // Bulk operations (for loading workflow)
  loadGraph: (_nodes: EditorCanvasNode[], _edges: EditorCanvasEdge[], _groups?: EditorNodeGroup[]) => void;
  clearGraph: () => void;
}
