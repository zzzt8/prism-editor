// workflowCatalogStore - workflow list loading and catalog
//
// State: workflows, isLoading, loadError
// Actions: loadWorkflows

import { create } from 'zustand';
import type { PublishedWorkflowMeta } from '../../modules/repositories/interfaces';
import { PublishedWorkflowRepository } from '../../modules/repositories';

const workflowRepo = new PublishedWorkflowRepository();

export interface WorkflowCatalogState {
  workflows: PublishedWorkflowMeta[];
  isLoading: boolean;
  loadError?: string;
  loadWorkflows: () => void;
}

export const useWorkflowCatalogStore = create<WorkflowCatalogState>((set) => {
  return {
    workflows: [],
    isLoading: false,
    loadError: undefined,

    loadWorkflows: async function loadWorkflows() {
      set({ isLoading: true, loadError: undefined });
      try {
        const metas = await workflowRepo.listPublished();
        metas.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
        set({ workflows: metas, isLoading: false });
      } catch (err) {
        set({ loadError: String(err), isLoading: false });
      }
    },
  };
});
