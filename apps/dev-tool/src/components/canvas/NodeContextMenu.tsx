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

import React, { type FC, useEffect, useRef, useState, type ReactNode } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { useOnSelectionChange } from '@xyflow/react';
import {
  Copy, Scissors, Clipboard, Pin, PinOff, FastForward, Minimize2, Maximize2,
  Trash2, Info, BookmarkPlus,
} from 'lucide-react';

interface MenuItem {
  label: string;
  icon: ReactNode;
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
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [snippetName, setSnippetName] = useState('');
  const [snippetDesc, setSnippetDesc] = useState('');

  // Track live selection directly from React Flow to avoid store sync lag
  const [liveSelectedIds, setLiveSelectedIds] = useState<string[]>([]);
  useOnSelectionChange({
    onChange: ({ nodes }) => setLiveSelectedIds(nodes.map((n) => n.id)),
  });

  const node = useCanvasStore((s) => s.nodes.find((n) => n.id === nodeId));
  const storeSelectedNodeIds = useCanvasStore((s) => s.selectedNodeIds);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const copyNodes = useCanvasStore((s) => s.copyNodes);
  const cutNodes = useCanvasStore((s) => s.cutNodes);
  const removeNode = useCanvasStore((s) => s.removeNode);
  const clipboard = useCanvasStore((s) => s.clipboard);
  const pasteNodes = useCanvasStore((s) => s.pasteNodes);
  const openInspector = useCanvasStore((s) => s.openInspector);
  const snippetSave = useCanvasStore((s) => s.snippetSave);

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

  // Use live selection from React Flow to include newly-selected nodes in multi-select
  const allSelectedIds = liveSelectedIds.includes(nodeId)
    ? liveSelectedIds
    : liveSelectedIds.length > 0
    ? liveSelectedIds
    : storeSelectedNodeIds.includes(nodeId)
    ? storeSelectedNodeIds
    : [...storeSelectedNodeIds, nodeId];

  const handleSaveSnippet = async () => {
    if (!snippetName.trim()) return;
    await snippetSave(snippetName.trim(), snippetDesc, allSelectedIds);
    setSaveDialogOpen(false);
    setSnippetName('');
    setSnippetDesc('');
    onClose();
  };

  const menuItems: MenuItem[] = [
    {
      label: '复制',
      icon: <Copy size={14} />,
      shortcut: 'Ctrl+C',
      action: () => { copyNodes([nodeId]); onClose(); },
    },
    {
      label: '剪切',
      icon: <Scissors size={14} />,
      shortcut: 'Ctrl+X',
      action: () => { cutNodes([nodeId]); onClose(); },
    },
    {
      label: '粘贴',
      icon: <Clipboard size={14} />,
      shortcut: 'Ctrl+V',
      disabled: !clipboard || clipboard.length === 0,
      action: () => { pasteNodes({ x, y }); onClose(); },
    },
    { label: '', icon: null, action: () => {}, disabled: true }, // separator
    {
      label: '保存为片段',
      icon: <BookmarkPlus size={14} />,
      action: () => { setSaveDialogOpen(true); },
    },
    { label: '', icon: null, action: () => {}, disabled: true }, // separator
    {
      label: isPinned ? '解除固定' : '固定节点',
      icon: isPinned ? <PinOff size={14} /> : <Pin size={14} />,
      action: () => {
        updateNodeData(nodeId, { pinned: !isPinned });
        onClose();
      },
    },
    {
      label: isBypassed ? '取消 Bypass' : 'Bypass',
      icon: <FastForward size={14} />,
      action: () => {
        updateNodeData(nodeId, { bypassed: !isBypassed });
        onClose();
      },
    },
    {
      label: isMinimized ? '展开节点' : '最小化',
      icon: isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />,
      action: () => {
        updateNodeData(nodeId, { minimized: !isMinimized });
        onClose();
      },
    },
    { label: '', icon: null, action: () => {}, disabled: true }, // separator
    {
      label: '删除',
      icon: <Trash2 size={14} />,
      shortcut: 'Del',
      danger: true,
      action: () => { removeNode(nodeId); onClose(); },
    },
    {
      label: '节点信息',
      icon: <Info size={14} />,
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
            <span style={{ flexShrink: 0, width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {item.icon}
            </span>
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.shortcut && (
              <span className="dcn-context-menu-shortcut">{item.shortcut}</span>
            )}
          </button>
        )
      )}
      {/* Save as Snippet Dialog */}
      {saveDialogOpen && (
        <div
          className="delete-confirm-overlay"
          onClick={() => setSaveDialogOpen(false)}
        >
          <div
            className="delete-confirm"
            style={{ minWidth: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <BookmarkPlus size={18} />
              <h3 style={{ margin: 0, fontSize: 15 }}>保存为片段</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#9ca3af', display: 'block', marginBottom: 4 }}>
                  片段名称
                </label>
                <input
                  autoFocus
                  value={snippetName}
                  onChange={(e) => setSnippetName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveSnippet();
                    }
                  }}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: '#1a1a2e', border: '1px solid #3f3f46',
                    color: '#f4f4f5', borderRadius: 6, padding: '6px 10px',
                    fontSize: 13,
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#9ca3af', display: 'block', marginBottom: 4 }}>
                  描述（可选）
                </label>
                <textarea
                  value={snippetDesc}
                  onChange={(e) => setSnippetDesc(e.target.value)}
                  rows={2}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: '#1a1a2e', border: '1px solid #3f3f46',
                    color: '#f4f4f5', borderRadius: 6, padding: '6px 10px',
                    fontSize: 13, resize: 'none',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                <button
                  onClick={() => setSaveDialogOpen(false)}
                  style={{
                    background: 'transparent', border: '1px solid #3f3f46',
                    color: '#9ca3af', borderRadius: 6, padding: '6px 16px',
                    cursor: 'pointer', fontSize: 13,
                  }}
                >
                  取消
                </button>
                <button
                  disabled={!snippetName.trim()}
                  onClick={handleSaveSnippet}
                  style={{
                    background: snippetName.trim() ? '#6366f1' : '#3f3f46',
                    border: 'none',
                    color: '#fff', borderRadius: 6, padding: '6px 16px',
                    cursor: snippetName.trim() ? 'pointer' : 'not-allowed',
                    fontSize: 13,
                  }}
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};