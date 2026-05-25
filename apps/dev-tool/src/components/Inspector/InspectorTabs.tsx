// InspectorTabs — five-tab bar: 参数 / 预览 / 调试 / 设置 / 信息
// Reads inspectorTab from store, calls openInspector on click.

import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import './Inspector.module.css';

const TABS = [
  { id: 'parameters' as const, label: '参数' },
  { id: 'preview' as const,    label: '预览' },
  { id: 'debug' as const,     label: '调试' },
  { id: 'settings' as const,   label: '设置' },
  { id: 'info' as const,      label: '信息' },
];

export const InspectorTabs: React.FC = () => {
  const inspectorTab = useCanvasStore((s) => s.inspectorTab);
  const openInspector = useCanvasStore((s) => s.openInspector);

  return (
    <div className="inspector-tabs">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={`inspector-tab${inspectorTab === tab.id ? ' inspector-tab--active' : ''}`}
          onClick={() => openInspector(tab.id)}
          type="button"
        >
          {tab.label}
        </button>
      ))}

    </div>
  );
};
