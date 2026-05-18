// selectedWorkflowStore - workflow selection state
//
// State: selectedWorkflow, nodeLoadErrors
// Actions: selectWorkflow, clearSelection
//
// selectWorkflow fetches the full workflow content directly from the server.

import { create } from 'zustand';
import type { PublishedWorkflow } from '@prism/shared-types';
import { loadRequiredNodes } from '../node-runtime/nodePackageLoader';

export interface NodeLoadError {
  packageName: string;
  message: string;
}

export interface SelectedWorkflowState {
  selectedWorkflow: PublishedWorkflow | null;
  nodeLoadErrors: NodeLoadError[];
  selectWorkflow: (sourceId: string) => void;
  clearSelection: () => void;
  clearNodeLoadErrors: () => void;
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export const useSelectedWorkflowStore = create<SelectedWorkflowState>((set) => {
  return {
    selectedWorkflow: null,
    nodeLoadErrors: [],

    selectWorkflow: async function selectWorkflow(sourceId: string) {
      try {
        // Call GET /api/published/:id directly - single endpoint, no list iteration
        const resp = await fetch(`${API_BASE}/published/${sourceId}`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const body: { data: {
          workflowId: string;
          workflow: { id: string; name: string; description?: string; version: string };
          content: string;
        } } = await resp.json();

        const published = body.data;
        const workflow = JSON.parse(published.content) as PublishedWorkflow;
        if (!workflow.sourceId) workflow.sourceId = published.workflow.id;
        if (!workflow.name) workflow.name = published.workflow.name;

        set({ selectedWorkflow: workflow, nodeLoadErrors: [] });

        const errors = await loadRequiredNodes(workflow);
        if (errors.length > 0) {
          console.warn('[selectedWorkflowStore] node errors:', errors);
          set({ nodeLoadErrors: errors });
        }
      } catch (err) {
        console.error('[selectedWorkflowStore] error:', err);
        set({ nodeLoadErrors: [{ packageName: 'system', message: String(err) }] });
      }
    },

    clearSelection: function clearSelection() {
      set({ selectedWorkflow: null, nodeLoadErrors: [] });
    },

    clearNodeLoadErrors: function clearNodeLoadErrors() {
      set({ nodeLoadErrors: [] });
    },
  };
});
