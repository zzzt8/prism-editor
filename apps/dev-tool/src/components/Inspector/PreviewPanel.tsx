// PreviewPanel — Inspector 内嵌实时预览 Tab
// 订阅选中节点的 executionResult，节点执行完成后自动刷新预览。
// 支持手动刷新（降级手段）和全屏展开。

import React, { useEffect, useRef, useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { RefreshCw, Maximize2, X, Loader2 } from 'lucide-react';
import './Inspector.module.css';

interface PreviewPanelProps {
  nodeId: string;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ nodeId }) => {
  const nodes = useCanvasStore((s) => s.nodes);
  const _executionStatus = useCanvasStore((s) => s._executionStatus);
  const _currentNodeId = useCanvasStore((s) => s._currentNodeId);

  const node = nodes.find((n) => n.id === nodeId);

  // Auto-refresh: listen to execution result changes
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMeta, setPreviewMeta] = useState<{ width: number; height: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [manualRefresh, setManualRefresh] = useState(0);
  const prevResultRef = useRef<unknown>(null);

  const isRunning = _currentNodeId === nodeId && _executionStatus === 'running';

  // Extract preview from executionResult
  const extractPreview = (result: Record<string, unknown> | undefined) => {
    if (!result) return null;
    // Priority: top-level previewUrl
    const topPreview = result['previewUrl'];
    if (typeof topPreview === 'string' && topPreview.length > 0) {
      const w = (result['width'] as number) ?? 0;
      const h = (result['height'] as number) ?? 0;
      return { url: topPreview, width: w, height: h };
    }
    // Search in result values for image objects
    for (const val of Object.values(result)) {
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        const obj = val as Record<string, unknown>;
        const url = (obj['previewUrl'] ?? obj['url']) as string | undefined;
        const w = (obj['width'] as number | undefined) ?? 0;
        const h = (obj['height'] as number | undefined) ?? 0;
        if (typeof url === 'string' && url.length > 0) {
          return { url, width: w, height: h };
        }
        // raw ImageData
        if (obj['data'] instanceof ImageData && w && h) {
          try {
            const MAX = 800;
            const scale = Math.min(1, MAX / Math.max(w, h));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(w * scale);
            canvas.height = Math.round(h * scale);
            const ctx = canvas.getContext('2d');
            if (!ctx) return null;
            const tmp = document.createElement('canvas');
            tmp.width = w; tmp.height = h;
            const tmpCtx = tmp.getContext('2d');
            if (!tmpCtx) return null;
            tmpCtx.putImageData(obj['data'] as ImageData, 0, 0);
            ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);
            return { url: canvas.toDataURL('image/png'), width: w, height: h };
          } catch { /* ignore */ }
        }
      }
    }
    return null;
  };

  useEffect(() => {
    if (!node) return;
    const result = node.data.executionResult;
    if (result !== prevResultRef.current) {
      prevResultRef.current = result;
      const preview = extractPreview(result as Record<string, unknown>);
      if (preview) {
        setPreviewUrl(preview.url);
        setPreviewMeta({ width: preview.width, height: preview.height });
      }
    }
  }, [node?.data.executionResult, manualRefresh, node]);

  // Fullscreen overlay
  const renderFullscreen = () => {
    if (!isFullscreen || !previewUrl) return null;
    return (
      <div
        className="preview-panel-fs-overlay"
        onClick={() => setIsFullscreen(false)}
      >
        <div
          className="preview-panel-fs-content"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="preview-panel-fs-header">
            <span className="preview-panel-fs-title">
              {node?.data.label ?? '预览'}
            </span>
            <button
              className="preview-panel-fs-close"
              onClick={() => setIsFullscreen(false)}
              aria-label="关闭全屏"
            >
              <X size={16} />
            </button>
          </div>
          <div className="preview-panel-fs-body">
            <img
              src={previewUrl}
              alt="全屏预览"
              className="preview-panel-fs-img"
            />
          </div>
          {previewMeta && (
            <div className="preview-panel-fs-footer">
              <span className="preview-panel-fs-meta">
                {previewMeta.width} × {previewMeta.height}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isRunning) {
    return (
      <div className="inspector-panel-body preview-panel preview-panel--running">
        <div className="preview-panel-state">
          <Loader2 size={20} className="preview-panel-spin" />
          <span className="preview-panel-state-label">执行中…</span>
        </div>
        {renderFullscreen()}
      </div>
    );
  }

  if (!previewUrl) {
    return (
      <div className="inspector-panel-body preview-panel preview-panel--empty">
        <div className="preview-panel-state">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="preview-panel-empty-icon">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          <span className="preview-panel-state-label preview-panel-empty-hint">
            请选择节点查看预览
          </span>
          <span className="preview-panel-empty-sub">
            执行节点后，预览将自动显示在此处
          </span>
        </div>
        {renderFullscreen()}
      </div>
    );
  }

  return (
    <div className="inspector-panel-body preview-panel">
      <div className="preview-panel-toolbar">
        <button
          className="preview-panel-tool-btn"
          onClick={() => setManualRefresh((n) => n + 1)}
          title="手动刷新预览"
        >
          <RefreshCw size={13} />
        </button>
        <button
          className="preview-panel-tool-btn"
          onClick={() => setIsFullscreen(true)}
          title="全屏查看"
        >
          <Maximize2 size={13} />
        </button>
        {previewMeta && (
          <span className="preview-panel-meta">
            {previewMeta.width} × {previewMeta.height}
          </span>
        )}
      </div>
      <div className="preview-panel-img-wrap">
        <img
          src={previewUrl}
          alt="节点输出预览"
          className="preview-panel-img"
        />
      </div>
      {renderFullscreen()}
    </div>
  );
};
