// SaveDialog - modal for naming and saving a workflow

import React, { useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { X } from 'lucide-react';

interface SaveDialogProps {
  onClose: () => void;
}

export const SaveDialog: React.FC<SaveDialogProps> = ({ onClose }) => {
  const workflowMeta = useCanvasStore((s) => s.workflowMeta);
  const saveWorkflow = useCanvasStore((s) => s.saveWorkflow);
  const [name, setName] = useState(workflowMeta.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('请输入工作流名称');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveWorkflow(name.trim());
      onClose();
    } catch (err) {
      setError(String(err));
      setSaving(false);
    }
  };

  return (
    <div className="dialog-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true">
        <div className="dialog-header">
          <span className="dialog-title">保存工作流</span>
          <button className="dialog-close" onClick={onClose} aria-label="关闭"><X size={16} /></button>
        </div>

        <div className="dialog-body">
          <div className="dialog-field">
            <label className="dialog-label" htmlFor="workflow-name">工作流名称</label>
            <input
              id="workflow-name"
              className="dialog-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="输入工作流名称"
              autoFocus
            />
          </div>

          {error && <div className="dialog-error">{error}</div>}

          <div className="dialog-info">
            <span className="dialog-info-label">ID</span>
            <span className="dialog-info-value">{workflowMeta.id}</span>
          </div>
        </div>

        <div className="dialog-footer">
          <button className="dialog-btn dialog-btn-secondary" onClick={onClose} disabled={saving}>
            取消
          </button>
          <button className="dialog-btn dialog-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
};
