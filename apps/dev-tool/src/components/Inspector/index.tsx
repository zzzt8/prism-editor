// Inspector — main inspector container (replaces ParamPanel)
// Renders header (node title + badge) then the appropriate panel based on inspectorTab.
// If no node selected: "选中节点以编辑参数"
// If multiple nodes selected: "已选择 N 个节点"

import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { InspectorTabs } from './InspectorTabs';
import { ParametersPanel } from './ParametersPanel';
import { SettingsPanel } from './SettingsPanel';
import { InfoPanel } from './InfoPanel';

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

  const selectedNode = selectedNodeIds.length === 1
    ? nodes.find((n) => n.id === selectedNodeIds[0])
    : undefined;

  // No node selected
  if (selectedNodeIds.length === 0) {
    return (
      <aside className="param-panel inspector">
        <div className="param-panel-empty">
          <span className="param-panel-empty-icon">◈</span>
          <span>选中节点以编辑参数</span>
        </div>
      </aside>
    );
  }

  // Multiple nodes selected
  if (selectedNodeIds.length > 1) {
    return (
      <aside className="param-panel inspector">
        <div className="param-panel-empty">
          <span className="param-panel-empty-icon">◈</span>
          <span>已选择 {selectedNodeIds.length} 个节点</span>
        </div>
      </aside>
    );
  }

  // Single node selected
  if (!selectedNode) return null;

  const { definition, label, nodeType } = selectedNode.data;
  const category = definition?.category ?? nodeType;

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

  return (
    <aside className="param-panel inspector">
      {/* Header */}
      <div className="param-panel-header">
        <span className="param-panel-title" title={label}>
          {label}
        </span>
        <span className="param-panel-badge">
          {CATEGORY_LABELS[category] ?? category}
        </span>
      </div>

      {/* Tabs */}
      <InspectorTabs />

      {/* Panel content */}
      {renderPanel()}

      <style>{`
        .param-panel.inspector {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .param-panel.inspector .param-panel-header {
          flex-shrink: 0;
        }

        .param-panel.inspector .inspector-tabs {
          flex-shrink: 0;
        }

        .param-panel.inspector .inspector-panel-body {
          flex: 1;
          overflow-y: auto;
          min-height: 0;
        }
      `}</style>
    </aside>
  );
};
