// graphSlice - manages graph state (nodes, edges, groups)
// Independent from UI state, focused on workflow structure

import { create } from 'zustand';
import type { NodeChange, EdgeChange } from '@xyflow/react';
import type { EditorCanvasNode, EditorCanvasEdge, EditorNodeGroup } from '@prism/shared-types';
import type { Connection as RfConnection } from '@xyflow/react';
import { canConnectByDataType, PortDataType } from '@prism/shared-types';
import { globalRegistry } from '@prism/core';
import { PORT_TYPE_COLORS } from '../../../utils/portTypeStyles';

type ReactFlowConnection = RfConnection;

interface ConnectionValidation {
  valid: boolean;
  reason?: string;
  sourceType?: PortDataType;
  targetType?: PortDataType;
}

interface GraphSlice {
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

// Port lookup helper
function findPort<T extends { id: string; name: string; label?: string; dataType?: string }>(
  ports: T[],
  portId: string
): T | undefined {
  return ports.find((p) => p.id === portId || p.name === portId || p.label === portId);
}

// Node definition registry initialization
function ensureNodeRegistryInitialized(): void {
  try {
    globalRegistry.initialize();
  } catch (err) {
    console.error('[graphSlice] globalRegistry.initialize() failed:', err);
  }
}

// Infer PortDataType from port name
function inferPortDataType(portName: string): PortDataType | undefined {
  const lower = portName.toLowerCase();
  if (lower === 'image' || lower === 'img' || lower === 'result') return PortDataType.IMAGE;
  if (lower === 'mask' || lower === 'msk' || lower === 'alpha') return PortDataType.MASK;
  if (lower === 'number' || lower === 'num') return PortDataType.NUMBER;
  if (lower === 'string' || lower === 'str' || lower === 'text') return PortDataType.STRING;
  if (lower === 'boolean' || lower === 'bool') return PortDataType.BOOLEAN;
  return undefined;
}

// Module-level counters (shared across slice instances)
let nodeCounter = 0;
let edgeCounter = 0;

export function getNodeCounter(): number {
  return nodeCounter;
}

export function setNodeCounter(value: number): void {
  nodeCounter = value;
}

export function getEdgeCounter(): number {
  return edgeCounter;
}

export function setEdgeCounter(value: number): void {
  edgeCounter = value;
}

export function createGraphSlice(): Pick<GraphSlice, keyof GraphSlice> {
  return {
    // Initial state
    nodes: [],
    edges: [],
    groups: [],

    // Node operations
    addNode(type, position) {
      ensureNodeRegistryInitialized();
      const definition = globalRegistry.getNode(type);
      if (!definition) return undefined;

      const id = `node-${++nodeCounter}`;
      const newNode: EditorCanvasNode = {
        id,
        type: 'prismNode',
        position,
        data: {
          label: definition.label,
          nodeType: type,
          params: Object.fromEntries(definition.params.map((p) => [p.id, p.default])),
          definition,
        },
      };

      return id; // Caller will add to state via setNodes
    },

    removeNode(id) {
      // This will be handled by the store after calling removeNode
    },

    updateNodePosition(id, position) {
      // This will be handled by the store
    },

    updateNodeData(id, data) {
      // This will be handled by the store
    },

    setNodes(nodes) {
      // This will be handled by the store
    },

    setEdges(edges) {
      // This will be handled by the store
    },

    onNodesChange(changes) {
      // This will be handled by the store
    },

    onEdgesChange(changes) {
      // This will be handled by the store
    },

    onConnect(connection): ConnectionValidation {
      // This will be handled by the store
      return { valid: false, reason: 'Not implemented' };
    },

    // Group operations
    addGroup(label, nodeIds) {
      // This will be handled by the store
      return '';
    },

    removeGroup(groupId) {
      // This will be handled by the store
    },

    updateGroup(groupId, updates) {
      // This will be handled by the store
    },

    moveGroup(groupId, deltaX, deltaY) {
      // This will be handled by the store
    },

    loadGraph(nodes, edges, groups = []) {
      // Sync counters
      if (nodes.length > 0) {
        const maxNodeNum = Math.max(
          0,
          ...nodes.map((n) => {
            const match = n.id.match(/^node-(\d+)$/);
            return match ? parseInt(match[1], 10) : 0;
          })
        );
        nodeCounter = maxNodeNum;
      }

      if (edges.length > 0) {
        const maxEdgeNum = Math.max(
          0,
          ...edges.map((e) => {
            const match = e.id.match(/^edge-(\d+)$/);
            return match ? parseInt(match[1], 10) : 0;
          })
        );
        edgeCounter = maxEdgeNum;
      }
    },

    clearGraph() {
      nodeCounter = 0;
      edgeCounter = 0;
    },
  };
}

// Re-export helper functions for use in store
export { findPort, ensureNodeRegistryInitialized, inferPortDataType };
