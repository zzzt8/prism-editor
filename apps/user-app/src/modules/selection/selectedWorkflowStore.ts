// selectedWorkflowStore - workflow selection state
//
// State: selectedWorkflow, nodeLoadErrors
// Actions: selectWorkflow, clearSelection
//
// selectWorkflow reads from userAppStorage (IndexedDB).

import { create } from 'zustand';
import type { PublishedWorkflow } from '@prism/shared-types';
import { loadRequiredNodes } from '../node-runtime/nodePackageLoader';
import { userAppStorage } from '../../storage';

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

export const useSelectedWorkflowStore = create<SelectedWorkflowState>((set) => {
  return {
    selectedWorkflow: null,
    nodeLoadErrors: [],

    selectWorkflow: async function selectWorkflow(sourceId: string) {
      try {
        const workflow = await userAppStorage.loadPublished(sourceId);
        set({ selectedWorkflow: workflow, nodeLoadErrors: [] });

        const errors = await loadRequiredNodes(workflow);
        if (errors.length > 0) {
          console.warn('[selectedWorkflowStore] node errors:', errors);
          set({ nodeLoadErrors: errors });
        }
      } catch (err) {
        console.error('[selectedWorkflowStore] error:', err);
        set({ selectedWorkflow: null, nodeLoadErrors: [{ packageName: 'system', message: String(err) }] });
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
