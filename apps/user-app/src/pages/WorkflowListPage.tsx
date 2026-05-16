// WorkflowListPage - displays all published workflows available to the user

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useWorkflowCatalogStore } from '../modules/catalog/workflowCatalogStore';
import { type PublishedWorkflowMeta } from '../modules/repositories/interfaces';
import { navigateToWorkflow } from '../router';
import { importWorkflowFromFile, importWorkflowFromClipboard } from '../utils/workflowImport';
import { syncWorkflowToLocal } from '../modules/repositories';

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
    <div className={`ua-toast ua-toast--${toast.type}`}>
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

// ─── WorkflowRow ─────────────────────────────────────────────────────────────

function WorkflowRow({ meta, onClick }: { meta: PublishedWorkflowMeta; onClick: () => void }) {
  return (
    <div className="home-workflow-row" onClick={onClick}>
      <div className="home-workflow-row-info">
        <div className="home-workflow-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </div>
        <div className="home-workflow-details">
          <span className="home-workflow-name">{meta.name}</span>
          {meta.description && (
            <span className="home-workflow-desc">{meta.description}</span>
          )}
        </div>
      </div>

      <div className="home-workflow-row-actions">
        <span className="home-workflow-time">
          {formatRelativeTime(meta.publishedAt)}
        </span>
        <span className="ua-io-badge ua-io-badge--in">{meta.inputCount} 输入</span>
        <span className="ua-io-badge ua-io-badge--out">{meta.outputCount} 输出</span>
      </div>
    </div>
  );
}

// ─── File upload trigger ──────────────────────────────────────────────────────

interface FileInputProps {
  inputRef: React.RefObject<HTMLInputElement>;
  onFile: (file: File) => void;
}

function FileInputTrigger({ inputRef, onFile }: FileInputProps) {
  return (
    <input
      ref={inputRef}
      type="file"
      accept=".json,application/json"
      style={{ display: 'none' }}
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) {
          onFile(file);
          e.target.value = '';
        }
      }}
    />
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export const WorkflowListPage: React.FC = () => {
  const { workflows, isLoading, loadError, loadWorkflows } = useWorkflowCatalogStore();

  const [toast, setToast] = useState<ToastState | null>(null);
  const [search, setSearch] = useState('');
  const [pasteHint, setPasteHint] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = useCallback((message: string, type: ToastState['type'] = 'success') => {
    setToast({ message, type });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  useEffect(() => {
    if (!isLoading && !loadError && workflows.length === 0) {
      setPasteHint(true);
    }
  }, [isLoading, loadError, workflows.length]);

  const handleFileImport = useCallback(async (_file: File) => {
    const result = await importWorkflowFromFile(_file);
    if (result.success) {
      try {
        await syncWorkflowToLocal(result.workflow);
        showToast(`已导入「${result.workflow.name}」`, 'success');
        loadWorkflows();
      } catch (err) {
        console.error('[WorkflowListPage] syncWorkflowToLocal ERROR:', err);
        showToast(`保存失败：${err instanceof Error ? err.message : String(err)}`, 'error');
      }
    } else {
      showToast(`导入失败：${result.reason}`, 'error');
    }
  }, [loadWorkflows, showToast]);

  useEffect(() => {
    if (!pasteHint) return;

    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        e.preventDefault();

        const result = await importWorkflowFromClipboard();
        if (result.success) {
          try {
            await syncWorkflowToLocal(result.workflow);
            loadWorkflows();
            setPasteHint(false);
            showToast(`已从剪贴板导入「${result.workflow.name}」`, 'success');
          } catch (err) {
            showToast(`保存失败：${err instanceof Error ? err.message : String(err)}`, 'error');
          }
        } else {
          showToast(`剪贴板内容无效：${result.reason}`, 'error');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pasteHint, loadWorkflows, showToast]);

  const filtered = workflows.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="home-layout">
      <FileInputTrigger inputRef={fileInputRef} onFile={handleFileImport} />

      {/* Header — dev-tool style */}
      <header className="home-header">
        <div className="home-header-logo">
          <div className="home-logo-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" />
              <circle cx="12" cy="12" r="3" fill="white" stroke="none" />
            </svg>
          </div>
          <div className="home-header-title-group">
            <span className="wf-logo-text">Prism Editor</span>
            <span className="home-header-subtitle">已发布工作流</span>
          </div>
        </div>
        <div className="home-header-actions">
          <button
            className="home-import-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            Import
          </button>
        </div>
      </header>

      <main className="home-main">
        {/* Toolbar */}
        <section className="home-toolbar">
          <div className="home-toolbar-left">
            <div className="home-search-wrapper">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="home-search-icon">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                className="home-search-input"
                placeholder="Filter workflows..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </section>

        {toast && <Toast toast={toast} onDismiss={dismissToast} />}

        {isLoading && (
          <div className="ua-loading">
            <div className="ua-spinner" />
            <span>加载中…</span>
          </div>
        )}

        {loadError && (
          <section className="home-error-banner">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{loadError}</span>
            <button onClick={loadWorkflows}>重试</button>
          </section>
        )}

        {!isLoading && !loadError && filtered.length === 0 && (
          <section className="home-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="home-empty-icon">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            <p className="home-empty-title">创建你的第一个工作流</p>
            <p className="home-empty-subtitle">
              {search
                ? 'No workflows match your current filters.'
                : '还没有保存的工作流。点击下方按钮创建一个。'}
            </p>
            {!search && (
              <button
                className="home-empty-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                导入工作流文件
              </button>
            )}
          </section>
        )}

        {!isLoading && filtered.length > 0 && (
          <section className="home-workflow-list">
            {filtered.map((meta) => (
              <WorkflowRow
                key={meta.sourceId}
                meta={meta}
                onClick={() => navigateToWorkflow(meta.sourceId)}
              />
            ))}
          </section>
        )}
      </main>
    </div>
  );
};
