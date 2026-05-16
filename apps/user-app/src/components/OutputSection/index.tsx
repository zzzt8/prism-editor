/**
 * OutputSection — Results and outputs display for the user workflow run page.
 *
 * @package @prism/user-app
 *
 * Renders:
 * - Empty state ("填写参数后点击执行")
 * - Running progress bar
 * - Done/error summary badge
 * - Grid of OutputPreview cards
 * - ZIP pack bar (when ≥ 2 outputs)
 *
 * ## Output card structure
 *
 * ```
 * ┌─────────────────────────────┐
 * │ 输出名称        说明          │
 * ├─────────────────────────────┤
 * │     [预览大图]               │
 * ├─────────────────────────────┤
 * │ [下载原图]                  │
 * │ 多尺寸下载：512/1024/2048   │
 * └─────────────────────────────┘
 * ```
 */

import React, { useState, useEffect } from 'react';
import type { PublishedOutput, ExecutionProgress } from '@prism/shared-types';
import type { RunState } from '../../modules/runner/runStore';
import {
  downloadSingleImage,
  downloadMultiSize,
  downloadResizedImage,
  downloadZipPack,
  extractImageData,
} from '../../utils/download';
import { useRunStore } from '../../modules/runner/runStore';

// ── Resolve output value from execution result ──────────────────────────────────

/**
 * Resolve the output value for a given output ID.
 *
 * Dev-tool publishes outputs with {nodeId}:{portId} format (e.g. "node-4:image").
 * The executor stores results keyed by nodeId only (e.g. "node-4").
 * This function handles both cases for backward compatibility.
 */
function resolveOutputValue(outputId: string, results: Record<string, unknown> | undefined): unknown {
  if (!results) return undefined;

  // Direct match (e.g. "node-4:image")
  if (outputId in results) return results[outputId];

  // Fallback: try nodeId only (e.g. "node-4" when outputId is "node-4:image")
  const [nodeId] = outputId.split(':');
  if (nodeId in results) return results[nodeId];

  return undefined;
}

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

// ── Progress display ─────────────────────────────────────────────────────────

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
        <div className="ua-spinner ua-spinner--accent" />
        <span className="ua-running-indicator">正在执行…</span>
      </div>
    );
  }

  const { totalNodes, completedNodes } = progress;
  const pct = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;

  return (
    <div className="ua-progress">
      <div className="ua-progress-header">
        <div className="ua-spinner ua-spinner--accent" />
        <span className="ua-progress-label ua-running-indicator">正在执行</span>
        <span className="ua-progress-count">{completedNodes}/{totalNodes} 节点</span>
      </div>
      <div className="ua-progress-bar">
        <div className="ua-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="ua-progress-pct">{pct}%</span>
    </div>
  );
}

// ── Result summary ────────────────────────────────────────────────────────────

function ResultSummary({ progress, runStatus }: { progress?: ExecutionProgress; runStatus: RunState['status'] }) {
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
  // Use runState.status as source of truth; progress may be undefined after execution completes.
  const isSuccess = runStatus === 'done' && !hasNodeErrors;

  if (isSuccess) {
    return (
      <div className="ua-result-summary">
        <div className="ua-result-summary-check">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <span className="ua-result-summary-title">已完成</span>
        {totalMs !== null && (
          <span className="ua-result-summary-meta">· {totalMs}ms · {nodeCount} 个节点</span>
        )}
        {totalMs === null && nodeCount > 0 && (
          <span className="ua-result-summary-meta">· {nodeCount} 个节点</span>
        )}
      </div>
    );
  }

  return (
    <div className="ua-result-summary ua-result-summary--error">
      <div className="ua-result-summary-check">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </div>
      <span className="ua-result-summary-title">执行出错</span>
      {hasNodeErrors && (
        <span className="ua-result-summary-meta">
          · {progress!.results.filter((r) => r.status === 'error').length} 个节点失败
        </span>
      )}
      {progress?.error && (
        <span className="ua-result-summary-meta">· {progress.error}</span>
      )}
    </div>
  );
}

// ── ZIP pack bar ──────────────────────────────────────────────────────────────

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
      resultValue: resolveOutputValue(out.id, results),
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

        {showMenu && (
          <div className="ua-zip-backdrop" onClick={() => setShowMenu(false)} />
        )}
      </div>

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

// ── Output preview card ───────────────────────────────────────────────────────

