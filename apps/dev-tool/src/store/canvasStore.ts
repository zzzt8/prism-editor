// Canvas store - manages workflow canvas state using Zustand

import { create } from 'zustand';
import type { Connection, Workflow, WorkflowNode, ExecutionProgress } from '@prism/shared-types';
import type { NodeDefinition, PortDataType } from '@prism/shared-types';
import { canConnectByDataType } from '@prism/shared-types';
import { createRegistry } from '@prism/node-definitions';
import { localStorageAdapter } from '../storage';
import { PORT_TYPE_COLORS } from '../utils/portTypeStyles';

/** Result of a connection validation check (enhanced with PortDataType) */
export interface ConnectionValidation {
  valid: boolean;
  reason?: string;
  sourceType?: PortDataType;
  targetType?: PortDataType;
}

export interface CanvasNodeData extends Record<string, unknown> {
  label: string;
  nodeType: string;
  params: Record<string, unknown>;
  definition?: NodeDefinition;
  /** Node execution result (populated by the executor at runtime) */
  executionResult?: Record<string, unknown>;
  /** Node execution error (populated when execution fails) */
  executionError?: string;
  /**
   * Dynamically added input ports (beyond static NodeDefinition.inputs).
   * Used for Composite and similar nodes to support dynamic port counts.
   * Stored at instance level only — does not modify the global NodeDefinition.
   */
  extraInputs?: Array<{ id: string; name: string; type: 'image'; dataType: PortDataType }>;
  /**
   * Dynamically added output ports (beyond static NodeDefinition.outputs).
   * Stored at instance level only — does not modify the global NodeDefinition.
   */
  extraOutputs?: Array<{ id: string; name: string; type: 'image'; dataType: PortDataType }>;
  /** Bypassed flag — when true, executor skips processing and passes inputs through */
  bypassed?: boolean;
  /** Minimized flag — when true, node renders as header-only (collapsible) */
  minimized?: boolean;
  /** Pinned flag — when true, node is locked and cannot be moved */
  pinned?: boolean;
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
  /** V6: edge color driven by source port dataType, stored at creation time */
  data?: { color?: string };
}

export interface NodeGroup {
  id: string;
  label: string;
  color: string;
  /** IDs of nodes that belong to this group */
  nodeIds: string[];
  /** Bounding box of the group in canvas coordinates */
  bounds: { x: number; y: number; width: number; height: number };
}

export interface ContextMenuState {
  x: number;
  y: number;
  nodeId: string;
}

interface CanvasState {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  groups: NodeGroup[];
  /** Clipboard for copy/cut/paste */
  clipboard: CanvasNode[] | null;
  /** Active context menu */
  contextMenu: ContextMenuState | null;
  /** Inspector tab to open ('parameters' | 'settings' | 'info') */
  inspectorTab: 'parameters' | 'settings' | 'info';
  workflowMeta: { id: string; name: string; version: string };
  isDirty: boolean;
  viewport: { x: number; y: number; zoom: number };
  _executionStatus: 'idle' | 'running' | 'done' | 'error' | 'cancelled';
  _currentNodeId: string | null;
  _executionAbort: (() => void) | null;

  addNode: (type: string, position: { x: number; y: number }) => void;
  removeNode: (id: string) => void;
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;
  updateNodeParams: (id: string, params: Record<string, unknown>) => void;
  updateNodeData: (id: string, data: Partial<CanvasNodeData>) => void;
  setNodes: (nodes: CanvasNode[]) => void;
  setEdges: (edges: CanvasEdge[]) => void;
  onNodesChange: (changes: any[]) => void;
  onEdgesChange: (changes: any[]) => void;
  onConnect: (connection: Connection) => ConnectionValidation;
  selectNode: (id: string, multi?: boolean) => void;
  clearSelection: () => void;
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void;
  setWorkflowMeta: (meta: { id: string; name: string; version: string }) => void;
  markDirty: () => void;
  markClean: () => void;
  newWorkflow: () => void;
  toWorkflow: () => Workflow;
  loadWorkflow: (workflow: Workflow) => void;
  saveWorkflow: (workflowName?: string) => Promise<void>;
  loadWorkflowFromStore: (id: string) => Promise<void>;
  exportWorkflowAsJson: () => Promise<void>;
  importWorkflowFromFile: (file: File) => Promise<void>;
  removeSelectedNodes: () => void;
  removeSelectedEdges: () => void;
  updateNodeExecution: (id: string, result?: Record<string, unknown>, error?: string) => void;
  executeWorkflow: () => Promise<{ status: 'done' | 'error' | 'cancelled'; error?: string }>;
  cancelExecution: () => void;
  clearExecution: () => void;

