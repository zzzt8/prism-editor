// Custom connection line - shows valid/invalid connection preview

import React, { memo } from 'react';
import { getStraightPath } from '@xyflow/react';
import type { ConnectionLineComponentProps } from '@xyflow/react';

export const ConnectionLine = memo(({
  fromX,
  fromY,
  toX,
  toY,
}: ConnectionLineComponentProps) => {
  const [path] = getStraightPath({
    sourceX: fromX,
    sourceY: fromY,
    targetX: toX,
    targetY: toY,
  });

  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke="#6366f1"
        strokeWidth={2}
        strokeDasharray="5 5"
        opacity={0.6}
        style={{ pointerEvents: 'none' }}
      />
    </g>
  );
});

ConnectionLine.displayName = 'ConnectionLine';
