// workflowCatalogStore - workflow list loading, rename, delete
//
// State: workflows (raw list), isLoading, loadError
// Actions: loadWorkflows, renameWorkflow, deleteWorkflow, updateLocalMeta

import { create } from 'zustand';
import type { PublishedWorkflowMeta } from '../../modules/repositories/interfaces';
import { PublishedWorkflowRepository } from '../../modules/repositories';

const workflowRepo = new PublishedWorkflowRepository();

export interface WorkflowCatalogState {
  workflows: PublishedWorkflowMeta[];
  isLoading: boolean;
  loadError?: string;
  loadWorkflows: () => void;
  renameWorkflow: (sourceId: string, name: string) => Promise<void>;
  deleteWorkflow: (sourceId: string) => Promise<void>;
}

export const useWorkflowCatalogStore = create<WorkflowCatalogState>((set, get) => {
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

    renameWorkflow: async function renameWorkflow(sourceId: string, name: string) {
      await workflowRepo.updateWorkflowMeta(sourceId, { name });
      set((state) => ({
        workflows: state.workflows.map((w) =>
          w.sourceId === sourceId ? { ...w, name } : w
        ),
      }));
    },

    deleteWorkflow: async function deleteWorkflow(sourceId: string) {
      await workflowRepo.deletePublished(sourceId);
      set((state) => ({
        workflows: state.workflows.filter((w) => w.sourceId !== sourceId),
      }));
    },
  };
});

export type SortKey = 'Recent' | 'Name';
