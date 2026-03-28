/**
 * ParamsSection — Exposed workflow parameters panel.
 *
 * @package @prism/user-app
 *
 * Renders a collapsible card containing all exposed parameters from a published
 * workflow. Each parameter is rendered as a styled range slider with a live value
 * display.
 *
 * ## Visual Layout (design.md Chapter 5)
 *
 * ```
 * ┌─────────────────────────────────────────────────────┐
 * │ ⚙️ 参数                                              │
 * │  缩放比例    ──────●──────  0.85                     │
 * │  位置        ──────●──────  居中                     │
 * └─────────────────────────────────────────────────────┘
 * ```
 */

import React from 'react';

interface ExposedParamField {
  nodeKey: string;
  nodeName: string;
  nodeType: string;
  paramId: string;
  paramName: string;
  paramValue: unknown;
  description?: string;
}

export interface ParamsSectionProps {
  workflow: {
    config: {
      nodeTypes?: Record<string, string>;
      nodeConfigs?: Record<string, { params?: Record<string, unknown> }>;
    };
  };
  paramValues: Record<string, Record<string, unknown>>;
  onParamChange: (nodeKey: string, paramId: string, value: unknown) => void;
}

export const ParamsSection: React.FC<ParamsSectionProps> = ({
  workflow,
  paramValues,
  onParamChange,
}) => {
  const fields: ExposedParamField[] = [];

  const nodeTypes = workflow.config.nodeTypes ?? {};
  const nodeConfigs = workflow.config.nodeConfigs ?? {};

  for (const [nodeKey, nodeType] of Object.entries(nodeTypes)) {
    const config = nodeConfigs[nodeKey];
    const params = config?.params;
    if (!params) continue;

    for (const [paramId, paramValue] of Object.entries(params)) {
      fields.push({
        nodeKey,
        nodeName: nodeType.replace(/-/g, ' '),
        nodeType,
        paramId,
        paramName: paramId.replace(/_/g, ' '),
        paramValue,
      });
    }
  }

  if (fields.length === 0) return null;

  return (
    <div className="ua-exposed-params">
      <div className="ua-exposed-params-title">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
        </svg>
        参数设置
      </div>

      {fields.map((field) => {
        const numValue = typeof field.paramValue === 'number'
          ? field.paramValue
          : parseFloat(String(field.paramValue));
        const displayValue = isNaN(numValue)
          ? String(field.paramValue)
          : numValue.toFixed(2);

        return (
          <div key={`${field.nodeKey}:${field.paramId}`} className="ua-param-row">
            <label className="ua-input-label">{field.paramName}</label>
            {field.description && (
              <p className="ua-input-desc">{field.description}</p>
            )}
            <div className="ua-param-slider-row">
              <input
                type="range"
                className="ua-param-slider"
                min={0}
                max={1}
                step={0.01}
                value={isNaN(numValue) ? 0.5 : numValue}
                onChange={(e) => onParamChange(field.nodeKey, field.paramId, parseFloat(e.target.value))}
              />
              <span className="ua-param-slider-value">{displayValue}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
