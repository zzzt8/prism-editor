// Composer SDK Types
// Core types for the Composer SDK public API

/********************
 * ProductTemplate
 * Simplified type matching server API response
 ********************/
export interface ProductTemplateContent {
  inputs?: ProductTemplateInput[];
  designParams?: ProductTemplateDesignParam[];
  layers?: LayerState[];
  [key: string]: unknown;
}

export interface ProductTemplate {
  id: string;
  name: string;
  description?: string;
  version: string;
  content: string | ProductTemplateContent;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Layer state representing a single layer in the composer canvas
 */
export interface LayerState {
  id: string;
  name: string;
  imageUrl: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  blendMode: BlendMode;
  mask?: MaskState;
  visible: boolean;
  locked: boolean;
}

/**
 * Mask state for layer masking operations
 */
export interface MaskState {
  type: MaskType;
  // For brightness mask
  threshold?: number;
  // For gradient mask
  startPoint?: { x: number; y: number };
  endPoint?: { x: number; y: number };
  // For feather
  radius?: number;
}

/**
 * Supported blend modes for layer compositing
 */
export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'soft-light';

/**
 * Supported mask types
 */
export type MaskType = 'brightness' | 'gradient' | 'feather';

/**
 * Complete composer state
 */
export interface ComposerState {
  layers: LayerState[];
  selectedLayerId: string | null;
  designParams: Record<string, number | string>;
  inputs: Record<string, string>;
}

/**
 * Parameters submitted to mall backend on user confirmation
 */
export interface ComposerSubmitParams {
  templateId: string;
  inputs: Record<string, string>;
  layers: LayerState[];
  designParams: Record<string, number | string>;
}

/**
 * ProductTemplateInput from ProductTemplate
 */
export interface ProductTemplateInput {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'color' | 'image';
  defaultValue?: string | number;
  options?: { label: string; value: string }[];
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
}

/**
 * ProductTemplateDesignParam from ProductTemplate
 */
export interface ProductTemplateDesignParam {
  id: string;
  label: string;
  type: 'number' | 'select';
  defaultValue: number | string;
  options?: { label: string; value: string | number }[];
  min?: number;
  max?: number;
  step?: number;
}

/**
 * Props for ComposerCanvas component
 */
export interface ComposerSDKProps {
  /**
   * ProductTemplate configuration loaded from Prism API
   */
  template: ProductTemplate;

  /**
   * Initial state for the composer (optional)
   */
  initialState?: Partial<ComposerState>;

  /**
   * Called when any layer or parameter changes (debounced 100ms)
   */
  onChange?: (_state: ComposerState) => void;

  /**
   * Called when user clicks the submit/confirm button
   * Only passes data, does NOT trigger Production Render
   */
  onSubmit?: (_params: ComposerSubmitParams) => void;

  /**
   * Canvas width in pixels (default: 800)
   */
  width?: number;

  /**
   * Canvas height in pixels (default: 600)
   */
  height?: number;

  /**
   * Background color for the canvas (default: '#ffffff')
   */
  backgroundColor?: string;
}
