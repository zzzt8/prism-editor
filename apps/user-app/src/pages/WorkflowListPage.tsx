// WorkflowListPage - dev-tool-style homepage for user-app
//
// Features migrated from dev-tool/WorkflowsView:
// - Search filter
// - Sort by Recent / Name
// - Grid/List view toggle (grid placeholder, list active)
// - Pagination (Load More + numbered pages)
// - Right-click context menu (Open / Rename / Delete)
// - Inline double-click rename
// - Delete confirmation modal
// - Error banner with retry

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, List, LayoutGrid, Layers, MoreHorizontal, Trash2, FolderOpen, Info, X, AlertCircle } from 'lucide-react';
import { type PublishedWorkflowMeta } from '../modules/repositories/interfaces';
import { type SortKey } from '../modules/catalog/workflowCatalogStore';
import { useWorkflowCatalogStore } from '../modules/catalog/workflowCatalogStore';
import { navigateToWorkflow } from '../router';
import { Box } from 'lucide-react';

const PAGE_SIZE = 10;

// ─── Toast ───────────────────────────────────────────────────────────────────

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
}

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="ua-toast ua-toast--success">
      {toast.message}
    </div>
  );
}

// ─── Date formatter ─────────────────────────────────────────────────────────

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Delete Confirm ─────────────────────────────────────────────────────────

interface DeleteConfirmProps {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirm({ name, onConfirm, onCancel }: DeleteConfirmProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div className="delete-confirm-overlay" onClick={onCancel}>
      <div className="delete-confirm" onClick={(e) => e.stopPropagation()}>
        <p className="delete-confirm-title">Delete Workflow?</p>
        <p className="delete-confirm-msg">
          <strong>"{name}"</strong> will be permanently deleted. This cannot be undone.
        </p>
        <div className="delete-confirm-actions">
          <button className="delete-btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="delete-btn-confirm" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────

export const WorkflowListPage: React.FC = () => {
  const { workflows, isLoading, loadError, loadWorkflows, renameWorkflow, deleteWorkflow } = useWorkflowCatalogStore();

  const [toast, setToast] = useState<ToastState | null>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('Recent');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PublishedWorkflowMeta | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);

  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((message: string, type: ToastState['type'] = 'success') => {
    setToast({ message, type });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  // Close context menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.home-context-menu')) return;
      setOpenMenuId(null);
      setMenuPosition(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = workflows.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === 'Recent') return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    if (sortKey === 'Name') return a.name.localeCompare(b.name);
    return 0;
  });

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleOpen = (wf: PublishedWorkflowMeta) => {
    setOpenMenuId(null);
    navigateToWorkflow(wf.sourceId);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteWorkflow(deleteTarget.sourceId);
      showToast(`已删除「${deleteTarget.name}」`, 'success');
    } catch {
      showToast('删除失败', 'error');
    }
    setDeleteTarget(null);
    setOpenMenuId(null);
  };

  const startEditName = (wf: PublishedWorkflowMeta, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValue(wf.name);
    setEditingId(wf.sourceId);
    setOpenMenuId(null);
    setMenuPosition(null);
    setTimeout(() => editInputRef.current?.select(), 0);
  };

  const saveEditName = async () => {
    if (!editingId) return;
    const trimmed = editValue.trim();
    if (trimmed) {
      try {
        await renameWorkflow(editingId, trimmed);
        showToast(`已重命名为「${trimmed}」`, 'success');
      } catch {
        showToast('重命名失败', 'error');
      }
    }
    setEditingId(null);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveEditName();
    if (e.key === 'Escape') setEditingId(null);
  };

