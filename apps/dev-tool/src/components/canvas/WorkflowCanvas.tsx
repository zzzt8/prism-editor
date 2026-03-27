// WorkflowCanvas - React Flow canvas wrapper

import React, { useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Connection,
  NodeMouseHandler,
  useReactFlow,
  useOnSelectionChange,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCanvasStore } from '../../store/canvasStore';
import { PrismNode } from '../nodes/PrismNode';
import { PrismEdge } from '../edges/PrismEdge';
import { ConnectionLine } from '../edges/ConnectionLine';
import { CanvasToolbar } from './CanvasToolbar';

const nodeTypes = {
  prismNode: PrismNode,
};

const edgeTypes = {
  default: PrismEdge,
};

export const WorkflowCanvas: React.FC = () => {
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const onNodesChange = useCanvasStore((s) => s.onNodesChange);
  const onEdgesChange = useCanvasStore((s) => s.onEdgesChange);
  const onConnect = useCanvasStore((s) => s.onConnect);
  const addNode = useCanvasStore((s) => s.addNode);
  const selectNode = useCanvasStore((s) => s.selectNode);
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const setViewport = useCanvasStore((s) => s.setViewport);
  const removeSelectedNodes = useCanvasStore((s) => s.removeSelectedNodes);
  const removeSelectedEdges = useCanvasStore((s) => s.removeSelectedEdges);
  const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds);
  const selectedEdgeIds = useCanvasStore((s) => s.selectedEdgeIds);

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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeIds, selectedEdgeIds, removeSelectedNodes, removeSelectedEdges, clearSelection]);

  const handleConnect = useCallback(
    (params: Connection) => {
      const success = onConnect({
        id: '',
        from: { nodeId: params.source, port: params.sourceHandle ?? 'out' },
        to: { nodeId: params.target, port: params.targetHandle ?? 'in' },
      });

      if (!success) {
        // Connection was rejected by validation (type mismatch or duplicate)
        // React Flow will still show the temporary line — it will disappear automatically
      }
    },
    [onConnect]
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const nodeType = event.dataTransfer.getData('application/prism-node-type');
      if (!nodeType) return;

      const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
      // Convert screen coordinates to flow coordinates
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      addNode(nodeType, { x: position.x - 80, y: position.y - 20 });
    },
    [reactFlowInstance, addNode]
  );

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      // Shift+click for multi-select is handled by React Flow internally
      // We use selectionOnDrag + multiSelectionKeyCode for box multi-select
      // Single click: selectNode replaces selection
      selectNode(node.id);
    },
    [selectNode]
  );

  // Mark selected state on nodes for PrismNode styling
  const nodesWithSelection = nodes.map((n) => ({
    ...n,
    selected: selectedNodeIds.includes(n.id),
  }));

  return (
    <div className="workflow-canvas-container">
      <ReactFlow
        nodes={nodesWithSelection}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onNodeClick={handleNodeClick}
        onPaneClick={() => clearSelection()}
        onMoveEnd={onMoveEnd}
        nodeTypes={nodeTypes}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        edgeTypes={edgeTypes as any}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        multiSelectionKeyCode="Shift"
        selectionOnDrag
        panOnScroll
        zoomOnScroll
        zoomOnPinch
        panOnDrag={[1, 2]}
        connectionRadius={30}
        defaultEdgeOptions={{ type: 'default', animated: false, markerEnd: MarkerType.ArrowClosed }}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        connectionLineComponent={ConnectionLine as any}
      >
        <Background gap={16} size={1} color="#2a2a35" />
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
    </div>
  );
};
