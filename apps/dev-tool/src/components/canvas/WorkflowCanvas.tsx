// WorkflowCanvas - React Flow canvas wrapper

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
  useOnSelectionChange,
  MarkerType,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCanvasStore, type ConnectionValidation } from '../../store/canvasStore';
import { PrismNode } from '../nodes/PrismNode';
import { PreviewImageNode } from '../nodes/PreviewImageNode';
import { GroupNode } from '../nodes/GroupNode';
import { PrismEdge } from '../edges/PrismEdge';
import { ConnectionLine } from '../edges/ConnectionLine';
import { CanvasToolbar } from './CanvasToolbar';
import { NodeSearchModal } from './NodeSearchModal';
import { NodeContextMenu } from './NodeContextMenu';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: Record<string, any> = {
  prismNode: PrismNode,
  previewImageNode: PreviewImageNode,
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

  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const onConnectStore = useCanvasStore((s) => s.onConnect);
  const addNode = useCanvasStore((s) => s.addNode);
  const selectNode = useCanvasStore((s) => s.selectNode);
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const setViewport = useCanvasStore((s) => s.setViewport);
  const removeSelectedNodes = useCanvasStore((s) => s.removeSelectedNodes);
  const removeSelectedEdges = useCanvasStore((s) => s.removeSelectedEdges);
  const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds);
  const selectedEdgeIds = useCanvasStore((s) => s.selectedEdgeIds);
  const groups = useCanvasStore((s) => s.groups);
  const addGroup = useCanvasStore((s) => s.addGroup);
  const contextMenu = useCanvasStore((s) => s.contextMenu);
  const setContextMenu = useCanvasStore((s) => s.setContextMenu);

  // ✅ Per React Flow docs: use applyNodeChanges/applyEdgeChanges to merge ALL change types
  // (position, dimensions, select, remove, etc.). This is REQUIRED for React Flow internals.
  const onNodesChange = useCallback(
    (changes) => {
      useCanvasStore.setState((state) => ({
        nodes: applyNodeChanges(changes, state.nodes),
        isDirty: true,
      }));
    },
    []
  );

  const onEdgesChange = useCallback(
    (changes) => {
      useCanvasStore.setState((state) => ({
        edges: applyEdgeChanges(changes, state.edges),
        isDirty: true,
      }));
    },
    []
  );

  const [validationError, setValidationError] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const reactFlowInstance = useReactFlow();

  // Track viewport zoom changes
  const onMoveEnd = useCallback(
    (_evt: unknown, viewport: { x: number; y: number; zoom: number }) => {
      setViewport(viewport);
    },
    [setViewport]
  );

  // Sync React Flow's selection state into our store
  useOnSelectionChange({
    onChange: ({ nodes: selectedNodes, edges: selectedEdges }) => {
      const nodeIds = selectedNodes.map((n) => n.id);
      const edgeIds = selectedEdges.map((e) => e.id);
      useCanvasStore.setState({ selectedNodeIds: nodeIds, selectedEdgeIds: edgeIds });
    },
  });

  // Keyboard: Delete/Backspace removes selected nodes or edges
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

        if (selectedEdgeIds.length > 0) {
          removeSelectedEdges();
          return;
        }
        if (selectedNodeIds.length > 0) {
          removeSelectedNodes();
        }
      }
      if (e.key === 'Escape') {
        clearSelection();
      }
      // Ctrl+G / G → create group from selected nodes
      if (e.key === 'g' || e.key === 'G') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        if (selectedNodeIds.length >= 2) {
          addGroup(`Group ${Date.now() % 1000}`, selectedNodeIds);
        }
      }
      // Ctrl+C → copy selected nodes
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        if (selectedNodeIds.length > 0) {
          useCanvasStore.getState().copyNodes(selectedNodeIds);
        }
      }
      // Ctrl+X → cut selected nodes
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        if (selectedNodeIds.length > 0) {
          useCanvasStore.getState().cutNodes(selectedNodeIds);
        }
      }
      // Ctrl+V → paste nodes
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        // Paste near the viewport center
        useCanvasStore.getState().pasteNodes({ x: 400, y: 300 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeIds, selectedEdgeIds, removeSelectedNodes, removeSelectedEdges, clearSelection, addGroup]);

  // 调试日志：打印 nodes 全量数据
  useEffect(() => {
    console.log('[DBG WorkflowCanvas] nodes:', JSON.stringify(nodes.map(n => ({
      id: n.id, type: n.type, position: n.position,
      label: n.data.label, nodeType: n.data.nodeType,
      hasDefinition: !!n.data.definition,
    })), null, 2));
  }, [nodes]);

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

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // 诊断：打印 drop 时的坐标信息
  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const nodeType = event.dataTransfer.getData('application/prism-node-type');
      if (!nodeType) {
        console.warn('[DBG Drop] No nodeType in dataTransfer!');
        return;
      }

      // 诊断坐标
      const screenPos = { x: event.clientX, y: event.clientY };
      const flowPos = reactFlowInstance.screenToFlowPosition(screenPos);
      console.log('[DBG Drop]', {
        screenPos,
        flowPos,
        'position - 80,-20': { x: flowPos.x - 80, y: flowPos.y - 20 },
        nodeType,
      });

      // 临时：固定位置测试
      const finalPos = { x: 300, y: 200 };
      console.log('[DBG Drop] Using FIXED position:', finalPos);
      addNode(nodeType, finalPos);
    },
    [reactFlowInstance, addNode]
  );

  // selected state is managed by React Flow via applyNodeChanges — do NOT override manually
  // Ctrl+click on a node toggles its selection (multi-select)
  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const isCtrlPressed = _event.ctrlKey || _event.metaKey;
      selectNode(node.id, isCtrlPressed);
    },
    [selectNode]
  );

  // Merge group nodes into the React Flow nodes array
  // GroupNodes are positioned at group.bounds and have pointer-events: none
  // so clicks pass through to actual child nodes
  const reactFlowNodes = useMemo(() => {
    const groupNodes: import('@xyflow/react').Node[] = groups.map((g) => ({
      id: g.id,
      type: 'groupNode',
      position: { x: g.bounds.x, y: g.bounds.y },
      data: { group: g },
      // Group nodes are not selectable/draggable by React Flow directly;
      // dragging is handled by GroupNode's internal mouse events
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
            position: 'absolute',
            bottom: 60,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#ef4444',
            color: 'white',
            padding: '8px 16px',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            maxWidth: 300,
            textAlign: 'center',
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
