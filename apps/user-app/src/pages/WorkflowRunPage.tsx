// WorkflowRunPage - run a published workflow with user inputs

import React, { useState, useCallback, useEffect } from 'react';
import { useUserAppStore } from '../store/publishedStore';
import { navigateToList } from '../router';
import type { ExecutionProgress, PublishedInput, PublishedOutput } from '@prism/shared-types';
import {
  downloadSingleImage,
  downloadMultiSize,
  downloadZipPack,
  extractImageData,
} from '../utils/download';

// ── MIME → file extension map ────────────────────────────────────────────────
function mimeToExt(mime: string): string {
  const MIME_EXT: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return MIME_EXT[mime] ?? 'png';
}

// ── Image input field ────────────────────────────────────────────────────────
function ImageInputField({
  inp,
  value,
  onChange,
}: {
  inp: PublishedInput;
  value: string;
  onChange: (v: string) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [imgError, setImgError] = useState(false);

  const revoke = useCallback((url: string) => {
    if (url.startsWith('blob:')) URL.revokeObjectURL(url);
  }, []);

  useEffect(() => {
    return () => { if (value) revoke(value); };
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

      {/* URL input */}
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

function ExposedParamFieldComponent({
  field,
  value,
  onChange,
}: {
  field: ExposedParamField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const numValue = typeof value === 'number' ? value : parseFloat(String(value));

  return (
    <div className="ua-input-group">
      <label className="ua-input-label">{field.paramName}</label>
      {field.description && (
        <p className="ua-input-desc">{field.description}</p>
      )}
      <input
        type="range"
        className="ua-param-slider"
        min={0}
        max={1}
        step={0.01}
        value={isNaN(numValue) ? 0.5 : numValue}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      <div className="ua-param-slider-value">{isNaN(numValue) ? String(value) : numValue.toFixed(2)}</div>
    </div>
  );
}

function ExposedParamsForm({
  selectedWorkflow,
  paramValues,
  onParamChange,
}: {
  selectedWorkflow: NonNullable<ReturnType<typeof useUserAppStore.getState>['selectedWorkflow']>;
  paramValues: Record<string, Record<string, unknown>>;
  onParamChange: (nodeKey: string, paramId: string, value: unknown) => void;
}) {
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
      {fields.map((field) => (
        <ExposedParamFieldComponent
          key={`${field.nodeKey}:${field.paramId}`}
          field={field}
          value={paramValues[field.nodeKey]?.[field.paramId] ?? field.paramValue}
          onChange={(v) => onParamChange(field.nodeKey, field.paramId, v)}
        />
      ))}
    </div>
  );
}

// ── Text input field ──────────────────────────────────────────────────────────
function TextInputField({
  inp,
  value,
  onChange,
}: {
  inp: PublishedInput;
  value: string;
  onChange: (v: string) => void;
}) {
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

// ── ZIP pack all outputs bar ─────────────────────────────────────────────────
interface ZipPackBarProps {
  outputs: PublishedOutput[];
  results: Record<string, unknown>;
  workflowName: string;
}

function ZipPackBar({ outputs, results, workflowName }: ZipPackBarProps) {
  const [downloading, setDownloading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [zipMsg, setZipMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!zipMsg) return;
    const t = setTimeout(() => setZipMsg(null), 3000);
    return () => clearTimeout(t);
  }, [zipMsg]);

  const validItems = outputs
    .map((out) => ({
      resultValue: results[out.id],
      filename: `${workflowName}_${out.name.replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '_')}`,
    }))
    .filter((item) => extractImageData(item.resultValue) !== null);

  const handlePackAll = async () => {
    setDownloading(true);
    setZipMsg(null);
    try {
      await downloadZipPack(validItems, `${workflowName}_outputs`);
      setZipMsg({ type: 'success', text: 'ZIP 下载成功' });
    } catch (err) {
      setZipMsg({ type: 'error', text: `打包失败：${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setDownloading(false);
    }
  };

  if (validItems.length === 0) return null;

  return (
    <div className="ua-zip-bar">
      <div className="ua-zip-bar-info">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <span>{validItems.length} 个输出文件</span>
      </div>

      <div className="ua-zip-bar-actions">
        {/* Multi-size pack: download all outputs at 3 sizes each */}
        <div className="ua-zip-menu-wrap">
          <button
            className="ua-zip-action-btn"
            onClick={() => setShowMenu((v) => !v)}
            disabled={downloading}
          >
            {downloading ? (
              <><span className="ua-spinner ua-spinner--sm" /> 打包中…</>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                </svg>
                打包下载 ▾
              </>
            )}
          </button>

          {showMenu && (
            <div className="ua-zip-dropdown">
              <button
                className="ua-zip-dropdown-item"
                onClick={handlePackAll}
                disabled={downloading}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                </svg>
                下载所有原图（打包 ZIP）
              </button>
              <div className="ua-zip-dropdown-sep" />
              <button
                className="ua-zip-dropdown-item ua-zip-dropdown-item--muted"
                disabled
              >
                多尺寸打包（512/1024/2048w）
              </button>
            </div>
          )}
        </div>

        {/* Close menu on outside click */}
        {showMenu && (
          <div
            className="ua-zip-backdrop"
            onClick={() => setShowMenu(false)}
          />
        )}
      </div>

      {/* ZIP result message */}
      {zipMsg && (
        <div className={`ua-download-msg ua-download-msg--${zipMsg.type}`}>
          {zipMsg.type === 'success' ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
          {zipMsg.text}
        </div>
      )}
    </div>
  );
}
interface OutputPreviewProps {
  out: PublishedOutput;
  resultValue: unknown;
  workflowName: string;
}

function OutputPreview({ out, resultValue, workflowName }: OutputPreviewProps) {
  const [imgError, setImgError] = useState(false);
  const [multiDownloading, setMultiDownloading] = useState(false);
  const [singleDownloading, setSingleDownloading] = useState(false);
  const [downloadMsg, setDownloadMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Auto-clear download message after 3s
  useEffect(() => {
    if (!downloadMsg) return;
    const t = setTimeout(() => setDownloadMsg(null), 3000);
    return () => clearTimeout(t);
  }, [downloadMsg]);

  if (resultValue == null) return null;

  // Result value is the raw node executor outputs object (e.g. { previewUrl, dataUrl, mimeType })
  const rv = resultValue as Record<string, unknown>;

  // Support both flat executor outputs and wrapped { result: { previewUrl } } structures
  const effectiveRv: Record<string, unknown> =
    rv && typeof rv === 'object' && 'result' in rv && typeof rv.result === 'object'
      ? (rv.result as Record<string, unknown>)
      : rv;

  const imageUrl: string | null =
    (typeof effectiveRv.previewUrl === 'string' &&
      (effectiveRv.previewUrl.startsWith('data:') || effectiveRv.previewUrl.startsWith('blob:')))
      ? effectiveRv.previewUrl
      : (typeof effectiveRv.dataUrl === 'string' && effectiveRv.dataUrl.startsWith('data:'))
      ? effectiveRv.dataUrl
      : null;

  const mimeType = typeof effectiveRv.mimeType === 'string' ? effectiveRv.mimeType : 'image/png';
  const ext = mimeToExt(mimeType);

  const nodeError = typeof resultValue === 'object' && resultValue !== null && 'error' in resultValue
    ? String((resultValue as Record<string, unknown>).error)
    : undefined;

  const baseFilename = `${workflowName}_${out.name.replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '_')}`;

  const handleSingleDownload = async () => {
    setSingleDownloading(true);
    try {
      await downloadSingleImage(resultValue, baseFilename);
      setDownloadMsg({ type: 'success', text: '下载完成' });
    } catch (err) {
      setDownloadMsg({ type: 'error', text: `下载失败：${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setSingleDownloading(false);
    }
  };

  const handleMultiSizeDownload = async () => {
    setMultiDownloading(true);
    try {
      await downloadMultiSize(resultValue, baseFilename, [512, 1024, 2048]);
      setDownloadMsg({ type: 'success', text: `已触发 ${3} 个尺寸下载` });
    } catch (err) {
      setDownloadMsg({ type: 'error', text: `下载失败：${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setMultiDownloading(false);
    }
  };

  if (imageUrl && !imgError) {
    return (
      <div className="ua-output-group">
        <div className="ua-output-header">
          <span className="ua-output-name">{out.name}</span>
          {out.description && <span className="ua-output-desc">{out.description}</span>}
        </div>
        <div className="ua-output-image-wrap">
          <img
            src={imageUrl}
            alt={out.name}
            className="ua-output-image"
            onError={() => setImgError(true)}
          />
        </div>
        {nodeError && (
          <div className="ua-output-error">{nodeError}</div>
        )}

        {/* Download panel */}
        <div className="ua-download-panel">
          {/* Primary: single download */}
          <button
            className="ua-download-btn"
            onClick={handleSingleDownload}
            disabled={singleDownloading}
            title={`下载 ${ext.toUpperCase()} 原图`}
          >
            {singleDownloading ? (
              <><span className="ua-spinner ua-spinner--sm" /> 生成中…</>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                下载原图
              </>
            )}
          </button>

          {/* Secondary: multi-size download */}
          <div className="ua-download-sizes">
            <span className="ua-download-sizes-label">多尺寸下载：</span>
            <div className="ua-download-size-btns">
              {multiDownloading ? (
                <span className="ua-download-sizes-loading">
                  <span className="ua-spinner ua-spinner--sm" />
                  生成中…
                </span>
              ) : (
                <button
                  className="ua-download-size-btn"
                  onClick={handleMultiSizeDownload}
                  title="下载 512w / 1024w / 2048w 三种尺寸"
                >
                  512 / 1024 / 2048
                </button>
              )}
            </div>
          </div>

          {/* Download result message */}
          {downloadMsg && (
            <div className={`ua-download-msg ua-download-msg--${downloadMsg.type}`}>
              {downloadMsg.type === 'success' ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
              {downloadMsg.text}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="ua-output-group">
      <div className="ua-output-header">
        <span className="ua-output-name">{out.name}</span>
        {out.description && <span className="ua-output-desc">{out.description}</span>}
      </div>
      {nodeError && (
        <div className="ua-output-error">{nodeError}</div>
      )}
      <pre className="ua-output-raw">{JSON.stringify(resultValue, null, 2)}</pre>
    </div>
  );
}

// ── Execution progress display ───────────────────────────────────────────────
function ProgressDisplay({ progress }: { progress?: ExecutionProgress }) {
  if (progress?.status === 'error') {
    return (
      <div className="ua-result-error">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>执行出错</span>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="ua-result-running">
        <div className="ua-spinner" />
        <span>正在执行…</span>
      </div>
    );
  }

  const { totalNodes, completedNodes } = progress;
  const pct = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;

  return (
    <div className="ua-progress">
      <div className="ua-progress-header">
        <div className="ua-spinner ua-spinner--accent" />
        <span className="ua-progress-label">正在执行</span>
        <span className="ua-progress-count">{completedNodes}/{totalNodes} 节点</span>
      </div>
      <div className="ua-progress-bar">
        <div
          className="ua-progress-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="ua-progress-pct">{pct}%</span>
    </div>
  );
}

// ── Execution result summary ──────────────────────────────────────────────────
function ResultSummary({
  progress,
}: {
  progress?: ExecutionProgress;
}) {
  const totalMs = (() => {
    if (!progress?.results?.length) return null;
    const first = progress.results[0];
    const last = progress.results[progress.results.length - 1];
    if (first?.startTime && last?.endTime) {
      return last.endTime - first.startTime;
    }
    return null;
  })();

  const nodeCount = progress?.results?.length ?? 0;
  const hasNodeErrors = progress?.results?.some((r) => r.status === 'error') ?? false;
  const isSuccess = progress?.status === 'done' && !hasNodeErrors;

  if (isSuccess) {
    return (
      <div className="ua-result-summary">
        <div className="ua-result-summary-check">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div className="ua-result-summary-text">
          <span className="ua-result-summary-title">执行完成</span>
          {totalMs !== null && (
            <span className="ua-result-summary-meta">耗时 {totalMs}ms · {nodeCount} 个节点</span>
          )}
          {totalMs === null && nodeCount > 0 && (
            <span className="ua-result-summary-meta">{nodeCount} 个节点</span>
          )}
        </div>
      </div>
    );
  }

  // Error / partial failure
  return (
    <div className="ua-result-summary ua-result-summary--error">
      <div className="ua-result-summary-check">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </div>
      <div className="ua-result-summary-text">
        <span className="ua-result-summary-title">执行出错</span>
        {hasNodeErrors && (
          <span className="ua-result-summary-meta">
            {progress!.results.filter((r) => r.status === 'error').length} 个节点执行失败
          </span>
        )}
        {progress?.error && (
          <span className="ua-result-summary-meta">{progress.error}</span>
        )}
      </div>
    </div>
  );
}

// ── Workflow not found / loading ─────────────────────────────────────────────
function WorkflowErrorState() {
  return (
    <div className="ua-page ua-run-page">
      <div className="ua-run-header">
        <button className="ua-back-btn" onClick={navigateToList}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          返回
        </button>
      </div>
      <div className="ua-run-body">
        <div className="ua-result-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>工作流不存在</span>
          <span className="ua-empty-sub">此工作流可能已被删除或从未发布</span>
        </div>
      </div>
    </div>
  );
}

// ── Main Run Page ────────────────────────────────────────────────────────────
export const WorkflowRunPage: React.FC = () => {
  const { selectedWorkflow, runState, setRunState } = useUserAppStore();

  // User input values: keyed by PublishedInput.id
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  // Exposed params values: keyed by nodeIndex → paramId → value
  const [paramValues, setParamValues] = useState<Record<string, Record<string, unknown>>>({});

  // Reset input values when workflow changes
  useEffect(() => {
    if (selectedWorkflow) {
      const defaults: Record<string, string> = {};
      for (const inp of selectedWorkflow.inputs) {
        defaults[inp.id] = inp.defaultValue != null ? String(inp.defaultValue) : '';
      }
      setInputValues(defaults);

      // Initialize exposed params from nodeConfigs
      const pvs: Record<string, Record<string, unknown>> = {};
      const nodeConfigs = selectedWorkflow.config.nodeConfigs ?? {};
      for (const [nodeKey, config] of Object.entries(nodeConfigs)) {
        if (config?.params) {
          pvs[nodeKey] = { ...config.params };
        }
      }
      setParamValues(pvs);
    }
    setRunState({ status: 'idle', progress: undefined });
  }, [selectedWorkflow, setRunState]);

  const updateInput = useCallback((id: string, value: string) => {
    setInputValues((prev) => ({ ...prev, [id]: value }));
  }, []);

  const updateParam = useCallback((nodeKey: string, paramId: string, value: unknown) => {
    setParamValues((prev) => ({
      ...prev,
      [nodeKey]: { ...(prev[nodeKey] ?? {}), [paramId]: value },
    }));
  }, []);

  const handleRun = useCallback(async () => {
    if (!selectedWorkflow) return;

    // Validate required visible inputs
    for (const inp of selectedWorkflow.inputs) {
      if (inp.required && inp.visible) {
        const effectiveValue = inputValues[inp.id] ?? (inp.defaultValue != null ? String(inp.defaultValue) : '');
        if (!effectiveValue.trim()) {
          setRunState({ status: 'error', error: `请填写必填项：${inp.name}` });
          return;
        }
      }
    }

    setRunState({ status: 'running' });

    try {
      const { nodeExecutors } = await import('@prism/image-ops');
      const { PublishedWorkflowExecutor } = await import('@prism/workflow-core');

      const executor = new PublishedWorkflowExecutor(nodeExecutors);
      const result = await executor.execute(selectedWorkflow, {
        inputs: inputValues,
        exposedParams: paramValues,
        onProgress: (p: ExecutionProgress) => {
          setRunState((prev) => ({ ...prev, status: 'running', progress: p }));
        },
      });

      if (result.status === 'done') {
        const outputs: Record<string, unknown> = {};
        const executorResults = result.results; // { [nodeId: string]: nodeOutputs }

        for (const output of selectedWorkflow.outputs) {
          // PublishedOutput.id format: "{nodeIndex}:{portId}" — e.g. "0:result"
          // ExecutorResult.results key = node index, value = node executor outputs object
          // Direct match: strip port suffix from output.id → nodeId
          const colonIdx = output.id.indexOf(':');
          if (colonIdx > 0) {
            const nodeId = output.id.slice(0, colonIdx);
            const portId = output.id.slice(colonIdx + 1);
            const nodeOutputs = executorResults[nodeId];
            if (nodeOutputs && portId in nodeOutputs) {
              outputs[output.id] = nodeOutputs[portId];
              continue;
            }
          }

          // Fallback: scan all node results for the first one with a valid image output
          for (const nodeResult of Object.values(executorResults) as Record<string, unknown>[]) {
            if (nodeResult?.previewUrl !== undefined || nodeResult?.dataUrl !== undefined) {
              outputs[output.id] = nodeResult;
              break;
            }
            if (nodeResult?.result !== undefined) {
              outputs[output.id] = nodeResult.result;
              break;
            }
          }
        }
        setRunState((prev) => ({ ...prev, status: 'done', result: outputs }));
      } else {
        setRunState((prev) => ({ ...prev, status: 'error', error: result.error ?? '执行失败' }));
      }
    } catch (err) {
      setRunState((prev) => ({ ...prev, status: 'error', error: String(err) }));
    }
  }, [selectedWorkflow, inputValues, paramValues, setRunState]);

  // Guard: no workflow loaded
  if (!selectedWorkflow) {
    return <WorkflowErrorState />;
  }

  const visibleInputs = selectedWorkflow.inputs.filter((inp) => inp.visible);
  const hasInputs = visibleInputs.length > 0;

  return (
    <div className="ua-page ua-run-page">
      {/* Header */}
      <div className="ua-run-header">
        <button className="ua-back-btn" onClick={navigateToList}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          返回
        </button>
        <div className="ua-run-title-group">
          <h1 className="ua-run-title">{selectedWorkflow.name}</h1>
          <span className="ua-run-version">v{selectedWorkflow.version}</span>
        </div>
        {selectedWorkflow.description && (
          <p className="ua-run-desc">{selectedWorkflow.description}</p>
        )}
      </div>

      <div className="ua-run-body">
        {/* Left panel: inputs */}
        <div className="ua-run-inputs">
          <h2 className="ua-section-title">
            {hasInputs ? '输入参数' : '此工作流不需要输入参数'}
          </h2>

          {visibleInputs.map((inp) => {
            if (inp.type === 'image') {
              return (
                <ImageInputField
                  key={inp.id}
                  inp={inp}
                  value={inputValues[inp.id] ?? ''}
                  onChange={(v) => updateInput(inp.id, v)}
                />
              );
            }
            return (
              <TextInputField
                key={inp.id}
                inp={inp}
                value={inputValues[inp.id] ?? ''}
                onChange={(v) => updateInput(inp.id, v)}
              />
            );
          })}

          {/* Exposed params */}
          <ExposedParamsForm
            selectedWorkflow={selectedWorkflow}
            paramValues={paramValues}
            onParamChange={updateParam}
          />

          {/* Error message */}
          {runState.status === 'error' && (
            <div className="ua-run-error">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {runState.error}
            </div>
          )}

          {/* Run button */}
          <button
            className={`ua-run-btn ua-run-btn--${runState.status === 'running' ? 'running' : 'ready'}`}
            onClick={handleRun}
            disabled={runState.status === 'running'}
          >
            {runState.status === 'running' ? (
              <>
                <span className="ua-spinner ua-spinner--white" />
                执行中…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                执行工作流
              </>
            )}
          </button>
        </div>

        {/* Right panel: results */}
        <div className="ua-run-results">
          <h2 className="ua-section-title">执行结果</h2>

          {runState.status === 'idle' && (
            <div className="ua-result-empty">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <path d="M8 12h8M8 8h8M8 16h5" />
              </svg>
              <span>填写参数后点击执行</span>
            </div>
          )}

          {runState.status === 'running' && (
            <ProgressDisplay progress={runState.progress} />
          )}

          {runState.status === 'done' && (
            <ResultSummary progress={runState.progress} />
          )}

          {runState.status === 'done' && runState.result && (
            <div className="ua-result-grid">
              {/* ZIP pack all outputs */}
              {selectedWorkflow.outputs.length >= 2 && (
                <ZipPackBar
                  outputs={selectedWorkflow.outputs}
                  results={runState.result}
                  workflowName={selectedWorkflow.name}
                />
              )}

              {selectedWorkflow.outputs.map((out, idx) => (
                <OutputPreview
                  key={out.id}
                  out={out}
                  resultValue={runState.result?.[out.id]}
                  workflowName={selectedWorkflow.name}
                />
              ))}
              {selectedWorkflow.outputs.length === 0 && (
                <div className="ua-result-empty">
                  <span>执行完成，无输出结果</span>
                </div>
              )}
            </div>
          )}

          {runState.status === 'done' && !runState.result && (
            <div className="ua-result-empty">
              <span>执行完成，无输出结果</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
