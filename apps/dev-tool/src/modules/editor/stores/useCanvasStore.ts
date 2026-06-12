// useCanvasStore - Zustand store combining all slices
// Refactored from canvasStore.ts with sliced architecture
// Maintains full backward compatibility with existing UI components

import { create } from 'zustand';
import type { NodeChange, EdgeChange, Connection as RfConnection } from '@xyflow/react';
import type {
  EditorCanvasNode,
  EditorCanvasEdge,
  EditorNodeGroup,
  EditorWorkflowMeta,
  ExecutionProgress,
  SnippetSummary,
} from '@prism/shared-types';
import type { Template } from '@prism/shared-types';
import { canConnectByDataType, PortDataType } from '@prism/shared-types';
import { PORT_TYPE_COLORS } from '../../../utils/portTypeStyles';
import type { ContextMenuState } from './selectionSlice';
import { ExecutionStatus } from './executionSlice';
import type { ExecutionLog, NodeTiming } from '@prism/shared-types';
import { createId } from '@prism/shared-types';
import { globalRegistry } from '@prism/core';
import { autosaveService, initAutosaveService, getAutosaveService } from '../services/autosaveService';
import { getExecutionService } from '../services/executionService';
import { activeStorageAdapter } from '../../../storage';
import { WorkflowRepository } from '../../repositories/workflowRepository';
import {
  createNodeId,
  createEdgeId,
  resetCounters,
  syncCountersFromWorkflow,
} from './idCounter';
import {
  findPort,
  inferPortDataType,
  ensureNodeRegistryInitialized,
  remapAndInsertNodes,
} from './canvasStoreHelpers';

// Re-export ExecutionStatus for backward compatibility (used by store/canvasStore.ts)
export type { ExecutionStatus } from './executionSlice';

type ReactFlowConnection = RfConnection;

// ─── Module-level state for execution ─────────────────────────────────────────

let _currentLog: ExecutionLog | null = null;
const _nodeStartTimes = new Map<string, number>();

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConnectionValidation {
  valid: boolean;
  reason?: string;
  sourceType?: PortDataType;
  targetType?: PortDataType;
}

export type InspectorTab = 'parameters' | 'preview' | 'debug' | 'settings' | 'info';

interface CanvasState {
  // Graph state (graphSlice)
  nodes: EditorCanvasNode[];
  edges: EditorCanvasEdge[];
  groups: EditorNodeGroup[];

  // Selection state (selectionSlice)
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  clipboard: EditorCanvasNode[] | null;
  contextMenu: ContextMenuState | null;

  // Inspector state (inspectorSlice)
  inspectorTab: InspectorTab;

  // Draft state (draftSlice)
  workflowMeta: EditorWorkflowMeta;
  viewport: { x: number; y: number; zoom: number };
  isDraggingFromPanel: boolean;
  isDirty: boolean;

  // Execution state (executionSlice)
  _executionStatus: ExecutionStatus;
  _currentNodeId: string | null;
  _executionAbort: (() => void) | null;
  _executionLog: import('@prism/shared-types').ExecutionLog | null;
  _executionLogs: ExecutionLog[];

  // ── Graph operations ────────────────────────────────────────────────────────

  addNode: (_type: string, _position: { x: number; y: number }) => void;
  removeNode: (_id: string) => void;
  updateNodePosition: (_id: string, _position: { x: number; y: number }) => void;
  updateNodeParams: (_id: string, _params: Record<string, unknown>) => void;
  updateNodeData: (_id: string, _data: Partial<EditorCanvasNode['data']>) => void;
  setNodes: (_nodes: EditorCanvasNode[]) => void;
  setEdges: (_edges: EditorCanvasEdge[]) => void;
  onNodesChange: (_changes: NodeChange[]) => void;
  onEdgesChange: (_changes: EdgeChange[]) => void;
  onConnect: (_connection: ReactFlowConnection) => ConnectionValidation;

  // Group operations
  addGroup: (_label: string, _nodeIds: string[]) => string;
  removeGroup: (_groupId: string) => void;
  updateGroup: (_groupId: string, _updates: Partial<Omit<EditorNodeGroup, 'id'>>) => void;
  moveGroup: (_groupId: string, _deltaX: number, _deltaY: number) => void;

