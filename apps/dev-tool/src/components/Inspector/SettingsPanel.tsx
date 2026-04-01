// SettingsPanel — node settings panel for Inspector
// Handles: alias edit, display mode, extra inputs (Composite), bypass, pin

import React, { useCallback, useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import type { PortDataType } from '@prism/shared-types';
import { Image, CircleDot, Hash, Type, ToggleLeft, FileText } from 'lucide-react';

interface SettingsPanelProps {
  nodeId: string;
}

const PORT_TYPE_ICONS: Record<string, React.ReactNode> = {
  image: <Image size={12} />,
  mask: <CircleDot size={12} />,
  number: <Hash size={12} />,
  string: <Type size={12} />,
  boolean: <ToggleLeft size={12} />,
  file: <FileText size={12} />,
};

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ nodeId }) => {
  const nodes = useCanvasStore((s) => s.nodes);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const addExtraInput = useCanvasStore((s) => s.addExtraInput);
  const removeExtraInput = useCanvasStore((s) => s.removeExtraInput);

  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return null;

  const { label, nodeType, extraInputs, minimized, bypassed, pinned } = node.data;

  const [aliasValue, setAliasValue] = useState(label);
  const [displayMode, setDisplayMode] = useState<'expanded' | 'minimized'>(
    minimized ? 'minimized' : 'expanded'
  );

  const handleAliasBlur = useCallback(() => {
    if (aliasValue.trim() && aliasValue !== label) {
      updateNodeData(nodeId, { label: aliasValue.trim() });
    } else {
      setAliasValue(label);
    }
  }, [aliasValue, label, nodeId, updateNodeData]);

  const handleAliasKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        (e.target as HTMLInputElement).blur();
      }
      if (e.key === 'Escape') {
        setAliasValue(label);
      }
    },
    [label]
  );

  const handleDisplayModeChange = useCallback(
    (mode: 'expanded' | 'minimized') => {
      setDisplayMode(mode);
      updateNodeData(nodeId, { minimized: mode === 'minimized' });
    },
    [nodeId, updateNodeData]
  );

  const handleBypassToggle = useCallback(() => {
    updateNodeData(nodeId, { bypassed: !bypassed });
  }, [nodeId, bypassed, updateNodeData]);

  const handlePinToggle = useCallback(() => {
    updateNodeData(nodeId, { pinned: !pinned });
  }, [nodeId, pinned, updateNodeData]);

  const handleAddExtraInput = useCallback(() => {
    // Find max overlayN in existing extraInputs and increment
    const existing = extraInputs ?? [];
    const maxOverlayNum = existing.reduce((max, port) => {
      const match = port.id.match(/^overlay(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    const nextNum = maxOverlayNum + 1;

    addExtraInput(nodeId, {
      id: `overlay${nextNum}`,
      name: `叠加 ${nextNum}`,
      type: 'image',
      dataType: 'image' as PortDataType,
    });
  }, [nodeId, extraInputs, addExtraInput]);

  const handleRemoveExtraInput = useCallback(
    (portId: string) => {
      removeExtraInput(nodeId, portId);
    },
    [nodeId, removeExtraInput]
  );

  const isComposite = nodeType === 'composite';

  return (
    <div className="inspector-panel-body">
      {/* Alias edit */}
      <div className="param-panel-section">
        <div className="param-panel-section-title">别名</div>
        <div className="param-row">
          <input
            className="param-input"
            type="text"
            value={aliasValue}
            onChange={(e) => setAliasValue(e.target.value)}
            onBlur={handleAliasBlur}
            onKeyDown={handleAliasKeyDown}
            placeholder={label}
          />
        </div>
      </div>

      {/* Display mode */}
      <div className="param-panel-section">
        <div className="param-panel-section-title">显示模式</div>
        <div className="param-row">
          <div className="settings-radio-group">
            <label className="settings-radio-label">
              <input
                type="radio"
                name={`display-mode-${nodeId}`}
                value="expanded"
                checked={displayMode === 'expanded'}
                onChange={() => handleDisplayModeChange('expanded')}
                className="settings-radio-input"
              />
              <span className="settings-radio-box" />
              <span>展开</span>
            </label>
            <label className="settings-radio-label">
              <input
                type="radio"
                name={`display-mode-${nodeId}`}
                value="minimized"
                checked={displayMode === 'minimized'}
                onChange={() => handleDisplayModeChange('minimized')}
                className="settings-radio-input"
              />
              <span className="settings-radio-box" />
              <span>最小化</span>
            </label>
          </div>
        </div>
      </div>

      {/* Extra inputs (Composite only) */}
      {isComposite && (
        <div className="param-panel-section">
          <div className="param-panel-section-title">输入端口</div>
          <div className="settings-extra-inputs">
            {extraInputs && extraInputs.length > 0 ? (
              <div className="settings-extra-inputs-list">
                {extraInputs.map((port) => (
                  <div key={port.id} className="settings-extra-input-row">
                    <span className="settings-extra-input-icon">
                      {PORT_TYPE_ICONS[port.type] ?? port.type}
                    </span>
                    <span className="settings-extra-input-name" title={port.name}>
                      {port.name}
                    </span>
                    <button
                      type="button"
                      className="settings-extra-input-remove"
                      onClick={() => handleRemoveExtraInput(port.id)}
                      title="移除此输入"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="settings-extra-inputs-empty">
                <span>暂无额外输入端口</span>
              </div>
            )}
            <button
              type="button"
              className="settings-add-input-btn"
              onClick={handleAddExtraInput}
            >
              + 添加输入
            </button>
          </div>
        </div>
      )}

      {/* Toggles */}
      <div className="param-panel-section">
        <div className="param-panel-section-title">状态</div>

        {/* Bypass toggle */}
        <div className="param-row">
          <div className="param-toggle-row">
            <label className="param-label" title="跳过此节点处理，直接透传输入">
              Bypass
            </label>
            <span className="param-toggle">
              <input
                type="checkbox"
                checked={!!bypassed}
                onChange={handleBypassToggle}
              />
              <span className="param-toggle-track" />
            </span>
          </div>
          <span className="param-description">
            跳过此节点处理，直接透传输入
          </span>
        </div>

        {/* Pin toggle */}
        <div className="param-row">
          <div className="param-toggle-row">
            <label className="param-label" title="锁定节点位置，防止意外移动">
              固定节点
            </label>
            <span className="param-toggle">
              <input
                type="checkbox"
                checked={!!pinned}
                onChange={handlePinToggle}
              />
              <span className="param-toggle-track" />
            </span>
          </div>
          <span className="param-description">
            锁定节点位置，防止意外移动
          </span>
        </div>
      </div>

      <style>{`
        .settings-radio-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .settings-radio-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 12px;
          color: var(--color-text);
          transition: color 0.12s;
        }

        .settings-radio-label:hover {
          color: var(--color-accent);
        }

        .settings-radio-input {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }

        .settings-radio-box {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid var(--color-border);
          background: var(--color-surface-2);
          flex-shrink: 0;
          transition: border-color 0.12s, background 0.12s;
          position: relative;
        }

        .settings-radio-box::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) scale(0);
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--color-accent);
          transition: transform 0.12s;
        }

        .settings-radio-input:checked + .settings-radio-box {
          border-color: var(--color-accent);
          background: rgba(99, 102, 241, 0.15);
        }

        .settings-radio-input:checked + .settings-radio-box::after {
          transform: translate(-50%, -50%) scale(1);
        }

        .settings-extra-inputs {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .settings-extra-inputs-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .settings-extra-input-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          background: var(--color-surface-2);
          border: 1px solid var(--color-border);
          border-radius: 6px;
          transition: border-color 0.12s;
        }

        .settings-extra-input-row:hover {
          border-color: rgba(99, 102, 241, 0.4);
        }

        .settings-extra-input-icon {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          color: var(--color-accent);
        }

        .settings-extra-input-name {
          flex: 1;
          font-size: 12px;
          color: var(--color-text);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .settings-extra-input-remove {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: var(--color-text-muted);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          flex-shrink: 0;
          transition: color 0.12s, background 0.12s;
          padding: 0;
          line-height: 1;
        }

        .settings-extra-input-remove:hover {
          color: #f87171;
          background: rgba(248, 113, 113, 0.15);
        }

        .settings-extra-inputs-empty {
          padding: 12px;
          text-align: center;
          font-size: 11px;
          color: var(--color-text-muted);
          background: var(--color-surface-2);
          border: 1px dashed var(--color-border);
          border-radius: 6px;
        }

        .settings-add-input-btn {
          padding: 7px 12px;
          background: transparent;
          border: 1.5px dashed var(--color-border);
          border-radius: 6px;
          color: var(--color-text-muted);
          font-size: 12px;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          transition: border-color 0.12s, color 0.12s, background 0.12s;
          width: 100%;
        }

        .settings-add-input-btn:hover {
          border-color: var(--color-accent);
          color: var(--color-accent);
          background: rgba(99, 102, 241, 0.06);
        }
      `}</style>
    </div>
  );
};
