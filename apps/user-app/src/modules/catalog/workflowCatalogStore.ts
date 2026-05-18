// workflowCatalogStore - workflow list loading, rename, delete
//
// State: workflows (raw list), isLoading, loadError
// Actions: loadWorkflows, renameWorkflow, deleteWorkflow, updateLocalMeta
//
// Architecture:
//   - loadWorkflows: fetches directly from GET /api/published (no auth required)
//   - rename/delete: requires IndexedDB-only mode (server doesn't support these)

import { create } from 'zustand';
import type { PublishedWorkflowMeta } from '../../modules/repositories/interfaces';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

interface ApiRecord {
  id: string;
  workflowId: string;
  publishedBy?: string;
  publishedAt: string;
  workflow: {
    id: string;
    name: string;
    description?: string;
    version: string;
    category?: string;
    createdAt: string;
    updatedAt: string;
  };
  content: string;
}

function parseMeta(item: ApiRecord): PublishedWorkflowMeta {
  let sourceName = item.workflow.name;
  let inputCount = 0;
  let outputCount = 0;
  try {
    const c = JSON.parse(item.content);
    if (c.sourceName) sourceName = c.sourceName;
    if (c.config?.inputs) inputCount = c.config.inputs.length;
    if (c.config?.outputs) outputCount = c.config.outputs.length;
  } catch { /* ignore */ }
  return {
    sourceId: item.workflow.id,
    name: item.workflow.name,
    description: item.workflow.description,
    sourceName,
    version: item.workflow.version,
    publishedAt: item.publishedAt,
    inputCount,
    outputCount,
  };
}

export interface WorkflowCatalogState {
  workflows: PublishedWorkflowMeta[];
  isLoading: boolean;
  loadError?: string;
  loadWorkflows: () => void;
  renameWorkflow: (sourceId: string, name: string) => Promise<void>;
  deleteWorkflow: (sourceId: string) => Promise<void>;
}

export const useWorkflowCatalogStore = create<WorkflowCatalogState>((set) => {
  return {
    workflows: [],
    isLoading: false,
    loadError: undefined,

    loadWorkflows: async function loadWorkflows() {
      set({ isLoading: true, loadError: undefined });
      try {
        const resp = await fetch(`${API_BASE}/published?limit=100`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const body: { data: ApiRecord[] } = await resp.json();
        const metas = body.data.map(parseMeta);
        metas.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
        set({ workflows: metas, isLoading: false });
      } catch (err) {
        set({ loadError: String(err), isLoading: false });
      }
    },

    renameWorkflow: async function renameWorkflow(_sourceId: string, _name: string) {
      // Server does not support rename; this is a no-op for server-fetched workflows.
      // Rename only works for locally-imported workflows (IndexedDB) via the repository.
      console.warn('[workflowCatalogStore] renameWorkflow: server mode does not support rename');
    },

    deleteWorkflow: async function deleteWorkflow(_sourceId: string) {
      // Server does not support delete via public API.
      // Only locally-imported workflows can be deleted.
      console.warn('[workflowCatalogStore] deleteWorkflow: server mode does not support delete');
    },
  };
});

export type SortKey = 'Recent' | 'Name';
