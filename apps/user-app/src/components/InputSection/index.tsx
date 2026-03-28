/**
 * InputSection — Input fields panel for the user workflow run page.
 *
 * @package @prism/user-app
 *
 * Renders all visible PublishedInput fields (ImageInputField + TextInputField)
 * from a published workflow. Supports drag-and-drop image upload, URL input,
 * and preview thumbnails.
 *
 * ## Visual Layout (design.md Chapter 5 User Layout)
 *
 * ```
 * ┌───────────────────────┐  ┌───────────────────────┐
 * │ 背景图 (必填)          │  │ Logo (必填)            │
 * │  [上传]               │  │  [上传]                │
 * └───────────────────────┘  └───────────────────────┘
 * ```
 *
 * Input fields are rendered sequentially in a flex column (gap: 16px).
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { PublishedInput } from '@prism/shared-types';

// ── Image input field ────────────────────────────────────────────────────────

interface ImageInputFieldProps {
  inp: PublishedInput;
  value: string;
  onChange: (v: string) => void;
}

function ImageInputField({ inp, value, onChange }: ImageInputFieldProps) {
  const [dragging, setDragging] = useState(false);
  const [imgError, setImgError] = useState(false);

  const revoke = useCallback((url: string) => {
    if (url.startsWith('blob:')) URL.revokeObjectURL(url);
  }, []);

  // Track previous value to revoke stale blob URLs (avoids memory leaks)
  const prevValueRef = useRef<string>('');
  useEffect(() => {
    const prev = prevValueRef.current;
    if (prev && prev !== value) {
      revoke(prev);
    }
    prevValueRef.current = value;
    return () => {
      // Revoke on unmount
      if (value) revoke(value);
    };
  }, [value, revoke]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      setImgError(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        onChange(url);
      }
    },
    [onChange]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImgError(false);
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onChange(url);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImgError(false);
    onChange(e.target.value);
  };

  return (
    <div className="ua-input-group">
      <label className="ua-input-label">
        {inp.name}
        {inp.required && <span className="ua-input-required">*</span>}
      </label>
      {inp.description && (
        <p className="ua-input-desc">{inp.description}</p>
      )}

      {/* URL text input */}
      <input
        type="text"
        className="ua-input ua-input--text"
        value={value}
        onChange={handleTextChange}
        placeholder="输入图片 URL 或拖拽图片到下方"
      />

      {/* Drop zone */}
      <div
        className={`ua-dropzone ${dragging ? 'ua-dropzone--active' : ''} ${value ? 'ua-dropzone--has-value' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        {value ? (
          <>
            <img
              src={value}
              alt="Preview"
              className="ua-dropzone-preview"
              onError={() => setImgError(true)}
            />
            {imgError && (
              <div className="ua-dropzone-error">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                图片加载失败，请检查 URL 或更换图片
              </div>
            )}
          </>
        ) : (
          <div className="ua-dropzone-hint">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>拖拽图片到这里</span>
            <span className="ua-dropzone-or">或</span>
            <label className="ua-dropzone-file-btn">
              选择文件
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </label>
          </div>
        )}
      </div>

      {value && (
        <button className="ua-input-clear" onClick={() => { onChange(''); setImgError(false); }}>
          清除图片
        </button>
      )}
    </div>
  );
}

// ── Text input field ──────────────────────────────────────────────────────────

interface TextInputFieldProps {
  inp: PublishedInput;
  value: string;
  onChange: (v: string) => void;
}

function TextInputField({ inp, value, onChange }: TextInputFieldProps) {
  return (
    <div className="ua-input-group">
      <label className="ua-input-label">
        {inp.name}
        {inp.required && <span className="ua-input-required">*</span>}
      </label>
      {inp.description && (
        <p className="ua-input-desc">{inp.description}</p>
      )}
      <input
        type="text"
        className="ua-input ua-input--text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={inp.defaultValue != null ? String(inp.defaultValue) : ''}
      />
    </div>
  );
}

// ── Exposed params form ───────────────────────────────────────────────────────

interface ExposedParamField {
  nodeKey: string;
  nodeName: string;
  nodeType: string;
  paramId: string;
  paramName: string;
  paramValue: unknown;
  description?: string;
}

interface ExposedParamsFormProps {
  selectedWorkflow: {
    config: { nodeTypes?: Record<string, string>; nodeConfigs?: Record<string, { params?: Record<string, unknown> }> };
  };
  paramValues: Record<string, Record<string, unknown>>;
  onParamChange: (nodeKey: string, paramId: string, value: unknown) => void;
}

function ExposedParamsForm({ selectedWorkflow, paramValues, onParamChange }: ExposedParamsFormProps) {
  const fields: ExposedParamField[] = [];

  const nodeTypes = selectedWorkflow.config.nodeTypes ?? {};
  const nodeConfigs = selectedWorkflow.config.nodeConfigs ?? {};

  for (const [nodeKey, nodeType] of Object.entries(nodeTypes)) {
    const config = nodeConfigs[nodeKey];
    const params = config?.params;
    if (!params) continue;

    for (const [paramId, paramValue] of Object.entries(params)) {
      fields.push({
        nodeKey,
        nodeName: nodeType.replace(/-/g, ' '),
        nodeType,
        paramId,
        paramName: paramId.replace(/_/g, ' '),
        paramValue,
      });
    }
  }

  if (fields.length === 0) return null;

  return (
    <div className="ua-exposed-params">
      <div className="ua-exposed-params-title">调整参数</div>
      {fields.map((field) => {
        const numValue = typeof field.paramValue === 'number'
          ? field.paramValue
          : parseFloat(String(field.paramValue));
        const displayValue = isNaN(numValue)
          ? String(field.paramValue)
          : numValue.toFixed(2);

        return (
          <div key={`${field.nodeKey}:${field.paramId}`} className="ua-input-group">
            <label className="ua-input-label">{field.paramName}</label>
            <input
              type="range"
              className="ua-param-slider"
              min={0}
              max={1}
              step={0.01}
              value={isNaN(numValue) ? 0.5 : numValue}
              onChange={(e) => onParamChange(field.nodeKey, field.paramId, parseFloat(e.target.value))}
            />
            <div className="ua-param-slider-value">{displayValue}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── InputSection ─────────────────────────────────────────────────────────────

export interface InputSectionProps {
  workflow: {
    inputs: PublishedInput[];
    config: { nodeTypes?: Record<string, string>; nodeConfigs?: Record<string, { params?: Record<string, unknown> }> };
  };
  inputValues: Record<string, string>;
  paramValues: Record<string, Record<string, unknown>>;
  onInputChange: (id: string, value: string) => void;
  onParamChange: (nodeKey: string, paramId: string, value: unknown) => void;
}

export const InputSection: React.FC<InputSectionProps> = ({
  workflow,
  inputValues,
  paramValues,
  onInputChange,
  onParamChange,
}) => {
  const visibleInputs = workflow.inputs.filter((inp) => inp.visible);

  return (
    <>
      <h2 className="ua-section-title">
        {visibleInputs.length > 0 ? '输入参数' : '此工作流不需要输入参数'}
      </h2>

      {visibleInputs.map((inp) => {
        if (inp.type === 'image') {
          return (
            <ImageInputField
              key={inp.id}
              inp={inp}
              value={inputValues[inp.id] ?? ''}
              onChange={(v) => onInputChange(inp.id, v)}
            />
          );
        }
        return (
          <TextInputField
            key={inp.id}
            inp={inp}
            value={inputValues[inp.id] ?? ''}
            onChange={(v) => onInputChange(inp.id, v)}
          />
        );
      })}

      <ExposedParamsForm
        selectedWorkflow={workflow}
        paramValues={paramValues}
        onParamChange={onParamChange}
      />
    </>
  );
};
