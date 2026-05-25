// RenderProductionModal - minimal UI for production rendering
// This is a placeholder for the SKU-based render flow

import React, { useState } from 'react';
import { X, Image, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

interface RenderProductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflowId: string;
}

interface RenderFile {
  name: string;
  url: string;
  mimeType: string;
  size: number;
}

export function RenderProductionModal({ isOpen, onClose, workflowId }: RenderProductionModalProps) {
  const [skuId, setSkuId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ files: RenderFile[]; renderedAt: string } | null>(null);

  const handleRender = async () => {
    if (!skuId.trim()) {
      setError('Please enter a SKU ID');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/skus/${skuId}/render`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userParams: {},
          workflowIds: workflowId ? [workflowId] : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Render failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="render-modal-overlay" onClick={onClose}>
      <div className="render-modal" onClick={(e) => e.stopPropagation()}>
        <div className="render-modal-header">
          <div>
            <h2 className="render-modal-title">Render Production Image</h2>
            <p className="render-modal-subtitle">Generate high-quality production renders via backend workflow</p>
          </div>
          <button className="render-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="render-modal-body">
          {!result ? (
            <>
              <div className="render-field">
                <label className="render-label">SKU ID</label>
                <input
                  type="text"
                  className="render-input"
                  placeholder="Enter SKU ID to render"
                  value={skuId}
                  onChange={(e) => setSkuId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRender();
                  }}
                />
                <p className="render-hint">
                  The SKU must be associated with a backend production workflow.
                </p>
              </div>

              {error && (
                <div className="render-error">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}
            </>
          ) : (
            <div className="render-result">
              <div className="render-result-header">
                <CheckCircle size={20} color="#4ade80" />
                <span>Render complete</span>
              </div>
              <p className="render-result-meta">
                {result.files.length} file(s) generated at {new Date(result.renderedAt).toLocaleString()}
              </p>
              <div className="render-files">
                {result.files.map((file, index) => (
                  <a
                    key={index}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="render-file"
                  >
                    <Image size={16} />
                    <span className="render-file-name">{file.name}</span>
                    <span className="render-file-size">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="render-modal-footer">
          <button className="render-btn-cancel" onClick={onClose}>
            {result ? 'Close' : 'Cancel'}
          </button>
          {!result && (
            <button
              className="render-btn-submit"
              onClick={handleRender}
              disabled={isLoading || !skuId.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="render-spin" />
                  Rendering...
                </>
              ) : (
                <>
                  <Image size={16} />
                  Render
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <style>{`
        .render-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .render-modal {
          background: #27272a;
          border-radius: 12px;
          width: 480px;
          max-width: 90vw;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .render-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 20px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .render-modal-title {
          font-size: 16px;
          font-weight: 600;
          color: #f4f4f5;
          margin: 0;
        }

        .render-modal-subtitle {
          font-size: 13px;
          color: #71717a;
          margin: 4px 0 0;
        }

        .render-modal-close {
          background: transparent;
          border: none;
          color: #71717a;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: background 0.12s, color 0.12s;
        }

        .render-modal-close:hover {
          background: rgba(255, 255, 255, 0.06);
          color: #f4f4f5;
        }

        .render-modal-body {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
        }

        .render-field {
          margin-bottom: 16px;
        }

        .render-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #a1a1aa;
          margin-bottom: 8px;
        }

        .render-input {
          width: 100%;
          padding: 10px 12px;
          background: #18181b;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          color: #f4f4f5;
          font-size: 14px;
          font-family: inherit;
          outline: none;
          transition: border-color 0.12s;
        }

        .render-input:focus {
          border-color: #a855f7;
          box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.15);
        }

        .render-hint {
          font-size: 12px;
          color: #71717a;
          margin: 8px 0 0;
        }

        .render-error {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: rgba(220, 38, 38, 0.1);
          border: 1px solid rgba(220, 38, 38, 0.2);
          border-radius: 8px;
          color: #fca5a5;
          font-size: 13px;
        }

        .render-result {
          text-align: center;
        }

        .render-result-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 600;
          color: #4ade80;
          margin-bottom: 8px;
        }

        .render-result-meta {
          font-size: 13px;
          color: #71717a;
          margin: 0 0 16px;
        }

        .render-files {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .render-file {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: #18181b;
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 8px;
          color: #a1a1aa;
          text-decoration: none;
          transition: background 0.12s, border-color 0.12s;
        }

        .render-file:hover {
          background: #1c1c1e;
          border-color: rgba(255, 255, 255, 0.12);
          color: #f4f4f5;
        }

        .render-file-name {
          flex: 1;
          font-size: 13px;
          text-align: left;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .render-file-size {
          font-size: 12px;
          color: #71717a;
        }

        .render-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          padding: 16px 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .render-btn-cancel {
          padding: 8px 16px;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 6px;
          color: #a1a1aa;
          font-size: 13px;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          transition: background 0.12s, color 0.12s;
        }

        .render-btn-cancel:hover {
          background: rgba(255, 255, 255, 0.04);
          color: #f4f4f5;
        }

        .render-btn-submit {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: #a855f7;
          border: none;
          border-radius: 6px;
          color: white;
          font-size: 13px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: background 0.12s;
        }

        .render-btn-submit:hover:not(:disabled) {
          background: #c084fc;
        }

        .render-btn-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .render-spin {
          animation: render-spin 0.8s linear infinite;
        }

        @keyframes render-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
