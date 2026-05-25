// SKU (Stock Keeping Unit) data structures

/**
 * Field types for SKU input fields.
 * - `string`: Text input
 * - `number`: Numeric input
 * - `select`: Dropdown selection (single or multiple)
 * - `color`: Color picker
 * - `boolean`: Toggle/switch
 * - `image`: Image upload field (uses assetId semantics)
 */
export type SKUInputFieldType = 'string' | 'number' | 'select' | 'color' | 'boolean' | 'image';

/**
 * Constraint options for image type fields.
 */
export interface SKUImageConstraints {
  /** Allowed MIME types (e.g., ['image/png', 'image/jpeg']) */
  accept?: string[];
  /** Maximum file size in MB */
  maxSizeMB?: number;
  /** Required aspect ratio (width:height, e.g., '16:9') */
  aspectRatio?: string;
  /** Minimum image width in pixels */
  minWidth?: number;
  /** Minimum image height in pixels */
  minHeight?: number;
  /** Allow multiple file uploads */
  multiple?: boolean;
}

/**
 * Base interface for SKU input fields.
 */
export interface SKUInputFieldBase {
  id: string;
  label: string;
  required?: boolean;
  description?: string;
  /** Field-specific validation rules */
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

/**
 * String type field.
 * When used as assetId reference, the string value should be parsed according to:
 * - If starts with 'asset:' → lookup in asset store by ID
 * - If starts with 'blob:' → use as blob URL directly
 * - Otherwise → treat as external URL
 */
export interface SKUTextField extends SKUInputFieldBase {
  type: 'string';
  defaultValue?: string;
  placeholder?: string;
  /** If true, this field stores an assetId reference */
  isAssetId?: boolean;
}

/**
 * Number type field.
 */
export interface SKUNumberField extends SKUInputFieldBase {
  type: 'number';
  defaultValue?: number;
  step?: number;
}

/**
 * Select type field.
 */
export interface SKUSelectField extends SKUInputFieldBase {
  type: 'select';
  options: { value: string; label: string }[];
  multiple?: boolean;
  defaultValue?: string | string[];
}

/**
 * Color type field.
 */
export interface SKUColorField extends SKUInputFieldBase {
  type: 'color';
  defaultValue?: string; // hex color
}

/**
 * Boolean type field.
 */
export interface SKUBooleanField extends SKUInputFieldBase {
  type: 'boolean';
  defaultValue?: boolean;
}

/**
 * Image type field with upload constraints.
 * The value stored is an assetId (string) following the parsing rules in SKUTextField.
 */
export interface SKUImageField extends SKUInputFieldBase {
  type: 'image';
  constraints?: SKUImageConstraints;
  /** Stored value is an assetId reference string */
}

export type SKUInputField =
  | SKUTextField
  | SKUNumberField
  | SKUSelectField
  | SKUColorField
  | SKUBooleanField
  | SKUImageField;

/**
 * Output specification for a SKU field.
 */
export interface SKUOutputSpec {
  /** Output field identifier */
  fieldId: string;
  /** Human-readable label for this output */
  label: string;
  /** Description of what this output represents */
  description?: string;
}

/**
 * Input schema definition for a SKU.
 */
export interface SKUInputSchema {
  /** Ordered list of input fields */
  fields: SKUInputField[];
  /** Output specifications derived from input fields */
  outputs: SKUOutputSpec[];
}

/**
 * SKU (Stock Keeping Unit) data structure.
 * Represents a product variant with its input schema and metadata.
 */
export interface SKU {
  id: string;
  /** Human-readable SKU code */
  code: string;
  /** Display name */
  name: string;
  /** Detailed description */
  description?: string;
  /** Input schema defining how this SKU is configured */
  inputSchema: SKUInputSchema;
  /** Associated workflow IDs */
  workflowIds: string[];
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Input data for creating/updating a SKU.
 * Omits server-generated fields like id and timestamps.
 */
export type SKUInput = Omit<SKU, 'id' | 'createdAt' | 'updatedAt' | 'workflowIds'> & {
  workflowIds?: string[];
};

/**
 * Input schema for creating/updating SKU via API.
 */
export type SKUInputSchemaInput = Omit<SKUInputSchema, 'outputs'> & {
  outputs?: SKUOutputSpec[];
};