  return (
    <div className="home-layout">
      {/* Header */}
      <header className="home-header">
        <div className="home-header-logo">
          <div className="home-logo-icon">
            <Box size={20} />
          </div>
          <div className="home-header-title-group">
            <span className="home-logo-text">Prism Editor</span>
            <span className="home-header-subtitle">已发布工作流</span>
          </div>
        </div>
      </header>

      <main className="home-main">
        {/* Toolbar */}
        <section className="home-toolbar">
          <div className="home-toolbar-left">
            <div className="home-search-wrapper">
              <Search size={14} className="home-search-icon" />
              <input
                type="text"
                className="home-search-input"
                placeholder="Filter workflows..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>

            {/* Sort dropdown */}
            <button
              className="home-dropdown"
              onClick={() => {
                const keys: SortKey[] = ['Recent', 'Name'];
                const idx = keys.indexOf(sortKey);
                setSortKey(keys[(idx + 1) % keys.length]);
                setPage(1);
              }}
            >
              <span className="home-dropdown-label">Sort:</span>
              <span>{sortKey}</span>
              <ChevronDown size={14} />
            </button>
          </div>

          <div className="home-toolbar-right">
            {/* View toggle */}
            <div className="home-view-toggle">
              <button
                className={`home-view-btn ${viewMode === 'list' ? 'home-view-btn--active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List view"
              >
                <List size={16} />
              </button>
              <button
                className={`home-view-btn ${viewMode === 'grid' ? 'home-view-btn--active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid view"
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>
        </section>

        {/* Toast */}
        {toast && <Toast toast={toast} onDismiss={dismissToast} />}

        {/* Loading */}
        {isLoading && (
          <div className="ua-loading">
            <div className="ua-spinner" />
            <span>加载中…</span>
          </div>
        )}

        {/* Error banner */}
        {loadError && (
          <section className="home-error-banner">
            <AlertCircle size={16} />
            <span>{loadError}</span>
            <button onClick={loadWorkflows}>
              <X size={14} />
            </button>
          </section>
        )}

        {/* Empty state */}
        {!isLoading && !loadError && paginated.length === 0 && (
          <section className="home-empty">
            <Layers size={48} className="home-empty-icon" />
            <p className="home-empty-title">创建你的第一个工作流</p>
            <p className="home-empty-subtitle">
              {search
                ? 'No workflows match your current filters.'
                : '还没有保存的工作流。'}
            </p>
          </section>
        )}

        {/* Workflow list */}
        {!isLoading && paginated.length > 0 && (
          <>
            <section className="home-workflow-list">
              {paginated.map((wf) => (
                <div
                  key={wf.sourceId}
                  className="home-workflow-row"
                  onClick={() => handleOpen(wf)}
                >
                  <div className="home-workflow-row-info">
                    <div className="home-workflow-icon">
                      <Layers size={18} />
                    </div>
                    <div className="home-workflow-details">
                      {editingId === wf.sourceId ? (
                        <input
                          ref={editInputRef}
                          className="home-name-edit-input"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={saveEditName}
                          onKeyDown={handleEditKeyDown}
                          onClick={(e) => e.stopPropagation()}
                          maxLength={64}
                        />
                      ) : (
                        <span
                          className="home-workflow-name"
                          title="双击修改名称"
                          onDoubleClick={(e) => startEditName(wf, e)}
                        >
                          {wf.name}
                        </span>
                      )}
                      {wf.description && (
                        <span className="home-workflow-desc">{wf.description}</span>
                      )}
                    </div>
                  </div>

                  <div className="home-workflow-row-actions">
                    <span className="home-workflow-time">
                      {formatRelativeTime(wf.publishedAt)}
                    </span>
                    <span className="ua-io-badge ua-io-badge--in">{wf.inputCount} 输入</span>
                    <span className="ua-io-badge ua-io-badge--out">{wf.outputCount} 输出</span>

                    {/* Context menu trigger */}
                    <button
                      ref={openMenuId === wf.sourceId ? menuTriggerRef : undefined}
                      className="home-more-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (openMenuId === wf.sourceId) {
                          setOpenMenuId(null);
                          setMenuPosition(null);
                        } else {
                          const MENU_MIN_WIDTH = 140;
                          const MENU_ITEM_HEIGHT = 34;
                          const MENU_ITEMS = 3;
                          const MENU_HEIGHT = MENU_ITEMS * MENU_ITEM_HEIGHT;
                          let x = e.clientX;
                          let y = e.clientY;
                          if (x + MENU_MIN_WIDTH > window.innerWidth) x = window.innerWidth - MENU_MIN_WIDTH - 8;
                          if (y + MENU_HEIGHT > window.innerHeight) y = y - MENU_HEIGHT;
                          setOpenMenuId(wf.sourceId);
                          setMenuPosition({ x, y });
                        }
                      }}
                    >
                      <MoreHorizontal size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </section>

            {/* Pagination */}
            {total > PAGE_SIZE && (
              <footer className="home-pagination">
                <button
                  className="home-load-more-btn"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                >
                  Load More
                </button>
                <div className="home-pagination-info">
                  <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
                  <div className="home-pagination-pages">
                    <button
                      className={`home-page-btn ${page === 1 ? 'home-page-btn--disabled' : ''}`}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Prev
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        className={`home-page-btn ${p === page ? 'home-page-btn--active' : ''}`}
                        onClick={() => setPage(p)}
                      >
                        {String(p).padStart(2, '0')}
                      </button>
                    ))}
                    <button
                      className={`home-page-btn ${page === totalPages ? 'home-page-btn--disabled' : ''}`}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </footer>
            )}
          </>
        )}
      </main>

      {/* Delete confirmation */}
      {deleteTarget && (
        <DeleteConfirm
          name={deleteTarget.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Context menu — portal to body so it's never clipped */}
      {openMenuId && menuPosition && createPortal(
        <div
          className="home-context-menu"
          style={{ position: 'fixed', left: menuPosition.x, top: menuPosition.y }}
        >
          <button
            className="home-context-menu-item"
            onClick={() => {
              const wf = workflows.find((w) => w.sourceId === openMenuId);
              if (wf) handleOpen(wf);
              setOpenMenuId(null);
              setMenuPosition(null);
            }}
          >
            <FolderOpen size={14} />
            Open
          </button>
          <button
            className="home-context-menu-item"
            onClick={(e) => {
              const wf = workflows.find((w) => w.sourceId === openMenuId);
              if (wf) startEditName(wf, e as unknown as React.MouseEvent);
              setOpenMenuId(null);
              setMenuPosition(null);
            }}
          >
            <Info size={14} />
            Rename
          </button>
          <button
            className="home-context-menu-item home-context-menu-item--danger"
            onClick={() => {
              const wf = workflows.find((w) => w.sourceId === openMenuId);
              if (wf) setDeleteTarget(wf);
              setOpenMenuId(null);
              setMenuPosition(null);
            }}
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>,
        document.body
      )}
    </div>
  );
};
