import React from 'react';
import {
  type DesignParam,
  type ProductTemplateAsset,
  type ProductTemplateInput,
} from '@prism/shared-types';
import { Plus, Trash2, X } from 'lucide-react';
import { useProductTemplateStore } from '../../store/productTemplateStore';

function createInput(): ProductTemplateInput {
  return {
    id: crypto.randomUUID(),
    name: 'input',
    type: 'string',
    label: 'Input',
    required: false,
  };
}

function createDesignParam(): DesignParam {
  return {
    id: crypto.randomUUID(),
    name: 'param',
    type: 'string',
    label: 'Parameter',
    required: false,
  };
}

function createAsset(): ProductTemplateAsset {
  return {
    id: crypto.randomUUID(),
    name: 'asset',
    type: 'image',
    required: false,
  };
}

export const ProductTemplateEditor: React.FC = () => {
  const {
    currentProductTemplate,
    isEditorOpen,
    isLoading,
    isDirty,
    closeEditor,
    updateProductTemplate,
    saveProductTemplate,
  } = useProductTemplateStore();

  if (!isEditorOpen || !currentProductTemplate) {
    return null;
  }

  const template = currentProductTemplate;

  const updateInput = (index: number, patch: Partial<ProductTemplateInput>) => {
    const inputs = [...template.inputs];
    inputs[index] = { ...inputs[index], ...patch };
    updateProductTemplate({ inputs });
  };

  const updateDesignParam = (index: number, patch: Partial<DesignParam>) => {
    const designParams = [...template.designParams];
    designParams[index] = { ...designParams[index], ...patch };
    updateProductTemplate({ designParams });
  };

  const updateAsset = (index: number, patch: Partial<ProductTemplateAsset>) => {
    const assets = [...template.assets];
    assets[index] = { ...assets[index], ...patch };
    updateProductTemplate({ assets });
  };

  return (
    <div className="dialog-overlay" onClick={(event) => event.target === event.currentTarget && closeEditor()}>
      <div className="dialog dialog-wide" role="dialog" aria-modal="true">
        <div className="dialog-header">
          <span className="dialog-title">Product Template Editor</span>
          <button className="dialog-close" onClick={closeEditor} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="dialog-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
          <div className="new-form-grid">
            <div className="new-field new-field--full">
              <label className="new-label">Name</label>
              <input
                className="new-input"
                value={template.name}
                onChange={(event) => updateProductTemplate({ name: event.target.value })}
              />
            </div>

            <div className="new-field new-field--full">
              <label className="new-label">Description</label>
              <textarea
                className="new-textarea"
                value={template.description ?? ''}
                onChange={(event) => updateProductTemplate({ description: event.target.value })}
                rows={3}
              />
            </div>

            <div className="new-field new-field--full">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="new-label">Inputs</label>
                <button
                  type="button"
                  className="dialog-btn dialog-btn-secondary"
                  onClick={() => updateProductTemplate({ inputs: [...template.inputs, createInput()] })}
                >
                  <Plus size={14} /> Add Input
                </button>
              </div>
              {template.inputs.map((input, index) => (
                <div key={input.id} className="workflow-list-item">
                  <div className="workflow-list-info" style={{ gap: 8 }}>
                    <input
                      className="new-input"
                      value={input.name}
                      onChange={(event) => updateInput(index, { name: event.target.value })}
                    />
                    <input
                      className="new-input"
                      value={input.label ?? ''}
                      onChange={(event) => updateInput(index, { label: event.target.value })}
                    />
                    <select
                      className="new-select"
                      value={input.type}
                      onChange={(event) => updateInput(index, { type: event.target.value as ProductTemplateInput['type'] })}
                    >
                      <option value="string">string</option>
                      <option value="number">number</option>
                      <option value="boolean">boolean</option>
                      <option value="image">image</option>
                      <option value="mask">mask</option>
                      <option value="file">file</option>
                      <option value="json">json</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    className="workflow-list-btn workflow-list-btn-danger"
                    onClick={() =>
                      updateProductTemplate({ inputs: template.inputs.filter((_, currentIndex) => currentIndex !== index) })
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="new-field new-field--full">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="new-label">Design Params</label>
                <button
                  type="button"
                  className="dialog-btn dialog-btn-secondary"
                  onClick={() =>
                    updateProductTemplate({ designParams: [...template.designParams, createDesignParam()] })
                  }
                >
                  <Plus size={14} /> Add Param
                </button>
              </div>
              {template.designParams.map((param, index) => (
                <div key={param.id} className="workflow-list-item">
                  <div className="workflow-list-info" style={{ gap: 8 }}>
                    <input
                      className="new-input"
                      value={param.name}
                      onChange={(event) => updateDesignParam(index, { name: event.target.value })}
                    />
                    <input
                      className="new-input"
                      value={param.label ?? ''}
                      onChange={(event) => updateDesignParam(index, { label: event.target.value })}
                    />
                    <select
                      className="new-select"
                      value={param.type}
                      onChange={(event) => updateDesignParam(index, { type: event.target.value as DesignParam['type'] })}
                    >
                      <option value="string">string</option>
                      <option value="number">number</option>
                      <option value="boolean">boolean</option>
                      <option value="select">select</option>
                      <option value="color">color</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    className="workflow-list-btn workflow-list-btn-danger"
                    onClick={() =>
                      updateProductTemplate({
                        designParams: template.designParams.filter((_, currentIndex) => currentIndex !== index),
                      })
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="new-field new-field--full">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="new-label">Assets</label>
                <button
                  type="button"
                  className="dialog-btn dialog-btn-secondary"
                  onClick={() => updateProductTemplate({ assets: [...template.assets, createAsset()] })}
                >
                  <Plus size={14} /> Add Asset
                </button>
              </div>
              {template.assets.map((asset, index) => (
                <div key={asset.id} className="workflow-list-item">
                  <div className="workflow-list-info" style={{ gap: 8 }}>
                    <input
                      className="new-input"
                      value={asset.name}
                      onChange={(event) => updateAsset(index, { name: event.target.value })}
                    />
                    <select
                      className="new-select"
                      value={asset.type}
                      onChange={(event) => updateAsset(index, { type: event.target.value as ProductTemplateAsset['type'] })}
                    >
                      <option value="image">image</option>
                      <option value="mask">mask</option>
                      <option value="material">material</option>
                      <option value="font">font</option>
                      <option value="file">file</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    className="workflow-list-btn workflow-list-btn-danger"
                    onClick={() =>
                      updateProductTemplate({ assets: template.assets.filter((_, currentIndex) => currentIndex !== index) })
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="new-field">
              <label className="new-label">Preview Width</label>
              <input
                type="number"
                className="new-input"
                value={template.preview.canvas.width ?? ''}
                onChange={(event) =>
                  updateProductTemplate({
                    preview: {
                      ...template.preview,
                      canvas: {
                        ...template.preview.canvas,
                        width: Number(event.target.value),
                      },
                    },
                  })
                }
              />
            </div>

            <div className="new-field">
              <label className="new-label">Preview Height</label>
              <input
                type="number"
                className="new-input"
                value={template.preview.canvas.height ?? ''}
                onChange={(event) =>
                  updateProductTemplate({
                    preview: {
                      ...template.preview,
                      canvas: {
                        ...template.preview.canvas,
                        height: Number(event.target.value),
                      },
                    },
                  })
                }
              />
            </div>

            <div className="new-field">
              <label className="new-label">Background</label>
              <input
                className="new-input"
                value={template.preview.canvas.background ?? ''}
                onChange={(event) =>
                  updateProductTemplate({
                    preview: {
                      ...template.preview,
                      canvas: {
                        ...template.preview.canvas,
                        background: event.target.value,
                      },
                    },
                  })
                }
              />
            </div>

            <div className="new-field">
              <label className="new-label">Fit</label>
              <select
                className="new-select"
                value={template.preview.canvas.fit ?? 'contain'}
                onChange={(event) =>
                  updateProductTemplate({
                    preview: {
                      ...template.preview,
                      canvas: {
                        ...template.preview.canvas,
                        fit: event.target.value as NonNullable<typeof template.preview.canvas.fit>,
                      },
                    },
                  })
                }
              >
                <option value="contain">contain</option>
                <option value="cover">cover</option>
                <option value="stretch">stretch</option>
              </select>
            </div>

            <div className="new-field">
              <label className="new-label">Output Format</label>
              <select
                className="new-select"
                value={template.production.output.format ?? 'png'}
                onChange={(event) =>
                  updateProductTemplate({
                    production: {
                      ...template.production,
                      output: {
                        ...template.production.output,
                        format: event.target.value as NonNullable<typeof template.production.output.format>,
                      },
                    },
                  })
                }
              >
                <option value="png">png</option>
                <option value="jpeg">jpeg</option>
                <option value="webp">webp</option>
                <option value="pdf">pdf</option>
                <option value="svg">svg</option>
              </select>
            </div>

            <div className="new-field">
              <label className="new-label">DPI</label>
              <input
                type="number"
                className="new-input"
                value={template.production.output.dpi ?? ''}
                onChange={(event) =>
                  updateProductTemplate({
                    production: {
                      ...template.production,
                      output: {
                        ...template.production.output,
                        dpi: Number(event.target.value),
                      },
                    },
                  })
                }
              />
            </div>
          </div>
        </div>

        <div className="dialog-footer">
          <span style={{ marginRight: 'auto', opacity: 0.75 }}>
            {isDirty ? 'Unsaved changes' : 'Saved'}
          </span>
          <button className="dialog-btn dialog-btn-secondary" onClick={closeEditor}>
            Cancel
          </button>
          <button
            className="dialog-btn dialog-btn-primary"
            onClick={() => void saveProductTemplate()}
            disabled={isLoading}
          >
            Save Product Template
          </button>
        </div>
      </div>
    </div>
  );
};
