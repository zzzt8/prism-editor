// Custom edge component for React Flow with type-based coloring

import React, { memo, useState } from 'react';
import {
  BaseEdge,
  EdgeProps,
  getSmoothStepPath,
  MarkerType,
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

  const [hovered, setHovered] = useState(false);
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  const isHighlighted = selected || hovered;

  return (
    <>
      {/* Invisible wider path for hover detection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ cursor: 'pointer' }}
      />
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          stroke: isHighlighted ? '#6366f1' : '#3a3a50',
          strokeWidth: isHighlighted ? 2.5 : 1.5,
          transition: 'stroke 0.15s, stroke-width 0.15s',
        }}
      />
    </>
  );
});

PrismEdge.displayName = 'PrismEdge';
