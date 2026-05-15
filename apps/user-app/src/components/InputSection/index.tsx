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

import React, { useState, useCallback } from 'react';
import type { PublishedInput, PublishedInputConfig, PublishedParamDefinition } from '@prism/shared-types';

// ── Image input field ────────────────────────────────────────────────────────

interface ImageInputFieldProps {
  inp: PublishedInput;
  value: string;
  onChange: (_v: string) => void;
}

function ImageInputField({ inp, value, onChange }: ImageInputFieldProps) {
  const [dragging, setDragging] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      setImgError(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (typeof ev.target?.result === 'string') {
            onChange(ev.target.result);
          }
        };
        reader.onerror = () => { console.error('[InputSection] handleDrop: error'); setImgError(true); };
        reader.readAsDataURL(file);
      }
    },
    [onChange]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImgError(false);
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (typeof ev.target?.result === 'string') {
          onChange(ev.target.result);
        }
      };
      reader.onerror = () => { console.error('[InputSection] handleFileChange: error'); setImgError(true); };
      reader.readAsDataURL(file);
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
        {inp.type === 'image' && (
          <span className={`ua-input-type-badge ua-input-type-badge--${inp.type || 'default'}`}>图片</span>
        )}
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
  onChange: (_v: string) => void;
}

function TextInputField({ inp, value, onChange }: TextInputFieldProps) {
  return (
    <div className="ua-input-group">
      <label className="ua-input-label">
        {inp.name}
        {inp.required && <span className="ua-input-required">*</span>}
        {inp.type === 'string' && (
          <span className={`ua-input-type-badge ua-input-type-badge--${inp.type || 'default'}`}>文本</span>
        )}
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

// ── Mask upload field ─────────────────────────────────────────────────────────

interface MaskInputFieldProps {
  inp: PublishedInput;
  value: string;
  onChange: (_v: string) => void;
}

function MaskInputField({ inp, value, onChange }: MaskInputFieldProps) {
  const [dragging, setDragging] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      setImgError(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (typeof ev.target?.result === 'string') {
            onChange(ev.target.result);
          }
        };
        reader.onerror = () => setImgError(true);
        reader.readAsDataURL(file);
      }
    },
    [onChange]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImgError(false);
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (typeof ev.target?.result === 'string') {
          onChange(ev.target.result);
        }
      };
      reader.onerror = () => setImgError(true);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="ua-input-group">
      <label className="ua-input-label">
        {inp.name}
        {inp.required && <span className="ua-input-required">*</span>}
        <span className={`ua-input-type-badge ua-input-type-badge--${inp.type || 'default'}`}>蒙版</span>
      </label>
      {inp.description && <p className="ua-input-desc">{inp.description}</p>}

      {/* URL text input */}
      <input
        type="text"
        className="ua-input ua-input--text"
        value={value}
        onChange={(e) => { setImgError(false); onChange(e.target.value); }}
        placeholder="输入蒙版图片 URL 或拖拽上传"
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
              alt="Mask preview"
              className="ua-dropzone-preview ua-dropzone-preview--mask"
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
            <span>拖拽蒙版图片到这里</span>
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
          清除蒙版
        </button>
      )}
    </div>
  );
}

// ── Exposed params form ───────────────────────────────────────────────────────

interface ExposedParamsFormProps {
  selectedWorkflow: {
    config: {
      nodeTypes?: Record<string, string>;
      nodeConfigs?: Record<string, { params?: Record<string, unknown> }>;
      exposedParams?: Array<{ nodeId: string; paramId: string; label: string }>;
      paramDefinitions?: PublishedParamDefinition[];
    };
  };
  paramValues: Record<string, Record<string, unknown>>;
  onParamChange: (_nodeKey: string, _paramId: string, _value: unknown) => void;
}

