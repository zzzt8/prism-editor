// Canvas toolbar - floating toolbar for canvas actions

import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { Check, X, AlertCircle } from 'lucide-react';

export const CanvasToolbar: React.FC = () => {
  const nodes = useCanvasStore((s) => s.nodes);
  const isDirty = useCanvasStore((s) => s.isDirty);
  const zoom = useCanvasStore((s) => s.viewport.zoom);
  const executionStatus = useCanvasStore((s) => s._executionStatus);
  const currentNodeId = useCanvasStore((s) => s._currentNodeId);

  const zoomPercent = Math.round(zoom * 100);

  const isRunning = executionStatus === 'running';
  const doneCount = nodes.filter((n) => n.data.executionResult !== undefined).length;
  const runningNode = isRunning && currentNodeId
    ? nodes.find((n) => n.id === currentNodeId)?.data.label
    : null;

  return (
    <div className="canvas-toolbar">
      <span className="canvas-toolbar-info">
        {nodes.length} 个节点
        {isDirty && <span className="dirty-indicator" title="有未保存的更改">●</span>}
      </span>

      {isRunning && (
        <span className="canvas-toolbar-exec canvas-toolbar-exec--running">
          <span className="exec-dot" />
          {runningNode ? `执行中: ${runningNode}` : '执行中…'}
        </span>
      )}

      {(executionStatus === 'done') && (
        <span className="canvas-toolbar-exec canvas-toolbar-exec--done">
          <Check size={12} /> 完成 ({doneCount}/{nodes.length})
        </span>
      )}

      {(executionStatus === 'error') && (
        <span className="canvas-toolbar-exec canvas-toolbar-exec--error">
          <AlertCircle size={12} /> 执行出错
        </span>
      )}

      {(executionStatus === 'cancelled') && (
        <span className="canvas-toolbar-exec canvas-toolbar-exec--cancelled">
          — 已取消
        </span>
      )}

      <span className="canvas-toolbar-zoom">{zoomPercent}%</span>
    </div>
  );
};
