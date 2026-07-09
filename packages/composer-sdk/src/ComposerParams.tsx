// ComposerParams - Parameter panel for ProductTemplate inputs and design params
// Provides dynamic form rendering with two-way binding to ComposerState

import React, { useCallback, useMemo } from 'react';
import { useComposerStore } from './ComposerState';
import type {
  ProductTemplate,
  ProductTemplateInput,
  ProductTemplateDesignParam,
} from './types';

interface ComposerParamsProps {
  /**
   * ProductTemplate configuration
   */
  template: ProductTemplate;

  /**
   * Optional className for styling
   */
  className?: string;
}

/**
 * ComposerParams - Renders dynamic forms for ProductTemplate inputs and design params
 * Supports text, number, select, and color input types
 */
export const ComposerParams: React.FC<ComposerParamsProps> = ({
  template,
  className,
}) => {
  // Store actions
  const {
    inputs,
    designParams,
    updateInput,
    updateDesignParam,
  } = useComposerStore();

  // Parse template content
  const { templateInputs, templateDesignParams } = useMemo(() => {
    const content = typeof template.content === 'string'
      ? JSON.parse(template.content)
      : template.content;

    return {
      templateInputs: (content.inputs || []) as ProductTemplateInput[],
      templateDesignParams: (content.designParams || []) as ProductTemplateDesignParam[],
    };
  }, [template]);

  // Input change handler
  const handleInputChange = useCallback(
    (id: string, value: string) => {
      updateInput(id, value);
    },
    [updateInput]
  );

  // Design param change handler
  const handleDesignParamChange = useCallback(
    (id: string, value: number | string) => {
      updateDesignParam(id, value);
    },
    [updateDesignParam]
  );

  // Render input field based on type
  const renderInputField = (input: ProductTemplateInput) => {
    const value = inputs[input.id] ?? input.defaultValue?.toString() ?? '';

    switch (input.type) {
      case 'text':
        return (
          <input
            key={input.id}
            type="text"
            value={value}
            onChange={(e) => handleInputChange(input.id, e.target.value)}
            placeholder={input.label}
            style={inputStyle}
          />
        );

      case 'number':
        return (
          <div key={input.id} style={inputGroupStyle}>
            <label style={labelStyle}>{input.label}</label>
            <input
              type="number"
              value={value as string}
              onChange={(e) => handleInputChange(input.id, e.target.value)}
              min={input.min}
              max={input.max}
              step={input.step}
              style={inputStyle}
            />
          </div>
        );

      case 'select':
        return (
          <div key={input.id} style={inputGroupStyle}>
            <label style={labelStyle}>{input.label}</label>
            <select
              value={value as string}
              onChange={(e) => handleInputChange(input.id, e.target.value)}
              style={inputStyle}
            >
              {input.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        );

      case 'color':
        return (
          <div key={input.id} style={inputGroupStyle}>
            <label style={labelStyle}>{input.label}</label>
            <div style={colorInputWrapperStyle}>
              <input
                type="color"
                value={value as string}
                onChange={(e) => handleInputChange(input.id, e.target.value)}
                style={colorInputStyle}
              />
              <span style={colorValueStyle}>{value as string}</span>
            </div>
          </div>
        );

      case 'image':
        return (
          <div key={input.id} style={inputGroupStyle}>
            <label style={labelStyle}>{input.label}</label>
            <input
              type="url"
              value={value as string}
              onChange={(e) => handleInputChange(input.id, e.target.value)}
              placeholder="https://..."
              style={inputStyle}
            />
          </div>
        );

      default:
        return null;
    }
  };

  // Render design param field based on type
  const renderDesignParamField = (param: ProductTemplateDesignParam) => {
    const value = designParams[param.id] ?? param.defaultValue;

    switch (param.type) {
      case 'number':
        return (
          <div key={param.id} style={inputGroupStyle}>
            <label style={labelStyle}>
              {param.label}
              {param.min !== undefined && param.max !== undefined && (
                <span style={rangeStyle}>
                  ({param.min} - {param.max})
                </span>
              )}
            </label>
            <div style={sliderWrapperStyle}>
              <input
                type="range"
                value={Number(value)}
                onChange={(e) =>
                  handleDesignParamChange(param.id, Number(e.target.value))
                }
                min={param.min}
                max={param.max}
                step={param.step}
                style={sliderStyle}
              />
              <span style={valueDisplayStyle}>{value}</span>
            </div>
          </div>
        );

      case 'select':
        return (
          <div key={param.id} style={inputGroupStyle}>
            <label style={labelStyle}>{param.label}</label>
            <select
              value={value as string}
              onChange={(e) =>
                handleDesignParamChange(param.id, e.target.value)
              }
              style={inputStyle}
            >
              {param.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        );

      default:
        return null;
    }
  };

  // Section wrapper styles
  const sectionStyle: React.CSSProperties = {
    marginBottom: '16px',
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid #e5e7eb',
  };

  return (
    <div className={className} style={containerStyle}>
      {/* User Inputs Section */}
      {templateInputs.length > 0 && (
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>输入参数</div>
          {templateInputs.map(renderInputField)}
        </div>
      )}

      {/* Design Params Section */}
      {templateDesignParams.length > 0 && (
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>设计参数</div>
          {templateDesignParams.map(renderDesignParamField)}
        </div>
      )}

      {/* Empty state */}
      {templateInputs.length === 0 && templateDesignParams.length === 0 && (
        <div style={emptyStateStyle}>
          此模板暂无可配置参数
        </div>
      )}
    </div>
  );
};

// Styles
const containerStyle: React.CSSProperties = {
  padding: '16px',
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const inputGroupStyle: React.CSSProperties = {
  marginBottom: '12px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 500,
  color: '#4b5563',
  marginBottom: '4px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: '14px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  outline: 'none',
  transition: 'border-color 0.15s',
  boxSizing: 'border-box',
};

const rangeStyle: React.CSSProperties = {
  fontWeight: 400,
  color: '#9ca3af',
  marginLeft: '4px',
};

const sliderWrapperStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
};

const sliderStyle: React.CSSProperties = {
  flex: 1,
  height: '4px',
  borderRadius: '2px',
  appearance: 'none',
  background: '#d1d5db',
  cursor: 'pointer',
};

const valueDisplayStyle: React.CSSProperties = {
  minWidth: '40px',
  textAlign: 'right',
  fontSize: '13px',
  color: '#6b7280',
};

const colorInputWrapperStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const colorInputStyle: React.CSSProperties = {
  width: '40px',
  height: '32px',
  padding: 0,
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  cursor: 'pointer',
};

const colorValueStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#6b7280',
  fontFamily: 'monospace',
};

const emptyStateStyle: React.CSSProperties = {
  textAlign: 'center',
  color: '#9ca3af',
  fontSize: '14px',
  padding: '24px 0',
};
