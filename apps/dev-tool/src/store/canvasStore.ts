// Canvas store - backward compatibility re-export
//
// This file was refactored into sliced architecture.
// All imports from this file now use the new store implementation:
//   apps/dev-tool/src/modules/editor/stores/useCanvasStore.ts
//
// The sliced store is the source of truth. This file provides backward
// compatibility for all existing imports from components.

export { useCanvasStore } from '../modules/editor/stores/useCanvasStore';
export type { ConnectionValidation, InspectorTab, ExecutionStatus } from '../modules/editor/stores/useCanvasStore';
export type { InspectorTab as InspectorTabType, ExecutionStatus as ExecutionStatusType } from '../modules/editor/stores/useCanvasStore';

// Re-export types from shared-types for backward compatibility with existing components
export type {
  EditorCanvasNode,
  EditorCanvasEdge,
  EditorNodeGroup,
  EditorWorkflowMeta,
  EditorNodeData,
  EditorDraft,
} from '@prism/shared-types';

// Backward compatibility aliases for types that existed in the old store
// These map to the EditorCanvasNode/EditorCanvasEdge types from shared-types
export type {
  EditorCanvasNode as CanvasNode,
  EditorCanvasEdge as CanvasEdge,
  EditorNodeGroup as NodeGroup,
} from '@prism/shared-types';

// CanvasNodeData with runtime state (executionResult, executionError, etc.)
// This type is used by components that need to access runtime state.
// The old store exported this type; we recreate it for backward compatibility.
export interface CanvasNodeData extends Record<string, unknown> {
  label: string;
  nodeType: string;
  params: Record<string, unknown>;
  definition?: import('@prism/shared-types').NodeDefinition;
  executionResult?: Record<string, unknown>;
  executionError?: string;
  _executingNodeId?: string;
  extraInputs?: Array<{ id: string; name: string; type: 'image'; dataType: import('@prism/shared-types').PortDataType }>;
  extraOutputs?: Array<{ id: string; name: string; type: 'image'; dataType: import('@prism/shared-types').PortDataType }>;
  bypassed?: boolean;
  minimized?: boolean;
  pinned?: boolean;
}