  // ── Selection operations ─────────────────────────────────────────────────────

  selectNode: (_id: string, _multi?: boolean) => void;
  clearSelection: () => void;
  removeSelectedNodes: () => void;
  removeSelectedEdges: () => void;

  // Clipboard operations
  copyNodes: (_nodeIds: string[]) => void;
  cutNodes: (_nodeIds: string[]) => void;
  pasteNodes: (_position: { x: number; y: number }) => void;

  // Context menu
  setContextMenu: (_menu: ContextMenuState | null) => void;

  // ── Draft operations ─────────────────────────────────────────────────────────

  setViewport: (_viewport: { x: number; y: number; zoom: number }) => void;
  setWorkflowMeta: (_meta: EditorWorkflowMeta) => void;
  renameWorkflow: (_name: string) => Promise<void>;
  setDraggingFromPanel: (_dragging: boolean) => void;
  markDirty: () => void;
  markClean: () => void;

  // ── Workflow operations ──────────────────────────────────────────────────────

  _triggerAutoSave: () => void;
  newWorkflow: () => void;
  toWorkflow: () => import('@prism/shared-types').Workflow;
  loadWorkflow: (_workflow: import('@prism/shared-types').Workflow) => void;
  loadFromTemplate: (_template: Template) => void;
  saveWorkflow: (_workflowName?: string) => Promise<void>;
  loadWorkflowFromStore: (_id: string) => Promise<void>;
  exportWorkflowAsJson: () => Promise<void>;
  importWorkflowFromFile: (_file: File) => Promise<void>;

  // ── Execution operations ─────────────────────────────────────────────────────

  updateNodeExecution: (_id: string, _result?: Record<string, unknown>, _error?: string) => void;
  executeWorkflow: () => Promise<{ status: 'done' | 'error' | 'cancelled'; error?: string }>;
  cancelExecution: () => void;
  clearExecution: () => void;
  recordNodeTiming: (_nodeId: string, _nodeType: string, _duration?: number, _status?: NodeTiming['status']) => void;

  // ── Inspector operations ─────────────────────────────────────────────────────

  openInspector: (_tab: InspectorTab, _nodeId?: string) => void;

  // ── Dynamic extra inputs ────────────────────────────────────────────────────

  addExtraInput: (_nodeId: string, _port: { id: string; name: string; type: 'image'; dataType: PortDataType }) => void;
  removeExtraInput: (_nodeId: string, _portId: string) => void;

  // ── Snippet operations ──────────────────────────────────────────────────────

  snippetSave: (_name: string, _description: string, _selectedNodeIds: string[]) => Promise<void>;
  snippetList: () => Promise<SnippetSummary[]>;
  insertSnippet: (_snippetId: string, _position: { x: number; y: number }) => Promise<void>;
  deleteSnippet: (_id: string) => Promise<void>;
}

// ─── Initialize services ─────────────────────────────────────────────────────

// Create workflow repository for autosave (use activeStorageAdapter for server-first)
const workflowRepository = new WorkflowRepository(activeStorageAdapter);

// Initialize autosave service
const _autosave = autosaveService;
initAutosaveService(workflowRepository);

// ─── Store implementation ─────────────────────────────────────────────────────

