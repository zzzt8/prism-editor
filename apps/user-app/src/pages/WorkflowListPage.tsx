// WorkflowListPage - displays all published workflows available to the user

import React, { useEffect } from 'react';
import { useUserAppStore, type PublishedWorkflowMeta } from '../store/publishedStore';
import { navigateToWorkflow } from '../router';

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

export const WorkflowListPage: React.FC = () => {
  const { workflows, isLoading, loadError, loadWorkflows } = useUserAppStore();

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  return (
    <div className="ua-page ua-list-page">
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
          </div>
        )}
      </div>
    </div>
  );
};
