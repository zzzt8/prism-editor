// Canvas store types — extracted from store/canvasStore.ts
// These types are editor-specific and include runtime state (executionResult, executionError, etc.)
// For persistent data types, use EditorNodeData from @prism/shared-types

import type { NodeDefinition, PortDataType } from '@prism/shared-types';

export interface CanvasNodeData extends Record<string, unknown> {
  label: string;
  nodeType: string;
  params: Record<string, unknown>;
  definition?: NodeDefinition;
  executionResult?: Record<string, unknown>;
  executionError?: string;
  _executingNodeId?: string;
  extraInputs?: Array<{ id: string; name: string; type: 'image'; dataType: PortDataType }>;
  extraOutputs?: Array<{ id: string; name: string; type: 'image'; dataType: PortDataType }>;
  bypassed?: boolean;
  minimized?: boolean;
  pinned?: boolean;
}
