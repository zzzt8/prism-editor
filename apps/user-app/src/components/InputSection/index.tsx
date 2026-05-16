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
 *
 * ## Batch Upload
 *
 * Image input fields support a "批量" mode (toggle) where multiple images can be
 * uploaded for sequential batch processing. Each image is processed one-by-one
 * and results are aggregated into a ZIP download.
 */

import React, { useState, useCallback } from 'react';
import type { PublishedInput, PublishedInputConfig, PublishedParamDefinition } from '@prism/shared-types';

// ── Shared file reading helper ─────────────────────────────────────────────────

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') {
        resolve(ev.target.result);
      } else {
        reject(new Error('Failed to read file as data URL'));
      }
    };
    reader.onerror = () => reject(new Error('FileReader error'));
    reader.readAsDataURL(file);
  });
}

// ── Image input field (single or batch) ────────────────────────────────────────

interface ImageInputFieldProps {
  inp: PublishedInput;
  /** Single value (single mode) or array (batch mode) */
  value: string | string[];
  onChange: (_v: string | string[]) => void;
}

function ImageInputField({ inp, value, onChange }: ImageInputFieldProps) {
  const [dragging, setDragging] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [draggingBatch, setDraggingBatch] = useState(false);

  const isArray = Array.isArray(value);
  const items: string[] = isArray ? value : value ? [value] : [];

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (!batchMode) {
        setImgError(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
          try {
            const dataUrl = await fileToDataUrl(file);
            onChange(dataUrl);
          } catch {
            setImgError(true);
          }
        }
      }
    },
    [batchMode, onChange]
  );

  const handleDropBatch = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDraggingBatch(false);
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
      if (files.length === 0) return;
      setImgError(false);
      try {
        const urls = await Promise.all(files.map(fileToDataUrl));
        onChange([...items, ...urls]);
      } catch {
        setImgError(true);
      }
    },
    [items, onChange]
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    if (!batchMode) {
      setImgError(false);
      try {
        const dataUrl = await fileToDataUrl(files[0]);
        onChange(dataUrl);
      } catch {
        setImgError(true);
      }
    } else {
      setImgError(false);
      try {
        const urls = await Promise.all(files.map(fileToDataUrl));
        onChange([...items, ...urls]);
      } catch {
        setImgError(true);
      }
    }
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleRemoveItem = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : '');
  };

  const handleMoveItem = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    [next[from], next[to]] = [next[to], next[from]];
    onChange(next);
  };

  const handleClearAll = () => {
    onChange('');
  };

  const isBatch = batchMode && items.length > 0;

  return (
    <div className="ua-input-group">
      <div className="ua-input-label-row">
        <label className="ua-input-label">
          {inp.name}
          {inp.required && <span className="ua-input-required">*</span>}
          {inp.type === 'image' && (
            <span className={`ua-input-type-badge ua-input-type-badge--${inp.type || 'default'}`}>图片</span>
          )}
        </label>
        <div className="ua-batch-toggle">
          <button
            className={`ua-batch-toggle-btn ${!batchMode ? 'active' : ''}`}
            onClick={() => { setBatchMode(false); }}
            type="button"
          >
            单张
          </button>
          <button
            className={`ua-batch-toggle-btn ${batchMode ? 'active' : ''}`}
            onClick={() => { setBatchMode(true); }}
            type="button"
          >
            批量
          </button>
        </div>
      </div>

      {inp.description && <p className="ua-input-desc">{inp.description}</p>}

      {/* Single-mode: URL input + drop zone */}
      {!batchMode && (
        <>
          <input
            type="text"
            className="ua-input ua-input--text"
            value={isArray ? '' : (value as string)}
            onChange={(e) => onChange(e.target.value)}
            placeholder="输入图片 URL 或拖拽图片到下方"
          />
          <div
            className={`ua-dropzone ${dragging ? 'ua-dropzone--active' : ''} ${!isArray && value ? 'ua-dropzone--has-value' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            {!isArray && value ? (
              <div className="ua-dropzone-preview-wrap">
                <img
                  src={value as string}
                  alt="Preview"
                  className="ua-dropzone-preview"
                  onError={() => setImgError(true)}
                />
                <button
                  className="ua-dropzone-clear"
                  onClick={(e) => { e.stopPropagation(); onChange(''); setImgError(false); }}
                  title="清除图片"
                  aria-label="清除图片"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
                {imgError && (
                  <div className="ua-dropzone-error">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    图片加载失败
                  </div>
                )}
              </div>
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
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
                </label>
              </div>
            )}
          </div>
        </>
      )}

      {/* Batch-mode: multi-file drop zone with ordered thumbnails */}
      {batchMode && (
        <>
          <div
            className={`ua-dropzone ua-dropzone--batch ${draggingBatch ? 'ua-dropzone--active' : ''} ${items.length > 0 ? 'ua-dropzone--has-value' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDraggingBatch(true); }}
            onDragLeave={() => setDraggingBatch(false)}
            onDrop={handleDropBatch}
          >
            {items.length === 0 ? (
              <div className="ua-dropzone-hint">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>拖拽多张图片到此处</span>
                <span className="ua-dropzone-or">或</span>
                <label className="ua-dropzone-file-btn">
                  选择文件
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            ) : (
              <div className="ua-batch-thumb-list">
                {items.map((dataUrl, index) => (
                  <div key={`${index}-${dataUrl.slice(0, 20)}`} className="ua-batch-thumb">
                    <img
                      src={dataUrl}
                      alt={`图片 ${index + 1}`}
                      className="ua-batch-thumb-img"
                      onError={() => { /* keep placeholder */ }}
                    />
                    <div className="ua-batch-thumb-overlay">
                      <span className="ua-batch-thumb-num">{index + 1}</span>
                      <div className="ua-batch-thumb-actions">
                        {index > 0 && (
                          <button
                            className="ua-batch-thumb-btn"
                            onClick={() => handleMoveItem(index, index - 1)}
                            title="上移"
                            type="button"
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="18 15 12 9 6 15" />
                            </svg>
                          </button>
                        )}
                        {index < items.length - 1 && (
                          <button
                            className="ua-batch-thumb-btn"
                            onClick={() => handleMoveItem(index, index + 1)}
                            title="下移"
                            type="button"
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </button>
                        )}
                        <button
                          className="ua-batch-thumb-btn ua-batch-thumb-btn--remove"
                          onClick={() => handleRemoveItem(index)}
                          title="移除"
                          type="button"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <label className="ua-batch-add-btn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  添加图片
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            )}
          </div>
          {items.length > 0 && (
            <div className="ua-batch-footer">
              <span className="ua-batch-count">{items.length} 张图片</span>
              <button className="ua-batch-clear" onClick={handleClearAll} type="button">
                清空全部
              </button>
            </div>
          )}
        </>
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

// ── Mask upload field (single or batch) ────────────────────────────────────────

interface MaskInputFieldProps {
  inp: PublishedInput;
  value: string | string[];
  onChange: (_v: string | string[]) => void;
}

function MaskInputField({ inp, value, onChange }: MaskInputFieldProps) {
  const [dragging, setDragging] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [draggingBatch, setDraggingBatch] = useState(false);

  const isArray = Array.isArray(value);
  const items: string[] = isArray ? value : value ? [value] : [];

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (!batchMode) {
        setImgError(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
          try {
            const dataUrl = await fileToDataUrl(file);
            onChange(dataUrl);
          } catch {
            setImgError(true);
          }
        }
      }
    },
    [batchMode, onChange]
  );

  const handleDropBatch = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDraggingBatch(false);
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
      if (!files.length) return;
      setImgError(false);
      try {
        const urls = await Promise.all(files.map(fileToDataUrl));
        onChange([...items, ...urls]);
      } catch {
        setImgError(true);
      }
    },
    [items, onChange]
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    if (!batchMode) {
      setImgError(false);
      try {
        const dataUrl = await fileToDataUrl(files[0]);
        onChange(dataUrl);
      } catch {
        setImgError(true);
      }
    } else {
      setImgError(false);
      try {
        const urls = await Promise.all(files.map(fileToDataUrl));
        onChange([...items, ...urls]);
      } catch {
        setImgError(true);
      }
    }
    e.target.value = '';
  };

  const handleRemoveItem = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : '');
  };

  const handleClearAll = () => onChange('');

  return (
    <div className="ua-input-group">
      <div className="ua-input-label-row">
        <label className="ua-input-label">
          {inp.name}
          {inp.required && <span className="ua-input-required">*</span>}
          <span className={`ua-input-type-badge ua-input-type-badge--${inp.type || 'default'}`}>蒙版</span>
        </label>
        <div className="ua-batch-toggle">
          <button
            className={`ua-batch-toggle-btn ${!batchMode ? 'active' : ''}`}
            onClick={() => setBatchMode(false)}
            type="button"
          >
            单张
          </button>
          <button
            className={`ua-batch-toggle-btn ${batchMode ? 'active' : ''}`}
            onClick={() => setBatchMode(true)}
            type="button"
          >
            批量
          </button>
        </div>
      </div>
      {inp.description && <p className="ua-input-desc">{inp.description}</p>}

      {/* Single-mode */}
      {!batchMode && (
        <>
          <input
            type="text"
            className="ua-input ua-input--text"
            value={isArray ? '' : (value as string)}
            onChange={(e) => onChange(e.target.value)}
            placeholder="输入蒙版图片 URL 或拖拽上传"
          />
          <div
            className={`ua-dropzone ${dragging ? 'ua-dropzone--active' : ''} ${!isArray && value ? 'ua-dropzone--has-value' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            {!isArray && value ? (
              <div className="ua-dropzone-preview-wrap">
                <img
                  src={value as string}
                  alt="Mask preview"
                  className="ua-dropzone-preview ua-dropzone-preview--mask"
                  onError={() => setImgError(true)}
                />
                <button
                  className="ua-dropzone-clear"
                  onClick={(e) => { e.stopPropagation(); onChange(''); setImgError(false); }}
                  title="清除蒙版"
                  aria-label="清除蒙版"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
                {imgError && (
                  <div className="ua-dropzone-error">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    图片加载失败
                  </div>
                )}
              </div>
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
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
                </label>
              </div>
            )}
          </div>
        </>
      )}

      {/* Batch-mode */}
      {batchMode && (
        <>
          <div
            className={`ua-dropzone ua-dropzone--batch ${draggingBatch ? 'ua-dropzone--active' : ''} ${items.length > 0 ? 'ua-dropzone--has-value' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDraggingBatch(true); }}
            onDragLeave={() => setDraggingBatch(false)}
            onDrop={handleDropBatch}
          >
            {items.length === 0 ? (
              <div className="ua-dropzone-hint">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>拖拽多张蒙版图片到此</span>
                <span className="ua-dropzone-or">或</span>
                <label className="ua-dropzone-file-btn">
                  选择文件
                  <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFileChange} />
                </label>
              </div>
            ) : (
              <div className="ua-batch-thumb-list">
                {items.map((dataUrl, index) => (
                  <div key={`${index}-${dataUrl.slice(0, 20)}`} className="ua-batch-thumb">
                    <img
                      src={dataUrl}
                      alt={`蒙版 ${index + 1}`}
                      className="ua-batch-thumb-img ua-batch-thumb-img--mask"
                      onError={() => {}}
                    />
                    <div className="ua-batch-thumb-overlay">
                      <span className="ua-batch-thumb-num">{index + 1}</span>
                      <button
                        className="ua-batch-thumb-btn ua-batch-thumb-btn--remove"
                        onClick={() => handleRemoveItem(index)}
                        title="移除"
                        type="button"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
                <label className="ua-batch-add-btn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  添加蒙版
                  <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFileChange} />
                </label>
              </div>
            )}
          </div>
          {items.length > 0 && (
            <div className="ua-batch-footer">
              <span className="ua-batch-count">{items.length} 张蒙版</span>
              <button className="ua-batch-clear" onClick={handleClearAll} type="button">
                清空全部
              </button>
            </div>
          )}
        </>
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
  /** Image/mask fields may hold string[] (batch mode) or string (single mode) */
  inputValues: Record<string, string | string[]>;
  paramValues: Record<string, Record<string, unknown>>;
  onInputChange: (_id: string, _value: string | string[]) => void;
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
            value={Array.isArray(inputValues[inp.id]) ? '' : (inputValues[inp.id] as string ?? '')}
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
