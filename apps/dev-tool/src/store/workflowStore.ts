// Workflow store - manages saved workflow list using Repository pattern
// Phase 1: Delegates to WorkflowRepository which wraps IndexedDBStorageAdapter

import { create } from 'zustand';
import type { WorkflowMeta } from '@prism/shared-types';
import { activeStorageAdapter } from '../storage';
import { WorkflowRepository } from '../modules/repositories';

const workflowRepository = new WorkflowRepository(activeStorageAdapter);

interface WorkflowState {
  savedWorkflows: WorkflowMeta[];
  isLoading: boolean;
  error: string | null;

  loadSavedWorkflows: () => Promise<void>;
  deleteSavedWorkflow: (_id: string) => Promise<void>;
  clearError: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  savedWorkflows: [],
  isLoading: false,
  error: null,

  loadSavedWorkflows: async () => {
    set({ isLoading: true, error: null });
    try {
      const workflows = await workflowRepository.list();
      set({ savedWorkflows: workflows, isLoading: false });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  deleteSavedWorkflow: async (_id: string) => {
    try {
      await workflowRepository.delete(_id);
      set((state) => ({
        savedWorkflows: state.savedWorkflows.filter((w) => w.id !== _id),
      }));
    } catch (err) {
      set({ error: String(err) });
    }
  },

  clearError: () => set({ error: null }),
}));
