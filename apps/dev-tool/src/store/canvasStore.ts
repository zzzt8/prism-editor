// Canvas store - manages workflow canvas state using Zustand

import { create } from 'zustand';
import type { Connection, Workflow, WorkflowNode, ExecutionProgress } from '@prism/shared-types';
import type { NodeDefinition } from '@prism/shared-types';
import { createRegistry } from '@prism/node-definitions';

export interface CanvasNodeData extends Record<string, unknown> {
  label: string;
  nodeType: string;
  params: Record<string, unknown>;
  definition?: NodeDefinition;
  /** Node execution result (populated by the executor at runtime) */
  executionResult?: Record<string, unknown>;
  /** Node execution error (populated when execution fails) */
  executionError?: string;
}

export interface CanvasNode {
  id: string;
  type?: string | undefined;
  position: { x: number; y: number };
  data: CanvasNodeData;
}

export interface CanvasEdge {
  id: string;
  source: string;
  sourceHandle?: string | null;
  target: string;
  targetHandle?: string | null;
  type?: string;
}

interface CanvasState {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  selectedNodeIds: string[];
  workflowMeta: { id: string; name: string; version: string };
  isDirty: boolean;
  viewport: { x: number; y: number; zoom: number };

  addNode: (type: string, position: { x: number; y: number }) => void;
  removeNode: (id: string) => void;
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;
  updateNodeParams: (id: string, params: Record<string, unknown>) => void;
  setNodes: (nodes: CanvasNode[]) => void;
  setEdges: (edges: CanvasEdge[]) => void;
  onNodesChange: (changes: any[]) => void;
  onEdgesChange: (changes: any[]) => void;
  onConnect: (connection: Connection) => boolean;
  selectNode: (id: string, multi?: boolean) => void;
  clearSelection: () => void;
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void;
  setWorkflowMeta: (meta: { id: string; name: string; version: string }) => void;
  markDirty: () => void;
  markClean: () => void;
  toWorkflow: () => Workflow;
  loadWorkflow: (workflow: Workflow) => void;
  removeSelectedNodes: () => void;
  updateNodeExecution: (id: string, result?: Record<string, unknown>, error?: string) => void;
  executeWorkflow: () => Promise<{ status: 'done' | 'error' | 'cancelled'; error?: string }>;
}

let nodeCounter = 0;

