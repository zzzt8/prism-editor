// Workflow store - manages current workflow and persistence
import { create } from 'zustand';
import type { Workflow } from '../workflow';
import type { StorageAdapter, WorkflowMeta } from '../storage';

export interface WorkflowState {
  currentWorkflow: Workflow | null;
  isDirty: boolean;
  isLoading: boolean;
  error: string | null;
  workflowList: WorkflowMeta[];
  storageAdapter: StorageAdapter | null;
}

export interface WorkflowActions {
  // Storage adapter
  setStorageAdapter: (adapter: StorageAdapter) => void;
  
  // Workflow CRUD
  createNew: (name: string) => Workflow;
  setCurrentWorkflow: (workflow: Workflow | null) => void;
  
  // Persistence
  save: () => Promise<void>;
  load: (id: string) => Promise<void>;
  loadList: () => Promise<void>;
  delete: (id: string) => Promise<void>;
  exportToJson: () => Promise<string>;
  importFromJson: (json: string) => Promise<void>;
  
  // Dirty state
  markDirty: () => void;
  markClean: () => void;
  
  // Reset
  reset: () => void;
}

const initialState: WorkflowState = {
  currentWorkflow: null,
  isDirty: false,
  isLoading: false,
  error: null,
  workflowList: [],
  storageAdapter: null,
};

export const useWorkflowStore = create<WorkflowState & WorkflowActions>((set, get) => ({
  ...initialState,

  // Storage adapter
  setStorageAdapter: (adapter) => set({ storageAdapter: adapter }),

  // Workflow CRUD
  createNew: (name) => {
    const now = new Date().toISOString();
    const workflow: Workflow = {
      id: `wf-${Date.now()}`,
      name,
      version: '1.0.0',
      nodes: [],
      connections: [],
      inputs: [],
      outputs: [],
      metadata: {
        description: '',
        author: '',
        tags: [],
        createdAt: now,
        updatedAt: now,
      },
    };
    set({ currentWorkflow: workflow, isDirty: true, error: null });
    return workflow;
  },

  setCurrentWorkflow: (workflow) => {
    set({ currentWorkflow: workflow, isDirty: false, error: null });
  },

  // Persistence
  save: async () => {
    const { currentWorkflow, storageAdapter } = get();
    if (!currentWorkflow) {
      set({ error: 'No workflow to save' });
      return;
    }
    if (!storageAdapter) {
      set({ error: 'No storage adapter configured' });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      // Update timestamp
      const updatedWorkflow: Workflow = {
        ...currentWorkflow,
        metadata: {
          ...currentWorkflow.metadata,
          updatedAt: new Date().toISOString(),
        },
      };
      await storageAdapter.save(updatedWorkflow);
      set({ currentWorkflow: updatedWorkflow, isDirty: false, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Save failed', isLoading: false });
    }
  },

  load: async (id) => {
    const { storageAdapter } = get();
    if (!storageAdapter) {
      set({ error: 'No storage adapter configured' });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const workflow = await storageAdapter.load(id);
      set({ currentWorkflow: workflow, isDirty: false, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Load failed', isLoading: false });
    }
  },

  loadList: async () => {
    const { storageAdapter } = get();
    if (!storageAdapter) {
      set({ error: 'No storage adapter configured' });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const list = await storageAdapter.list();
      set({ workflowList: list, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Load list failed', isLoading: false });
    }
  },

  delete: async (id) => {
    const { storageAdapter, currentWorkflow } = get();
    if (!storageAdapter) {
      set({ error: 'No storage adapter configured' });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      await storageAdapter.delete(id);
      // Clear current if deleted
      if (currentWorkflow?.id === id) {
        set({ currentWorkflow: null, isLoading: false });
      } else {
        set({ isLoading: false });
      }
      // Refresh list
      get().loadList();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Delete failed', isLoading: false });
    }
  },

  exportToJson: async () => {
    const { currentWorkflow, storageAdapter } = get();
    if (!currentWorkflow) {
      throw new Error('No workflow to export');
    }
    if (!storageAdapter) {
      throw new Error('No storage adapter configured');
    }
    return storageAdapter.exportToJson(currentWorkflow);
  },

  importFromJson: async (json) => {
    const { storageAdapter } = get();
    if (!storageAdapter) {
      set({ error: 'No storage adapter configured' });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const workflow = await storageAdapter.importFromJson(json);
      set({ currentWorkflow: workflow, isDirty: true, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Import failed', isLoading: false });
    }
  },

  // Dirty state
  markDirty: () => set({ isDirty: true }),

  markClean: () => set({ isDirty: false }),

  // Reset
  reset: () => set(initialState),
}));

// Selectors
export const selectCurrentWorkflow = (state: WorkflowState & WorkflowActions) => state.currentWorkflow;
export const selectIsDirty = (state: WorkflowState & WorkflowActions) => state.isDirty;
export const selectIsLoading = (state: WorkflowState & WorkflowActions) => state.isLoading;
export const selectError = (state: WorkflowState & WorkflowActions) => state.error;
export const selectWorkflowList = (state: WorkflowState & WorkflowActions) => state.workflowList;
