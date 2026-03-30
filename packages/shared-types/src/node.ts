// NodeDefinition interface (ports, params, categories)

import type { PortDataType } from './port-data-types';

// Canonical port type union — used for both port definitions and param definitions.
// Only includes types that CAN be wired between nodes.
export type PortType = 'image' | 'mask' | 'number' | 'string' | 'boolean';

export type PortDefinitionType = PortType;

export interface PortDefinition {
  id: string;
  name: string;
  type: PortDefinitionType;
  /** The data type of the port, used for connection validation and type conversion. */
  dataType: PortDataType;
  required: boolean;
  description?: string;
}

// Param types extend port types with UI-only types (select, image-file)
export type ParamDefinitionType = PortType | 'select' | 'image-file';

/** Option entry for select-type params */
export type ParamOption = { label: string; value: unknown };

export interface ParamDefinition {
  id: string;
  name: string;
  type: ParamDefinitionType;
  default?: unknown;
  required?: boolean;
  description?: string;
  options?: { label: string; value: unknown }[];
  min?: number;
  max?: number;
  step?: number;
}

export interface NodeDefinition {
  type: string;
  category: string;
  label: string;
  description?: string;
  inputs: PortDefinition[];
  outputs: PortDefinition[];
  params: ParamDefinition[];
  version?: string;
}

export const NODE_CATEGORIES = {
  INPUT: 'input',
  TRANSFORM: 'transform',
  MASK: 'mask',
  COMPOSITE: 'composite',
  OUTPUT: 'output',
} as const;

export type NodeCategory = (typeof NODE_CATEGORIES)[keyof typeof NODE_CATEGORIES];