function ExposedParamsForm({ selectedWorkflow, paramValues, onParamChange }: ExposedParamsFormProps) {
  const nodeTypes = selectedWorkflow.config.nodeTypes ?? {};
  const nodeConfigs = selectedWorkflow.config.nodeConfigs ?? {};
  const exposedParams = selectedWorkflow.config.exposedParams ?? [];
  const paramDefinitions = selectedWorkflow.config.paramDefinitions ?? [];

  const paramDefMap = new Map<string, PublishedParamDefinition>();
  for (const pd of paramDefinitions) {
    paramDefMap.set(`${pd.nodeId}:${pd.paramId}`, pd);
  }

  return (
    <div className="ua-exposed-params">
      <div className="ua-exposed-params-title">调整参数</div>
      {exposedParams.map((ep) => {
        const config = nodeConfigs[ep.nodeId];
        const rawValue = paramValues[ep.nodeId]?.[ep.paramId] ?? config?.params?.[ep.paramId];
        const pd = paramDefMap.get(`${ep.nodeId}:${ep.paramId}`);
        const controlType = pd?.controlType ?? 'number';

        if (controlType === 'string' || controlType === 'image-file') {
          return (
            <div key={`${ep.nodeId}:${ep.paramId}`} className="ua-input-group">
              <label className="ua-input-label">{ep.label}</label>
              <input
                type={controlType === 'image-file' ? 'url' : 'text'}
                className="ua-param-text"
                placeholder={controlType === 'image-file' ? '输入图片 URL' : undefined}
                value={(rawValue as string) ?? ''}
                onChange={(e) => onParamChange(ep.nodeId, ep.paramId, e.target.value)}
              />
            </div>
          );
        }

        if (controlType === 'boolean') {
          const boolValue = typeof rawValue === 'boolean' ? rawValue : Boolean(rawValue);
          return (
            <div key={`${ep.nodeId}:${ep.paramId}`} className="ua-input-group">
              <label className="ua-param-switch" style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <span className="ua-input-label" style={{ marginBottom: 0 }}>{ep.label}</span>
                <input
                  type="checkbox"
                  checked={boolValue}
                  onChange={(e) => onParamChange(ep.nodeId, ep.paramId, e.target.checked)}
                />
              </label>
            </div>
          );
        }

        if (controlType === 'select') {
          const options = pd?.options ?? [];
          return (
            <div key={`${ep.nodeId}:${ep.paramId}`} className="ua-input-group">
              <label className="ua-input-label">{ep.label}</label>
              <select
                className="ua-param-select"
                value={String(rawValue ?? '')}
                onChange={(e) => onParamChange(ep.nodeId, ep.paramId, e.target.value)}
              >
                {options.map((opt) => (
                  <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
                ))}
              </select>
            </div>
          );
        }

        // number (slider)
        const numValue = typeof rawValue === 'number'
          ? rawValue
          : parseFloat(String(rawValue ?? 0));
        const displayValue = isNaN(numValue)
          ? String(rawValue ?? '')
          : numValue.toFixed(2);
        const min = pd?.validation?.min ?? 0;
        const max = pd?.validation?.max ?? 1;

        return (
          <div key={`${ep.nodeId}:${ep.paramId}`} className="ua-input-group">
            <label className="ua-input-label">{ep.label}</label>
            <input
              type="range"
              className="ua-param-slider"
              min={min}
              max={max}
              step={0.01}
              value={isNaN(numValue) ? (min + max) / 2 : numValue}
              onChange={(e) => onParamChange(ep.nodeId, ep.paramId, parseFloat(e.target.value))}
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
    config: {
      nodeTypes?: Record<string, string>;
      nodeConfigs?: Record<string, { params?: Record<string, unknown> }>;
      /** New v2 field: structured input configs from auto-detected source nodes */
      inputs?: PublishedInputConfig[];
      exposedParams?: Array<{ nodeId: string; paramId: string; label: string }>;
      paramDefinitions?: import('@prism/shared-types').PublishedParamDefinition[];
    };
  };
  inputValues: Record<string, string>;
  paramValues: Record<string, Record<string, unknown>>;
  onInputChange: (_id: string, _value: string) => void;
  onParamChange: (_nodeKey: string, _paramId: string, _value: unknown) => void;
}

export const InputSection: React.FC<InputSectionProps> = ({
  workflow,
  inputValues,
  paramValues,
  onInputChange,
  onParamChange,
}) => {
  // Prefer new v2 config.inputs; fall back to legacy inputs[] array
  const configInputs = workflow.config.inputs;
  const legacyInputs = workflow.inputs;

  // Build a visible-inputs list that works with both old and new publish formats.
  // New format: config.inputs[].nodeId → inputs[id] === "{nodeId}:{port}"
  // Legacy format: inputs[] with visible=true
  const visibleInputs: PublishedInput[] = configInputs && configInputs.length > 0
    ? configInputs.map((ci) => ({
        id: `${ci.nodeId}:out`,
        name: ci.label,
        type: ci.type,
        required: true,
        visible: true,
      }))
    : legacyInputs.filter((inp) => inp.visible);

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
        if (inp.type === 'mask') {
          return (
            <MaskInputField
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
