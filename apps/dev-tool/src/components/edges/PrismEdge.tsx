// Custom edge component for React Flow with type-based coloring
//
// Design spec: openspec/changes/node-editor-comfyui-refactor/design.md
// Decision 2: Port type colors — edge stroke color matches source port dataType
//
// V6 rewrite: horizontal bezier (type 'default') + SVG drop-shadow + hover glow
//   → getBezierPath gives smooth horizontal curves matching ComfyUI's aesthetic
//   → drop-shadow simulates the thick black outline visible on dark grids
//   → hover/selected state thickens stroke and adds a color-matched glow
//   → Edge color is stored at creation time in edge.data.color (canvasStore.ts onConnect)
//
// Mandatory Rule R1: sourceHandleId = port.id from NodeDefinition.outputs

import React, { memo, useState } from 'react';
import {
  BaseEdge,
  EdgeProps,
  getBezierPath,
} from '@xyflow/react';

// V6 SVG filter IDs are scoped per-edge so multiple edges don't share one filter
function buildFilterId(id: string) {
  return `prism-edge-shadow-${id}`;
}

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
  } = props;

  const [hovered, setHovered] = useState(false);

  // V6: color is pre-computed and stored on edge data at creation time (canvasStore.ts onConnect)
  // This avoids needing to look up the source node inside the edge renderer
  const typeColor: string = (props.data as { color?: string } | undefined)?.color ?? '#6b7280';

  const isHighlighted = selected || hovered;
  const strokeWidth = isHighlighted ? 4 : 3;
  const filterId = buildFilterId(id);

  // Horizontal bezier — ComfyUI style: smooth horizontal curves with no sharp turns
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.35, // moderate curve — not too flat, not too bouncy
  });

  return (
    <>
      {/* SVG defs — drop-shadow filter scoped to this edge instance */}
      <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}>
        <defs>
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
            {/* V6 ComfyUI-style outer shadow — thick dark outline gives edges
                the "floating cable" look on dark backgrounds */}
            <feDropShadow dx="0" dy="1" stdDeviation="1.8" floodColor="#000000" floodOpacity="0.92" result="outer" />
            <feDropShadow dx="0" dy="-1" stdDeviation="1.2" floodColor="#000000" floodOpacity="0.6" result="inner-top" />
            {/* Merge shadow layers with the source graphic */}
            <feMerge>
              <feMergeNode in="outer" />
              <feMergeNode in="inner-top" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* Invisible wider path for hover detection */}
      <path
        id={`${id}-hitarea`}
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ cursor: 'pointer' }}
      />

      {/* Main visible edge path — base layer with drop-shadow */}
      <BaseEdge
        id={id}
        path={edgePath}
        className={`prism-edge${isHighlighted ? ' prism-edge--highlighted' : ''}`}
        style={{
          stroke: typeColor,
          strokeWidth,
          // V6: apply SVG drop-shadow filter for the "cable outline" look
          filter: isHighlighted
            ? `url(#${filterId}) drop-shadow(0 0 5px ${typeColor}) drop-shadow(0 0 10px ${typeColor}66)`
            : `url(#${filterId})`,
          transition: 'stroke-width 0.15s ease, filter 0.15s ease',
        }}
      />
    </>
  );
});

PrismEdge.displayName = 'PrismEdge';
