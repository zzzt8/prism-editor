// TemplateManager - modal for managing and creating workflows from templates
// DEPRECATED: Will be removed in a future version. Use SnippetFragment system instead.

import React, { useState } from 'react';
import type { TemplateSummary, Template } from '@prism/shared-types';
import { TemplateRepository } from '../../modules/repositories/templateRepository';
import { useCanvasStore } from '../../store/canvasStore';
import { X, FileText } from 'lucide-react';

const repo = new TemplateRepository();

interface TemplateManagerProps {
  onClose: () => void;
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({ onClose }) => {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadFromTemplate = useCanvasStore((s) =>
    'loadFromTemplate' in s
      ? (s as ReturnType<typeof useCanvasStore.getState> & { loadFromTemplate: (_t: Template) => void }).loadFromTemplate
      : undefined
  ) as ((t: Template) => void) | undefined;

  // Load template list
  React.useEffect(() => {
    repo.list()
      .then(setTemplates)
      .catch(() => setError('加载模板失败'))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (id: string) => {
    setSelected(id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个模板吗？已派生的工作流不会受影响。')) return;
    try {
      await repo.delete(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      if (selected === id) setSelected(null);
    } catch {
      setError('删除失败');
    }
  };

  const handleCreateFromTemplate = async () => {
    if (!selected || !loadFromTemplate) return;
    setCreating(true);
    setCreateError(null);
    try {
      const template = await repo.get(selected);
      loadFromTemplate(template as Template);
      onClose();
    } catch {
      setCreateError('加载模板失败');
    } finally {
      setCreating(false);
    }
  };

  const selectedTemplate = templates.find((t) => t.id === selected);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="dialog-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog dialog-wide" role="dialog" aria-modal="true">
        <div className="dialog-header">
          <span className="dialog-title">模板管理</span>
          <button className="dialog-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="tm-layout">
          {/* Left: Template list */}
          <div className="tm-list-panel">
            <div className="tm-list-header">
              <span className="tm-list-title">模板列表</span>
              <span className="tm-list-count">{templates.length}</span>
            </div>

            {loading ? (
              <div className="tm-list-state">
                <div className="tm-spinner" />
                <span>加载中…</span>
              </div>
            ) : error ? (
              <div className="tm-list-state tm-list-state--error">{error}</div>
            ) : templates.length === 0 ? (
              <div className="tm-list-state tm-list-state--empty">
                <FileText size={28} strokeWidth={1.5} />
                <p>暂无模板</p>
                <span>保存工作流时选择「另存为模板」即可创建</span>
              </div>
            ) : (
              <div className="tm-list-scroll">
                {templates.map((t) => (
                  <div
                    key={t.id}
                    className={`tm-list-item ${selected === t.id ? 'tm-list-item--selected' : ''}`}
                    onClick={() => handleSelect(t.id)}
                  >
                    <div className="tm-list-item-icon">
                      <FileText size={14} strokeWidth={1.5} />
                    </div>
                    <div className="tm-list-item-body">
                      <div className="tm-list-item-name">{t.name}</div>
                      <div className="tm-list-item-meta">
                        {t.nodeCount} 节点 · {t.edgeCount} 连线 · {formatDate(t.updatedAt)}
                      </div>
                    </div>
                    <button
                      className="tm-list-item-delete"
                      title="删除"
                      onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Detail / Create panel */}
          <div className="tm-detail-panel">
            {selectedTemplate ? (
              <>
                <div className="tm-detail-header">
                  <div className="tm-detail-title">{selectedTemplate.name}</div>
                  {selectedTemplate.metadata?.description && (
                    <div className="tm-detail-desc">{selectedTemplate.metadata.description}</div>
                  )}
                  <div className="tm-detail-stats">
                    <span>v{selectedTemplate.version}</span>
                    <span>{selectedTemplate.nodeCount} 节点</span>
                    <span>{selectedTemplate.edgeCount} 连线</span>
                    <span>创建于 {formatDate(selectedTemplate.createdAt)}</span>
                  </div>
                  {selectedTemplate.metadata?.tags && selectedTemplate.metadata.tags.length > 0 && (
                    <div className="tm-detail-tags">
                      {selectedTemplate.metadata.tags.map((tag) => (
                        <span key={tag} className="tm-tag">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                {createError && <div className="tm-error">{createError}</div>}
                <button
                  className="dialog-btn dialog-btn-primary"
                  style={{ width: '100%', marginTop: 'auto' }}
                  onClick={handleCreateFromTemplate}
                  disabled={creating}
                >
                  {creating ? '加载中…' : '从模板创建工作流'}
                </button>
              </>
            ) : (
              <div className="tm-detail-empty">
                <FileText size={32} strokeWidth={1} />
                <p>选择一个模板查看详情</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .tm-layout {
          display: flex;
          gap: 1px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 6px;
          overflow: hidden;
          min-height: 400px;
        }

        .tm-list-panel {
          width: 240px;
          flex-shrink: 0;
          background: var(--bg-base);
          display: flex;
          flex-direction: column;
        }

        .tm-list-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .tm-list-title {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-muted);
        }

        .tm-list-count {
          font-size: 11px;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.06);
          padding: 1px 6px;
          border-radius: 10px;
        }

        .tm-list-scroll {
          flex: 1;
          overflow-y: auto;
        }

        .tm-list-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          cursor: pointer;
          transition: background 0.1s;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        }

        .tm-list-item:hover {
          background: rgba(255, 255, 255, 0.04);
        }

        .tm-list-item--selected {
          background: rgba(168, 85, 247, 0.12);
          border-left: 2px solid var(--accent);
          padding-left: 10px;
        }

        .tm-list-item-icon {
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .tm-list-item-body {
          flex: 1;
          min-width: 0;
        }

        .tm-list-item-name {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .tm-list-item-meta {
          font-size: 10px;
          color: var(--text-muted);
          margin-top: 1px;
        }

        .tm-list-item-delete {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 14px;
          cursor: pointer;
          padding: 2px 4px;
          border-radius: 4px;
          opacity: 0;
          transition: opacity 0.1s, color 0.1s;
          flex-shrink: 0;
        }

        .tm-list-item:hover .tm-list-item-delete {
          opacity: 1;
        }

        .tm-list-item-delete:hover {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
        }

        .tm-detail-panel {
          flex: 1;
          background: var(--bg-base);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-width: 0;
        }

        .tm-detail-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 10px;
          color: var(--text-muted);
          font-size: 13px;
        }

        .tm-detail-header {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .tm-detail-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .tm-detail-desc {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .tm-detail-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          font-size: 11px;
          color: var(--text-muted);
        }

        .tm-detail-stats span {
          background: rgba(255, 255, 255, 0.04);
          padding: 2px 8px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .tm-detail-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 4px;
        }

        .tm-tag {
          font-size: 10px;
          padding: 2px 7px;
          background: rgba(168, 85, 247, 0.12);
          color: #c084fc;
          border-radius: 10px;
          border: 1px solid rgba(168, 85, 247, 0.2);
        }

        .tm-error {
          font-size: 12px;
          color: #ef4444;
          padding: 6px 10px;
          background: rgba(239, 68, 68, 0.08);
          border-radius: var(--radius-sm);
        }

        .tm-list-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 32px 16px;
          font-size: 12px;
          color: var(--text-muted);
          text-align: center;
        }

        .tm-list-state--empty {
          color: var(--text-muted);
        }

        .tm-list-state--error {
          color: #ef4444;
        }

        .tm-list-state p {
          margin: 0;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .tm-list-state span {
          font-size: 11px;
        }

        .tm-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: tm-spin 0.6s linear infinite;
        }

        @keyframes tm-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
