// SettingsPanel — node settings panel for Inspector
// Handles: alias edit, display mode, extra inputs (Composite), bypass, pin

import React, { useCallback, useState, useEffect } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import type { PortDataType } from '@prism/shared-types';
import { Image, CircleDot, Hash, Type, ToggleLeft, FileText } from 'lucide-react';
import './Inspector.module.css';

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

  // Hooks must be called before any early returns
  const [aliasValue, setAliasValue] = useState('');
  const [displayMode, setDisplayMode] = useState<'expanded' | 'minimized'>('expanded');

  const node = nodes.find((n) => n.id === nodeId);
  const nodeData = node?.data;
  const label = nodeData?.label ?? '';
  const nodeType = nodeData?.nodeType ?? '';
  const extraInputs = nodeData?.extraInputs;
  const minimized = nodeData?.minimized;
  const bypassed = nodeData?.bypassed;
  const pinned = nodeData?.pinned;
  const isComposite = nodeType === 'composite';

  // Sync state when node data changes
  useEffect(() => {
    setAliasValue(label ?? '');
    setDisplayMode(minimized ? 'minimized' : 'expanded');
  }, [label, minimized]);

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

    </div>
  );
};
