// OpenDialog - modal for listing and loading saved workflows

import React, { useEffect } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { useWorkflowStore } from '../../store/workflowStore';

interface OpenDialogProps {
  onClose: () => void;
}

export const OpenDialog: React.FC<OpenDialogProps> = ({ onClose }) => {
  const loadWorkflowFromStore = useCanvasStore((s) => s.loadWorkflowFromStore);
  const isDirty = useCanvasStore((s) => s.isDirty);
  const { savedWorkflows, isLoading, error, loadSavedWorkflows, deleteSavedWorkflow } = useWorkflowStore();

  useEffect(() => {
    loadSavedWorkflows();
  }, [loadSavedWorkflows]);

  const handleOpen = async (id: string) => {
    if (isDirty && !window.confirm('当前有未保存的更改，确定要打开其他工作流吗？')) return;
    try {
      await loadWorkflowFromStore(id);
      onClose();
    } catch {
      // load error handled by store
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`确定要删除工作流"${name}"吗？此操作不可撤销。`)) return;
    await deleteSavedWorkflow(id);
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="dialog-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog dialog-wide" role="dialog" aria-modal="true">
        <div className="dialog-header">
          <span className="dialog-title">打开工作流</span>
          <button className="dialog-close" onClick={onClose} aria-label="关闭">✕</button>
        </div>

        <div className="dialog-body">
          {isLoading && (
            <div className="dialog-loading">加载中…</div>
          )}

          {!isLoading && error && (
            <div className="dialog-error">{error}</div>
          )}

          {!isLoading && !error && savedWorkflows.length === 0 && (
            <div className="dialog-empty">
              <span className="dialog-empty-icon">◇</span>
              <span>暂无已保存的工作流</span>
            </div>
          )}

          {!isLoading && !error && savedWorkflows.length > 0 && (
            <div className="workflow-list">
              {savedWorkflows.map((wf) => (
                <div key={wf.id} className="workflow-list-item">
                  <div className="workflow-list-info">
                    <span className="workflow-list-name">{wf.name}</span>
                    <span className="workflow-list-date">{formatDate(wf.updatedAt)}</span>
                  </div>
                  <div className="workflow-list-actions">
                    <button
                      className="workflow-list-btn workflow-list-btn-danger"
                      onClick={() => handleDelete(wf.id, wf.name)}
                      title="删除"
                    >
                      删除
                    </button>
                    <button
                      className="workflow-list-btn workflow-list-btn-primary"
                      onClick={() => handleOpen(wf.id)}
                      title="打开"
                    >
                      打开
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dialog-footer">
          <button className="dialog-btn dialog-btn-secondary" onClick={onClose}>
            取消
          </button>
        </div>
      </div>
    </div>
  );
};