export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeIds: [],
  workflowMeta: { id: crypto.randomUUID(), name: 'Untitled Workflow', version: '1.0.0' },
  isDirty: false,
  viewport: { x: 0, y: 0, zoom: 1 },

  addNode(type, position) {
    const registry = createRegistry();
    const definition = registry.get(type);
    if (!definition) return;

    const id = `node-${++nodeCounter}`;
    const newNode: CanvasNode = {
      id,
      type: 'prismNode',
      position,
      data: {
        label: definition.label,
        nodeType: type,
        params: Object.fromEntries(
          definition.params.map((p) => [p.id, p.default])
        ),
        definition,
      },
    };

    set((state) => ({ nodes: [...state.nodes, newNode], isDirty: true }));
  },

  removeNode(id) {
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeIds: state.selectedNodeIds.filter((sid) => sid !== id),
      isDirty: true,
    }));
  },

  updateNodePosition(id, position) {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, position } : n
      ),
      isDirty: true,
    }));
  },

  updateNodeParams(id, params) {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, params } } : n
      ),
      isDirty: true,
    }));
  },

  setNodes(nodes) {
    set({ nodes });
  },

  setEdges(edges) {
    set({ edges });
  },

  onNodesChange(changes) {
    set((state) => {
      let updatedNodes = state.nodes;
      let selectedIds = [...state.selectedNodeIds];

      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          updatedNodes = updatedNodes.map((n) =>
            n.id === change.id ? { ...n, position: change.position } : n
          );
        }
        if (change.type === 'remove') {
          updatedNodes = updatedNodes.filter((n) => n.id !== change.id);
          selectedIds = selectedIds.filter((sid) => sid !== change.id);
        }
        if (change.type === 'select') {
          if (change.selected) {
            if (!selectedIds.includes(change.id)) selectedIds.push(change.id);
          } else {
            selectedIds = selectedIds.filter((sid) => sid !== change.id);
          }
        }
      }

      return { nodes: updatedNodes, selectedNodeIds: selectedIds, isDirty: true };
    });
  },

  onEdgesChange(changes) {
    set((state) => {
      let updatedEdges = state.edges;
      for (const change of changes) {
        if (change.type === 'remove') {
          updatedEdges = updatedEdges.filter((e) => e.id !== change.id);
        }
      }
      return { edges: updatedEdges, isDirty: true };
    });
  },

  onConnect(connection): boolean {
    const { edges, nodes } = get();

    const sourceNode = nodes.find((n) => n.id === connection.from.nodeId);
    const targetNode = nodes.find((n) => n.id === connection.to.nodeId);

    if (!sourceNode || !targetNode) return false;

    const sourceDef = sourceNode.data.definition;
    const targetDef = targetNode.data.definition;

    if (!sourceDef || !targetDef) return false;

    const sourcePort = sourceDef.outputs.find(
      (p) => p.id === connection.from.port || p.name === connection.from.port
    );
    const targetPort = targetDef.inputs.find(
      (p) => p.id === connection.to.port || p.name === connection.to.port
    );

    if (!sourcePort || !targetPort) return false;

    if (sourcePort.type !== targetPort.type) return false;

    const exists = edges.some(
      (e) =>
        e.source === connection.from.nodeId &&
        e.target === connection.to.nodeId &&
        e.sourceHandle === connection.from.port &&
        e.targetHandle === connection.to.port
    );
    if (exists) return false;

    const newEdge: CanvasEdge = {
      id: `edge-${crypto.randomUUID()}`,
      source: connection.from.nodeId,
      sourceHandle: connection.from.port,
      target: connection.to.nodeId,
      targetHandle: connection.to.port,
      type: 'default',
    };

    set((state) => ({ edges: [...state.edges, newEdge], isDirty: true }));
    return true;
  },

  selectNode(id, multi = false) {
    set((state) => {
      if (multi) {
        const alreadySelected = state.selectedNodeIds.includes(id);
        return {
          selectedNodeIds: alreadySelected
            ? state.selectedNodeIds.filter((sid) => sid !== id)
            : [...state.selectedNodeIds, id],
        };
      }
      return { selectedNodeIds: [id] };
    });
  },

  clearSelection() {
    set({ selectedNodeIds: [] });
  },

  setViewport(viewport) {
    set({ viewport });
  },

  removeSelectedNodes() {
    const { selectedNodeIds } = get();
    if (selectedNodeIds.length === 0) return;

    set((state) => ({
      nodes: state.nodes.filter((n) => !selectedNodeIds.includes(n.id)),
      edges: state.edges.filter(
        (e) =>
          !selectedNodeIds.includes(e.source) && !selectedNodeIds.includes(e.target)
      ),
      selectedNodeIds: [],
      isDirty: true,
    }));
  },

  updateNodeExecution(id, result, error) {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, executionResult: result, executionError: error } }
          : n
      ),
    }));
  },

  setWorkflowMeta(meta) {
    set({ workflowMeta: meta });
  },

  markDirty() {
    set({ isDirty: true });
  },

  markClean() {
    set({ isDirty: false });
  },

  toWorkflow(): Workflow {
    const { nodes, edges, workflowMeta } = get();

    return {
      id: workflowMeta.id,
      name: workflowMeta.name,
      version: workflowMeta.version,
      nodes: nodes.map((n): WorkflowNode => ({
        id: n.id,
        type: n.data.nodeType,
        position: n.position,
        params: n.data.params,
      })),
      connections: edges.map((e): Connection => ({
        id: e.id,
        from: { nodeId: e.source, port: e.sourceHandle ?? 'out' },
        to: { nodeId: e.target, port: e.targetHandle ?? 'in' },
      })),
      inputs: [],
      outputs: [],
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  },

  loadWorkflow(workflow) {
    const registry = createRegistry();
    const canvasNodes: CanvasNode[] = workflow.nodes.map((n) => {
      const def = registry.get(n.type);
      return {
        id: n.id,
        type: 'prismNode',
        position: n.position,
        data: {
          label: def?.label ?? n.type,
          nodeType: n.type,
          params: n.params,
          definition: def,
        },
      };
    });

    const canvasEdges: CanvasEdge[] = workflow.connections.map((c) => ({
      id: c.id,
      source: c.from.nodeId,
      sourceHandle: c.from.port,
      target: c.to.nodeId,
      targetHandle: c.to.port,
      type: 'default',
    }));

    const maxNum = Math.max(
      0,
      ...workflow.nodes.map((n) => {
        const match = n.id.match(/^node-(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
    );
    nodeCounter = maxNum;

    set({
      nodes: canvasNodes,
      edges: canvasEdges,
      workflowMeta: { id: workflow.id, name: workflow.name, version: workflow.version },
      selectedNodeIds: [],
      isDirty: false,
    });
  },

  async executeWorkflow() {
    const { nodes, workflowMeta, edges } = get();
    if (nodes.length === 0) {
      return { status: 'done' as const };
    }

    const { nodeExecutors } = await import('@prism/image-ops');
    const { WorkflowExecutor } = await import('@prism/workflow-core');

    const executor = new WorkflowExecutor(nodeExecutors);
    const workflow = {
      id: workflowMeta.id,
      name: workflowMeta.name,
      version: workflowMeta.version,
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.data.nodeType,
        position: n.position,
        params: n.data.params,
      })),
      connections: edges.map((e) => ({
        id: e.id,
        from: { nodeId: e.source, port: e.sourceHandle ?? 'out' },
        to: { nodeId: e.target, port: e.targetHandle ?? 'in' },
      })),
      inputs: [],
      outputs: [],
      metadata: { createdAt: '', updatedAt: '' },
    };

    const progressCallback = (progress: ExecutionProgress) => {
      set((state) => ({
        nodes: state.nodes.map((n) => {
          const nodeResult = progress.results.find((r: { nodeId: string }) => r.nodeId === n.id);
          if (!nodeResult) return n;
          return {
            ...n,
            data: {
              ...n.data,
              executionResult: nodeResult.outputs,
              executionError: nodeResult.status === 'error' ? nodeResult.error : undefined,
            },
          };
        }),
      }));
    };

    const result = await executor.execute(workflow, { onProgress: progressCallback });
    return { status: result.status as 'done' | 'error' | 'cancelled', error: result.error };
  },
}));
