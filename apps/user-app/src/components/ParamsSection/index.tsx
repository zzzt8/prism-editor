/**
 * ParamsSection — Exposed workflow parameters panel.
 *
 * @package @prism/user-app
 *
 * Renders all exposed parameters from a published workflow using rich control types.
 * Falls back to string rendering if paramDefinitions are unavailable.
 *
 * ## Visual Layout
 *
 * ```
 * ┌─────────────────────────────────────────────────────┐
 * │ ⚙️ 参数                                              │
 * │  缩放比例    ──────●──────  0.85                     │
 * │  位置        ──────●──────  居中                     │
 * └─────────────────────────────────────────────────────┘
 * ```
 */

import React, { useCallback } from 'react';
import type {
  PublishedParamDefinition,
  PublishedParamConfig,
  ParamControlType,
} from '@prism/shared-types';

// ── ParamsSection Props ────────────────────────────────────────────────────────

export interface ParamsSectionProps {
  workflow: {
    config: {
      nodeTypes?: Record<string, string>;
      nodeConfigs?: Record<string, { params?: Record<string, unknown> }>;
      paramDefinitions?: PublishedParamDefinition[];
      exposedParams?: PublishedParamConfig[];
    };
  };
  paramValues: Record<string, Record<string, unknown>>;
  onParamChange: (nodeKey: string, paramId: string, value: unknown) => void;
}

// ── Individual control renderers ──────────────────────────────────────────────

interface ControlProps {
  value: unknown;
  onChange: (value: unknown) => void;
  paramDef: PublishedParamDefinition | undefined;
  disabled: boolean;
}

const SelectControl: React.FC<ControlProps> = ({ value, onChange, paramDef, disabled }) => {
  const options = paramDef?.options ?? [];
  return (
    <select
      className="ua-param-select"
      value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      {options.map((opt) => (
        <option key={String(opt.value)} value={String(opt.value)}>
          {opt.label}
        </option>
      ))}
    </select>
  );
};

const NumberControl: React.FC<ControlProps> = ({ value, onChange, paramDef, disabled }) => {
  const raw = typeof value === 'number' ? value : parseFloat(String(value ?? 'NaN'));
  const isValid = !isNaN(raw);
  const num = isValid ? raw : 0;
  const min = paramDef?.validation?.min;
  const max = paramDef?.validation?.max;

  if (!isValid) {
    return (
      <input
        type="text"
        className="ua-param-text"
        value={String(value ?? '')}
        onChange={(e) => {
          const parsed = parseFloat(e.target.value);
          onChange(isNaN(parsed) ? e.target.value : parsed);
        }}
        disabled={disabled}
      />
    );
  }

  return (
    <div className="ua-param-number-row">
      <input
        type="range"
        className="ua-param-slider"
        min={min ?? 0}
        max={max ?? 1}
        step={0.01}
        value={num}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
      />
      <span className="ua-param-slider-value">{num.toFixed(2)}</span>
    </div>
  );
};

const StringControl: React.FC<ControlProps> = ({ value, onChange, disabled }) => {
  return (
    <input
      type="text"
      className="ua-param-text"
      value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    />
  );
};

const BooleanControl: React.FC<ControlProps> = ({ value, onChange, disabled }) => {
  const boolValue = typeof value === 'boolean' ? value : Boolean(value);
  return (
    <label className="ua-param-switch">
      <input
        type="checkbox"
        checked={boolValue}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span className="ua-param-switch-track">
        <span className="ua-param-switch-thumb" />
      </span>
    </label>
  );
};

const ImageFileControl: React.FC<ControlProps> = ({ value, onChange, disabled }) => {
  return (
    <input
      type="url"
      className="ua-param-text"
      placeholder="输入图片 URL"
      value={(value as string) ?? ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    />
  );
};

/**
 * Dispatch to the correct control renderer based on controlType.
 */
const ParamControlRenderer: React.FC<ControlProps & { controlType: ParamControlType }> = ({
  controlType,
  ...props
}) => {
  switch (controlType) {
    case 'select': return <SelectControl {...props} />;
    case 'number': return <NumberControl {...props} />;
    case 'boolean': return <BooleanControl {...props} />;
    case 'image-file': return <ImageFileControl {...props} />;
    default: return <StringControl {...props} />;
  }
};

// ── Main ParamsSection ────────────────────────────────────────────────────────

export const ParamsSection: React.FC<ParamsSectionProps> = ({
  workflow,
  paramValues,
  onParamChange,
}) => {
  const nodeTypes = workflow.config.nodeTypes ?? {};
  const nodeConfigs = workflow.config.nodeConfigs ?? {};
  const paramDefinitions = workflow.config.paramDefinitions ?? [];

  // Build a lookup map: "nodeId:paramId" → PublishedParamDefinition
  const paramDefMap = new Map<string, PublishedParamDefinition>();
  for (const pd of paramDefinitions) {
    paramDefMap.set(`${pd.nodeId}:${pd.paramId}`, pd);
  }

  // Build field list: prefer paramDefinitions, fall back to nodeConfigs params
  const fields: Array<{
    nodeKey: string;
    paramId: string;
    paramName: string;
    paramValue: unknown;
    controlType: ParamControlType;
    paramDef: PublishedParamDefinition | undefined;
    visibility: 'visible' | 'hidden' | 'locked';
    description?: string;
  }> = [];

  if (paramDefinitions.length > 0) {
    // Use paramDefinitions for rendering
    for (const pd of paramDefinitions) {
      const paramValue = paramValues[pd.nodeId]?.[pd.paramId] ?? pd.defaultValue;
      fields.push({
        nodeKey: pd.nodeId,
        paramId: pd.paramId,
        paramName: pd.label,
        paramValue,
        controlType: pd.controlType,
        paramDef: pd,
        visibility: pd.visibility ?? 'visible',
        description: pd.description,
      });
    }
  } else {
    // Fallback: iterate nodeConfigs params (backward compat with exposedParams)
    for (const [nodeKey, nodeType] of Object.entries(nodeTypes)) {
      const config = nodeConfigs[nodeKey];
      const params = config?.params;
      if (!params) continue;

      for (const [paramId, paramValue] of Object.entries(params)) {
        fields.push({
          nodeKey,
          paramId,
          paramName: paramId.replace(/_/g, ' '),
          paramValue,
          controlType: 'string',
          paramDef: undefined,
          visibility: 'visible',
        });
      }
    }
  }

  // Filter out hidden params
  const visibleFields = fields.filter((f) => f.visibility !== 'hidden');
  if (visibleFields.length === 0) return null;

  const handleChange = useCallback(
    (nodeKey: string, paramId: string, value: unknown) => {
      onParamChange(nodeKey, paramId, value);
    },
    [onParamChange]
  );

  return (
    <div className="ua-exposed-params">
      <div className="ua-exposed-params-title">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
        </svg>
        参数设置
      </div>

      {visibleFields.map((field) => {
        const isLocked = field.visibility === 'locked';

        return (
          <div key={`${field.nodeKey}:${field.paramId}`} className="ua-param-row">
            <label className="ua-input-label">{field.paramName}</label>
            {field.description && (
              <p className="ua-input-desc">{field.description}</p>
            )}
            <ParamControlRenderer
              controlType={field.controlType}
              value={field.paramValue}
              onChange={(v) => handleChange(field.nodeKey, field.paramId, v)}
              paramDef={field.paramDef}
              disabled={isLocked}
            />
          </div>
        );
      })}
    </div>
  );
};
