// SaveDialog - save workflow as draft or template

import React, { useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { TemplateRepository } from '../../modules/repositories/templateRepository';
import type { Template } from '@prism/shared-types';
import { X } from 'lucide-react';

const templateRepo = new TemplateRepository();

interface SaveDialogProps {
  onClose: () => void;
  onSavedAsTemplate?: (_templateId: string) => void;
}

type SaveMode = 'draft' | 'template';

export const SaveDialog: React.FC<SaveDialogProps> = ({ onClose, onSavedAsTemplate }) => {
  const workflowMeta = useCanvasStore((s) => s.workflowMeta);
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const groups = useCanvasStore((s) => s.groups);
  const viewport = useCanvasStore((s) => s.viewport);
  void viewport; // read from store but used only for triggering re-render
  const saveWorkflow = useCanvasStore((s) => s.saveWorkflow);

  const [saveMode, setSaveMode] = useState<SaveMode>('draft');
  const [name, setName] = useState(workflowMeta.name);
  const [templateDesc, setTemplateDesc] = useState('');
  const [templateTags, setTemplateTags] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (saveMode === 'draft') {
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
    } else {
      // Save as template
      const trimmedName = name.trim();
      if (!trimmedName) {
        setError('请输入模板名称');
        return;
      }
      if (nodes.length === 0) {
        setError('画布上没有节点，无法保存为模板');
        return;
      }

      setSaving(true);
      setError(null);
      try {
        const now = new Date().toISOString();

        // Strip runtime state from nodes (executionResult, executionError, _executingNodeId)
        const snapshotNodes = nodes.map((n) => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: {
            label: n.data.label,
            nodeType: n.data.nodeType,
            params: n.data.params,
            definition: n.data.definition,
            extraInputs: n.data.extraInputs,
            extraOutputs: n.data.extraOutputs,
            bypassed: n.data.bypassed,
            minimized: n.data.minimized,
            pinned: n.data.pinned,
          },
        }));

        const template: Template = {
          id: crypto.randomUUID(),
          name: trimmedName,
          version: '1.0.0',
          metadata: {
            description: templateDesc.trim() || undefined,
            tags: templateTags.trim()
              ? templateTags.split(',').map((t) => t.trim()).filter(Boolean)
              : undefined,
          },
          createdAt: now,
          updatedAt: now,
          workflowMeta: {
            id: crypto.randomUUID(),
            name: trimmedName,
            version: '1.0.0',
          },
          nodes: snapshotNodes,
          edges: edges.map((e) => ({
            id: e.id,
            source: e.source,
            sourceHandle: e.sourceHandle,
            target: e.target,
            targetHandle: e.targetHandle,
            type: e.type,
            data: e.data,
          })),
          groups: groups.map((g) => ({ ...g })),
          inputs: [],
          outputs: [],
        };

        await templateRepo.save(template);
        onSavedAsTemplate?.(template.id);
        onClose();
      } catch (err) {
        setError(String(err));
        setSaving(false);
      }
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
          {/* Save type selector */}
          <div className="dialog-field">
            <label className="dialog-label">保存类型</label>
            <div className="save-type-options">
              <label className={`save-type-option ${saveMode === 'draft' ? 'save-type-option--active' : ''}`}>
                <input
                  type="radio"
                  name="saveMode"
                  value="draft"
                  checked={saveMode === 'draft'}
                  onChange={() => setSaveMode('draft')}
                />
                <span className="save-type-label">保存草稿</span>
                <span className="save-type-hint">覆盖当前工作流</span>
              </label>
              <label className={`save-type-option ${saveMode === 'template' ? 'save-type-option--active' : ''}`}>
                <input
                  type="radio"
                  name="saveMode"
                  value="template"
                  checked={saveMode === 'template'}
                  onChange={() => setSaveMode('template')}
                />
                <span className="save-type-label">另存为模板</span>
                <span className="save-type-hint">创建可复用的模板资产</span>
              </label>
            </div>
          </div>

          {/* Common: name field */}
          <div className="dialog-field">
            <label className="dialog-label" htmlFor="workflow-name">
              {saveMode === 'template' ? '模板名称' : '工作流名称'}
              {saveMode === 'template' && <span className="field-required">*</span>}
            </label>
            <input
              id="workflow-name"
              className="dialog-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder={saveMode === 'template' ? '输入模板名称' : '输入工作流名称'}
              autoFocus
            />
          </div>

          {/* Template-only fields */}
          {saveMode === 'template' && (
            <>
              <div className="dialog-field">
                <label className="dialog-label" htmlFor="template-desc">模板描述（可选）</label>
                <input
                  id="template-desc"
                  className="dialog-input"
                  type="text"
                  value={templateDesc}
                  onChange={(e) => setTemplateDesc(e.target.value)}
                  placeholder="简短描述这个模板的用途"
                />
              </div>
              <div className="dialog-field">
                <label className="dialog-label" htmlFor="template-tags">标签（可选，逗号分隔）</label>
                <input
                  id="template-tags"
                  className="dialog-input"
                  type="text"
                  value={templateTags}
                  onChange={(e) => setTemplateTags(e.target.value)}
                  placeholder="如：人像, 电商, 批量处理"
                />
              </div>
              <div className="dialog-info">
                <span className="dialog-info-label">将保存</span>
                <span className="dialog-info-value">
                  {nodes.length} 个节点 · {edges.length} 条连线 · {groups.length} 个分组
                </span>
              </div>
            </>
          )}

          {/* Draft-only: show workflow ID */}
          {saveMode === 'draft' && (
            <div className="dialog-info">
              <span className="dialog-info-label">ID</span>
              <span className="dialog-info-value">{workflowMeta.id}</span>
            </div>
          )}

          {error && <div className="dialog-error">{error}</div>}
        </div>

        <div className="dialog-footer">
          <button className="dialog-btn dialog-btn-secondary" onClick={onClose} disabled={saving}>
            取消
          </button>
          <button
            className={`dialog-btn ${saveMode === 'template' ? 'dialog-btn-primary' : 'dialog-btn-primary'}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '保存中…' : saveMode === 'template' ? '保存模板' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
};
