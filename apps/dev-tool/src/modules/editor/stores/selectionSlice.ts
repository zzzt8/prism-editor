// selectionSlice - manages selection state (selected nodes/edges, clipboard, context menu)
// Independent from graph state
//
// NOTE: This is a type-only interface file. Clipboard state (clipboard field) is
// managed directly in useCanvasStore.ts.

import type { EditorCanvasNode } from '@prism/shared-types';

export interface ContextMenuState {
  x: number;
  y: number;
  /** null = canvas right-click; string = right-clicked specific node */
  nodeId: string | null;
}

export interface SelectionSlice {
  // State
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  clipboard: EditorCanvasNode[] | null;
  contextMenu: ContextMenuState | null;

  // Selection operations
  selectNode: (_id: string, _multi?: boolean) => void;
  clearSelection: () => void;
  removeSelectedNodes: (_nodeIds: string[]) => EditorCanvasNode[];
  removeSelectedEdges: (_edgeIds: string[]) => void;

  // Clipboard operations
  copyNodes: (_nodeIds: string[], _nodes: EditorCanvasNode[]) => void;
  cutNodes: (_nodeIds: string[], _nodes: EditorCanvasNode[], _edges: { source: string; target: string }[]) => void;
  pasteNodes: (_position: { x: number; y: number }) => EditorCanvasNode[] | null;

  // Context menu
  setContextMenu: (_menu: ContextMenuState | null) => void;
}
