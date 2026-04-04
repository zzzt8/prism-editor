// WorkflowListPage - displays all published workflows available to the user

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useUserAppStore, type PublishedWorkflowMeta } from '../store/publishedStore';
import { navigateToWorkflow } from '../router';
import { importWorkflowFromFile, importWorkflowFromClipboard } from '../utils/workflowImport';
import { syncWorkflowToLocal } from '../store/publishedStore';

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

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── WorkflowCard ─────────────────────────────────────────────────────────────

function WorkflowCard({ meta, onClick }: { meta: PublishedWorkflowMeta; onClick: () => void }) {
  return (
    <div className="ua-workflow-card" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}>
      <div className="ua-card-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="M8 12h8M8 8h8M8 16h5" />
        </svg>
      </div>
      <div className="ua-card-info">
        <div className="ua-card-name">{meta.name}</div>
        {meta.description && (
          <div className="ua-card-desc">{meta.description}</div>
        )}
        <div className="ua-card-meta">
          <span className="ua-card-version">v{meta.version}</span>
          <span className="ua-card-sep">·</span>
          <span className="ua-card-source">{meta.sourceName}</span>
        </div>
        <div className="ua-card-date">{formatDate(meta.publishedAt)}</div>
      </div>
      <div className="ua-card-io">
        <span className="ua-io-badge ua-io-badge--in">{meta.inputCount} 输入</span>
        <span className="ua-io-badge ua-io-badge--out">{meta.outputCount} 输出</span>
      </div>
      <div className="ua-card-arrow">›</div>
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
          // Reset so the same file can be selected again
          e.target.value = '';
        }
      }}
    />
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export const WorkflowListPage: React.FC = () => {
  const { workflows, isLoading, loadError, loadWorkflows } = useUserAppStore();

  const [toast, setToast] = useState<ToastState | null>(null);
  const [pasteHint, setPasteHint] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = useCallback((message: string, type: ToastState['type'] = 'success') => {
    setToast({ message, type });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  // Initial load
  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  // Show paste hint when list is empty after loading
  useEffect(() => {
    if (!isLoading && !loadError && workflows.length === 0) {
      setPasteHint(true);
    }
  }, [isLoading, loadError, workflows.length]);

  // ── Import from file ─────────────────────────────────────────────────────
  const handleFileImport = useCallback(async (file: File) => {
    console.log('[WorkflowListPage] handleFileImport:', file.name, file.size);
    const result = await importWorkflowFromFile(file);
    console.log('[WorkflowListPage] importWorkflowFromFile:', result.success ? 'OK' : 'FAILED', result.success ? result.workflow.name : result.reason);
    if (result.success) {
      try {
        await syncWorkflowToLocal(result.workflow);
        console.log('[WorkflowListPage] syncWorkflowToLocal OK');
        loadWorkflows();
        showToast(`已导入「${result.workflow.name}」`, 'success');
      } catch (err) {
        console.error('[WorkflowListPage] syncWorkflowToLocal ERROR:', err);
        showToast(`保存失败：${err instanceof Error ? err.message : String(err)}`, 'error');
      }
    } else {
      showToast(`导入失败：${result.reason}`, 'error');
    }
  }, [loadWorkflows, showToast]);

  // ── Ctrl+V paste detection ───────────────────────────────────────────────
  // Only active when the list is empty (pasteHint is shown)
  useEffect(() => {
    if (!pasteHint) return;

    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ctrl+V on Windows/Linux, Cmd+V on Mac
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        // Don't intercept if focus is in a text input
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

  return (
    <div className="ua-page ua-list-page">
      <FileInputTrigger inputRef={fileInputRef} onFile={handleFileImport} />

      <div className="ua-page-header">
        <div className="ua-logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" />
          </svg>
          <span>Prism Editor</span>
        </div>
        <div className="ua-page-title">
          <h1>已发布工作流</h1>
          <p>选择一个工作流开始处理图像</p>
        </div>
      </div>

      <div className="ua-page-body">
        {/* Toast notifications */}
        {toast && <Toast toast={toast} onDismiss={dismissToast} />}

        {isLoading && (
          <div className="ua-loading">
            <div className="ua-spinner" />
            <span>加载中…</span>
          </div>
        )}

        {loadError && (
          <div className="ua-error-box">
            <span>加载失败：{loadError}</span>
            <button onClick={loadWorkflows}>重试</button>
          </div>
        )}

        {!isLoading && !loadError && workflows.length === 0 && (
          <div className="ua-empty-state">
            <div className="ua-empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <path d="M8 12h8M8 8h8M8 16h5" />
              </svg>
            </div>
            <div className="ua-empty-title">暂无可用工作流</div>
            <div className="ua-empty-sub">请在开发者工具中创建并发布工作流</div>
            <div className="ua-empty-actions">
              <button
                className="ua-btn ua-btn--secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                上传工作流文件
              </button>
              {pasteHint && (
                <div className="ua-paste-hint">
                  或切换到开发者工具发布后，按 <kbd>Ctrl+V</kbd> 从剪贴板导入
                </div>
              )}
            </div>
          </div>
        )}

        {!isLoading && workflows.length > 0 && (
          <div className="ua-workflow-list">
            {workflows.map((meta) => (
              <WorkflowCard
                key={meta.sourceId}
                meta={meta}
                onClick={() => navigateToWorkflow(meta.sourceId)}
              />
            ))}
            {/* Import more */}
            <button
              className="ua-import-more-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              + 导入更多工作流
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
