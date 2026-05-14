// ImportModal - modal for importing node packages from JSON files

import React, { useState, useCallback } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import {
  type NodePackageManifest,
  safeValidateNodePackage,
} from '@prism/shared-types';
import { globalRegistry, parseInlineExecutor } from '@prism/core';
import type { NodeExecutor } from '@prism/shared-types';

interface ImportModalProps {
  onClose: () => void;
  onSuccess: (_manifest: NodePackageManifest, _nodeTypes: string[]) => void;
}

type ImportState = 'idle' | 'loading' | 'success' | 'error';

export const ImportModal: React.FC<ImportModalProps> = ({ onClose, onSuccess }) => {
  const [state, setState] = useState<ImportState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [manifest, setManifest] = useState<NodePackageManifest | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setState('loading');
    setError(null);

    try {
      const text = await file.text();
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error('Invalid JSON format');
      }

      const result = safeValidateNodePackage(json);
      if (!result.success) {
        const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
        throw new Error(`Validation failed: ${issues}`);
      }

      const validManifest = result.data;

      // Parse executors into actual functions
      const parsedExecutors: Record<string, NodeExecutor> = {};
      for (const execDef of validManifest.executors) {
        if (execDef.source.type === 'inline') {
          parsedExecutors[execDef.id] = parseInlineExecutor(execDef.source.code, execDef.id);
        } else if (execDef.source.type === 'url') {
          // For URL-based executors, create a proxy that fetches from the URL
          const url = execDef.source.url;
          parsedExecutors[execDef.id] = async (inputs, params) => {
            const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ inputs, params }),
            });
            if (!response.ok) {
              throw new Error(`Executor URL returned ${response.status}: ${response.statusText}`);
            }
            return response.json();
          };
        }
      }

      // Initialize global registry
      globalRegistry.initialize();
      const nodeTypes: string[] = [];

      // Register nodes
      for (const def of validManifest.definitions) {
        // Check if already exists
        if (globalRegistry.getNode(def.type)) {
          throw new Error(`Node type "${def.type}" is already registered`);
        }

        // Register with custom flag
        globalRegistry.registerNode(def, true);
        nodeTypes.push(def.type);

        // Register executor - use executor field if present, otherwise use type as fallback
        // Note: executor field may be present in the JSON but not in the TypeScript type
        const executorId = (def as unknown as { executor?: string }).executor ?? def.type;
        if (parsedExecutors[executorId]) {
          globalRegistry.registerExecutor(executorId, parsedExecutors[executorId]);
        }
      }

      setManifest(validManifest);
      setState('success');
      onSuccess(validManifest, nodeTypes);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setState('error');
    }
  }, [onSuccess]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.json')) {
      handleFile(file);
    } else {
      setError('Please drop a JSON file');
      setState('error');
    }
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragActive(false);
  }, []);

  return (
    <div className="dialog-overlay" onClick={(e) => e.target === e.currentTarget && state !== 'loading' && onClose()}>
      <div className="dialog dialog-wide" role="dialog" aria-modal="true">
        <div className="dialog-header">
          <span className="dialog-title">导入节点包</span>
          {state !== 'loading' && (
            <button className="dialog-close" onClick={onClose} aria-label="关闭">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="dialog-body">
          {state === 'idle' && (
            <>
              <div
                className={`import-dropzone ${dragActive ? 'import-dropzone-active' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <Upload size={32} className="import-dropzone-icon" />
                <p className="import-dropzone-text">拖拽节点包 JSON 文件到此处</p>
                <p className="import-dropzone-hint">或</p>
                <label className="import-file-btn">
                  选择文件
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileInput}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
              <div className="import-format-hint">
                <p>节点包格式示例：</p>
                <pre>{`{
  "name": "my-nodes",
  "version": "1.0.0",
  "definitions": [...],
  "executors": [...]
}`}</pre>
              </div>
            </>
          )}

          {state === 'loading' && (
            <div className="import-loading">
              <Loader size={24} className="import-spinner" />
              <span>验证并导入中...</span>
            </div>
          )}

          {state === 'error' && error && (
            <div className="import-error">
              <AlertCircle size={24} />
              <span>{error}</span>
              <button className="dialog-btn dialog-btn-secondary" onClick={() => setState('idle')}>
                重试
              </button>
            </div>
          )}

          {state === 'success' && manifest && (
            <div className="import-success">
              <CheckCircle size={24} />
              <span>导入成功！</span>
              <div className="import-summary">
                <p><strong>{manifest.name}</strong> v{manifest.version}</p>
                <p>包含 {manifest.definitions.length} 个节点定义</p>
              </div>
            </div>
          )}
        </div>

        <div className="dialog-footer">
          <button className="dialog-btn dialog-btn-secondary" onClick={onClose} disabled={state === 'loading'}>
            {state === 'success' ? '完成' : '取消'}
          </button>
        </div>
      </div>
    </div>
  );
};
