// Canvas store - manages workflow canvas state using Zustand

import { create } from 'zustand';
import type { NodeChange, EdgeChange, Connection as RfConnection } from '@xyflow/react';
import type { Workflow, WorkflowNode, ExecutionProgress, NodeDefinition, Connection } from '@prism/shared-types';
import { canConnectByDataType, PortDataType } from '@prism/shared-types';
import { globalRegistry } from '@prism/core';
import { activeStorageAdapter } from '../storage';
import { PORT_TYPE_COLORS } from '../utils/portTypeStyles';

// React Flow's Connection type (source/target based)
type ReactFlowConnection = RfConnection;

// ─── Port lookup helper ────────────────────────────────────────────────────────

/**
 * Match a port by id, name, or label (some test JSON uses label instead of name).
 */
function findPort<T extends { id: string; name: string; label?: string; dataType?: string }>(
  ports: T[],
  portId: string
): T | undefined {
  return ports.find((p) => p.id === portId || p.name === portId || p.label === portId);
}

/**
 * Infer PortDataType from common port names when dataType is missing.
 */
function inferPortDataType(portName: string): PortDataType | undefined {
  const lower = portName.toLowerCase();
  if (lower === 'image' || lower === 'img' || lower === 'result') return PortDataType.IMAGE;
  if (lower === 'mask' || lower === 'msk' || lower === 'alpha') return PortDataType.MASK;
  if (lower === 'number' || lower === 'num') return PortDataType.NUMBER;
  if (lower === 'string' || lower === 'str' || lower === 'text') return PortDataType.STRING;
  if (lower === 'boolean' || lower === 'bool') return PortDataType.BOOLEAN;
  return undefined;
}

const AUTO_SAVE_DELAY_MS = 5 * 60 * 1000; // 5 minutes

let nodeCounter = 0;
let edgeCounter = 0;
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
let autoSaveWorkflowId: string | null = null; // Track which workflow is being saved

function cancelAutoSave(): void {
  if (autoSaveTimer !== null) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
    autoSaveWorkflowId = null;
  }
}

