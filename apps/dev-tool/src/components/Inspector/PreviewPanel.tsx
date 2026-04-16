// PreviewPanel — Inspector 内嵌实时预览 Tab
// 订阅选中节点的 executionResult，节点执行完成后自动刷新预览。
// 支持手动刷新（降级手段）和全屏展开。

import React, { useEffect, useRef, useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { RefreshCw, Maximize2, X, Loader2 } from 'lucide-react';

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

      <style>{`
        .preview-panel {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .preview-panel--empty {
          align-items: center;
          justify-content: center;
          min-height: 200px;
        }

        .preview-panel--running {
          align-items: center;
          justify-content: center;
          min-height: 120px;
        }

        .preview-panel-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          text-align: center;
        }

        .preview-panel-empty-icon {
          color: #52525b;
          opacity: 0.7;
        }

        .preview-panel-state-label {
          font-size: 12px;
          color: #71717a;
          font-weight: 500;
        }

        .preview-panel-empty-hint {
          color: #71717a;
          font-size: 12px;
        }

        .preview-panel-empty-sub {
          font-size: 11px;
          color: #52525b;
          max-width: 180px;
          text-align: center;
          line-height: 1.4;
        }

        .preview-panel-spin {
          color: #818cf8;
          animation: dcn-dot-pulse 1s ease-in-out infinite;
        }

        /* Toolbar */
        .preview-panel-toolbar {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          flex-shrink: 0;
        }

        .preview-panel-tool-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          background: transparent;
          border: 1px solid #3f3f46;
          border-radius: 4px;
          color: #71717a;
          cursor: pointer;
          transition: color 0.12s, border-color 0.12s, background 0.12s;
          padding: 0;
        }

        .preview-panel-tool-btn:hover {
          color: #f4f4f5;
          border-color: #a1a1aa;
          background: #27272a;
        }

        .preview-panel-meta {
          margin-left: auto;
          font-size: 10px;
          font-family: 'SF Mono', monospace;
          color: #8b5cf6;
          background: rgba(139, 92, 246, 0.1);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 4px;
          padding: 1px 6px;
        }

        /* Image area */
        .preview-panel-img-wrap {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: repeating-conic-gradient(#1a1a1a 0% 25%, #222 0% 50%) 0 0 / 16px 16px;
          min-height: 120px;
        }

        .preview-panel-img {
          max-width: 100%;
          max-height: 320px;
          object-fit: contain;
          display: block;
        }

        /* Fullscreen overlay */
        .preview-panel-fs-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(4px);
          animation: fadeIn 0.15s ease;
        }

        .preview-panel-fs-content {
          max-width: 90vw;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 20px 60px rgba(0,0,0,0.8);
          background: #18181b;
        }

        .preview-panel-fs-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          background: #27272a;
          border-bottom: 1px solid #3f3f46;
          flex-shrink: 0;
        }

        .preview-panel-fs-title {
          font-size: 13px;
          font-weight: 600;
          color: #f4f4f5;
        }

        .preview-panel-fs-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: #71717a;
          cursor: pointer;
          transition: color 0.12s, background 0.12s;
          padding: 0;
        }

        .preview-panel-fs-close:hover {
          color: #f4f4f5;
          background: #3f3f46;
        }

        .preview-panel-fs-body {
          flex: 1;
          overflow: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          background: repeating-conic-gradient(#0f0f0f 0% 25%, #181818 0% 50%) 0 0 / 24px 24px;
        }

        .preview-panel-fs-img {
          max-width: 100%;
          max-height: calc(90vh - 80px);
          object-fit: contain;
          display: block;
        }

        .preview-panel-fs-footer {
          padding: 8px 16px;
          background: #27272a;
          border-top: 1px solid #3f3f46;
          flex-shrink: 0;
        }

        .preview-panel-fs-meta {
          font-size: 11px;
          font-family: 'SF Mono', monospace;
          color: #8b5cf6;
        }
      `}</style>
    </div>
  );
};