export const useCanvasStore = create<CanvasState>((set, get) => ({
  // Initial state - graphSlice
  nodes: [],
  edges: [],
  groups: [],

  // Initial state - selectionSlice
  selectedNodeIds: [],
  selectedEdgeIds: [],
  clipboard: null,
  contextMenu: null,

  // Initial state - inspectorSlice
  inspectorTab: 'parameters',

  // Initial state - draftSlice
      workflowMeta: { id: createId(), name: 'Untitled Workflow', version: '1.0.0' },
      viewport: { x: 0, y: 0, zoom: 1 },
      isDraggingFromPanel: false,
      isDirty: false,

  // Initial state - executionSlice
  _executionStatus: 'idle',
  _currentNodeId: null,
  _executionAbort: null,
  _executionLog: null,
  _executionLogs: [],

  // ── Graph operations ────────────────────────────────────────────────────────

  addNode(type, position) {
    ensureNodeRegistryInitialized();
    const definition = globalRegistry.getNode(type);
    if (!definition) return;

    const id = createNodeId();
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

  updateNodeData(id, data) {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...data } } : n
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

    const newEdge: EditorCanvasEdge = {
      id: `edge-${createId()}`,
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

  // Group operations
  addGroup(label, nodeIds) {
    const id = `group-${Date.now()}`;
    const state = get();
    if (nodeIds.length === 0) return id;

    // Compute bounding box from child nodes
    const groupNodes = state.nodes.filter((n) => nodeIds.includes(n.id));
    if (groupNodes.length === 0) return id;

    const xs = groupNodes.map((n) => n.position.x);
    const ys = groupNodes.map((n) => n.position.y);
    const maxXs = groupNodes.map((n) => n.position.x + 200);
    const maxYs = groupNodes.map((n) => n.position.y + 100);

    const minX = Math.min(...xs) - 24;
    const minY = Math.min(...ys) - 24;
    const width = Math.max(...maxXs) - minX + 24;
    const height = Math.max(...maxYs) - minY + 24;

    const group: EditorNodeGroup = {
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

  // ── Selection operations ───────────────────────────────────────────────────

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

  // Clipboard operations
  copyNodes(nodeIds) {
    const { nodes } = get();
    const nodesToCopy = nodes.filter((n) => nodeIds.includes(n.id));
    set({ clipboard: nodesToCopy });
  },

  cutNodes(nodeIds) {
    const { nodes } = get();
    const nodesToCut = nodes.filter((n) => nodeIds.includes(n.id));
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

    // Extract edges that are within the clipboard
    const clipboardNodeIds = new Set(state.clipboard.map((n) => n.id));
    const clipboardEdges = state.edges.filter(
      (e) => clipboardNodeIds.has(e.source) && clipboardNodeIds.has(e.target)
    );

    const { newNodes, newEdges } = remapAndInsertNodes(state.clipboard, clipboardEdges, position, {
      createNodeId,
      createEdgeId,
    });

    set((s) => ({
      nodes: [...s.nodes, ...newNodes],
      edges: [...s.edges, ...newEdges],
      clipboard: newNodes,
    }));
    get()._triggerAutoSave();
  },

  // Context menu
  setContextMenu(menu) {
    set({ contextMenu: menu });
  },

  // ── Draft operations ───────────────────────────────────────────────────────

  setViewport(viewport) {
    set({ viewport });
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

  setDraggingFromPanel(dragging) {
    set({ isDraggingFromPanel: dragging });
  },

  markDirty() {
    set({ isDirty: true });
    get()._triggerAutoSave();
  },

  markClean() {
    set({ isDirty: false });
  },

  // ── Workflow operations ───────────────────────────────────────────────────

  _triggerAutoSave() {
    const { workflowMeta, nodes, edges } = get();
    if (!workflowMeta.id) return;

    // Use autosave service
    const autosaveSvc = getAutosaveService();
    autosaveSvc.trigger(
      workflowMeta,
      nodes,
      edges,
      () => set({ isDirty: false })
    );
  },

  newWorkflow() {
    // Cancel any in-flight execution before resetting state
    const { _executionAbort } = get();
    if (_executionAbort) {
      _executionAbort();
    }

    // Cancel autosave
    const autosaveSvc = getAutosaveService();
    autosaveSvc.cancel();

    resetCounters();

    set({
      nodes: [],
      edges: [],
      groups: [],
      selectedNodeIds: [],
      selectedEdgeIds: [],
      workflowMeta: { id: createId(), name: 'Untitled Workflow', version: '1.0.0' },
      isDirty: false,
      isDraggingFromPanel: false,
      _executionStatus: 'idle',
      _currentNodeId: null,
      _executionAbort: null,
      _executionLog: null,
      _executionLogs: [],
    });
  },

  toWorkflow(): import('@prism/shared-types').Workflow {
    const { nodes, edges, workflowMeta } = get();

    return {
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
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  },

  loadFromTemplate(template: Template) {
    // Cancel autosave
    const autosaveSvc = getAutosaveService();
    autosaveSvc.cancel();

    ensureNodeRegistryInitialized();

    // Map old node IDs to new ones
    const oldToNewIdMap = new Map<string, string>();

    // Rebuild canvas nodes from template snapshot
    // 1. Assign fresh IDs to avoid collision with existing canvas nodes
    // 2. Re-resolve node definitions from globalRegistry
    // 3. Reset runtime state (executionResult, executionError, etc.)
    const canvasNodes: EditorCanvasNode[] = template.nodes.map((origNode) => {
      const newId = createNodeId();
      oldToNewIdMap.set(origNode.id, newId);

      const def = globalRegistry.getNode(origNode.data.nodeType);
      return {
        ...origNode,
        id: newId,
        type: 'prismNode',
        data: {
          label: origNode.data.label,
          nodeType: origNode.data.nodeType,
          params: origNode.data.params,
          definition: def,
          extraInputs: origNode.data.extraInputs,
          extraOutputs: origNode.data.extraOutputs,
          bypassed: false,
          minimized: origNode.data.minimized,
          pinned: origNode.data.pinned,
        },
      };
    });

    // Rebuild edges with remapped source/target node IDs
    const canvasEdges: EditorCanvasEdge[] = template.edges.map((origEdge) => ({
      ...origEdge,
      id: createEdgeId(),
      source: oldToNewIdMap.get(origEdge.source) ?? origEdge.source,
      target: oldToNewIdMap.get(origEdge.target) ?? origEdge.target,
    }));

    // Rebuild groups with remapped node IDs
    const remappedGroups: EditorNodeGroup[] = template.groups.map((g) => ({
      ...g,
      id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      nodeIds: g.nodeIds
        .map((oldId) => oldToNewIdMap.get(oldId))
        .filter((id): id is string => id !== undefined),
    }));

    // New workflow meta (fresh identity, independent from template snapshot)
    const _now = new Date().toISOString();

    set({
      nodes: canvasNodes,
      edges: canvasEdges,
      groups: remappedGroups,
      workflowMeta: {
        id: createId(),
        name: template.name,
        version: '1.0.0',
      },
      selectedNodeIds: [],
      selectedEdgeIds: [],
      isDirty: true,
      isDraggingFromPanel: false,
      _executionStatus: 'idle',
      _currentNodeId: null,
      _executionAbort: null,
      _executionLog: null,
      _executionLogs: [],
    });
  },

  loadWorkflow(workflow) {
    // Cancel autosave
    const autosaveSvc = getAutosaveService();
    autosaveSvc.cancel();

    ensureNodeRegistryInitialized();

    const canvasNodes: EditorCanvasNode[] = workflow.nodes.map((n) => {
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

    const canvasEdges: EditorCanvasEdge[] = workflow.connections.map((c) => ({
      id: c.id,
      source: c.from.nodeId,
      sourceHandle: c.from.port,
      target: c.to.nodeId,
      targetHandle: c.to.port,
      type: 'default',
    }));

    // Sync counters
    syncCountersFromWorkflow(
      workflow.nodes.map((n) => n.id),
      workflow.connections.map((e) => e.id)
    );

    set({
      nodes: canvasNodes,
      edges: canvasEdges,
      groups: [],
      workflowMeta: {
        id: workflow.id,
        name: workflow.name,
        version: workflow.version,
        targetPlatform: workflow.metadata?.targetPlatform,
        // Preserve publishedId only if loading the same workflow (handles save+load in one action)
        publishedId: workflow.id === get().workflowMeta.id ? get().workflowMeta.publishedId : undefined,
      },
      selectedNodeIds: [],
      isDirty: true,
      isDraggingFromPanel: false,
      _executionStatus: 'idle',
      _currentNodeId: null,
      _executionAbort: null,
      _executionLog: null,
      _executionLogs: [],
    });
  },

  async saveWorkflow(workflowName?: string): Promise<void> {
    // Cancel autosave
    const autosaveSvc = getAutosaveService();
    autosaveSvc.cancel();

    const { workflowMeta, nodes, edges } = get();

    const existing = await workflowRepository.get(workflowMeta.id).catch(() => null);
    const createdAt = existing?.metadata?.createdAt ?? new Date().toISOString();

    // Note: Version is managed by the server. We send the current version as baseRevision
    // for conflict detection, but the server will generate the new version.
    const _baseRevision = workflowMeta.version;

    const workflow: import('@prism/shared-types').Workflow = {
      id: workflowMeta.id,
      name: workflowName ?? workflowMeta.name,
      version: workflowMeta.version,
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.data.nodeType,
        position: n.position,
        params: n.data.params,
      })),
      connections: edges
        .filter((e) => e.sourceHandle && e.targetHandle)
        .map((e) => ({
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

    const saved = await workflowRepository.save(workflow);
    // Sync server-assigned ID back to local state (happens when workflow is created on server)
    const newId = saved?.id ?? workflowMeta.id;

    set({
      workflowMeta: { ...workflowMeta, id: newId, name: workflow.name },
      isDirty: false,
      isDraggingFromPanel: false,
    });
  },

  async loadWorkflowFromStore(id: string): Promise<void> {
    const workflow = await workflowRepository.get(id);
    get().loadWorkflow(workflow);
  },

  async exportWorkflowAsJson(): Promise<void> {
    const { getImportExportService } = await import('../services/importExportService');
    const svc = getImportExportService();
    const { workflowMeta, nodes, edges } = get();
    await svc.exportAsJson(workflowMeta, nodes, edges);
  },

  async importWorkflowFromFile(file: File): Promise<void> {
    const { getImportExportService } = await import('../services/importExportService');
    const svc = getImportExportService();
    const result = await svc.importFromFile(file);
    get().loadWorkflow({
      id: result.workflowMeta.id,
      name: result.workflowMeta.name,
      version: result.workflowMeta.version,
      nodes: result.nodes.map((n: EditorCanvasNode) => ({
        id: n.id,
        type: n.data.nodeType,
        position: n.position,
        params: n.data.params,
      })),
      connections: result.edges.map((e: EditorCanvasEdge) => ({
        id: e.id,
        from: { nodeId: e.source, port: e.sourceHandle ?? '' },
        to: { nodeId: e.target, port: e.targetHandle ?? '' },
      })),
      inputs: [],
      outputs: [],
      metadata: { createdAt: '', updatedAt: '' },
    });
    await workflowRepository.save(get().toWorkflow());
  },

  // ── Execution operations ───────────────────────────────────────────────────

  updateNodeExecution(id, result, error) {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, executionResult: result, executionError: error } }
          : n
      ),
    }));
  },

  async executeWorkflow() {
    let { nodes, workflowMeta, edges } = get();
    if (nodes.length === 0) return { status: 'done' as const };

    // ── ExecutionLog: create record on start ─────────────────────────────────
    const startedAt = Date.now();
    _currentLog = {
      runId: createId(),
      workflowId: workflowMeta.id,
      inputs: {},
      outputs: {},
      status: 'started',
      startedAt,
      nodeTimings: [],
      errors: [],
    };
    _nodeStartTimes.clear();

    // Clear previous execution results and set running state
    set((state) => ({
      nodes: state.nodes.map((n) => ({
        ...n,
        data: { ...n.data, executionResult: undefined, executionError: undefined },
      })),
      _executionStatus: 'running' as const,
      _currentNodeId: null,
    }));

    // Use node list after clear (avoid stale executionResult on references)
    ({ nodes, workflowMeta, edges } = get());

    // Create abort controller for cancellation
    get()._executionAbort?.();
    const controller = new AbortController();
    set({ _executionAbort: () => controller.abort() });

    // Progress callback
    const progressCallback = (progress: ExecutionProgress) => {
      // ── ExecutionLog: record node timing on each progress event ─────────────
      if (_currentLog && progress.currentNodeId) {
        const now = Date.now();
        const node = get().nodes.find((n) => n.id === progress.currentNodeId);
        const nodeType = node?.data.nodeType ?? 'unknown';
        const startTime = _nodeStartTimes.get(progress.currentNodeId) ?? now;
        const duration = now - startTime;

        const existingIdx = _currentLog.nodeTimings.findIndex(
          (t) => t.nodeId === progress.currentNodeId
        );
        const timingStatus = (() => {
          if (progress.results.find((r) => r.nodeId === progress.currentNodeId && r.status === 'done')) return 'done';
          if (progress.results.find((r) => r.nodeId === progress.currentNodeId && r.status === 'error')) return 'error';
          return 'running';
        })();

        if (existingIdx >= 0) {
          _currentLog.nodeTimings[existingIdx] = {
            ..._currentLog.nodeTimings[existingIdx],
            duration,
            status: timingStatus,
            completedAt: timingStatus === 'done' || timingStatus === 'error' ? now : undefined,
          };
        } else {
          _currentLog.nodeTimings.push({
            nodeId: progress.currentNodeId,
            nodeType,
            duration,
            status: timingStatus,
            startedAt: startTime,
            completedAt: timingStatus === 'done' || timingStatus === 'error' ? now : undefined,
          });
          _nodeStartTimes.set(progress.currentNodeId, now);
        }
      }

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

    // Execute using service
    const executionSvc = getExecutionService();
    const result = await executionSvc.execute(
      workflowMeta,
      nodes,
      edges,
      {
        onProgress: progressCallback,
        signal: controller.signal,
      }
    );

    // ── ExecutionLog: finalize on completion ──────────────────────────────────
    if (_currentLog) {
      const completedAt = Date.now();
      _currentLog.completedAt = completedAt;
      _currentLog.duration = completedAt - _currentLog.startedAt;
      _currentLog.status = result.status === 'done' ? 'completed'
        : result.status === 'error' ? 'failed'
        : 'cancelled';

      // Collect outputs from all done nodes
      _currentLog.outputs = Object.fromEntries(
        get().nodes
          .filter((n) => n.data.executionResult)
          .map((n) => [n.id, n.data.executionResult])
      );

      // Record error if execution failed
      if (result.error) {
        _currentLog.errors.push({
          nodeId: '',
          error: result.error,
          timestamp: completedAt,
        });
      }

      // Store log in memory
      set((state) => ({
        _executionLogs: [...state._executionLogs, _currentLog!],
      }));
      _currentLog = null;
      _nodeStartTimes.clear();
    }

    const finalStatus = result.status as 'done' | 'error' | 'cancelled';
    set({ _executionStatus: finalStatus, _currentNodeId: null, _executionAbort: null });
    return { status: finalStatus, error: result.error };
  },

  cancelExecution() {
    const svc = getExecutionService();
    svc.cancel();
  },

  clearExecution() {
    set((state) => ({
      nodes: state.nodes.map((n) => ({
        ...n,
        data: { ...n.data, executionResult: undefined, executionError: undefined, _executingNodeId: undefined },
      })),
      _executionStatus: 'idle' as const,
      _currentNodeId: null,
      _executionAbort: null,
      _executionLog: null,
      _executionLogs: [],
    }));
  },

  recordNodeTiming(nodeId, nodeType, duration, status = 'done') {
    const now = Date.now();
    const timing: NodeTiming = {
      nodeId,
      nodeType,
      duration,
      status,
      startedAt: _nodeStartTimes.get(nodeId) ?? now,
      completedAt: status === 'done' || status === 'error' ? now : undefined,
    };

    if (_currentLog) {
      const existingIdx = _currentLog.nodeTimings.findIndex((t) => t.nodeId === nodeId);
      if (existingIdx >= 0) {
        _currentLog.nodeTimings[existingIdx] = timing;
      } else {
        _currentLog.nodeTimings.push(timing);
      }
    }
  },

  // ── Inspector operations ───────────────────────────────────────────────────

  openInspector(tab, nodeId) {
    set({ inspectorTab: tab });
    if (nodeId) {
      set(() => ({ selectedNodeIds: [nodeId] }));
    }
  },

  // ── Dynamic extra inputs ────────────────────────────────────────────────────

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

  // ── Snippet operations ──────────────────────────────────────────────────────
  // Snippet features removed — stub out
  async snippetSave(_name: string, _description: string, _selectedNodeIds: string[]): Promise<void> {},
  async snippetList(): Promise<never[]> { return []; },
  async insertSnippet(_id: string, _position: { x: number; y: number }): Promise<void> {},
  async deleteSnippet(_id: string): Promise<void> {},
}));
