// TemplateList - displays a list of saved templates

import React, { useState, useEffect } from 'react';
import type { TemplateSummary } from '@prism/shared-types';
import { TemplateRepository } from '../../modules/repositories/templateRepository';
import { FileText, Trash2, Clock } from 'lucide-react';

const repo = new TemplateRepository();

interface TemplateListProps {
  onSelect: (_id: string) => void;
  onDelete: (_id: string) => void;
  selectedId?: string;
}

export const TemplateList: React.FC<TemplateListProps> = ({ onSelect, onDelete: _onDelete, selectedId }) => {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    repo.list()
      .then(setTemplates)
      .catch(() => setError('加载模板失败'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('确定要删除这个模板吗？已派生的工作流不会受影响。')) return;
    try {
      await repo.delete(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch {
      setError('删除失败');
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="tm-list-state">
        <div className="tm-spinner" />
        <span>加载中…</span>
      </div>
    );
  }

  if (error) {
    return <div className="tm-list-state tm-list-state--error">{error}</div>;
  }

  if (templates.length === 0) {
    return (
      <div className="tm-list-state tm-list-state--empty">
        <FileText size={32} strokeWidth={1.5} />
        <p>暂无模板</p>
        <span>保存工作流时选择「另存为模板」即可创建</span>
      </div>
    );
  }

  return (
    <div className="tm-list">
      {templates.map((t) => (
        <div
          key={t.id}
          className={`tm-card ${selectedId === t.id ? 'tm-card--selected' : ''}`}
          onClick={() => onSelect(t.id)}
        >
          <div className="tm-card-body">
            <div className="tm-card-title">{t.name}</div>
            {t.metadata?.description && (
              <div className="tm-card-desc">{t.metadata.description}</div>
            )}
            <div className="tm-card-meta">
              <span className="tm-card-stat">
                {t.nodeCount} 节点 · {t.edgeCount} 连线
              </span>
              <span className="tm-card-date">
                <Clock size={10} />
                {formatDate(t.updatedAt)}
              </span>
            </div>
            {t.metadata?.tags && t.metadata.tags.length > 0 && (
              <div className="tm-card-tags">
                {t.metadata.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="tm-tag">{tag}</span>
                ))}
              </div>
            )}
          </div>
          <button
            className="tm-card-delete"
            title="删除模板"
            onClick={(e) => handleDelete(e, t.id)}
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}
    </div>
  );
};
