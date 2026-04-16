// NodeContextMenu — right-click context menu for canvas nodes
//
// Design spec: openspec/changes/node-editor-comfyui-refactor/design.md
// Decision 6: Context menu items and bypass implementation
//
// Features:
// - Copy / Cut / Paste / Delete
// - Pin / Unpin (lock node position)
// - Bypass (skip node execution)
// - Minimize / Expand
// - Node Info (open Inspector Info tab)
// - Save as Snippet

import React, { type FC, useEffect, useRef, useState, cloneElement, type ReactNode, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { useCanvasStore } from '../../store/canvasStore';
import { useOnSelectionChange } from '@xyflow/react';
import type { SnippetSummary } from '@prism/shared-types';
import {
  Copy, Scissors, Clipboard, Pin, PinOff, FastForward, Minimize2, Maximize2,
  Trash2, Info, BookmarkPlus, Plus, ChevronRight, X,
} from 'lucide-react';

interface MenuItem {
  label: string;
  icon: ReactNode;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  action?: () => void;
  submenu?: ReactNode;
}

interface NodeContextMenuProps {
  x: number;
  y: number;
  /** null = canvas right-click; string = specific node (may or may not be selected) */
  nodeId: string | null;
  onClose: () => void;
}

// ── Save-as-snippet dialog ──────────────────────────────────────────────────────

interface SnippetSaveDialogProps {
  allSelectedIds: string[];
  snippetSave: (name: string, description: string, ids: string[]) => Promise<void>;
  onClose: () => void;
}

const SnippetSaveDialogContent: FC<SnippetSaveDialogProps> = ({
  allSelectedIds,
  snippetSave,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await Promise.race([
        snippetSave(name.trim(), desc, allSelectedIds),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('保存超时（5s）')), 5000)
        ),
      ]);
      onClose();
    } catch (err) {
      console.error('[SnippetSaveDialog] 保存失败:', err);
      setSaving(false);
    }
  };

  return (
    <div
      className="delete-confirm-overlay"
      onClick={onClose}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        className="delete-confirm"
        style={{ minWidth: 300 }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
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
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
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
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
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
              onClick={onClose}
              disabled={saving}
              style={{
                background: 'transparent', border: '1px solid #3f3f46',
                color: '#9ca3af', borderRadius: 6, padding: '6px 16px',
                cursor: 'pointer', fontSize: 13,
              }}
            >
              取消
            </button>
            <button
              disabled={!name.trim() || saving}
              onClick={handleSave}
              style={{
                background: name.trim() && !saving ? '#6366f1' : '#3f3f46',
                border: 'none',
                color: '#fff', borderRadius: 6, padding: '6px 16px',
                cursor: name.trim() && !saving ? 'pointer' : 'not-allowed',
                fontSize: 13,
              }}
            >
              {saving ? '保存中…' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Submenu context ───────────────────────────────────────────────────────────

interface SnippetMenuItemProps {
  id: string;
  name: string;
  onInsert: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  onDeleted: () => void;
}

const LONG_PRESS_DURATION = 400;

const SnippetMenuItem: FC<SnippetMenuItemProps> = ({
  id,
  name,
  onInsert,
  onDelete,
  onDeleted,
}) => {
  const [showDelete, setShowDelete] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseDown = () => {
    pressTimer.current = setTimeout(() => {
      setShowDelete(true);
    }, LONG_PRESS_DURATION);
  };

  const handleMouseUp = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const handleMouseLeave = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    setShowDelete(false);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await onDelete(id);
    onDeleted();
  };

  return (
    <div
      className="dcn-snippet-item"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <button
        className="dcn-snippet-item-delete"
        onClick={handleDelete}
        title="取消保存"
      >
        <X size={12} />
      </button>
      <button
        className="dcn-context-menu-item"
        onClick={() => { onInsert(id); }}
        style={{ opacity: showDelete ? 0.4 : 1 }}
      >
        <span style={{ flexShrink: 0, width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BookmarkPlus size={14} />
        </span>
        <span style={{ flex: 1 }}>{name}</span>
      </button>
    </div>
  );
};

const SubmenuContainer: FC<{
  label: string;
  icon: ReactNode;
  children: ReactNode;
}> = ({ label, icon, children }) => (
  <div className="dcn-submenu-wrapper">
    <button
      className="dcn-context-menu-item"
      style={{ cursor: 'default' }}
    >
      <span style={{ flexShrink: 0, width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </span>
      <span style={{ flex: 1 }}>{label}</span>
      <ChevronRight size={12} style={{ opacity: 0.5, flexShrink: 0 }} />
    </button>
    <div className="dcn-submenu">
      {children}
    </div>
  </div>
);

// ── Main context menu ───────────────────────────────────────────────────────────

export const NodeContextMenu: FC<NodeContextMenuProps> = ({
  x,
  y,
  nodeId,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const dialogOverlayRef = useRef<HTMLDivElement>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  // Track live selection directly from React Flow to avoid store sync lag
  const [liveSelectedIds, setLiveSelectedIds] = useState<string[]>([]);
  useOnSelectionChange({
    onChange: ({ nodes }) => setLiveSelectedIds(nodes.map((n) => n.id)),
  });

  // nodeId: null → canvas right-click (menu shows liveSelectedIds)
  // nodeId: string → right-clicked specific node (use that node's data + liveSelectedIds)
  const targetNode = nodeId != null ? useCanvasStore((s) => s.nodes.find((n) => n.id === nodeId)) : null;
  const storeSelectedNodeIds = useCanvasStore((s) => s.selectedNodeIds);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const copyNodes = useCanvasStore((s) => s.copyNodes);
  const cutNodes = useCanvasStore((s) => s.cutNodes);
  const removeNode = useCanvasStore((s) => s.removeNode);
  const clipboard = useCanvasStore((s) => s.clipboard);
  const pasteNodes = useCanvasStore((s) => s.pasteNodes);
  const openInspector = useCanvasStore((s) => s.openInspector);
  const snippetSave = useCanvasStore((s) => s.snippetSave);
  const snippetListStore = useCanvasStore((s) => s.snippetList);
  const insertSnippet = useCanvasStore((s) => s.insertSnippet);
  const deleteSnippet = useCanvasStore((s) => s.deleteSnippet);
  const [snippetList, setSnippetList] = useState<SnippetSummary[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load snippet list on mount and after delete
  useEffect(() => {
    snippetListStore().then(setSnippetList);
  }, [snippetListStore, refreshKey]);

  // Close on click outside or Escape (but NOT when clicking the save dialog)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Don't close if clicking the save dialog (rendered via portal to document.body)
      if (dialogOverlayRef.current && dialogOverlayRef.current.contains(e.target as HTMLElement)) {
        return;
      }
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

  // Determine which nodes the menu applies to:
  // - Canvas right-click with selection: use liveSelectedIds
  // - Canvas right-click without selection: empty array
  // - Right-clicked specific node (may not be in liveSelectedIds yet): use liveSelectedIds if available, fallback to store
  const allSelectedIds: string[] = (() => {
    if (nodeId == null) {
      return liveSelectedIds.length > 0 ? liveSelectedIds : storeSelectedNodeIds;
    }
    if (liveSelectedIds.includes(nodeId)) {
      return liveSelectedIds;
    }
    if (liveSelectedIds.length > 0) {
      return liveSelectedIds;
    }
    if (storeSelectedNodeIds.includes(nodeId)) {
      return storeSelectedNodeIds;
    }
    return [nodeId];
  })();

  // canvas right-click without any selection → limited menu (paste + insert snippets only)
  const isCanvasOnlyMenu = nodeId == null && allSelectedIds.length === 0;

  // Pin/Bypass/Minimize state: derive from targetNode (if nodeId != null) or first selected node
  const primaryNode = (() => {
    if (targetNode) return targetNode;
    if (allSelectedIds.length > 0) {
      const nodes = useCanvasStore.getState().nodes;
      return nodes.find((n) => n.id === allSelectedIds[0]) ?? null;
    }
    return null;
  })();

  const isPinned = (primaryNode?.data as Record<string, unknown>)?.pinned === true;
  const isBypassed = primaryNode?.data.bypassed === true;
  const isMinimized = primaryNode?.data.minimized === true;

  // Adjust position to keep menu on screen
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - 400);

  const menuItems: MenuItem[] = [
    {
      label: '复制',
      icon: <Copy size={14} />,
      shortcut: 'Ctrl+C',
      disabled: isCanvasOnlyMenu,
      action: () => { copyNodes(allSelectedIds); onClose(); },
    },
    {
      label: '剪切',
      icon: <Scissors size={14} />,
      shortcut: 'Ctrl+X',
      disabled: isCanvasOnlyMenu,
      action: () => { cutNodes(allSelectedIds); onClose(); },
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
      disabled: isCanvasOnlyMenu,
      action: () => { setSaveDialogOpen(true); },
    },
    { label: '', icon: null, action: () => {}, disabled: true }, // separator
    ...(snippetList.length > 0
      ? [
          {
            label: '插入片段',
            icon: <Plus size={14} />,
            disabled: false,
            submenu: (
              <SubmenuContainer
                label="插入片段"
                icon={<Plus size={14} />}
              >
                {snippetList.map((s) => (
                  <SnippetMenuItem
                    key={s.id}
                    id={s.id}
                    name={s.name}
                    onInsert={(id) => { insertSnippet(id, { x, y }); onClose(); }}
                    onDelete={deleteSnippet}
                    onDeleted={() => setRefreshKey((k) => k + 1)}
                  />
                ))}
              </SubmenuContainer>
            ),
          } as MenuItem,
          { label: '', icon: null, action: (() => {}) as () => void, disabled: true } as MenuItem,
        ]
      : []),
    { label: '', icon: null, action: () => {}, disabled: true }, // separator
    {
      label: isPinned ? '解除固定' : '固定节点',
      icon: isPinned ? <PinOff size={14} /> : <Pin size={14} />,
      disabled: isCanvasOnlyMenu,
      action: () => {
        allSelectedIds.forEach((id) => updateNodeData(id, { pinned: !isPinned }));
        onClose();
      },
    },
    {
      label: isBypassed ? '取消 Bypass' : 'Bypass',
      icon: <FastForward size={14} />,
      disabled: isCanvasOnlyMenu,
      action: () => {
        allSelectedIds.forEach((id) => updateNodeData(id, { bypassed: !isBypassed }));
        onClose();
      },
    },
    {
      label: isMinimized ? '展开节点' : '最小化',
      icon: isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />,
      disabled: isCanvasOnlyMenu,
      action: () => {
        allSelectedIds.forEach((id) => updateNodeData(id, { minimized: !isMinimized }));
        onClose();
      },
    },
    { label: '', icon: null, action: () => {}, disabled: true }, // separator
    {
      label: '删除',
      icon: <Trash2 size={14} />,
      shortcut: 'Del',
      danger: true,
      disabled: isCanvasOnlyMenu,
      action: () => { allSelectedIds.forEach((id) => removeNode(id)); onClose(); },
    },
    {
      label: '节点信息',
      icon: <Info size={14} />,
      disabled: isCanvasOnlyMenu || allSelectedIds.length === 0,
      action: () => {
        const target = nodeId ?? allSelectedIds[0];
        if (target) openInspector('info', target);
        onClose();
      },
    },
  ];

  // Build the portal content: both the menu and the dialog go to document.body
  // This avoids DOM nesting issues (dialog rendered inside menu div) while keeping
  // the dialog isolated from the menu's click-outside detection.
  const portalContent = (
    <>
      {/* Save-as-snippet dialog — rendered via portal alongside the menu */}
      {saveDialogOpen && (
        <div ref={dialogOverlayRef}>
          <SnippetSaveDialogContent
            allSelectedIds={allSelectedIds}
            snippetSave={snippetSave}
            onClose={() => { setSaveDialogOpen(false); onClose(); }}
          />
        </div>
      )}
      {/* Context menu */}
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
          ) : item.submenu ? (
            cloneElement(item.submenu as ReactElement<{ key?: string }>, { key: `submenu-${idx}` })
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
      </div>
    </>
  );

  return createPortal(portalContent, document.body);
};
