// Custom Prism node component for React Flow
//
// Enhancements over the basic node:
// - Parameter summary row showing key param values
// - Port connection status (which ports are wired)
// - Execution status indicator (idle / running / done / error)
// - Execution result thumbnail when available
// - Category-based visual accent via CSS classes

import React, { memo, useMemo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useCanvasStore } from '../../store/canvasStore';
import type { CanvasNodeData } from '../../store/canvasStore';
import { NodePreviewModal } from '../canvas/NodePreviewModal';

const CATEGORY_COLORS: Record<string, string> = {
  input:    '#22c55e',
  transform: '#3b82f6',
  mask:     '#f59e0b',
  composite: '#8b5cf6',
  output:   '#ef4444',
};

const CATEGORY_ICONS: Record<string, string> = {
  input:    '↓',
  transform: '↔',
  mask:     '◐',
  composite: '⊕',
  output:   '↑',
};

interface PrismNodeProps {
  id: string;
  data: CanvasNodeData;
  selected?: boolean;
}

export const PrismNode = memo(({ id, data, selected }: PrismNodeProps) => {
  const definition = data.definition;
  const currentNodeId = useCanvasStore((s) => s._currentNodeId);

  const categoryColor = definition
    ? (CATEGORY_COLORS[definition.category] ?? '#6b7280')
    : '#6b7280';

  const categoryIcon = definition
    ? (CATEGORY_ICONS[definition.category] ?? '◈')
    : '◈';

  // Build a map of param id → current value for display
  const paramSummary = useMemo(() => {
    if (!definition) return [];
    return definition.params
      .filter((p) => {
        const val = data.params[p.id];
        return val !== undefined && val !== '' && val !== null && val !== p.default;
      })
      .map((p) => ({
        label: p.name,
        value: data.params[p.id],
      }));
  }, [definition, data.params]);

  // Determine execution status (idle / running / done / error)
  const execStatus = data.executionError
    ? 'error'
    : data.executionResult
    ? 'done'
    : currentNodeId === id
    ? 'running'
    : 'idle';

  // Build thumbnail from execution result (image output port)
  const thumbnail = useMemo(() => {
    if (!data.executionResult) return null;
    const imageKey = definition?.outputs.find(
      (o) => o.type === 'image' || o.type === 'mask'
    )?.id;
    if (!imageKey) return null;
    const imgData = data.executionResult[imageKey] as ImageData | undefined;
    if (!imgData || !imgData.width || !imgData.height) return null;
    if (imgData.width * imgData.height > 512 * 512) return null;
    try {
      const canvas = document.createElement('canvas');
      const scale = Math.min(80 / imgData.width, 40 / imgData.height, 1);
      canvas.width = Math.round(imgData.width * scale);
      canvas.height = Math.round(imgData.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.imageSmoothingEnabled = imgData.width <= 80 && imgData.height <= 40;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = imgData.width;
      tempCanvas.height = imgData.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return null;
      tempCtx.putImageData(imgData, 0, 0);
      ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/png');
    } catch {
      return null;
    }
  }, [data.executionResult, definition]);

  // Full-size image for preview modal
  const previewImage = useMemo(() => {
    if (!data.executionResult) return null;
    const imageKey = definition?.outputs.find(
      (o) => o.type === 'image' || o.type === 'mask'
    )?.id;
    if (!imageKey) return null;
    const imgData = data.executionResult[imageKey] as ImageData | undefined;
    if (!imgData || !imgData.width || !imgData.height) return null;
    const MAX_PREVIEW = 800;
    const scale = Math.min(1, MAX_PREVIEW / Math.max(imgData.width, imgData.height));
    try {
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(imgData.width * scale);
      canvas.height = Math.round(imgData.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.imageSmoothingEnabled = false;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = imgData.width;
      tempCanvas.height = imgData.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return null;
      tempCtx.putImageData(imgData, 0, 0);
      ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/png');
    } catch {
      return null;
    }
  }, [data.executionResult, definition]);

  const [showPreview, setShowPreview] = useState(false);

  return (
    <div
      className={`prism-node prism-node--${execStatus} ${selected ? 'selected' : ''}`}
      style={{
        borderColor: selected ? categoryColor : undefined,
        '--node-color': categoryColor,
      } as React.CSSProperties}
    >
      {/* Header */}
      <div
        className="prism-node-header"
        style={{ backgroundColor: categoryColor }}
      >
        <span className="prism-node-icon">{categoryIcon}</span>
        <span className="prism-node-label">{data.label}</span>
        {execStatus === 'done' && (
          <span className="prism-node-status prism-node-status--done" title="执行成功">✓</span>
        )}
        {execStatus === 'error' && (
          <span className="prism-node-status prism-node-status--error" title="执行失败">✕</span>
        )}
        {execStatus === 'running' && (
          <span className="prism-node-status prism-node-status--running" title="执行中">●</span>
        )}
      </div>

      {/* Input handles — left side */}
      <div className="prism-node-ports prism-node-ports--input">
        {definition?.inputs.map((input, idx) => (
          <Handle
            key={input.id}
            type="target"
            position={Position.Left}
            id={input.id}
            title={input.name}
            className="prism-handle prism-handle--input"
            style={{ top: `${14 + idx * 18}px` }}
          />
        ))}
      </div>

      {/* Body */}
      <div className="prism-node-body">
        {data.executionError ? (
          <div className="prism-node-error" title={data.executionError}>
            <span className="prism-node-icon-sm">⚠</span>
            <span className="prism-node-msg prism-node-msg--error">
              {data.executionError.length > 40
                ? data.executionError.slice(0, 40) + '…'
                : data.executionError}
            </span>
          </div>
        ) : null}

        {paramSummary.length > 0 && (
          <div className="prism-node-params">
            {paramSummary.slice(0, 3).map((p) => (
              <span key={p.label} className="prism-node-param-chip">
                {p.label}: {String(p.value)}
              </span>
            ))}
          </div>
        )}

        {thumbnail ? (
          <div
            className="prism-node-thumbnail prism-node-thumbnail--clickable"
            title="点击查看大图"
            onClick={() => setShowPreview(true)}
          >
            <img src={thumbnail} alt="节点预览" className="prism-node-thumbnail-img" />
          </div>
        ) : null}

        {showPreview && previewImage && (
          <NodePreviewModal
            imageUrl={previewImage}
            nodeLabel={data.label}
            portName={definition?.outputs.find((o) => o.type === 'image' || o.type === 'mask')?.name ?? '输出'}
            onClose={() => setShowPreview(false)}
          />
        )}

        <div className="prism-node-meta">
          {definition?.description ? (
            <span className="prism-node-description" title={definition.description}>
              {definition.description.length > 32
                ? definition.description.slice(0, 32) + '…'
                : definition.description}
            </span>
          ) : (
            <span className="prism-node-type-tag">{data.nodeType}</span>
          )}
        </div>
      </div>

      {/* Output handles — right side */}
      <div className="prism-node-ports prism-node-ports--output">
        {definition?.outputs.map((output, idx) => (
          <Handle
            key={output.id}
            type="source"
            position={Position.Right}
            id={output.id}
            title={output.name}
            className="prism-handle prism-handle--output"
            style={{ top: `${14 + idx * 18}px` }}
          />
        ))}
      </div>
    </div>
  );
});

PrismNode.displayName = 'PrismNode';

