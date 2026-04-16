// InspectorTabs — five-tab bar: 参数 / 预览 / 调试 / 设置 / 信息
// Reads inspectorTab from store, calls openInspector on click.

import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';

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

      <style>{`
        .inspector-tabs {
          display: flex;
          flex-direction: row;
          border-bottom: 1px solid var(--color-border);
          background: var(--color-surface);
          position: sticky;
          top: 0;
          z-index: 2;
        }

        .inspector-tab {
          flex: 1;
          padding: 8px 12px;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          color: var(--color-text-muted);
          font-size: 11px;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          transition: color 0.15s, border-color 0.15s;
          text-align: center;
          letter-spacing: 0.01em;
        }

        .inspector-tab:hover {
          color: var(--color-text);
          background: rgba(255, 255, 255, 0.04);
        }

        .inspector-tab--active {
          color: var(--color-accent);
          border-bottom-color: var(--color-accent);
        }

        .inspector-tab--active:hover {
          background: rgba(99, 102, 241, 0.08);
        }
      `}</style>
    </div>
  );
};