  /** Group operations */
  addGroup: (label: string, nodeIds: string[]) => string;
  removeGroup: (groupId: string) => void;
  updateGroup: (groupId: string, updates: Partial<Omit<NodeGroup, 'id'>>) => void;
  moveGroup: (groupId: string, deltaX: number, deltaY: number) => void;

  /** Context menu operations */
  setContextMenu: (menu: ContextMenuState | null) => void;
  /** Clipboard operations */
  copyNodes: (nodeIds: string[]) => void;
  cutNodes: (nodeIds: string[]) => void;
  pasteNodes: (position: { x: number; y: number }) => void;
  /** Inspector */
  openInspector: (tab: 'parameters' | 'settings' | 'info', nodeId?: string) => void;
  /** Dynamic extra inputs */
  addExtraInput: (nodeId: string, port: { id: string; name: string; type: 'image'; dataType: PortDataType }) => void;
  removeExtraInput: (nodeId: string, portId: string) => void;
}

let nodeCounter = 0;

export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeIds: [],
  selectedEdgeIds: [],
  groups: [],
  clipboard: null,
  contextMenu: null,
  inspectorTab: 'parameters',
  workflowMeta: { id: crypto.randomUUID(), name: 'Untitled Workflow', version: '1.0.0' },
  isDirty: false,
  viewport: { x: 0, y: 0, zoom: 1 },
  _executionStatus: 'idle',
  _currentNodeId: null,
  _executionAbort: null,

  addNode(type, position) {
    const registry = createRegistry();
    const definition = registry.get(type);
    if (!definition) return;

    const reactFlowType = 'prismNode';

    const id = `node-${++nodeCounter}`;
    const newNode: CanvasNode = {
      id,
      type: reactFlowType,
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
      }

      return { nodes: updatedNodes, selectedNodeIds: selectedIds, isDirty: true };
    });
  },

  onEdgesChange(changes) {
    set((state) => {
      let updatedEdges = state.edges;
      let selectedEdgeIds = [...state.selectedEdgeIds];
      for (const change of changes) {
        if (change.type === 'remove') {
          updatedEdges = updatedEdges.filter((e) => e.id !== change.id);
          selectedEdgeIds = selectedEdgeIds.filter((eid) => eid !== change.id);
        }
      }
      return { edges: updatedEdges, selectedEdgeIds, isDirty: true };
    });
  },

  onConnect(connection): ConnectionValidation {
    const { edges, nodes } = get();

    const sourceNode = nodes.find((n) => n.id === connection.from.nodeId);
    const targetNode = nodes.find((n) => n.id === connection.to.nodeId);

    if (!sourceNode || !targetNode) {
      return { valid: false, reason: 'Source or target node not found' };
    }

    const sourceDef = sourceNode.data.definition;
    const targetDef = targetNode.data.definition;

    if (!sourceDef || !targetDef) {
      return { valid: false, reason: 'Node definition not found' };
    }

    const sourcePort = sourceDef.outputs.find(
      (p) => p.id === connection.from.port || p.name === connection.from.port
    );

    // Check both static definition inputs and dynamic extraInputs
    const staticInputs = targetDef.inputs;
    const extraInputs = targetNode.data.extraInputs ?? [];
    const targetPort = staticInputs.find(
      (p) => p.id === connection.to.port || p.name === connection.to.port
    ) ?? extraInputs.find(
      (p) => p.id === connection.to.port || p.name === connection.to.port
    );

    if (!sourcePort) {
      return {
        valid: false,
        reason: `Port '${connection.from.port}' not found on source node '${sourceDef.label}'`,
      };
    }
    if (!targetPort) {
      return {
        valid: false,
        reason: `Port '${connection.to.port}' not found on target node '${targetDef.label}'`,
      };
    }

    const sourceType = sourcePort.dataType;
    const targetType = targetPort.dataType;

    const compatibilityResult = canConnectByDataType(
      { dataType: sourceType },
      { dataType: targetType }
    );

    if (!compatibilityResult.valid) {
      return {
        valid: false,
        reason: `[类型不兼容] ${sourceType} → ${targetType}: ${compatibilityResult.reason ?? '无法连接'}`,
        sourceType,
        targetType,
      };
    }

    const exists = edges.some(
      (e) =>
        e.source === connection.from.nodeId &&
        e.target === connection.to.nodeId &&
        e.sourceHandle === connection.from.port &&
        e.targetHandle === connection.to.port
    );
    if (exists) {
      return { valid: false, reason: 'Connection already exists' };
    }

    // V6: compute edge color from source port dataType for ComfyUI-style colored cables
    const edgeColor = PORT_TYPE_COLORS[sourceType] ?? '#6b7280';

    const newEdge: CanvasEdge = {
      id: `edge-${crypto.randomUUID()}`,
      source: connection.from.nodeId,
      sourceHandle: connection.from.port,
      target: connection.to.nodeId,
      targetHandle: connection.to.port,
      type: 'default',
      data: { color: edgeColor },
    };

    set((state) => ({ edges: [...state.edges, newEdge], isDirty: true }));
    return { valid: true };
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
    set({ selectedNodeIds: [], selectedEdgeIds: [] });
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
      selectedEdgeIds: [],
      isDirty: true,
    }));
  },

  removeSelectedEdges() {
    const { selectedEdgeIds } = get();
    if (selectedEdgeIds.length === 0) return;

    set((state) => ({
      edges: state.edges.filter((e) => !selectedEdgeIds.includes(e.id)),
      selectedEdgeIds: [],
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

  newWorkflow() {
    // Cancel any in-flight execution before resetting state
    const { _executionAbort } = get();
    if (_executionAbort) {
      _executionAbort();
    }
    nodeCounter = 0;
    set({
      nodes: [],
      edges: [],
      selectedNodeIds: [],
      selectedEdgeIds: [],
      workflowMeta: { id: crypto.randomUUID(), name: 'Untitled Workflow', version: '1.0.0' },
      isDirty: false,
      _executionStatus: 'idle',
      _currentNodeId: null,
      _executionAbort: null,
    });
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
        from: {
          nodeId: e.source,
          port: e.sourceHandle ?? (() => { throw new Error('sourceHandle is required'); })(),
        },
        to: {
          nodeId: e.target,
          port: e.targetHandle ?? (() => { throw new Error('targetHandle is required'); })(),
        },
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
      _executionStatus: 'idle',
      _currentNodeId: null,
    });
  },

  async saveWorkflow(workflowName?: string): Promise<void> {
    const { workflowMeta } = get();

    const existing = await localStorageAdapter.load(workflowMeta.id).catch(() => null);
    const createdAt = existing?.metadata?.createdAt ?? new Date().toISOString();

    const workflow: Workflow = {
      id: workflowMeta.id,
      name: workflowName ?? workflowMeta.name,
      version: workflowMeta.version,
      nodes: get().nodes.map((n): WorkflowNode => ({
        id: n.id,
        type: n.data.nodeType,
        position: n.position,
        params: n.data.params,
      })),
      connections: get().edges.map((e): Connection => ({
        id: e.id,
        from: {
          nodeId: e.source,
          port: e.sourceHandle ?? (() => { throw new Error('sourceHandle is required'); })(),
        },
        to: {
          nodeId: e.target,
          port: e.targetHandle ?? (() => { throw new Error('targetHandle is required'); })(),
        },
      })),
      inputs: [],
      outputs: [],
      metadata: {
        createdAt,
        updatedAt: new Date().toISOString(),
      },
    };

    await localStorageAdapter.save(workflow);
    set({
      workflowMeta: { ...workflowMeta, name: workflow.name },
      isDirty: false,
    });
  },

  async loadWorkflowFromStore(id: string): Promise<void> {
    const workflow = await localStorageAdapter.load(id);
    get().loadWorkflow(workflow);
  },

  async exportWorkflowAsJson(): Promise<void> {
    const workflow = get().toWorkflow();
    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${workflow.name.replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '-')}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  },

  async importWorkflowFromFile(file: File): Promise<void> {
    const { jsonFileAdapter } = await import('../storage');
    const workflow = await jsonFileAdapter.importFromFile(file);
    get().loadWorkflow(workflow);
  },

  async executeWorkflow() {
    const { nodes, workflowMeta, edges } = get();
    if (nodes.length === 0) return { status: 'done' as const };

    // Clear previous execution results and set running state
    set((state) => ({
      nodes: state.nodes.map((n) => ({
        ...n,
        data: { ...n.data, executionResult: undefined, executionError: undefined },
      })),
      _executionStatus: 'running' as const,
      _currentNodeId: null,
    }));

    // Create abort controller for cancellation
    const controller = new AbortController();
    set({ _executionAbort: () => controller.abort() });

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
        from: {
          nodeId: e.source,
          port: e.sourceHandle ?? (() => { throw new Error('sourceHandle is required'); })(),
        },
        to: {
          nodeId: e.target,
          port: e.targetHandle ?? (() => { throw new Error('targetHandle is required'); })(),
        },
      })),
      inputs: [],
      outputs: [],
      metadata: { createdAt: '', updatedAt: '' },
    };

    const progressCallback = (progress: ExecutionProgress) => {
      set((state) => ({
        nodes: state.nodes.map((n) => {
          const nodeResult = progress.results.find((r) => r.nodeId === n.id);
          if (!nodeResult) return n;
          return {
            ...n,
            data: {
              ...n.data,
              executionResult: nodeResult.status === 'done' ? nodeResult.outputs : undefined,
              executionError: nodeResult.status === 'error' ? nodeResult.error : undefined,
            },
          };
        }),
        _currentNodeId: progress.currentNodeId ?? null,
      }));
    };

    const result = await executor.execute(workflow, {
      signal: controller.signal,
      onProgress: progressCallback,
    });

    const finalStatus = result.status as 'done' | 'error' | 'cancelled';
    set({ _executionStatus: finalStatus, _currentNodeId: null, _executionAbort: null });
    return { status: finalStatus, error: result.error };
  },

  cancelExecution() {
    const abort = get()._executionAbort;
    if (abort) abort();
  },

  clearExecution() {
    set((state) => ({
      nodes: state.nodes.map((n) => ({
        ...n,
        data: { ...n.data, executionResult: undefined, executionError: undefined },
      })),
      _executionStatus: 'idle' as const,
      _currentNodeId: null,
    }));
  },

  // ── Group operations ──────────────────────────────────────────────────────

  addGroup(label, nodeIds) {
    const id = `group-${Date.now()}`;
    const state = get();
    if (nodeIds.length === 0) return id;

    // Compute bounding box from child nodes
    const groupNodes = state.nodes.filter((n) => nodeIds.includes(n.id));
    if (groupNodes.length === 0) return id;

    const xs = groupNodes.map((n) => n.position.x);
    const ys = groupNodes.map((n) => n.position.y);
    const maxXs = groupNodes.map((n) => n.position.x + 200); // approximate node width
    const maxYs = groupNodes.map((n) => n.position.y + 100); // approximate node height

    const minX = Math.min(...xs) - 24;
    const minY = Math.min(...ys) - 24;
    const width = Math.max(...maxXs) - minX + 24;
    const height = Math.max(...maxYs) - minY + 24;

    const group: NodeGroup = {
      id,
      label,
      color: '#6366f1',
      nodeIds,
      bounds: { x: minX, y: minY, width, height },
    };

    set((s) => ({ groups: [...s.groups, group], isDirty: true }));
    return id;
  },

  removeGroup(groupId) {
    set((state) => ({
      groups: state.groups.filter((g) => g.id !== groupId),
      isDirty: true,
    }));
  },

  updateGroup(groupId, updates) {
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId ? { ...g, ...updates } : g
      ),
      isDirty: true,
    }));
  },

  /**
   * Move all nodes in a group by a delta.
   * Also updates the group's bounds accordingly.
   */
  moveGroup(groupId, deltaX, deltaY) {
    const state = get();
    const group = state.groups.find((g) => g.id === groupId);
    if (!group) return;

    set((s) => ({
      // Move all child nodes
      nodes: s.nodes.map((n) =>
        group.nodeIds.includes(n.id)
          ? { ...n, position: { x: n.position.x + deltaX, y: n.position.y + deltaY } }
          : n
      ),
      // Move the group's own bounds
      groups: s.groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              bounds: {
                x: g.bounds.x + deltaX,
                y: g.bounds.y + deltaY,
                width: g.bounds.width,
                height: g.bounds.height,
              },
            }
          : g
      ),
      isDirty: true,
    }));
  },

  // ── Context menu & clipboard ─────────────────────────────────────────────

  setContextMenu(menu) {
    set({ contextMenu: menu });
  },

  copyNodes(nodeIds) {
    const state = get();
    const nodesToCopy = state.nodes.filter((n) => nodeIds.includes(n.id));
    set({ clipboard: nodesToCopy });
  },

  cutNodes(nodeIds) {
    const state = get();
    const nodesToCut = state.nodes.filter((n) => nodeIds.includes(n.id));
    set((s) => ({
      clipboard: nodesToCut,
      nodes: s.nodes.filter((n) => !nodeIds.includes(n.id)),
      edges: s.edges.filter((e) => !nodeIds.includes(e.source) && !nodeIds.includes(e.target)),
      selectedNodeIds: s.selectedNodeIds.filter((id) => !nodeIds.includes(id)),
      isDirty: true,
    }));
  },

  pasteNodes(position) {
    const state = get();
    if (!state.clipboard || state.clipboard.length === 0) return;

    const pasteOffset = 40;
    const newNodes = state.clipboard.map((origNode) => {
      const newId = `node-${++nodeCounter}`;
      return {
        ...origNode,
        id: newId,
        position: {
          x: origNode.position.x + pasteOffset,
          y: origNode.position.y + pasteOffset,
        },
        data: {
          ...origNode.data,
          // Clear execution state on paste
          executionResult: undefined,
          executionError: undefined,
          bypassed: false,
          minimized: false,
        },
      };
    });

    set((s) => ({
      nodes: [...s.nodes, ...newNodes],
      clipboard: newNodes,
      isDirty: true,
    }));
  },

  openInspector(tab, nodeId) {
    set({ inspectorTab: tab });
    if (nodeId) {
      set((s) => ({ selectedNodeIds: [nodeId] }));
    }
  },

  updateNodeData(id, data) {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...data } } : n
      ),
      isDirty: true,
    }));
  },

  addExtraInput(nodeId, port) {
    set((state) => ({
      nodes: state.nodes.map((n) => {
        if (n.id !== nodeId) return n;
        const existing = n.data.extraInputs ?? [];
        return {
          ...n,
          data: {
            ...n.data,
            extraInputs: [...existing, port],
          },
        };
      }),
      isDirty: true,
    }));
  },

  removeExtraInput(nodeId, portId) {
    set((state) => ({
      nodes: state.nodes.map((n) => {
        if (n.id !== nodeId) return n;
        return {
          ...n,
          data: {
            ...n.data,
            extraInputs: (n.data.extraInputs ?? []).filter((p) => p.id !== portId),
          },
        };
      }),
      isDirty: true,
    }));
  },
}));