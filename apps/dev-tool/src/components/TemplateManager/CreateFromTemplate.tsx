// CreateFromTemplate - "从模板创建" action component
// Loads a template from IndexedDB and opens it in the editor canvas.
// canvasStore.loadFromTemplate is implemented in T7.

import React, { useState } from 'react';
import type { Template } from '@prism/shared-types';
import { TemplateRepository } from '../../modules/repositories/templateRepository';
import { useCanvasStore } from '../../store/canvasStore';

const repo = new TemplateRepository();

interface CreateFromTemplateProps {
  templateId: string;
  onCreated: () => void;
}

export const CreateFromTemplate: React.FC<CreateFromTemplateProps> = ({ templateId, onCreated }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Template | null>(null);

  const loadFromTemplate = useCanvasStore((s) => 'loadFromTemplate' in s ? (s as ReturnType<typeof useCanvasStore.getState> & { loadFromTemplate: (t: Template) => void }).loadFromTemplate : undefined);

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const template = await repo.get(templateId);
      if (!loadFromTemplate) {
        setError('编辑器未就绪，请稍后重试');
        return;
      }
      loadFromTemplate(template);
      onCreated();
    } catch {
      setError('加载模板失败');
    } finally {
      setLoading(false);
    }
  };

  // Pre-fetch preview on mount
  React.useEffect(() => {
    repo.get(templateId).then(setPreview).catch(() => {});
  }, [templateId]);

  return (
    <div className="tm-create">
      {preview && (
        <div className="tm-create-preview">
          <div className="tm-create-preview-title">{preview.name}</div>
          <div className="tm-create-preview-meta">
            {preview.nodes.length} 节点 · {preview.edges.length} 连线
            {preview.metadata?.description && ` · ${preview.metadata.description}`}
          </div>
        </div>
      )}
      {error && <div className="tm-error">{error}</div>}
      <button
        className="dialog-btn dialog-btn-primary"
        style={{ width: '100%' }}
        onClick={handleCreate}
        disabled={loading}
      >
        {loading ? '加载中…' : '从模板创建工作流'}
      </button>
    </div>
  );
};
