// Custom Prism node component for React Flow

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { CanvasNodeData } from '../../store/canvasStore';

const categoryColors: Record<string, string> = {
  input: '#22c55e',
  transform: '#3b82f6',
  mask: '#f59e0b',
  composite: '#8b5cf6',
  output: '#ef4444',
};

interface PrismNodeProps {
  data: CanvasNodeData;
  selected?: boolean;
}

export const PrismNode = memo(({ data, selected }: PrismNodeProps) => {
  const definition = data.definition;
  const categoryColor = definition
    ? categoryColors[definition.category] ?? '#6b7280'
    : '#6b7280';

  return (
    <div
      className={`prism-node ${selected ? 'selected' : ''}`}
      style={{ borderColor: selected ? categoryColor : '#3a3a50' }}
    >
      {/* Header */}
      <div
        className="prism-node-header"
        style={{ backgroundColor: categoryColor }}
      >
        <span className="prism-node-label">{data.label}</span>
      </div>

      {/* Input handles */}
      {definition?.inputs.map((input, idx) => (
        <Handle
          key={input.id}
          type="target"
          position={Position.Left}
          id={input.id}
          title={input.name}
          className="prism-handle"
          style={{ top: `${20 + idx * 20}px` }}
        />
      ))}

      {/* Output handles */}
      {definition?.outputs.map((output, idx) => (
        <Handle
          key={output.id}
          type="source"
          position={Position.Right}
          id={output.id}
          title={output.name}
          className="prism-handle"
          style={{ top: `${20 + idx * 20}px` }}
        />
      ))}

      {/* Body */}
      <div className="prism-node-body">
        {data.executionError ? (
          <div className="prism-node-error" title={data.executionError}>
            <span className="prism-node-icon">⚠</span>
            <span className="prism-node-error-text">执行失败</span>
          </div>
        ) : null}
        {((): boolean => {
          const result = data.executionResult as Record<string, unknown> | undefined;
          return !!(result && result['crossOriginWarning']);
        })() ? (
          <div className="prism-node-warning" title={(data.executionResult as Record<string, unknown>)['crossOriginWarning'] as string}>
            <span className="prism-node-icon">⚡</span>
            <span className="prism-node-warning-text">跨域警告</span>
          </div>
        ) : null}
        {definition?.description ? (
          <span className="prism-node-description">
            {definition.description}
          </span>
        ) : (
          <span className="prism-node-type-tag">{data.nodeType}</span>
        )}
      </div>
    </div>
  );
});

PrismNode.displayName = 'PrismNode';
