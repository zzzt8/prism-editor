// useCanvasSelectionSync — syncs React Flow selection state into the canvas store

import { useEffect } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { useOnSelectionChange } from '@xyflow/react';

export function useCanvasSelectionSync() {
  useOnSelectionChange({
    onChange: ({ nodes: selectedNodes, edges: selectedEdges }) => {
      const nodeIds = selectedNodes.map((n) => n.id);
      const edgeIds = selectedEdges.map((e) => e.id);
      useCanvasStore.setState({ selectedNodeIds: nodeIds, selectedEdgeIds: edgeIds });
    },
  });
}