function scheduleAutoSave(
  workflowId: string,
  saveFn: () => Promise<void>,
  onDone: () => void
): void {
  cancelAutoSave();
  autoSaveWorkflowId = workflowId;
  autoSaveTimer = setTimeout(async () => {
    autoSaveTimer = null;
    autoSaveWorkflowId = null;
    try {
      await saveFn();
      // Only call onDone if we're still saving the same workflow
      // (user may have switched workflows during the delay)
      onDone();
    } catch {
      // Errors are already logged by the storage adapter
    }
  }, AUTO_SAVE_DELAY_MS);
}

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
  /** ID of the currently executing node (used to show running state without global store subscription) */
  _executingNodeId?: string;
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
  isDraggingFromPanel: boolean;
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
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: ReactFlowConnection) => ConnectionValidation;
  selectNode: (id: string, multi?: boolean) => void;
  clearSelection: () => void;
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void;
  setWorkflowMeta: (meta: { id: string; name: string; version: string }) => void;
  renameWorkflow: (name: string) => Promise<void>;
  markDirty: () => void;
  markClean: () => void;
  setDraggingFromPanel: (dragging: boolean) => void;
  _triggerAutoSave: () => void;
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
  isDraggingFromPanel: false,
  _executionStatus: 'idle',
  _currentNodeId: null,
  _executionAbort: null,

  addNode(type, position) {
    const definition = globalRegistry.getNode(type);
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

    set((state) => ({ nodes: [...state.nodes, newNode] }));
    get()._triggerAutoSave();
  },

  removeNode(id) {
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeIds: state.selectedNodeIds.filter((sid) => sid !== id),
    }));
    get()._triggerAutoSave();
  },

  updateNodePosition(id, position) {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, position } : n
      ),
    }));
    get()._triggerAutoSave();
  },

  updateNodeParams(id, params) {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, params } } : n
      ),
    }));
    get()._triggerAutoSave();
  },

  setNodes(nodes) {
    set({ nodes });
  },

  setEdges(edges) {
    set({ edges });
  },

  onNodesChange(changes) {
    let updatedNodes = get().nodes;
    let selectedIds = get().selectedNodeIds;

    for (const change of changes) {
      if (change.type === 'position' && change.position) {
        updatedNodes = updatedNodes.map((n) =>
          n.id === change.id ? { ...n, position: change.position! } : n
        );
      }
      if (change.type === 'remove') {
        updatedNodes = updatedNodes.filter((n) => n.id !== change.id);
        selectedIds = selectedIds.filter((sid) => sid !== change.id);
      }
    }

    set({ nodes: updatedNodes, selectedNodeIds: selectedIds });
    get()._triggerAutoSave();
  },

  onEdgesChange(changes) {
    let updatedEdges = get().edges;
    let selectedEdgeIds = get().selectedEdgeIds;
    for (const change of changes) {
      if (change.type === 'remove') {
        updatedEdges = updatedEdges.filter((e) => e.id !== change.id);
        selectedEdgeIds = selectedEdgeIds.filter((eid) => eid !== change.id);
      }
    }
    set({ edges: updatedEdges, selectedEdgeIds });
    get()._triggerAutoSave();
  },

  onConnect(connection): ConnectionValidation {
    const { edges, nodes } = get();

    // React Flow Connection uses source/target; normalize to shared-types format
    const sourceId = (connection as unknown as { from?: { nodeId: string } }).from?.nodeId ?? connection.source!;
    const targetId = (connection as unknown as { to?: { nodeId: string } }).to?.nodeId ?? connection.target!;
    const sourcePortId = (connection as unknown as { from?: { port: string } }).from?.port ?? connection.sourceHandle!;
    const targetPortId = (connection as unknown as { to?: { port: string } }).to?.port ?? connection.targetHandle!;

    const sourceNode = nodes.find((n) => n.id === sourceId);
    const targetNode = nodes.find((n) => n.id === targetId);

    if (!sourceNode || !targetNode) {
      return { valid: false, reason: 'Source or target node not found' };
    }

    const sourceDef = sourceNode.data.definition;
    const targetDef = targetNode.data.definition;

    if (!sourceDef || !targetDef) {
      return { valid: false, reason: 'Node definition not found' };
    }

    const sourcePort = findPort(sourceDef.outputs, sourcePortId);

    // Check both static definition inputs and dynamic extraInputs
    const staticInputs = targetDef.inputs;
    const extraInputs = targetNode.data.extraInputs ?? [];
    const targetPort = findPort(staticInputs, targetPortId) ?? findPort(extraInputs, targetPortId);

    if (!sourcePort) {
      return {
        valid: false,
        reason: `Port '${sourcePortId}' not found on source node '${sourceDef.label}'`,
      };
    }
    if (!targetPort) {
      return {
        valid: false,
        reason: `Port '${targetPortId}' not found on target node '${targetDef.label}'`,
      };
    }

    // Resolve dataType — use explicit field, or infer from port name/id
    const rawSourceType = sourcePort.dataType ?? inferPortDataType(sourcePort.name);
    const rawTargetType = targetPort.dataType ?? inferPortDataType(targetPort.name);

    if (!rawSourceType) {
      return {
        valid: false,
        reason: `Cannot determine dataType for source port '${sourcePortId}'`,
      };
    }
    if (!rawTargetType) {
      return {
        valid: false,
        reason: `Cannot determine dataType for target port '${targetPortId}'`,
      };
    }

    const sourceType = rawSourceType as PortDataType;
    const targetType = rawTargetType as PortDataType;

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
        e.source === sourceId &&
        e.target === targetId &&
        e.sourceHandle === sourcePortId &&
        e.targetHandle === targetPortId
    );
    if (exists) {
      return { valid: false, reason: 'Connection already exists' };
    }

    // V6: compute edge color from source port dataType for ComfyUI-style colored cables
    const edgeColor = PORT_TYPE_COLORS[sourceType] ?? '#6b7280';

    const newEdge: CanvasEdge = {
      id: `edge-${crypto.randomUUID()}`,
      source: sourceId,
      sourceHandle: sourcePortId,
      target: targetId,
      targetHandle: targetPortId,
      type: 'default',
      data: { color: edgeColor },
    };

    set((state) => ({ edges: [...state.edges, newEdge] }));
    get()._triggerAutoSave();
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
    }));
    get()._triggerAutoSave();
  },

  removeSelectedEdges() {
    const { selectedEdgeIds } = get();
    if (selectedEdgeIds.length === 0) return;

    set((state) => ({
      edges: state.edges.filter((e) => !selectedEdgeIds.includes(e.id)),
      selectedEdgeIds: [],
    }));
    get()._triggerAutoSave();
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
    set({ workflowMeta: meta, isDirty: true });
    get()._triggerAutoSave();
  },

  async renameWorkflow(name: string): Promise<void> {
    const { workflowMeta } = get();
    const trimmed = name.trim();
    if (!trimmed || trimmed === workflowMeta.name) return;
    set({ workflowMeta: { ...workflowMeta, name: trimmed }, isDirty: true });
    await get().saveWorkflow();
  },

  newWorkflow() {
    // Cancel any in-flight execution before resetting state
    const { _executionAbort } = get();
    if (_executionAbort) {
      _executionAbort();
    }
    cancelAutoSave();
    nodeCounter = 0;
    edgeCounter = 0;
    set({
      nodes: [],
      edges: [],
      groups: [],
      selectedNodeIds: [],
      selectedEdgeIds: [],
      workflowMeta: { id: crypto.randomUUID(), name: 'Untitled Workflow', version: '1.0.0' },
      isDirty: false,
      isDraggingFromPanel: false,
      _executionStatus: 'idle',
      _currentNodeId: null,
      _executionAbort: null,
    });
  },

  markDirty() {
    set({ isDirty: true });
    get()._triggerAutoSave();
  },

  markClean() {
    set({ isDirty: false });
  },

  setDraggingFromPanel(dragging: boolean) {
    set({ isDraggingFromPanel: dragging });
  },

  _triggerAutoSave() {
    const { workflowMeta } = get();
    if (!workflowMeta.id) return;

    scheduleAutoSave(
      workflowMeta.id,
      async () => {
        const { workflowMeta: meta, nodes, edges } = get();
        const workflow: Workflow = {
          id: meta.id,
          name: meta.name,
          version: meta.version,
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
          metadata: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        };
        await activeStorageAdapter.save(workflow);
      },
      () => {
        set({ isDirty: false });
      }
    );
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
    cancelAutoSave();

    const canvasNodes: CanvasNode[] = workflow.nodes.map((n) => {
      const def = globalRegistry.getNode(n.type);
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

    const maxEdgeNum = Math.max(
      0,
      ...workflow.connections.map((e) => {
        const match = e.id.match(/^edge-(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
    );
    edgeCounter = maxEdgeNum;

    set({
      nodes: canvasNodes,
      edges: canvasEdges,
      groups: [],
      workflowMeta: { id: workflow.id, name: workflow.name, version: workflow.version },
      selectedNodeIds: [],
      isDirty: true,
      isDraggingFromPanel: false,
      _executionStatus: 'idle',
      _currentNodeId: null,
    });
  },

  async saveWorkflow(workflowName?: string): Promise<void> {
    cancelAutoSave();
    const { workflowMeta } = get();

    const existing = await activeStorageAdapter.load(workflowMeta.id).catch(() => null);
    const createdAt = existing?.metadata?.createdAt ?? new Date().toISOString();

    // Increment version number on each save
    const currentVersionParts = workflowMeta.version.split('.');
    const major = parseInt(currentVersionParts[0] || '1', 10);
    const minor = parseInt(currentVersionParts[1] || '0', 10) + 1;
    const newVersion = `${major}.${minor}.0`;

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
      connections: get().edges
        .filter((e) => e.sourceHandle && e.targetHandle)
        .map((e): Connection => ({
          id: e.id,
          from: {
            nodeId: e.source,
            port: e.sourceHandle!,
          },
          to: {
            nodeId: e.target,
            port: e.targetHandle!,
          },
        })),
      inputs: [],
      outputs: [],
      metadata: {
        createdAt,
        updatedAt: new Date().toISOString(),
      },
    };

    await activeStorageAdapter.save(workflow);
    set({
      workflowMeta: { ...workflowMeta, name: workflow.name, version: newVersion },
      isDirty: false,
      isDraggingFromPanel: false,
    });
  },

  async loadWorkflowFromStore(id: string): Promise<void> {
    const workflow = await activeStorageAdapter.load(id);
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
    const { jsonFileAdapter, activeStorageAdapter } = await import('../storage');
    const workflow = await jsonFileAdapter.importFromFile(file);
    get().loadWorkflow(workflow);
    await activeStorageAdapter.save(workflow);
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

    // Initialize globalRegistry and get executors
    try {
      globalRegistry.initialize();
    } catch (initError) {
      set({
        _executionStatus: 'error' as const,
        _executionAbort: null,
      });
      return {
        status: 'error' as const,
        error: initError instanceof Error ? initError.message : 'Failed to initialize node registry',
      };
    }

    let executors: ReturnType<typeof globalRegistry.getExecutors>;
    try {
      executors = globalRegistry.getExecutors();
    } catch (execError) {
      set({
        _executionStatus: 'error' as const,
        _executionAbort: null,
      });
      return {
        status: 'error' as const,
        error: execError instanceof Error ? execError.message : 'Failed to get executors',
      };
    }

    const { WorkflowExecutor } = await import('@prism/workflow-core');

    const executor = new WorkflowExecutor(executors);
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
              _executingNodeId: progress.currentNodeId,
            },
          };
        }),
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
        data: { ...n.data, executionResult: undefined, executionError: undefined, _executingNodeId: undefined },
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

    set((s) => ({ groups: [...s.groups, group] }));
    get()._triggerAutoSave();
    return id;
  },

  removeGroup(groupId) {
    set((state) => ({
      groups: state.groups.filter((g) => g.id !== groupId),
    }));
    get()._triggerAutoSave();
  },

  updateGroup(groupId, updates) {
    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId ? { ...g, ...updates } : g
      ),
    }));
    get()._triggerAutoSave();
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
    }));
    get()._triggerAutoSave();
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
    }));
    get()._triggerAutoSave();
  },

  pasteNodes(position) {
    const state = get();
    if (!state.clipboard || state.clipboard.length === 0) return;

    const pasteOffset = 40;
    const oldToNewIdMap = new Map<string, string>();

    const newNodes = state.clipboard.map((origNode) => {
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
          // Clear execution state on paste
          executionResult: undefined,
          executionError: undefined,
          bypassed: false,
          minimized: false,
        },
      };
    });

    // Also copy edges between pasted nodes
    const clipboardNodeIds = new Set(state.clipboard.map((n) => n.id));
    const newEdges = state.edges
      .filter((edge) => clipboardNodeIds.has(edge.source) && clipboardNodeIds.has(edge.target))
      .map((edge) => ({
        ...edge,
        id: `edge-${++edgeCounter}`,
        source: oldToNewIdMap.get(edge.source) ?? edge.source,
        target: oldToNewIdMap.get(edge.target) ?? edge.target,
      }));

    set((s) => ({
      nodes: [...s.nodes, ...newNodes],
      edges: [...s.edges, ...newEdges],
      clipboard: newNodes,
    }));
    get()._triggerAutoSave();
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
    }));
    get()._triggerAutoSave();
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
    }));
    get()._triggerAutoSave();
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
    }));
    get()._triggerAutoSave();
  },
}));