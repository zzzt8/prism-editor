// Custom connection line - shows valid/invalid connection preview with type info

import React, { memo, useMemo } from 'react';
import { getStraightPath, type ConnectionLineComponentProps } from '@xyflow/react';
import { getPortTypeStyle, PORT_TYPE_COLORS } from '../../utils/portTypeStyles';
import { createRegistry } from '@prism/node-definitions';
import type { PortDataType } from '@prism/shared-types';

export const ConnectionLine = memo(({
  fromX,
  fromY,
  toX,
  toY,
  fromHandle,
  fromNode,
}: ConnectionLineComponentProps) => {
  const [path] = getStraightPath({
    sourceX: fromX,
    sourceY: fromY,
    targetX: toX,
    targetY: toY,
  });

  // Determine port type info for label display
  const { color, label } = useMemo(() => {
    if (!fromHandle || !fromNode) {
      return { color: '#a855f7', label: '' };
    }

    const registry = createRegistry();
    const nodeData = fromNode.data as { nodeType?: string };
    const nodeType = nodeData?.nodeType ?? '';

    const def = registry.get(nodeType);
    if (!def) return { color: '#a855f7', label: '' };

    // fromHandle.id is the port id
    const handleId = fromHandle.id;
    if (!handleId) return { color: '#a855f7', label: '' };

    const outputPort = def.outputs.find(
      (o) => o.id === handleId || o.name === handleId
    );
    if (!outputPort) return { color: '#a855f7', label: '' };

    const portColor = PORT_TYPE_COLORS[outputPort.dataType as PortDataType] ?? '#6b7280';
    const style = getPortTypeStyle(outputPort.dataType as PortDataType);
    return { color: portColor, label: style.shortLabel };
  }, [fromHandle, fromNode]);

  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2;

  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeDasharray="5 5"
        opacity={0.8}
        style={{ pointerEvents: 'none' }}
      />
      {label && (
        <foreignObject
          x={midX - 20}
          y={midY - 10}
          width={40}
          height={20}
          style={{ pointerEvents: 'none', overflow: 'visible' }}
        >
          <div
            style={{
              backgroundColor: color,
              color: '#fff',
              borderRadius: 6,
              padding: '1px 6px',
              fontSize: 10,
              fontWeight: 600,
              fontFamily: 'monospace',
              display: 'inline-block',
              lineHeight: '16px',
              textAlign: 'center',
              boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </div>
        </foreignObject>
      )}
    </g>
  );
});

ConnectionLine.displayName = 'ConnectionLine';
