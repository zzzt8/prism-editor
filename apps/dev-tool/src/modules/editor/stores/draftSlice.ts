// draftSlice - manages workflow draft state (metadata, viewport, drag state)
// Persistence-focused state that maps to EditorDraft

import type { EditorWorkflowMeta } from '@prism/shared-types';

export interface DraftSlice {
  // State
  workflowMeta: EditorWorkflowMeta;
  viewport: { x: number; y: number; zoom: number };
  isDraggingFromPanel: boolean;

  // Operations
  setWorkflowMeta: (meta: EditorWorkflowMeta) => void;
  renameWorkflow: (name: string) => EditorWorkflowMeta | null;
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void;
  setDraggingFromPanel: (dragging: boolean) => void;
  loadDraft: (meta: EditorWorkflowMeta, viewport?: { x: number; y: number; zoom: number }) => void;
  newDraft: () => void;
}

export function createDraftSlice(): Pick<DraftSlice, keyof DraftSlice> {
  return {
    // Initial state
    workflowMeta: {
      id: crypto.randomUUID(),
      name: 'Untitled Workflow',
      version: '1.0.0',
    },
    viewport: { x: 0, y: 0, zoom: 1 },
    isDraggingFromPanel: false,

    // Operations
    setWorkflowMeta(meta) {
      return meta;
    },

    renameWorkflow(name) {
      const trimmed = name.trim();
      if (!trimmed) return null;
      return {
        id: this.workflowMeta.id,
        name: trimmed,
        version: this.workflowMeta.version,
      };
    },

    setViewport(viewport) {
      return viewport;
    },

    setDraggingFromPanel(dragging) {
      return dragging;
    },

    loadDraft(meta, viewport = { x: 0, y: 0, zoom: 1 }) {
      return { meta, viewport };
    },

    newDraft() {
      return {
        meta: {
          id: crypto.randomUUID(),
          name: 'Untitled Workflow',
          version: '1.0.0',
        },
        viewport: { x: 0, y: 0, zoom: 1 },
        isDraggingFromPanel: false,
      };
    },
  };
}
