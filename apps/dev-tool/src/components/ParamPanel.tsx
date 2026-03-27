// ParamPanel — right-side panel showing the selected node's parameters
//
// Wires:
// - Reads selectedNodeIds from useCanvasStore
// - Derives the CanvasNode from the nodes array
// - Renders ParamDefinition widgets (text, number+slider, select, boolean)
// - Calls updateNodeParams on every change

import React, { useCallback } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import type { ParamDefinition, PortDefinition } from '@prism/shared-types';

const CATEGORY_LABELS: Record<string, string> = {
  input:    '输入',
  transform: '变换',
  mask:     '遮罩',
  composite: '合成',
  output:   '输出',
};

const PORT_TYPE_LABELS: Record<string, string> = {
  image: '🖼',
  mask:  '◐',
  number: '#',
  string: 'A',
  boolean: '◻',
};

function ParamField({
  param,
  value,
  onChange,
}: {
  param: ParamDefinition;
  value: unknown;
  onChange: (id: string, val: unknown) => void;
}) {
  const handleChange = (val: unknown) => onChange(param.id, val);

  if (param.type === 'string') {
    return (
      <div className="param-row">
        <label className="param-label" title={param.description}>
          {param.name}
          {param.required && <span className="param-label-required">*</span>}
        </label>
        {param.description && (
          <span className="param-description">{param.description}</span>
        )}
        <input
          className="param-input"
          type="text"
          value={(value as string) ?? ''}
          placeholder={String(param.default ?? '')}
          onChange={(e) => handleChange(e.target.value)}
        />
      </div>
    );
  }

  if (param.type === 'number') {
    const numVal = typeof value === 'number' ? value : (param.default as number ?? 0);
    const min = param.min ?? 0;
    const max = param.max ?? 100;
    const step = param.step ?? 1;
    const hasRange = max - min > step * 2;

    return (
      <div className="param-row">
        <label className="param-label" title={param.description}>
          {param.name}
          {param.required && <span className="param-label-required">*</span>}
        </label>
        {param.description && (
          <span className="param-description">{param.description}</span>
        )}
        {hasRange ? (
          <div className="param-slider-row">
            <input
              className="param-slider"
              type="range"
              min={min}
              max={max}
              step={step}
              value={numVal}
              onChange={(e) => handleChange(Number(e.target.value))}
            />
            <span className="param-slider-value">{numVal}</span>
          </div>
        ) : (
          <input
            className="param-number-input"
            type="number"
            min={min}
            max={max}
            step={step}
            value={numVal}
            onChange={(e) => handleChange(Number(e.target.value))}
          />
        )}
      </div>
    );
  }

  if (param.type === 'select') {
    return (
      <div className="param-row">
        <label className="param-label" title={param.description}>
          {param.name}
          {param.required && <span className="param-label-required">*</span>}
        </label>
        {param.description && (
          <span className="param-description">{param.description}</span>
        )}
        <select
          className="param-select"
          value={(value as string) ?? (param.default as string) ?? ''}
          onChange={(e) => handleChange(e.target.value)}
        >
          {(param.options ?? []).map((opt) => (
            <option key={String(opt.value)} value={String(opt.value)}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (param.type === 'boolean') {
    const boolVal = typeof value === 'boolean' ? value : (param.default as boolean ?? false);
    return (
      <div className="param-row">
        <div className="param-toggle-row">
          <label className="param-label" title={param.description}>
            {param.name}
          </label>
          <span className="param-toggle">
            <input
              type="checkbox"
              checked={boolVal}
              onChange={(e) => handleChange(e.target.checked)}
            />
            <span className="param-toggle-track" />
          </span>
        </div>
        {param.description && (
          <span className="param-description">{param.description}</span>
        )}
      </div>
    );
  }

  // Fallback: display-only
  return (
    <div className="param-row">
      <label className="param-label">{param.name}</label>
      <span className="param-description">
        {param.description ?? String(value ?? '')}
      </span>
    </div>
  );
}

export const ParamPanel: React.FC = () => {
  const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds);
  const nodes = useCanvasStore((s) => s.nodes);
  const updateNodeParams = useCanvasStore((s) => s.updateNodeParams);

  const selectedNode = selectedNodeIds.length === 1
    ? nodes.find((n) => n.id === selectedNodeIds[0])
    : undefined;

  const selectedNodeId = selectedNodeIds[0];
  const handleChange = useCallback(
    (id: string, value: unknown) => {
      if (!selectedNodeId) return;
      updateNodeParams(selectedNodeId, {
        ...nodes.find((n) => n.id === selectedNodeId)?.data.params ?? {},
        [id]: value,
      });
    },
    [selectedNodeId, updateNodeParams, nodes]
  );

  if (selectedNodeIds.length === 0) {
    return (
      <aside className="param-panel">
        <div className="param-panel-empty">
          <span className="param-panel-empty-icon">◈</span>
          <span>选中节点以编辑参数</span>
        </div>
      </aside>
    );
  }

  if (selectedNodeIds.length > 1) {
    return (
      <aside className="param-panel">
        <div className="param-panel-empty">
          <span className="param-panel-empty-icon">◈</span>
          <span>已选择 {selectedNodeIds.length} 个节点</span>
        </div>
      </aside>
    );
  }

  if (!selectedNode) return null;

  const { definition, params, label, nodeType } = selectedNode.data;
  const category = definition?.category ?? nodeType;

  return (
    <aside className="param-panel">
      {/* Header */}
      <div className="param-panel-header">
        <span className="param-panel-title" title={label}>
          {label}
        </span>
        <span className="param-panel-badge">
          {CATEGORY_LABELS[category] ?? category}
        </span>
      </div>

      {/* Node info */}
      {definition && (
        <div className="param-panel-section">
          <div className="param-panel-section-title">节点信息</div>
          <div className="param-node-info">
            <div className="param-info-row">
              <span className="param-info-label">类型</span>
              <span>{nodeType}</span>
            </div>
            {definition.description && (
              <div className="param-info-row">
                <span className="param-info-label">说明</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {definition.description}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Input ports */}
      {definition && definition.inputs.length > 0 && (
        <div className="param-panel-section">
          <div className="param-panel-section-title">输入端口</div>
          {definition.inputs.map((p: PortDefinition) => (
            <div key={p.id} className="param-info-row">
              <span>{PORT_TYPE_LABELS[p.type] ?? p.type}</span>
              <span>{p.name}</span>
              {p.required && (
                <span className="param-label-required">*</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Output ports */}
      {definition && definition.outputs.length > 0 && (
        <div className="param-panel-section">
          <div className="param-panel-section-title">输出端口</div>
          {definition.outputs.map((p: PortDefinition) => (
            <div key={p.id} className="param-info-row">
              <span>{PORT_TYPE_LABELS[p.type] ?? p.type}</span>
              <span>{p.name}</span>
              {p.required && (
                <span className="param-label-required">*</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Parameters */}
      {definition && definition.params.length > 0 && (
        <div className="param-panel-section">
          <div className="param-panel-section-title">参数</div>
          {definition.params.map((param: ParamDefinition) => (
            <ParamField
              key={param.id}
              param={param}
              value={params[param.id] ?? param.default}
              onChange={handleChange}
            />
          ))}
        </div>
      )}
    </aside>
  );
};
