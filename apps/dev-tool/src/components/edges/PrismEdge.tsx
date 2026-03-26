// Custom edge component for React Flow with type-based coloring

import React, { memo } from 'react';
import {
  BaseEdge,
  EdgeProps,
  getSmoothStepPath,
} from '@xyflow/react';

export const PrismEdge = memo((props: EdgeProps) => {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    selected,
    style,
  } = props;

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        ...style,
        stroke: selected ? '#6366f1' : '#3a3a50',
        strokeWidth: selected ? 2.5 : 1.5,
        transition: 'stroke 0.15s, stroke-width 0.15s',
      }}
    />
  );
});

PrismEdge.displayName = 'PrismEdge';
