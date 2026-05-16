// draftSlice - manages workflow draft state (metadata, viewport, drag state)
// Persistence-focused state that maps to EditorDraft

import type { EditorWorkflowMeta } from '@prism/shared-types';

export interface DraftSlice {
  // State
  workflowMeta: EditorWorkflowMeta;
  viewport: { x: number; y: number; zoom: number };
  isDraggingFromPanel: boolean;

  // Operations
  setWorkflowMeta: (_meta: EditorWorkflowMeta) => void;
  renameWorkflow: (_name: string) => EditorWorkflowMeta | null;
  setViewport: (_viewport: { x: number; y: number; zoom: number }) => void;
  setDraggingFromPanel: (_dragging: boolean) => void;
  loadDraft: (_meta: EditorWorkflowMeta, _viewport?: { x: number; y: number; zoom: number }) => void;
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
    setWorkflowMeta(_meta) {
      return _meta;
    },

    renameWorkflow(_name) {
      const trimmed = _name.trim();
      if (!trimmed) return null;
      return {
        id: this.workflowMeta.id,
        name: trimmed,
        version: this.workflowMeta.version,
      };
    },

    setViewport(_viewport) {
      return _viewport;
    },

    setDraggingFromPanel(_dragging) {
      return _dragging;
    },

    loadDraft(_meta, _viewport = { x: 0, y: 0, zoom: 1 }) {
      return { meta: _meta, viewport: _viewport };
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
