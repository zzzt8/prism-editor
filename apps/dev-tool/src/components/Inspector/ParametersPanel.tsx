// ParametersPanel — parameter editing panel for Inspector
// Includes ParamField and ImageFileField widgets (migrated from ParamPanel.tsx)

import React, { useCallback, useState, useRef } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import type { ParamDefinition, ParamOption } from '@prism/shared-types';
import { CircleDot } from 'lucide-react';

// ── ParamField ──────────────────────────────────────────────────────────────

function ParamField({
  param,
  value,
  onChange,
}: {
  param: ParamDefinition;
  value: unknown;
  onChange: (_id: string, _val: unknown) => void;
}) {
  const handleChange = (val: unknown) => onChange(param.id, val);

  if (param.type === 'image-file') {
    return <ImageFileField param={param} value={value} onChange={onChange} />;
  }

  if (param.type === 'string') {
    return (
      <div className="param-row">
        <label className="param-label" title={param.description}>
          {param.name}
          {param.required && <span className="param-label-required">*</span>}
        </label>
        {param.description && (
          <span className="param-description">{param.description}</span>
        )}
        <input
          className="param-input"
          type="text"
          value={(value as string) ?? ''}
          placeholder={String(param.default ?? '')}
          onChange={(e) => handleChange(e.target.value)}
        />
      </div>
    );
  }

  if (param.type === 'number') {
    const numVal = typeof value === 'number' ? value : (param.default as number ?? 0);
    const min = param.min ?? 0;
    const max = param.max ?? 100;
    const step = param.step ?? 1;
    // Always show number input; slider appears alongside when both min and max are defined
    const hasRange = param.min !== undefined && param.max !== undefined;

    return (
      <div className="param-row">
        <label className="param-label" title={param.description}>
          {param.name}
          {param.required && <span className="param-label-required">*</span>}
        </label>
        {param.description && (
          <span className="param-description">{param.description}</span>
        )}
        <input
          className="param-number-input"
          type="number"
          min={min}
          max={max}
          step={step}
          value={numVal}
          onChange={(e) => handleChange(Number(e.target.value))}
        />
        {hasRange && (
          <input
            className="param-slider"
            type="range"
            min={min}
            max={max}
            step={step}
            value={numVal}
            onChange={(e) => handleChange(Number(e.target.value))}
          />
        )}
      </div>
    );
  }

  if (param.type === 'select') {
    return (
      <div className="param-row">
        <label className="param-label" title={param.description}>
          {param.name}
          {param.required && <span className="param-label-required">*</span>}
        </label>
        {param.description && (
          <span className="param-description">{param.description}</span>
        )}
        <select
          className="param-select"
          value={(value as string) ?? (param.default as string) ?? ''}
          onChange={(e) => handleChange(e.target.value)}
        >
          {(param.options ?? []).map((opt: ParamOption) => (
            <option key={String(opt.value)} value={String(opt.value)}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (param.type === 'boolean') {
    const boolVal = typeof value === 'boolean' ? value : (param.default as boolean ?? false);
    return (
      <div className="param-row">
        <div className="param-toggle-row">
          <label className="param-label" title={param.description}>
            {param.name}
          </label>
          <span className="param-toggle">
            <input
              type="checkbox"
              checked={boolVal}
              onChange={(e) => handleChange(e.target.checked)}
            />
            <span className="param-toggle-track" />
          </span>
        </div>
        {param.description && (
          <span className="param-description">{param.description}</span>
        )}
      </div>
    );
  }

  // Fallback: display-only
  return (
    <div className="param-row">
      <label className="param-label">{param.name}</label>
      <span className="param-description">
        {param.description ?? String(value ?? '')}
      </span>
    </div>
  );
}

// ── ImageFileField ───────────────────────────────────────────────────────────

interface ImageFileValue {
  dataUrl: string;
  width: number;
  height: number;
  fileName: string;
}

function ImageFileField({
  param,
  value,
  onChange,
}: {
  param: ParamDefinition;
  value: unknown;
  onChange: (_id: string, _val: unknown) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const imageValue = value as ImageFileValue | undefined;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        onChange(param.id, {
          dataUrl,
          width: img.naturalWidth,
          height: img.naturalHeight,
          fileName: file.name,
        });
      };
      img.onerror = () => {
        onChange(param.id, {
          dataUrl,
          width: 0,
          height: 0,
          fileName: file.name,
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="param-row">
      <label className="param-label">{param.name}</label>
      {param.description && (
        <span className="param-description">{param.description}</span>
      )}

      {imageValue?.dataUrl ? (
        <div className="image-file-preview">
          <div className="image-file-preview-header">
            <span className="image-file-name" title={imageValue.fileName}>
              {imageValue.fileName}
            </span>
            <span className="image-file-resolution">
              {imageValue.width > 0
                ? `${imageValue.width} × ${imageValue.height}`
                : '—'}
            </span>
          </div>
          <img
            src={imageValue.dataUrl}
            alt={imageValue.fileName}
            className="image-file-img"
          />
          <button
            type="button"
            className="image-file-change-btn"
            onClick={() => inputRef.current?.click()}
          >
            更换图片
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="image-file-upload-btn"
          onClick={() => inputRef.current?.click()}
        >
          选择图片
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
    </div>
  );
}

// ── ParametersPanel ──────────────────────────────────────────────────────────

interface ParametersPanelProps {
  nodeId: string;
}

export const ParametersPanel: React.FC<ParametersPanelProps> = ({ nodeId }) => {
  const nodes = useCanvasStore((s) => s.nodes);
  const updateNodeParams = useCanvasStore((s) => s.updateNodeParams);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);

  // Hooks must be called before any early returns
  const [editingAlias, setEditingAlias] = useState(false);
  const [aliasValue, setAliasValue] = useState('');

  const node = nodes.find((n) => n.id === nodeId);
  const nodeData = node?.data;
  const definition = nodeData?.definition;
  const params = nodeData?.params ?? {};
  const label = nodeData?.label ?? '';

  const handleAliasSave = useCallback(() => {
    updateNodeData(nodeId, { label: aliasValue });
    setEditingAlias(false);
  }, [nodeId, aliasValue, updateNodeData]);

  const handleAliasKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') handleAliasSave();
      if (e.key === 'Escape') {
        setAliasValue(label ?? '');
        setEditingAlias(false);
      }
    },
    [handleAliasSave, label]
  );

  const handleChange = useCallback(
    (id: string, value: unknown) => {
      updateNodeParams(nodeId, {
        ...(params ?? {}),
        [id]: value,
      });
    },
    [nodeId, params, updateNodeParams]
  );

  if (!node) return null;

  // Show image thumbnail for image-file params
  const imageFileValue = params['imageFile'];
  const imageMeta = imageFileValue as
    | { dataUrl?: string; width?: number; height?: number; fileName?: string }
    | undefined;

  if (!definition) {
    return (
      <div className="inspector-panel-body inspector-panel-empty">
        <CircleDot size={16} className="param-panel-empty-icon" />
        <span>此节点无定义信息</span>
      </div>
    );
  }

  const hasParams = definition.params && definition.params.length > 0;

  return (
    <div className="inspector-panel-body">
      {/* Node alias (editable inline) */}
      <div className="param-panel-section">
        <div className="inspector-alias-row">
          {editingAlias ? (
            <input
              className="param-input inspector-alias-input"
              type="text"
              value={aliasValue}
              autoFocus
              onChange={(e) => setAliasValue(e.target.value)}
              onBlur={handleAliasSave}
              onKeyDown={handleAliasKeyDown}
            />
          ) : (
            <span
              className="inspector-alias-display"
              onClick={() => {
                setAliasValue(label);
                setEditingAlias(true);
              }}
              title="点击编辑别名"
            >
              {label}
            </span>
          )}
        </div>

        {/* Image thumbnail for image-file type */}
        {imageMeta?.dataUrl && (
          <div className="inspector-image-thumb">
            <img
              src={imageMeta.dataUrl}
              alt={imageMeta.fileName ?? 'preview'}
              className="inspector-image-thumb-img"
            />
            <div className="inspector-image-thumb-meta">
              <span className="inspector-image-thumb-name" title={imageMeta.fileName}>
                {imageMeta.fileName}
              </span>
              <span className="inspector-image-thumb-resolution">
                {imageMeta.width && imageMeta.height
                  ? `${imageMeta.width} × ${imageMeta.height}`
                  : '—'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Parameters list */}
      {!hasParams ? (
        <div className="inspector-panel-empty">
          <CircleDot size={16} className="param-panel-empty-icon" />
          <span>此节点无参数</span>
        </div>
      ) : (
        <div className="param-panel-section">
          <div className="param-panel-section-title">参数</div>
          {(definition.params as ParamDefinition[]).map((param: ParamDefinition) => (
            <ParamField
              key={param.id}
              param={param}
              value={params[param.id] ?? param.default}
              onChange={handleChange}
            />
          ))}
        </div>
      )}

      <style>{`
        /* ParametersPanel body — no padding, let Inspector container handle scroll */
        .inspector-panel-body {
          /* flex/overflow inherited from Inspector container */
        }

        .inspector-panel-empty {
          /* empty styles removed — base from Inspector */
        }

        .inspector-alias-row {
          margin-bottom: 12px;
        }

        .inspector-alias-display {
          font-size: 14px;
          font-weight: 600;
          color: var(--color-text);
          cursor: text;
          padding: 4px 6px;
          border-radius: 6px;
          transition: background 0.12s;
          display: inline-block;
        }

        .inspector-alias-display:hover {
          background: var(--color-surface-2);
        }

        .inspector-alias-input {
          font-size: 14px;
          font-weight: 600;
          padding: 4px 8px;
          width: 100%;
          box-sizing: border-box;
        }

        .inspector-image-thumb {
          border: 1px solid var(--color-border);
          border-radius: 8px;
          overflow: hidden;
          background: var(--color-surface-2);
          margin-top: 8px;
        }

        .inspector-image-thumb-img {
          display: block;
          width: 100%;
          max-height: 120px;
          object-fit: contain;
          background: repeating-conic-gradient(#1a1a1a 0% 25%, #222 0% 50%) 0 0 / 16px 16px;
        }

        .inspector-image-thumb-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 6px 10px;
          background: var(--bg-surface);
          border-top: 1px solid var(--color-border);
        }

        .inspector-image-thumb-name {
          font-size: 11px;
          color: var(--color-text-muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
          min-width: 0;
        }

        .inspector-image-thumb-resolution {
          font-size: 11px;
          font-family: 'SF Mono', 'Cascadia Code', monospace;
          color: var(--color-accent);
          white-space: nowrap;
          flex-shrink: 0;
          background: rgba(99, 102, 241, 0.1);
          border-radius: 4px;
          padding: 1px 6px;
        }
      `}</style>
    </div>
  );
};

// Re-export for use by other components
export { ParamField, ImageFileField };
