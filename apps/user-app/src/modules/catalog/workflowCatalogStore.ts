// workflowCatalogStore - workflow list loading, rename, delete
//
// State: workflows (raw list), isLoading, loadError
// Actions: loadWorkflows, renameWorkflow, deleteWorkflow, updateLocalMeta
//
// Architecture:
//   - loadWorkflows: fetches directly from GET /api/published (no auth required)
//   - rename/delete: call PATCH/DELETE /api/published/:id (requires auth)

import { create } from 'zustand';
import type { PublishedWorkflowMeta } from '../../modules/repositories/interfaces';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

interface AuthTokens {
  accessToken: string | null;
  refreshToken: string | null;
}

function getAuthTokens(): AuthTokens {
  const state = document.cookie;
  const refreshMatch = state.match(/refreshToken=([^;]+)/);
  return {
    accessToken: null,
    refreshToken: refreshMatch ? refreshMatch[1] : null,
  };
}

async function apiRequest<T>(
  url: string,
  options?: RequestInit,
  tokens?: AuthTokens
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (tokens?.accessToken) {
    headers['Authorization'] = `Bearer ${tokens.accessToken}`;
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: { ...headers, ...(options?.headers || {}) },
  });

  if (response.status === 401 && tokens?.refreshToken) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const newTokens = getAuthTokens();
      if (newTokens.accessToken) {
        return apiRequest<T>(url, options, newTokens);
      }
    }
    throw new Error('Session expired. Please log in again.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed: ${response.status}`);
  }

  return response.json();
}

async function refreshAccessToken(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    return response.ok;
  } catch {
    return false;
  }
}

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

    renameWorkflow: async function renameWorkflow(sourceId: string, name: string) {
      const tokens = getAuthTokens();
      await apiRequest<{ success: boolean }>(
        `/published/${sourceId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ name }),
        },
        tokens
      );
      set((state) => ({
        workflows: state.workflows.map((w) =>
          w.sourceId === sourceId ? { ...w, name } : w
        ),
      }));
    },

    deleteWorkflow: async function deleteWorkflow(sourceId: string) {
      const tokens = getAuthTokens();
      await apiRequest<{ success: boolean }>(
        `/published/${sourceId}`,
        { method: 'DELETE' },
        tokens
      );
      set((state) => ({
        workflows: state.workflows.filter((w) => w.sourceId !== sourceId),
      }));
    },
  };
});

export type SortKey = 'Recent' | 'Name';
