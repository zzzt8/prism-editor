// PublishRepository - implements IPublishRepository using server API
// Server-first: publish/unpublish operations go to server API

import type { PublishedWorkflow } from '@prism/shared-types';
import type { IPublishRepository, PublishedWorkflowMeta } from './interfaces';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

interface AuthTokens {
  accessToken: string | null;
  refreshToken: string | null;
}

function getTokens(): AuthTokens {
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
      const newTokens = getTokens();
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

export class PublishRepository implements IPublishRepository {
  async publish(workflowId: string, published: PublishedWorkflow): Promise<void> {
    const tokens = getTokens();
    await apiRequest<{ data: unknown }>('/published', {
      method: 'POST',
      body: JSON.stringify({
        workflowId,
        content: JSON.stringify(published),
        publishedBy: published.name,
      }),
    }, tokens);
  }

  async unpublish(workflowId: string): Promise<void> {
    const tokens = getTokens();
    // Find the published workflow by workflowId
    const listResp = await apiRequest<{
      data: Array<{ id: string; workflowId: string }>;
    }>('/published?limit=100', {}, tokens);

    const published = listResp.data.find((p) => p.workflowId === workflowId);
    if (!published) {
      throw new Error('Published workflow not found');
    }

    await apiRequest<{ success: boolean }>(`/published/${published.id}`, {
      method: 'DELETE',
    }, tokens);
  }

  async getPublished(sourceId: string): Promise<PublishedWorkflow | null> {
    const tokens = getTokens();
    try {
      const resp = await apiRequest<{
        data: { workflowId: string; content: string };
      }>(`/published/${sourceId}`, {}, tokens);

      return JSON.parse(resp.data.content) as PublishedWorkflow;
    } catch {
      return null;
    }
  }

  async listPublished(): Promise<PublishedWorkflowMeta[]> {
    const tokens = getTokens();
    const resp = await apiRequest<{
      data: Array<{
        id: string;
        workflowId: string;
        publishedAt: string;
        workflow: { id: string; name: string; description?: string; version: string };
        content: string;
      }>;
    }>('/published?limit=100', {}, tokens);

    return resp.data.map((item) => {
      let inputCount = 0;
      let outputCount = 0;
      try {
        const c = JSON.parse(item.content);
        inputCount = c.config?.inputs?.length ?? c.inputs?.length ?? 0;
        outputCount = c.config?.outputs?.length ?? c.outputs?.length ?? 0;
      } catch { /* ignore */ }

      return {
        sourceId: item.workflow.id,
        name: item.workflow.name,
        description: item.workflow.description,
        sourceName: item.workflow.name,
        version: item.workflow.version,
        publishedAt: item.publishedAt,
        inputCount,
        outputCount,
      };
    });
  }
}
