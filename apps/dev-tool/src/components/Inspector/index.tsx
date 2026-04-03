// Inspector — main inspector container (replaces ParamPanel)
// Renders header (node title + badge) then the appropriate panel based on inspectorTab.
// If no node selected: "选中节点以编辑参数"
// If multiple nodes selected: "已选择 N 个节点"
// Includes footer with Reset / Apply Changes for parameters tab.

import React, { useState, useEffect } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { InspectorTabs } from './InspectorTabs';
import { ParametersPanel } from './ParametersPanel';
import { SettingsPanel } from './SettingsPanel';
import { InfoPanel } from './InfoPanel';
import { CircleDot, RotateCcw, Check, Loader2 } from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  input:    '输入',
  transform: '变换',
  mask:     '遮罩',
  composite: '合成',
  output:   '输出',
};

export const Inspector: React.FC = () => {
  const inspectorTab = useCanvasStore((s) => s.inspectorTab);
  const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds);
  const nodes = useCanvasStore((s) => s.nodes);
  const updateNodeParams = useCanvasStore((s) => s.updateNodeParams);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);

  // Snapshot of original params/label when a node is first selected
  const [originalParams, setOriginalParams] = useState<Record<string, unknown>>({});
  const [originalLabel, setOriginalLabel] = useState<string>('');
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // Derive selectedNode — must be AFTER all hooks above
  const selectedNode = selectedNodeIds.length === 1
    ? nodes.find((n) => n.id === selectedNodeIds[0])
    : undefined;

  // Capture original state when a new single node is selected
  // Always call this hook — never inside a conditional block
  useEffect(() => {
    if (selectedNode) {
      const { params, label } = selectedNode.data;
      setOriginalParams({ ...params });
      setOriginalLabel(label ?? '');
      setHasLocalChanges(false);
    }
  }, [selectedNodeIds[0], selectedNode]);

  // Detect local changes — always call; selectedNode is always defined here
  // (the next line uses optional chaining so it's safe even when undefined)
  const { params, label } = selectedNode?.data ?? {};
  const category = selectedNode?.data?.definition?.category;
  const paramsChanged = params ? JSON.stringify(params) !== JSON.stringify(originalParams) : false;
  const labelChanged = label !== originalLabel;

  // Update hasLocalChanges synchronously on every render where params/label changed
  // This replaces the problematic conditional useEffect
  React.useLayoutEffect(() => {
    setHasLocalChanges(paramsChanged || labelChanged);
  }, [paramsChanged, labelChanged]);

  // --- Early returns AFTER all hooks ---
  if (selectedNodeIds.length === 0) {
    return (
      <aside className="param-panel inspector" />
    );
  }

  if (selectedNodeIds.length > 1) {
    return (
      <aside className="param-panel inspector">
        <div className="param-panel-empty">
          <CircleDot size={16} className="param-panel-empty-icon" />
          <span>已选择 {selectedNodeIds.length} 个节点</span>
        </div>
      </aside>
    );
  }

  // At this point: single node is guaranteed selected
  if (!selectedNode) return null;

  const handleReset = () => {
    // Restore original params
    updateNodeParams(selectedNode.id, { ...originalParams });
    // Restore original label if changed
    if (label !== originalLabel) {
      updateNodeData(selectedNode.id, { label: originalLabel });
    }
    setHasLocalChanges(false);
  };

  const handleApply = () => {
    // Changes are already live — just commit the snapshot
    setIsApplying(true);
    setTimeout(() => {
      setOriginalParams({ ...params });
      setOriginalLabel(label ?? '');
      setHasLocalChanges(false);
      setIsApplying(false);
    }, 300);
  };

  const renderPanel = () => {
    switch (inspectorTab) {
      case 'parameters':
        return <ParametersPanel nodeId={selectedNode.id} />;
      case 'settings':
        return <SettingsPanel nodeId={selectedNode.id} />;
      case 'info':
        return <InfoPanel nodeId={selectedNode.id} />;
      default:
        return null;
    }
  };

  const showFooter = inspectorTab === 'parameters' && hasLocalChanges;

  return (
    <aside className="param-panel inspector">
      {/* Header */}
      <div className="param-panel-header">
        <span className="param-panel-title" title={label}>
          {label}
        </span>
        <span className="param-panel-badge">
          {category ? CATEGORY_LABELS[category] ?? category : ''}
        </span>
      </div>

      {/* Tabs */}
      <InspectorTabs />

      {/* Panel content */}
      {renderPanel()}

      {/* Footer — shown only when parameters have local changes */}
      {showFooter && (
        <div className="inspector-footer">
          <div className="inspector-footer-changes-badge">
            <span className="inspector-footer-dot" />
            已修改
          </div>
          <div className="inspector-footer-actions">
            <button
              className="inspector-footer-reset-btn"
              onClick={handleReset}
              type="button"
            >
              <RotateCcw size={13} />
              重置
            </button>
            <button
              className="inspector-footer-apply-btn"
              onClick={handleApply}
              disabled={isApplying}
              type="button"
            >
              {isApplying ? (
                <Loader2 size={13} className="ins-spin" />
              ) : (
                <Check size={13} />
              )}
              {isApplying ? '应用中…' : '应用变更'}
            </button>
          </div>
        </div>
      )}

      <style>{`
        .param-panel.inspector {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          height: 100%;
        }

        .param-panel.inspector > .inspector-panel-body {
          flex: 1;
          overflow-y: auto;
          min-height: 0;
        }

        .param-panel.inspector .param-panel-header {
          flex-shrink: 0;
        }

        .param-panel.inspector .inspector-tabs {
          flex-shrink: 0;
        }

        /* Base param-panel layout (shared with legacy ParamPanel) */
        .param-panel {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
          background: #18181b;
          overflow: hidden;
        }

        .param-panel-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-bottom: 1px solid #27272a;
          flex-shrink: 0;
          min-height: 0;
        }

        .param-panel-title {
          font-size: 13px;
          font-weight: 600;
          color: #f4f4f5;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
          min-width: 0;
        }

        .param-panel-badge {
          font-size: 10px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 9999px;
          background: #27272a;
          color: #a1a1aa;
          border: 1px solid #3f3f46;
          flex-shrink: 0;
          text-transform: capitalize;
        }

        .param-panel-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 100%;
          color: #71717a;
          font-size: 13px;
          text-align: center;
          padding: 24px;
        }

        .param-panel-empty-icon {
          opacity: 0.4;
        }

        .param-panel-empty span {
          font-size: 13px;
          color: #71717a;
        }

        .param-panel-section {
          padding: 12px;
        }

        .param-panel-section-title {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #71717a;
          margin-bottom: 8px;
        }

        /* Param field styles */
        .param-row {
          margin-bottom: 12px;
        }

        .param-label {
          display: block;
          font-size: 11px;
          font-weight: 500;
          color: #c4c4cc;
          margin-bottom: 4px;
        }

        .param-label-required {
          color: #a78bfa;
          margin-left: 2px;
        }

        .param-description {
          display: block;
          font-size: 11px;
          color: #71717a;
          margin-bottom: 4px;
          line-height: 1.4;
        }

        .param-input {
          width: 100%;
          box-sizing: border-box;
          height: 28px;
          background: #27272a;
          border: 1px solid #3f3f46;
          border-radius: 6px;
          color: #f4f4f5;
          font-size: 12px;
          font-family: inherit;
          padding: 0 8px;
          outline: none;
          transition: border-color 0.12s;
        }

        .param-input:focus {
          border-color: #b1a1ff;
          box-shadow: 0 0 0 2px rgba(177, 161, 255, 0.15);
        }

        .param-number-input {
          width: 100%;
          box-sizing: border-box;
          height: 28px;
          background: #27272a;
          border: 1px solid #3f3f46;
          border-radius: 6px;
          color: #f4f4f5;
          font-size: 12px;
          font-family: inherit;
          padding: 0 8px;
          outline: none;
          transition: border-color 0.12s;
        }

        .param-number-input:focus {
          border-color: #b1a1ff;
          box-shadow: 0 0 0 2px rgba(177, 161, 255, 0.15);
        }

        .param-select {
          width: 100%;
          box-sizing: border-box;
          height: 28px;
          background: #27272a;
          border: 1px solid #3f3f46;
          border-radius: 6px;
          color: #f4f4f5;
          font-size: 12px;
          font-family: inherit;
          padding: 0 8px;
          outline: none;
          cursor: pointer;
          transition: border-color 0.12s;
          -webkit-appearance: none;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 8px center;
          padding-right: 28px;
        }

        .param-select:focus {
          border-color: #b1a1ff;
          box-shadow: 0 0 0 2px rgba(177, 161, 255, 0.15);
        }

        .param-toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .param-toggle {
          position: relative;
          display: inline-flex;
          align-items: center;
        }

        .param-toggle input {
          opacity: 0;
          width: 0;
          height: 0;
          position: absolute;
        }

        .param-toggle-track {
          width: 32px;
          height: 18px;
          border-radius: 6px;
          background: #3f3f46;
          border: 1px solid #52525b;
          cursor: pointer;
          transition: background 0.18s, border-color 0.18s;
          position: relative;
        }

        .param-toggle-track::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #71717a;
          transition: transform 0.18s, background 0.18s;
        }

        .param-toggle input:checked + .param-toggle-track {
          background: #b1a1ff;
          border-color: #b1a1ff;
        }

        .param-toggle input:checked + .param-toggle-track::after {
          transform: translateX(14px);
          background: white;
        }

        .param-slider-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .param-slider {
          flex: 1;
          height: 4px;
          appearance: none;
          background: #3f3f46;
          border-radius: 6px;
          outline: none;
          cursor: pointer;
        }

        .param-slider::-webkit-slider-thumb {
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #b1a1ff;
          cursor: pointer;
          border: 2px solid #18181b;
          box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        }

        .param-slider-value {
          font-size: 11px;
          color: #a1a1aa;
          min-width: 28px;
          text-align: right;
          font-family: 'SF Mono', 'Cascadia Code', monospace;
        }

        /* Image file field */
        .image-file-preview {
          border: 1px solid #3f3f46;
          border-radius: 8px;
          overflow: hidden;
          background: #27272a;
        }

        .image-file-preview-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 6px 10px;
          border-bottom: 1px solid #3f3f46;
        }

        .image-file-name {
          font-size: 11px;
          color: #a1a1aa;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
        }

        .image-file-resolution {
          font-size: 10px;
          color: #b1a1ff;
          background: rgba(177, 161, 255, 0.1);
          padding: 1px 6px;
          border-radius: 6px;
          white-space: nowrap;
        }

        .image-file-img {
          display: block;
          width: 100%;
          max-height: 100px;
          object-fit: contain;
          background: repeating-conic-gradient(#1a1a1a 0% 25%, #222 0% 50%) 0 0 / 16px 16px;
        }

        .image-file-change-btn,
        .image-file-upload-btn {
          display: block;
          width: 100%;
          padding: 7px;
          border: 1px dashed #3f3f46;
          background: transparent;
          color: #71717a;
          font-size: 11px;
          font-family: inherit;
          cursor: pointer;
          text-align: center;
          transition: border-color 0.12s, color 0.12s, background-color 0.12s;
          border-radius: 6px;
        }

        .image-file-change-btn:hover,
        .image-file-upload-btn:hover {
          border-color: #a855f7;
          color: #a855f7;
          background: rgba(168, 85, 247, 0.05);
        }

        /* Inspector tabs */
        .inspector-tabs {
          display: flex;
          gap: 0;
          padding: 0 12px;
          border-bottom: 1px solid #27272a;
          flex-shrink: 0;
        }

        .inspector-tab-btn {
          padding: 8px 12px;
          border: none;
          background: transparent;
          color: #71717a;
          font-size: 12px;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          transition: color 0.12s, border-color 0.12s;
        }

        .inspector-tab-btn:hover {
          color: #a1a1aa;
        }

        .inspector-tab-btn--active {
          color: #f4f4f5;
          border-bottom-color: #b1a1ff;
        }

        /* Inspector panel body */
        .inspector-panel-body {
          flex: 1;
          overflow-y: auto;
          min-height: 0;
        }

        /* Footer */
        .inspector-footer {
          flex-shrink: 0;
          border-top: 1px solid #27272a;
          padding: 10px 12px 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          animation: ins-footer-in 0.18s ease;
        }

        @keyframes ins-footer-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .inspector-footer-changes-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 500;
          color: #f59e0b;
        }

        .inspector-footer-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #f59e0b;
        }

        .inspector-footer-actions {
          display: flex;
          gap: 6px;
        }

        .inspector-footer-reset-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          flex: 1;
          justify-content: center;
          padding: 7px 12px;
          border: 1px solid #3f3f46;
          border-radius: 6px;
          background: transparent;
          color: #a1a1aa;
          font-size: 12px;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          transition: background 0.12s, border-color 0.12s, color 0.12s;
        }
        .inspector-footer-reset-btn:hover {
          background: #27272a;
          border-color: #52525b;
          color: #f4f4f5;
        }

        .inspector-footer-apply-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          flex: 2;
          justify-content: center;
          padding: 7px 12px;
          border: none;
          border-radius: 6px;
          background: #b1a1ff;
          color: white;
          font-size: 12px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: background 0.12s, opacity 0.12s;
        }
        .inspector-footer-apply-btn:hover:not(:disabled) {
          background: #c0b0ff;
        }
        .inspector-footer-apply-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .ins-spin {
          animation: ins-spin 0.8s linear infinite;
        }

        @keyframes ins-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </aside>
  );
};
