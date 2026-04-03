// GroupNode — visual group container for ComfyUI-style multi-select grouping
//
// Design spec: openspec/changes/node-editor-comfyui-refactor/design.md
// Decision 5: Group structure and behavior
// Confirmed: Group drag title = sync-move all child nodes
//
// GroupNode is rendered as a React Flow custom Node, positioned at group.bounds.
// The header area is draggable — dragging it moves ALL child nodes simultaneously.

import React, { type FC, useCallback, useRef, useState, useEffect } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useCanvasStore, type NodeGroup } from '../../store/canvasStore';

interface GroupNodeData {
  group: NodeGroup;
  [key: string]: unknown;
}

export type GroupNodeType = Node<GroupNodeData, 'groupNode'>;

export const GroupNode: FC<NodeProps<GroupNodeType>> = ({ id, data }) => {
  const { group } = data;
  const moveGroup = useCanvasStore((s) => s.moveGroup);

  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number } | null>(null);

  // Stable refs to hold listener functions so they can be removed on unmount
  const listenersAttachedRef = useRef<{ move?: (e: MouseEvent) => void; up?: (e: MouseEvent) => void } | null>(null);

  // When the group node position changes (via React Flow drag), sync to all child nodes
  // The header is the drag handle — we track mousedown/mouseup to sync child positions
  const handleHeaderMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      dragStartRef.current = { mouseX: e.clientX, mouseY: e.clientY };
      setDragging(true);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!dragStartRef.current) return;
        const deltaX = moveEvent.clientX - dragStartRef.current.mouseX;
        const deltaY = moveEvent.clientY - dragStartRef.current.mouseY;
        if (deltaX !== 0 || deltaY !== 0) {
          moveGroup(group.id, deltaX, deltaY);
          dragStartRef.current = { mouseX: moveEvent.clientX, mouseY: moveEvent.clientY };
        }
      };

      const handleMouseUp = () => {
        dragStartRef.current = null;
        setDragging(false);
        if (listenersAttachedRef.current) {
          document.removeEventListener('mousemove', listenersAttachedRef.current.move!);
          document.removeEventListener('mouseup', listenersAttachedRef.current.up!);
          listenersAttachedRef.current = null;
        }
      };

      listenersAttachedRef.current = { move: handleMouseMove, up: handleMouseUp };
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [group.id, moveGroup]
  );

  // Cleanup on unmount: remove any lingering listeners
  useEffect(() => {
    return () => {
      if (listenersAttachedRef.current) {
        document.removeEventListener('mousemove', listenersAttachedRef.current.move!);
        document.removeEventListener('mouseup', listenersAttachedRef.current.up!);
        listenersAttachedRef.current = null;
      }
    };
  }, []);

  return (
    <div
      className={`dcn-group${dragging ? ' dcn-group--dragging' : ''}`}
      style={{
        position: 'absolute',
        left: group.bounds.x,
        top: group.bounds.y,
        width: group.bounds.width,
        height: group.bounds.height,
        borderColor: group.color,
        borderRadius: 8,
        background: `color-mix(in srgb, ${group.color} 6%, transparent)`,
        // pointer-events: none on the bg so clicks pass through to child nodes
        pointerEvents: 'none',
        transition: dragging ? 'none' : 'border-color 0.15s',
        zIndex: 0,
      }}
    >
      {/* Invisible wider hit area for group selection */}
      <Handle
        type="target"
        position={Position.Left}
        id="group-handle"
        style={{ opacity: 0, width: 4, height: 4 }}
      />

      {/* Group label — this IS the drag handle (pointer-events: auto) */}
      <div
        className="dcn-group-header"
        style={{
          pointerEvents: 'auto',
          cursor: dragging ? 'grabbing' : 'grab',
          background: `color-mix(in srgb, ${group.color} 15%, transparent)`,
          borderBottom: `1px solid color-mix(in srgb, ${group.color} 30%, transparent)`,
          userSelect: 'none',
        }}
        onMouseDown={handleHeaderMouseDown}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: group.color,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            lineHeight: 1,
          }}
        >
          {group.label}
        </span>
        <span
          style={{
            fontSize: 9,
            color: `color-mix(in srgb, ${group.color} 60%, var(--color-text-muted))`,
            marginLeft: 4,
          }}
        >
          ({group.nodeIds.length})
        </span>
      </div>
    </div>
  );
};

GroupNode.displayName = 'GroupNode';
