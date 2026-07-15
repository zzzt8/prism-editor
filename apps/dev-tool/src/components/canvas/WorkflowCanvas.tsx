// WorkflowCanvas - React Flow canvas wrapper
//
// Composed from focused hooks:
//   useCanvasDragDrop.ts      — file drag & drop
//   useCanvasKeyboard.ts     — keyboard shortcuts
//   useCanvasSelectionSync.ts — selection state sync

import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Connection,
  NodeMouseHandler,
  useReactFlow,
  MarkerType,
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCanvasStore, type ConnectionValidation, type CanvasNode, type CanvasEdge } from '../../store/canvasStore';
import { PrismNode } from '../nodes/PrismNode';
import { GroupNode } from '../nodes/GroupNode';
import { PrismEdge } from '../edges/PrismEdge';
import { ConnectionLine } from '../edges/ConnectionLine';
import { CanvasToolbar } from './CanvasToolbar';
import { NodeSearchModal } from './NodeSearchModal';
import { NodeContextMenu } from './NodeContextMenu';
import { useCanvasDragDrop } from './useCanvasDragDrop';
import { useCanvasKeyboard } from './useCanvasKeyboard';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: Record<string, any> = {
  prismNode: PrismNode, // Memoized in the component file
  groupNode: GroupNode,
};

const edgeTypes = {
  default: PrismEdge,
};

class CanvasErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }
  static getDerivedStateFromError(e: Error) {
    return { hasError: true, error: e.message + '\n' + (e.stack ?? '') };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: '#ff6b6b', backgroundColor: '#1a0000', fontFamily: 'monospace', fontSize: 12 }}>
          <h3>Canvas Error!</h3>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{this.state.error}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export const WorkflowCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();

  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const onConnectStore = useCanvasStore((s) => s.onConnect);
  const selectNode = useCanvasStore((s) => s.selectNode);
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const setViewport = useCanvasStore((s) => s.setViewport);
  const groups = useCanvasStore((s) => s.groups);
  const contextMenu = useCanvasStore((s) => s.contextMenu);
  const setContextMenu = useCanvasStore((s) => s.setContextMenu);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const validationErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Apply focused hooks
  const { handleDragOver, handleDrop } = useCanvasDragDrop(reactFlowInstance);
  useCanvasKeyboard();

  // ── Native contextmenu interceptor ───────────────────────────────────────────
  // React 18 事件委托模型中，JSX onContextMenu 的 preventDefault()
  // 在 React Flow 内部通过 wrapHandler 包装后可能失效。
  // 改用原生 addEventListener 在 React 外部拦截，绕过事件委托，
  // 确保浏览器原生菜单被阻止。
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const nodeEl = target.closest('[data-node-id]');
      const isInReactFlow = target.closest('.react-flow');

      if (!isInReactFlow) return;

      e.preventDefault();
      e.stopPropagation();

      if (!nodeEl) {
        // 空白画布右键：显示画布级菜单（nodeId = null）
        setContextMenu({ x: e.clientX, y: e.clientY, nodeId: null });
      } else {
        // 节点右键：判断节点是否已在选中列表中
        const nodeId = nodeEl.getAttribute('data-node-id')!;
        const isSelected = useCanvasStore.getState().selectedNodeIds.includes(nodeId);
        // 已选中节点右键 → 用 nodeId: null，让 NodeContextMenu 从 liveSelectedIds 读取
        // 未选中节点右键 → 传入该 nodeId（点击后会先触发 selectNode 使其选中）
        setContextMenu({ x: e.clientX, y: e.clientY, nodeId: isSelected ? null : nodeId });
      }
    };

    document.addEventListener('contextmenu', handler, true); // capture phase
    return () => document.removeEventListener('contextmenu', handler, true);
  }, [setContextMenu]);

  // React Flow change handlers
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Detect drag start (position change with dragging=true) and drag end (dragging=false)
      // to control live execution behavior
      for (const change of changes) {
        if (change.type === 'position') {
          if (change.dragging === true) {
            useCanvasStore.getState().startInteraction();
          } else if (change.dragging === false) {
            useCanvasStore.getState().endInteraction();
          }
        }
      }
      useCanvasStore.setState((state) => ({
        nodes: applyNodeChanges(changes, state.nodes) as CanvasNode[],
        isDirty: true,
      }));
    },
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      useCanvasStore.setState((state) => ({
        edges: applyEdgeChanges(changes, state.edges) as CanvasEdge[],
        isDirty: true,
      }));
    },
    []
  );

  const onMoveEnd = useCallback(
    (_evt: unknown, viewport: { x: number; y: number; zoom: number }) => {
      setViewport(viewport);
      // End any active interaction when panning ends (user might have been dragging nodes)
      const state = useCanvasStore.getState();
      if (state._isInteracting) {
        state.endInteraction();
      }
    },
    [setViewport]
  );

  const handleConnect = useCallback(
    (params: Connection) => {
      const validation: ConnectionValidation = onConnectStore(params);

      if (!validation.valid) {
        // Clear any existing timer before setting new one
        if (validationErrorTimerRef.current) {
          clearTimeout(validationErrorTimerRef.current);
        }
        setValidationError(validation.reason ?? 'Connection rejected');
        validationErrorTimerRef.current = setTimeout(() => {
          setValidationError(null);
          validationErrorTimerRef.current = null;
        }, 3000);
      }
    },
    [onConnectStore]
  );

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const isMulti = _event.ctrlKey || _event.metaKey || _event.shiftKey;
      selectNode(node.id, isMulti);
    },
    [selectNode]
  );

  // Merge group nodes into the React Flow nodes array
  const reactFlowNodes = useMemo(() => {
    const groupNodes: import('@xyflow/react').Node[] = groups.map((g) => ({
      id: g.id,
      type: 'groupNode',
      position: { x: g.bounds.x, y: g.bounds.y },
      data: { group: g },
      draggable: false,
      selectable: false,
    }));
    return [...nodes, ...groupNodes];
  }, [nodes, groups]);

  const isDraggingFromPanel = useCanvasStore((s) => s.isDraggingFromPanel);

  const handlePaneClick = useCallback(
    () => {
      clearSelection();
      setContextMenu(null);
    },
    [clearSelection, setContextMenu]
  );

  // Double-click on canvas pane to open node search
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleDoubleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.react-flow__node') || target.closest('.react-flow__edge')) {
        return;
      }
      setSearchOpen(true);
    };

    container.addEventListener('dblclick', handleDoubleClick);
    return () => container.removeEventListener('dblclick', handleDoubleClick);
  }, []);

  // Cleanup setTimeout on unmount
  useEffect(() => {
    return () => {
      if (validationErrorTimerRef.current) {
        clearTimeout(validationErrorTimerRef.current);
      }
    };
  }, []);

  return (
    <CanvasErrorBoundary>
    <div ref={containerRef} className="workflow-canvas-container" style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        className="dark"
        style={{ width: '100%', height: '100%' }}
        nodes={reactFlowNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onNodeDoubleClick={() => setSearchOpen(true)}
        zoomOnDoubleClick={false}
        onMoveEnd={onMoveEnd}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        snapToGrid
        snapGrid={[16, 16]}
        multiSelectionKeyCode="Ctrl"
        selectionOnDrag
        panOnScroll
        zoomOnScroll
        zoomOnPinch
        panOnDrag
        connectionRadius={30}
        defaultEdgeOptions={{
          type: 'default',
          animated: false,
          markerEnd: MarkerType.ArrowClosed,
          style: { strokeWidth: 3 },
        }}
        connectionLineComponent={ConnectionLine}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.5}
          color="var(--canvas-grid-color, #3f3f46)"
        />
        <Controls position="bottom-right" showInteractive={false} />
        <MiniMap
          position="bottom-left"
          nodeColor="#6B6B8A"
          maskColor="rgba(14, 14, 18, 0.75)"
          pannable
          zoomable
        />
      </ReactFlow>

      {/* Drag-from-panel overlay */}
      {isDraggingFromPanel && (
        <div className="canvas-drag-overlay" aria-hidden="true">
          <div className="canvas-drag-overlay-content">
            <div className="canvas-drag-overlay-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
            <span className="canvas-drag-overlay-label">Drop to create node</span>
          </div>
        </div>
      )}
      <CanvasToolbar />
      {searchOpen && (
        <NodeSearchModal
          onClose={() => setSearchOpen(false)}
        />
      )}
      {validationError && (
        <div
          style={{
            position: 'absolute', bottom: 60,
            left: '50%', transform: 'translateX(-50%)',
            background: '#ef4444', color: 'white',
            padding: '8px 16px', borderRadius: 6,
            fontSize: 13, fontWeight: 500,
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            maxWidth: 300, textAlign: 'center',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          {validationError}
        </div>
      )}
      {contextMenu && (
        <NodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeId={contextMenu.nodeId}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
    </CanvasErrorBoundary>
  );
};
