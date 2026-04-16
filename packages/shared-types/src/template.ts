// Template types - snapshot-based template model for workflow reuse
// Template is an independent asset model, NOT an alias of EditorDraft.
// Snapshot of EditorCanvasNode[] and EditorCanvasEdge[] enables offline
// and version-independent template reuse.

import type {
  EditorCanvasNode,
  EditorCanvasEdge,
  EditorNodeGroup,
  EditorWorkflowMeta,
  WorkflowInput,
  WorkflowOutput,
} from './editor-draft';

/**
 * Template metadata - non-node data for template management
 */
export interface TemplateMetadata {
  author?: string;
  tags?: string[];
  category?: string;
  description?: string;
}

/**
 * Template - independent snapshot asset for workflow reuse
 *
 * Differs from EditorDraft:
 * - id is template-specific, not tied to a source workflow
 * - Contains a complete snapshot of the canvas graph
 * - Immutable after snapshot: modifying a template does NOT affect derived drafts
 */
export interface Template {
  id: string;
  name: string;
  version: string;
  metadata: TemplateMetadata;
  createdAt: string;
  updatedAt: string;

  // Snapshot of the canvas graph at save time
  workflowMeta: EditorWorkflowMeta;
  nodes: EditorCanvasNode[];
  edges: EditorCanvasEdge[];
  groups: EditorNodeGroup[];

  // I/O schema - populated by C2 publish protocol; empty for now (Design Decision 3)
  inputs: WorkflowInput[];
  outputs: WorkflowOutput[];
}

/**
 * TemplateSummary - lightweight data for template list pages
 * Excludes the node/edge snapshot to keep list rendering fast.
 */
export interface TemplateSummary {
  id: string;
  name: string;
  version: string;
  metadata: TemplateMetadata;
  createdAt: string;
  updatedAt: string;
  nodeCount: number;
  edgeCount: number;
}

/**
 * TemplateInput / TemplateOutput - reuses WorkflowInput/WorkflowOutput
 * per design decision 3 (no independent schema at this stage).
 */
export type TemplateInput = WorkflowInput;
export type TemplateOutput = WorkflowOutput;
