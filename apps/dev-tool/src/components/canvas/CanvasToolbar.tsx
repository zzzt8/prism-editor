// Canvas toolbar - floating toolbar for canvas actions

import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';

export const CanvasToolbar: React.FC = () => {
  const nodes = useCanvasStore((s) => s.nodes);
  const isDirty = useCanvasStore((s) => s.isDirty);
  const zoom = useCanvasStore((s) => s.viewport.zoom);

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div className="canvas-toolbar">
      <span className="canvas-toolbar-info">
        {nodes.length} 个节点
        {isDirty && <span className="dirty-indicator">●</span>}
      </span>
      <span className="canvas-toolbar-zoom">{zoomPercent}%</span>
    </div>
  );
};
