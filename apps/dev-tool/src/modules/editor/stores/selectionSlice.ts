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
  selectNode: (id: string, multi?: boolean) => void;
  clearSelection: () => void;
  removeSelectedNodes: (nodeIds: string[]) => EditorCanvasNode[];
  removeSelectedEdges: (edgeIds: string[]) => void;

  // Clipboard operations
  copyNodes: (nodeIds: string[], nodes: EditorCanvasNode[]) => void;
  cutNodes: (nodeIds: string[], nodes: EditorCanvasNode[], edges: { source: string; target: string }[]) => void;
  pasteNodes: (position: { x: number; y: number }) => EditorCanvasNode[] | null;

  // Context menu
  setContextMenu: (menu: ContextMenuState | null) => void;
}
