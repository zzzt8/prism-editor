import type { PortType } from './node';

/**
 * Product Template v1 - higher-level business model above Workflow.
 *
 * This model introduces a business abstraction for product-oriented editing
 * without changing current workflow execution, publishing, or server contracts.
 */

export type ProductTemplateInputType = PortType | 'file' | 'json';
export type DesignParamValueType = 'string' | 'number' | 'boolean' | 'select' | 'color';
export type ProductTemplateAssetType = 'image' | 'mask' | 'material' | 'font' | 'file';
export type PreviewCanvasFit = 'contain' | 'cover' | 'stretch';
export type ProductionOutputFormat = 'png' | 'jpeg' | 'webp' | 'pdf' | 'svg';

export interface ProductTemplateInputOption {
  label: string;
  value: string | number;
}

export interface ProductTemplateInputValidation {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface ProductTemplateInput {
  id: string;
  name: string;
  type: ProductTemplateInputType;
  label?: string;
  description?: string;
  required?: boolean;
  defaultValue?: unknown;
  validation?: ProductTemplateInputValidation;
  options?: ProductTemplateInputOption[];
}

export interface ProductTemplateAsset {
  id: string;
  name: string;
  type: ProductTemplateAssetType;
  description?: string;
  required?: boolean;
  reference?: string;
  metadata?: Record<string, unknown>;
}

export interface DesignParamOption {
  label: string;
  value: string | number | boolean;
}

export interface DesignParam {
  id: string;
  name: string;
  type: DesignParamValueType;
  label?: string;
  description?: string;
  defaultValue?: unknown;
  required?: boolean;
  options?: DesignParamOption[];
  constraints?: {
    min?: number;
    max?: number;
    step?: number;
    pattern?: string;
  };
}

export interface PreviewFlowRef {
  /**
   * Transitional relation to current runtime objects.
   *
   * `published-workflow` is the primary v1 target for front-end preview scenarios,
   * while `workflow` remains available for editor-side or migration-period reuse.
   * Preview and production do not need to point to the same workflow because they
   * share user inputs and design parameters through `ProductTemplate.inputs` and
   * `ProductTemplate.designParams`.
   */
  type: 'published-workflow' | 'workflow';
  workflowId?: string;
  publishedWorkflowId?: string;
  workflowVersion?: string;
  entryNodeId?: string;
  notes?: string;
}

export interface ProductionFlowRef {
  /**
   * Transitional placeholder for production rendering.
   *
   * In v1 this is only a reference structure and does not imply executable
   * production behavior yet. Production flow may be different from preview flow,
   * while still consuming the same shared inputs and design parameters from the
   * parent `ProductTemplate`.
   */
  type: 'workflow' | 'external' | 'none';
  workflowId?: string;
  description?: string;
  workflowVersion?: string;
  entryNodeId?: string;
  notes?: string;
}

export interface PreviewCanvasLayerBinding {
  id: string;
  source: 'input' | 'asset' | 'designParam';
  sourceId: string;
  target?: string;
  description?: string;
}

export interface PreviewCanvasSpec {
  width?: number;
  height?: number;
  background?: string;
  fit?: PreviewCanvasFit;
  viewport?: {
    x?: number;
    y?: number;
    zoom?: number;
  };
  layers?: PreviewCanvasLayerBinding[];
}

export interface ProductionOutputField {
  id: string;
  name: string;
  type: 'image' | 'mask' | 'file' | 'json' | 'string';
  description?: string;
  required?: boolean;
}

export interface ProductionOutputSpec {
  format?: ProductionOutputFormat;
  dpi?: number;
  colorProfile?: string;
  size?: {
    width?: number;
    height?: number;
    unit?: 'px' | 'mm' | 'cm' | 'in';
  };
  outputs?: ProductionOutputField[];
  notes?: string;
}

export interface ProductTemplate {
  id: string;
  name: string;
  description?: string;
  version: string;

  inputs: ProductTemplateInput[];
  assets: ProductTemplateAsset[];
  designParams: DesignParam[];

  preview: {
    canvas: PreviewCanvasSpec;
    flow: PreviewFlowRef;
  };

  production: {
    output: ProductionOutputSpec;
    flow: ProductionFlowRef;
  };

  createdAt?: string;
  updatedAt?: string;
}
