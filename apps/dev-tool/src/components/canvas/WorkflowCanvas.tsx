// WorkflowCanvas - React Flow canvas wrapper
//
// Composed from focused hooks:
//   useCanvasDragDrop.ts      — file drag & drop
//   useCanvasKeyboard.ts     — keyboard shortcuts
//   useCanvasSelectionSync.ts — selection state sync
//   useCanvasDebugLog.ts     — debug logging

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
import { useCanvasSelectionSync } from './useCanvasSelectionSync';
import { useCanvasDebugLog } from './useCanvasDebugLog';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: Record<string, any> = {
  prismNode: PrismNode,
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

  // Apply focused hooks
  const { handleDragOver, handleDrop } = useCanvasDragDrop(reactFlowInstance);
  useCanvasKeyboard();
  useCanvasSelectionSync();
  useCanvasDebugLog();

  // React Flow change handlers
  const onNodesChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (changes: any[]) => {
      useCanvasStore.setState((state) => ({
        nodes: applyNodeChanges(changes, state.nodes) as CanvasNode[],
        isDirty: true,
      }));
    },
    []
  );

  const onEdgesChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (changes: any[]) => {
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
    },
    [setViewport]
  );

  const handleConnect = useCallback(
    (params: Connection) => {
      const validation: ConnectionValidation = onConnectStore({
        id: '',
        from: { nodeId: params.source, port: params.sourceHandle ?? 'out' },
        to: { nodeId: params.target, port: params.targetHandle ?? 'in' },
      });

      if (!validation.valid) {
        setValidationError(validation.reason ?? 'Connection rejected');
        setTimeout(() => setValidationError(null), 3000);
      }
    },
    [onConnectStore]
  );

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const isCtrlPressed = _event.ctrlKey || _event.metaKey;
      selectNode(node.id, isCtrlPressed);
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

  const handlePaneClick = useCallback(
    () => {
      clearSelection();
      setContextMenu(null);
    },
    [clearSelection, setContextMenu]
  );

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, _node: import('@xyflow/react').Node) => {
      event.preventDefault();
      event.stopPropagation();
      setContextMenu({ x: event.clientX, y: event.clientY, nodeId: _node.id });
    },
    [setContextMenu]
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

  return (
    <CanvasErrorBoundary>
    <div ref={containerRef} className="workflow-canvas-container">
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
        onNodeContextMenu={handleNodeContextMenu}
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
          color="var(--canvas-grid-color, #2A2A2D)"
        />
        <Controls position="bottom-right" showInteractive={false} />
        <MiniMap
          position="bottom-left"
          nodeColor="#3a3a50"
          maskColor="rgba(0,0,0,0.6)"
          pannable
          zoomable
        />
      </ReactFlow>
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
