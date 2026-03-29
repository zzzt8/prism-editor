// NodeContextMenu — right-click context menu for canvas nodes
//
// Design spec: openspec/changes/node-editor-comfyui-refactor/design.md
// Decision 6: Context menu items and bypass implementation
//
// Features:
// - Copy / Cut / Paste / Delete
// - Rename (trigger title edit)
// - Pin / Unpin (lock node position)
// - Bypass (skip node execution)
// - Minimize / Expand
// - Node Info (open Inspector Info tab)

import React, { type FC, useEffect, useRef } from 'react';
import { useCanvasStore } from '../../store/canvasStore';

interface MenuItem {
  label: string;
  icon: string;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  action: () => void;
}

interface NodeContextMenuProps {
  x: number;
  y: number;
  nodeId: string;
  onClose: () => void;
}

export const NodeContextMenu: FC<NodeContextMenuProps> = ({
  x,
  y,
  nodeId,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  const node = useCanvasStore((s) => s.nodes.find((n) => n.id === nodeId));
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const copyNodes = useCanvasStore((s) => s.copyNodes);
  const cutNodes = useCanvasStore((s) => s.cutNodes);
  const removeNode = useCanvasStore((s) => s.removeNode);
  const clipboard = useCanvasStore((s) => s.clipboard);
  const pasteNodes = useCanvasStore((s) => s.pasteNodes);
  const openInspector = useCanvasStore((s) => s.openInspector);

  // Close on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as HTMLElement)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!node) return null;

  const isPinned = (node.data as Record<string, unknown>).pinned === true;
  const isBypassed = node.data.bypassed === true;
  const isMinimized = node.data.minimized === true;

  // Adjust position to keep menu on screen
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - 400);

  const menuItems: MenuItem[] = [
    {
      label: '复制',
      icon: '⎘',
      shortcut: 'Ctrl+C',
      action: () => { copyNodes([nodeId]); onClose(); },
    },
    {
      label: '剪切',
      icon: '✂',
      shortcut: 'Ctrl+X',
      action: () => { cutNodes([nodeId]); onClose(); },
    },
    {
      label: '粘贴',
      icon: '⎙',
      shortcut: 'Ctrl+V',
      disabled: !clipboard || clipboard.length === 0,
      action: () => { pasteNodes({ x, y }); onClose(); },
    },
    { label: '', icon: '', action: () => {}, disabled: true }, // separator
    {
      label: isPinned ? '解除固定' : '固定节点',
      icon: isPinned ? '⬡' : '⊞',
      action: () => {
        updateNodeData(nodeId, { pinned: !isPinned });
        onClose();
      },
    },
    {
      label: isBypassed ? '取消 Bypass' : 'Bypass',
      icon: '⏭',
      action: () => {
        updateNodeData(nodeId, { bypassed: !isBypassed });
        onClose();
      },
    },
    {
      label: isMinimized ? '展开节点' : '最小化',
      icon: isMinimized ? '⬜' : '▬',
      action: () => {
        updateNodeData(nodeId, { minimized: !isMinimized });
        onClose();
      },
    },
    { label: '', icon: '', action: () => {}, disabled: true }, // separator
    {
      label: '删除',
      icon: '🗑',
      shortcut: 'Del',
      danger: true,
      action: () => { removeNode(nodeId); onClose(); },
    },
    {
      label: '节点信息',
      icon: 'ℹ',
      action: () => { openInspector('info', nodeId); onClose(); },
    },
  ];

  return (
    <div
      ref={menuRef}
      className="dcn-context-menu"
      style={{
        left: adjustedX,
        top: adjustedY,
        position: 'fixed',
        zIndex: 9999,
      }}
    >
      {menuItems.map((item, idx) =>
        item.label === '' ? (
          <div key={`sep-${idx}`} className="dcn-context-menu-separator" />
        ) : (
          <button
            key={item.label + idx}
            className={[
              'dcn-context-menu-item',
              item.danger ? 'dcn-context-menu-item--danger' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={item.disabled ? undefined : item.action}
            disabled={item.disabled}
            title={item.shortcut}
          >
            <span style={{ fontSize: '13px', flexShrink: 0, width: 16, textAlign: 'center' as const }}>
              {item.icon}
            </span>
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.shortcut && (
              <span className="dcn-context-menu-shortcut">{item.shortcut}</span>
            )}
          </button>
        )
      )}
    </div>
  );
};
