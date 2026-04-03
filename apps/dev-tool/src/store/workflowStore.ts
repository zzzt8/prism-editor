// Workflow store - manages saved workflow list using LocalStorageAdapter

import { create } from 'zustand';
import type { WorkflowMeta } from '@prism/shared-types';
import { indexedDBStorageAdapter } from '../storage';

interface WorkflowState {
  savedWorkflows: WorkflowMeta[];
  isLoading: boolean;
  error: string | null;

  loadSavedWorkflows: () => Promise<void>;
  deleteSavedWorkflow: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  savedWorkflows: [],
  isLoading: false,
  error: null,

  loadSavedWorkflows: async () => {
    set({ isLoading: true, error: null });
    try {
      const workflows = await indexedDBStorageAdapter.list();
      set({ savedWorkflows: workflows, isLoading: false });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  deleteSavedWorkflow: async (id: string) => {
    try {
      await indexedDBStorageAdapter.delete(id);
      set((state) => ({
        savedWorkflows: state.savedWorkflows.filter((w) => w.id !== id),
      }));
    } catch (err) {
      set({ error: String(err) });
    }
  },

  clearError: () => set({ error: null }),
}));
