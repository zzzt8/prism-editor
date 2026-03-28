// Canvas store - Zustand state management for React Flow canvas
import { create } from 'zustand';
import type { Node, Edge, Viewport } from '@xyflow/react';
import type { Position } from '../workflow';
import type { XYPosition } from '@xyflow/react';

export interface CanvasState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeIds: string[];
  viewport: Viewport;
}

export interface CanvasActions {
  // Node operations
  setNodes: (nodes: Node[]) => void;
  addNode: (type: string, position: XYPosition) => void;
  removeNode: (id: string) => void;
  updateNodeData: (id: string, data: Partial<Node['data']>) => void;
  
  // Edge operations
  setEdges: (edges: Edge[]) => void;
  addEdge: (edge: Edge) => void;
  removeEdge: (id: string) => void;
  
  // Selection operations
  setSelectedNodeIds: (ids: string[]) => void;
  clearSelection: () => void;
  
  // Viewport operations
  setViewport: (viewport: Viewport) => void;
  
  // Batch operations (for React Flow onNodesChange / onEdgesChange)
  applyNodeChanges: (changes: import('@xyflow/react').NodeChange[]) => void;
  applyEdgeChanges: (changes: import('@xyflow/react').EdgeChange[]) => void;
  
  // Reset
  reset: () => void;
}

const initialState: CanvasState = {
  nodes: [],
  edges: [],
  selectedNodeIds: [],
  viewport: { x: 0, y: 0, zoom: 1 },
};

export const useCanvasStore = create<CanvasState & CanvasActions>((set, get) => ({
  ...initialState,

  // Node operations
  setNodes: (nodes) => set({ nodes }),

  addNode: (type, position) => {
    const id = `${type}-${Date.now()}`;
    const newNode: Node = {
      id,
      type,
      position,
      data: { label: type, params: {} },
    };
    set((state) => ({ nodes: [...state.nodes, newNode] }));
  },

  removeNode: (id) => {
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeIds: state.selectedNodeIds.filter((sid) => sid !== id),
    }));
  },

  updateNodeData: (id, data) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...data } } : n
      ),
    }));
  },

  // Edge operations
  setEdges: (edges) => set({ edges }),

  addEdge: (edge) => {
    set((state) => ({ edges: [...state.edges, edge] }));
  },

  removeEdge: (id) => {
    set((state) => ({ edges: state.edges.filter((e) => e.id !== id) }));
  },

  // Selection operations
  setSelectedNodeIds: (ids) => set({ selectedNodeIds: ids }),

  clearSelection: () => set({ selectedNodeIds: [] }),

  // Viewport operations
  setViewport: (viewport) => set({ viewport }),

  // Batch operations for React Flow
  applyNodeChanges: (changes) => {
    set((state) => {
      let nodes = state.nodes;
      let selectedNodeIds = state.selectedNodeIds;
      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          nodes = nodes.map((n) =>
            n.id === change.id ? { ...n, position: change.position! } : n
          );
        } else if (change.type === 'dimensions' && change.dimensions) {
          nodes = nodes.map((n) =>
            n.id === change.id ? { ...n, ...change.dimensions } : n
          );
        } else if (change.type === 'remove') {
          nodes = nodes.filter((n) => n.id !== change.id);
          selectedNodeIds = selectedNodeIds.filter((id) => id !== change.id);
          // Also remove connected edges
          state.edges = state.edges.filter(
            (e) => e.source !== change.id && e.target !== change.id
          );
        } else if (change.type === 'select') {
          // Update selection state
          if (change.selected) {
            if (!selectedNodeIds.includes(change.id)) {
              selectedNodeIds = [...selectedNodeIds, change.id];
            }
          } else {
            selectedNodeIds = selectedNodeIds.filter(
              (id) => id !== change.id
            );
          }
        }
      }
      return { nodes, selectedNodeIds };
    });
  },

  applyEdgeChanges: (changes) => {
    set((state) => {
      let edges = state.edges;
      for (const change of changes) {
        if (change.type === 'remove') {
          edges = edges.filter((e) => e.id !== change.id);
        } else if (change.type === 'select') {
          edges = edges.map((e) =>
            e.id === change.id ? { ...e, selected: change.selected } : e
          );
        }
      }
      return { edges };
    });
  },

  // Reset
  reset: () => set(initialState),
}));

// Selectors for performance optimization
export const selectNodes = (state: CanvasState & CanvasActions) => state.nodes;
export const selectEdges = (state: CanvasState & CanvasActions) => state.edges;
export const selectSelectedNodeIds = (state: CanvasState & CanvasActions) => state.selectedNodeIds;
export const selectViewport = (state: CanvasState & CanvasActions) => state.viewport;
export const selectSelectedNodes = (state: CanvasState & CanvasActions) =>
  state.nodes.filter((n) => state.selectedNodeIds.includes(n.id));
