// Snippet types - partial canvas graph snapshot for node group reuse
// SnippetFragment captures selected nodes + edges + groups as a lightweight, reusable fragment.
// Unlike Template (full workflow snapshot), SnippetFragment focuses on local node clusters.

import type {
  EditorCanvasNode,
  EditorCanvasEdge,
  EditorNodeGroup,
} from './editor-draft';

/**
 * SnippetFragment - partial snapshot of selected canvas nodes for reuse
 *
 * Differs from Template:
 * - SnippetFragment captures only selected nodes (not full workflow)
 * - No workflowMeta, inputs, or outputs (no I/O schema)
 * - Lightweight: optimized for frequent save/insert operations
 */
export interface SnippetFragment {
  id: string;
  name: string;
  description?: string;
  createdAt: string;

  // Partial canvas graph — excludes runtime state
  nodes: EditorCanvasNode[];
  edges: EditorCanvasEdge[];
  groups: EditorNodeGroup[];
}

/**
 * SnippetSummary - lightweight data for snippet list display
 * Excludes the node/edge snapshot to keep list rendering fast.
 */
export interface SnippetSummary {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  nodeCount: number;
  edgeCount: number;
}
