// selectionSlice - manages selection state (selected nodes/edges, clipboard, context menu)
// Independent from graph state

import type { EditorCanvasNode } from '@prism/shared-types';

export interface ContextMenuState {
  x: number;
  y: number;
  nodeId: string;
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

export function createSelectionSlice(): Pick<SelectionSlice, keyof SelectionSlice> {
  // Module-level state for clipboard (persists across store recreations)
  let clipboardNodes: EditorCanvasNode[] | null = null;
  let clipboardEdges: { source: string; target: string }[] = [];
  let nodeCounter = 0;
  let edgeCounter = 0;

  return {
    // Initial state
    selectedNodeIds: [],
    selectedEdgeIds: [],
    clipboard: null,
    contextMenu: null,

    // Selection operations
    selectNode(id, multi = false) {
      if (multi) {
        const alreadySelected = this.selectedNodeIds.includes(id);
        return alreadySelected
          ? this.selectedNodeIds.filter((sid) => sid !== id)
          : [...this.selectedNodeIds, id];
      }
      return [id];
    },

    clearSelection() {
      return { selectedNodeIds: [], selectedEdgeIds: [] };
    },

    removeSelectedNodes(nodeIds) {
      // Returns nodes that were removed (for potential undo)
      return [];
    },

    removeSelectedEdges(edgeIds) {
      // Handled by store
    },

    // Clipboard operations
    copyNodes(nodeIds, nodes) {
      clipboardNodes = nodes.filter((n) => nodeIds.includes(n.id));
      return clipboardNodes;
    },

    cutNodes(nodeIds, nodes, edges) {
      clipboardNodes = nodes.filter((n) => nodeIds.includes(n.id));
      clipboardEdges = edges.filter((e) => nodeIds.includes(e.source) || nodeIds.includes(e.target));
      return clipboardNodes;
    },

    pasteNodes(position) {
      if (!clipboardNodes || clipboardNodes.length === 0) return null;

      const pasteOffset = 40;
      const oldToNewIdMap = new Map<string, string>();

      const newNodes = clipboardNodes.map((origNode) => {
        const newId = `node-${++nodeCounter}`;
        oldToNewIdMap.set(origNode.id, newId);
        return {
          ...origNode,
          id: newId,
          position: {
            x: origNode.position.x + pasteOffset,
            y: origNode.position.y + pasteOffset,
          },
          data: {
            ...origNode.data,
            executionResult: undefined,
            executionError: undefined,
            bypassed: false,
            minimized: false,
          },
        };
      });

      // Also copy edges between pasted nodes
      const clipboardNodeIds = new Set(clipboardNodes.map((n) => n.id));
      const newEdges = clipboardEdges
        .filter((edge) => clipboardNodeIds.has(edge.source) && clipboardNodeIds.has(edge.target))
        .map((edge) => ({
          ...edge,
          id: `edge-${++edgeCounter}`,
          source: oldToNewIdMap.get(edge.source) ?? edge.source,
          target: oldToNewIdMap.get(edge.target) ?? edge.target,
        }));

      // Update clipboard state
      clipboardNodes = newNodes;
      clipboardEdges = newEdges;

      return newNodes;
    },

    // Context menu
    setContextMenu(menu) {
      return menu;
    },
  };
}

// Helper to get clipboard for state updates
export function getClipboardState(): EditorCanvasNode[] | null {
  return null; // Will be managed by store
}
