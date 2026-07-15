// WorkflowsView — Homepage listing all saved workflows

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Box, Search, ChevronDown, List, LayoutGrid, Plus,
  Layers, MoreHorizontal, Trash2, FolderOpen, Info, X, AlertCircle,
} from 'lucide-react';
import type { WorkflowMeta } from '@prism/shared-types';
import {
  activeStorageAdapter,
  indexedDBStorageAdapter,
} from '../storage';
import { useCanvasStore } from '../store/canvasStore';
import { DeleteConfirm } from './workflows/DeleteConfirm';

const fileInputStyle: React.CSSProperties = { display: 'none' };

type SortKey = 'Recent' | 'Name' | 'Status';
type StatusFilter = 'All' | 'Draft' | 'Published';

const PAGE_SIZE = 10;

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

interface WorkflowsViewProps {
  onNewWorkflow: () => void;
}

export function WorkflowsView({ onNewWorkflow }: WorkflowsViewProps) {
  const navigate = useNavigate();
  const loadWorkflow = useCanvasStore((s) => s.loadWorkflow);
  const importWorkflowFromFile = useCanvasStore((s) => s.importWorkflowFromFile);

  const [allWorkflows, setAllWorkflows] = useState<WorkflowMeta[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [sortKey, setSortKey] = useState<SortKey>('Recent');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkflowMeta | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importWorkflowFromFile(file);
      navigate('/workflow/imported');
    } catch (err) {
      console.error('Import failed:', err);
    } finally {
      e.target.value = '';
    }
  };

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const list = await activeStorageAdapter.list();
      setAllWorkflows(list);
    } catch (err) {
      if (err instanceof Error && (err.message.includes('401') || err.message.includes('Unauthorized'))) {
        try {
          const localList = await indexedDBStorageAdapter.list();
          setAllWorkflows(localList);
        } catch {
          setAllWorkflows([]);
        }
      } else {
        const msg = err instanceof Error ? err.message : 'Failed to load workflows';
        setLoadError(msg);
        setAllWorkflows([]);
      }
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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

  const filtered = allWorkflows.filter((w) => {
    const matchSearch = w.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      statusFilter === 'All' ? true :
      statusFilter === 'Draft' ? w.status === 'draft' :
      w.status === 'published';
    return matchSearch && matchStatus;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === 'Recent') return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    if (sortKey === 'Name') return a.name.localeCompare(b.name);
    if (sortKey === 'Status') return a.status.localeCompare(b.status);
    return 0;
  });

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleOpen = async (wf: WorkflowMeta) => {
    setOpenMenuId(null);
    setLoadError(null);
    try {
      let content;
      try {
        content = await activeStorageAdapter.load(wf.id);
      } catch (err) {
        if (err instanceof Error && (err.message.includes('not found') || err.message.includes('404'))) {
          // Workflow not on server yet (legacy local workflow) — fallback to IndexedDB
          content = await indexedDBStorageAdapter.load(wf.id);
        } else {
          throw err;
        }
      }
      loadWorkflow(content);
      navigate(`/workflow/${wf.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load workflow';
      setLoadError(message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const deleteId = deleteTarget.id;
    try {
      await activeStorageAdapter.delete(deleteTarget.id);
      setAllWorkflows((prev) => prev.filter((w) => w.id !== deleteId));
      setDeleteTarget(null);
      setOpenMenuId(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete workflow';
      setLoadError(msg);
      setDeleteTarget(null);
    }
  };

  const startEditName = (wf: WorkflowMeta, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValue(wf.name);
    setEditingId(wf.id);
    setOpenMenuId(null);
    setMenuPosition(null);
    setTimeout(() => editInputRef.current?.select(), 0);
  };

  const saveEditName = async () => {
    if (!editingId) return;
    const trimmed = editValue.trim();
    if (trimmed) {
      await activeStorageAdapter.updateWorkflowMeta(editingId, { name: trimmed });
      setAllWorkflows((prev) =>
        prev.map((w) => w.id === editingId ? { ...w, name: trimmed } : w)
      );
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
            <span className="home-header-subtitle">Workflows</span>
          </div>
        </div>
        <div className="home-header-actions">
          <button className="home-import-btn" onClick={() => fileInputRef.current?.click()}>Import</button>
          <input ref={fileInputRef} type="file" accept=".json" style={fileInputStyle} onChange={handleImport} />
          <button className="home-new-btn" onClick={onNewWorkflow}>
            <Plus size={16} />
            New Workflow
          </button>
          <div
            className="home-avatar"
            title="User"
          >
            <div
              className="home-avatar-placeholder"
              style={{
                width: '100%',
                height: '100%',
                background: 'var(--accent-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent)',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              U
            </div>
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

            {/* Status dropdown */}
            <button
              className="home-dropdown"
              onClick={() => {
                const next: StatusFilter[] = ['All', 'Draft', 'Published'];
                const idx = next.indexOf(statusFilter);
                setStatusFilter(next[(idx + 1) % next.length]);
                setPage(1);
              }}
            >
              <span className="home-dropdown-label">Status:</span>
              <span>{statusFilter}</span>
              <ChevronDown size={14} />
            </button>
          </div>

          <div className="home-toolbar-right">
            {/* Sort dropdown */}
            <button
              className="home-dropdown"
              onClick={() => {
                const keys: SortKey[] = ['Recent', 'Name', 'Status'];
                const idx = keys.indexOf(sortKey);
                setSortKey(keys[(idx + 1) % keys.length]);
              }}
            >
              <span className="home-dropdown-label">Sort:</span>
              <span>{sortKey}</span>
              <ChevronDown size={14} />
            </button>

            {/* View toggle — hidden until grid view is implemented */}
            <div className="home-view-toggle" style={{ opacity: 0.3, pointerEvents: 'none' }}>
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

        {/* Error display */}
        {loadError && (
          <section className="home-error-banner">
            <AlertCircle size={16} />
            <span>{loadError}</span>
            <button onClick={() => setLoadError(null)} title="Dismiss">
              <X size={14} />
            </button>
          </section>
        )}

        {/* Workflow List / Empty State */}
        {paginated.length === 0 ? (
          <section className="home-empty">
            <Layers size={48} className="home-empty-icon" />
            <p className="home-empty-title">创建你的第一个工作流</p>
            <p className="home-empty-subtitle">
              {search || statusFilter !== 'All'
                ? 'No workflows match your current filters.'
                : '还没有保存的工作流。点击下方按钮创建一个。'}
            </p>
            {!search && statusFilter === 'All' && (
              <button className="home-empty-btn" onClick={onNewWorkflow}>
                <Plus size={16} />
                New Workflow
              </button>
            )}
          </section>
        ) : (
          <>
            <section className="home-workflow-list">
              {paginated.map((wf) => (
                <div
                  key={wf.id}
                  className="home-workflow-row"
                  onClick={() => handleOpen(wf)}
                >
                  <div className="home-workflow-row-info">
                    <div className="home-workflow-icon">
                      <Layers size={18} />
                    </div>
                    <div className="home-workflow-details">
                      {editingId === wf.id ? (
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
                    <span className={`home-status-badge home-status-badge--${wf.status}`}>
                      {wf.status === 'draft' ? 'Draft' : 'Published'}
                    </span>
                    <span className="home-workflow-time">
                      {formatRelativeTime(wf.updatedAt)}
                    </span>

                    {/* Context menu trigger */}
                    <button
                      ref={openMenuId === wf.id ? menuTriggerRef : undefined}
                      className="home-more-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (openMenuId === wf.id) {
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
                          setOpenMenuId(wf.id);
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
                <button className="home-load-more-btn" onClick={() => setPage((p) => Math.min(p + 1, totalPages))}>
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
              const wf = allWorkflows.find((w) => w.id === openMenuId);
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
              const wf = allWorkflows.find((w) => w.id === openMenuId);
              if (wf) startEditName(wf, e);
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
              const wf = allWorkflows.find((w) => w.id === openMenuId);
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
}

export { DeleteConfirm } from './workflows/DeleteConfirm';