interface OutputPreviewProps {
  out: PublishedOutput;
  resultValue: unknown;
  workflowName: string;
}

function OutputPreview({ out, resultValue, workflowName }: OutputPreviewProps) {
  const [imgError, setImgError] = useState(false);
  const [multiDownloading, setMultiDownloading] = useState(false);
  const [singleDownloading, setSingleDownloading] = useState(false);
  const [downloadingSize, setDownloadingSize] = useState<number | null>(null);
  const [downloadMsg, setDownloadMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!downloadMsg) return;
    const t = setTimeout(() => setDownloadMsg(null), 3000);
    return () => clearTimeout(t);
  }, [downloadMsg]);

  if (resultValue == null) return null;

  const rv = resultValue as Record<string, unknown>;
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

  const handleSizeDownload = async (width: number) => {
    setDownloadingSize(width);
    try {
      await downloadResizedImage(resultValue, baseFilename, width);
      setDownloadMsg({ type: 'success', text: `${width}w 下载完成` });
    } catch (err) {
      setDownloadMsg({ type: 'error', text: `下载失败：${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setDownloadingSize(null);
    }
  };

  if (imageUrl && !imgError) {
    return (
      <>
        {/* Lightbox */}
        {lightboxSrc && (
          <div
            className="ua-lightbox"
            onClick={() => setLightboxSrc(null)}
          >
            <img
              src={lightboxSrc}
              alt={out.name}
              className="ua-lightbox-img"
            />
          </div>
        )}

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
              onClick={() => setLightboxSrc(imageUrl)}
              style={{ cursor: 'zoom-in' }}
              onError={() => setImgError(true)}
            />
          </div>
          {nodeError && (
          <div className="ua-output-error">{nodeError}</div>
        )}

        <div className="ua-download-panel">
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

          <div className="ua-download-sizes">
            <span className="ua-download-sizes-label">多尺寸下载</span>
            <div className="ua-download-size-links">
              {multiDownloading ? (
                <span className="ua-download-sizes-loading">
                  <span className="ua-spinner ua-spinner--sm" />
                  生成中…
                </span>
              ) : (
                <>
                  <button
                    className="ua-download-size-link"
                    onClick={() => handleSizeDownload(512)}
                    disabled={downloadingSize !== null}
                    title="下载 512w 尺寸"
                  >
                    {downloadingSize === 512 ? (
                      <span className="ua-spinner ua-spinner--sm" />
                    ) : '512'}
                  </button>
                  <button
                    className="ua-download-size-link"
                    onClick={() => handleSizeDownload(1024)}
                    disabled={downloadingSize !== null}
                    title="下载 1024w 尺寸"
                  >
                    {downloadingSize === 1024 ? (
                      <span className="ua-spinner ua-spinner--sm" />
                    ) : '1024'}
                  </button>
                  <button
                    className="ua-download-size-link"
                    onClick={() => handleSizeDownload(2048)}
                    disabled={downloadingSize !== null}
                    title="下载 2048w 尺寸"
                  >
                    {downloadingSize === 2048 ? (
                      <span className="ua-spinner ua-spinner--sm" />
                    ) : '2048'}
                  </button>
                  <button
                    className="ua-download-all-link"
                    onClick={handleMultiSizeDownload}
                    title="下载 512w / 1024w / 2048w 三种尺寸"
                  >
                    全部
                  </button>
                </>
              )}
            </div>
          </div>

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
      </>
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

// ── OutputSection ─────────────────────────────────────────────────────────────

export interface OutputSectionProps {
  outputs: PublishedOutput[];
  workflowName: string;
  runState: {
    status: 'idle' | 'running' | 'cancelling' | 'done' | 'cancelled' | 'error';
    progress?: ExecutionProgress;
    result?: Record<string, unknown>;
    error?: string;
  };
  /** Batch results keyed by image index (0-based) */
  batchResults?: Record<number, Record<string, unknown>>;
  /** Total images in batch */
  batchTotal?: number;
  /** Currently executing image index */
  batchCurrent?: number;
  /** Whether batch mode is active */
  hasBatch?: boolean;
  /** ZIP download handler — only provided when batch completed */
  onDownloadZip?: () => Promise<void>;
}

export const OutputSection: React.FC<OutputSectionProps> = ({
  outputs,
  workflowName,
  runState,
  batchResults,
  batchTotal = 0,
  batchCurrent = 0,
  hasBatch = false,
  onDownloadZip,
}) => {
  const executionLogs = useRunStore((s) => s.executionLogs);
  const downloadExecutionLogs = useRunStore((s) => s.downloadExecutionLogs);
  const hasLogs = executionLogs.length > 0;

  return (
    <>
      <div className="ua-output-header-row">
        <h2 className="ua-section-title">执行结果</h2>
        {hasLogs && (
          <button
            className="ua-export-icon-btn"
            onClick={downloadExecutionLogs}
            title="导出执行日志"
            aria-label="导出执行日志"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        )}
        {hasBatch && runState.status === 'done' && onDownloadZip && (
          <button
            className="ua-export-icon-btn"
            onClick={onDownloadZip}
            title="下载全部结果 ZIP"
            aria-label="下载全部结果 ZIP"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        )}
      </div>

      {/* Batch progress bar */}
      {hasBatch && runState.status === 'running' && batchTotal > 0 && (
        <div className="ua-batch-progress">
          <div className="ua-batch-progress-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <path d="M8 12h8M8 8h8M8 16h5" />
            </svg>
            <span>批量处理中</span>
            <span className="ua-batch-progress-count">{batchCurrent + 1} / {batchTotal}</span>
          </div>
          <div className="ua-progress-bar">
            <div
              className="ua-progress-fill"
              style={{ width: `${Math.round(((batchCurrent) / batchTotal) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Batch results summary */}
      {hasBatch && runState.status === 'done' && Object.keys(batchResults ?? {}).length > 0 && (
        <div className="ua-batch-summary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{Object.keys(batchResults ?? {}).length} 张图片处理完成</span>
          <button className="ua-batch-zip-btn" onClick={onDownloadZip}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            下载 ZIP
          </button>
        </div>
      )}

      {/* Batch result grid */}
      {hasBatch && runState.status === 'done' && Object.keys(batchResults ?? {}).length > 0 && (
        <div className="ua-batch-grid">
          {Object.entries(batchResults ?? {}).map(([idxStr, result]) => {
            const idx = Number(idxStr);
            return (
              <div key={idxStr} className="ua-batch-card">
                <div className="ua-batch-card-header">
                  <span className="ua-batch-card-num">#{Number(idx) + 1}</span>
                </div>
                {outputs.map((out) => (
                  <OutputPreview
                    key={`${idxStr}-${out.id}`}
                    out={out}
                    resultValue={resolveOutputValue(out.id, result)}
                    workflowName={`${workflowName}_${String(idx + 1).padStart(3, '0')}`}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Single execution idle state */}
      {!hasBatch && runState.status === 'idle' && (
        <div className="ua-result-empty">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <path d="M8 12h8M8 8h8M8 16h5" />
          </svg>
          <span>填写参数后点击执行</span>
        </div>
      )}

      {runState.status === 'running' && !hasBatch && (
        <ProgressDisplay progress={runState.progress} />
      )}

      {(runState.status === 'cancelling' || runState.status === 'cancelled') && !hasBatch && (
        <div className="ua-result-summary ua-result-summary--cancelled">
          <div className="ua-result-summary-check">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </div>
          <span className="ua-result-summary-title">已取消</span>
          <span className="ua-result-summary-meta">· 部分节点结果可能不完整</span>
        </div>
      )}

      {/* Single execution result */}
      {runState.status === 'done' && !hasBatch && (
        <ResultSummary progress={runState.progress} runStatus={runState.status} />
      )}

      {runState.status === 'done' && !hasBatch && runState.result && (
        <div className="ua-result-grid">
          {outputs.length >= 2 && (
            <ZipPackBar
              outputs={outputs}
              results={runState.result}
              workflowName={workflowName}
            />
          )}

          {outputs.map((out) => (
            <OutputPreview
              key={out.id}
              out={out}
              resultValue={resolveOutputValue(out.id, runState.result)}
              workflowName={workflowName}
            />
          ))}

          {outputs.length === 0 && (
            <div className="ua-result-empty">
              <span>执行完成，无输出结果</span>
            </div>
          )}
        </div>
      )}

      {runState.status === 'done' && !hasBatch && !runState.result && (
        <div className="ua-result-empty">
          <span>执行完成，无输出结果</span>
        </div>
      )}

      {runState.status === 'error' && !hasBatch && (
        <div className="ua-result-empty">
          <span>执行出错：{runState.error}</span>
        </div>
      )}
    </>
  );
};
