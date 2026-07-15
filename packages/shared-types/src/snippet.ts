// Snippet types - partial canvas graph snapshot for node group reuse
// Note: Full Snippet functionality was removed in Phase 0.
// This file preserves SnippetSummary for dev-tool's context menu UI only.

/**
 * SnippetSummary - lightweight data for snippet list display.
 * Excludes the node/edge snapshot to keep list rendering fast.
 * 
 * Note: Snippet CRUD and storage were removed. This type is kept
 * only for UI type compatibility with existing dev-tool code.
 */
export interface SnippetSummary {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  nodeCount: number;
  edgeCount: number;
}
