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
import { PreviewPanel } from './PreviewPanel';
import { DebugTab } from './DebugTab';
import { CircleDot, RotateCcw, Check, Loader2 } from 'lucide-react';
import './Inspector.module.css';

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
      case 'preview':
        return <PreviewPanel nodeId={selectedNode.id} />;
      case 'debug':
        return <DebugTab nodeId={selectedNode.id} />;
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

    </aside>
  );
};
