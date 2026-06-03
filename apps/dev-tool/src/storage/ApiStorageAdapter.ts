import type { StorageAdapter, WorkflowMeta, NodeDefinition, Connection } from '@prism/shared-types';
import type { Workflow } from '@prism/shared-types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

interface ApiWorkflow {
  id: string;
  name: string;
  description?: string;
  version: string;
  status: 'DRAFT' | 'PUBLISHED';
  category?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiListResponse {
  data: Array<{
    id: string;
    name: string;
    description?: string;
    version: string;
    status: string;
    category?: string;
    createdAt: string;
    updatedAt: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt?: string;
}

interface _AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface RefreshResponse {
  user: AuthUser;
  accessToken: string;
}

export class ApiStorageAdapter implements StorageAdapter {
  private baseUrl: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
  }

  private getRefreshCookie(): string | null {
    const match = document.cookie.match(/refreshToken=([^;]+)/);
    return match ? match[1] : null;
  }

  private async refreshAccessToken(): Promise<boolean> {
    try {
      const refreshToken = this.refreshToken || this.getRefreshCookie();
      if (!refreshToken) {
        return false;
      }

      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        return false;
      }

      const data: RefreshResponse = await response.json();
      this.accessToken = data.accessToken;
      return true;
    } catch {
      return false;
    }
  }

  private async request<T>(url: string, options?: RequestInit, retryOnAuth = true): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${url}`, {
        ...options,
        headers: {
          ...headers,
          ...(options?.headers || {}),
        },
      });

      if (response.status === 401 && retryOnAuth && this.refreshToken) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed && this.accessToken) {
          return this.request<T>(url, options, false);
        }
        throw new Error('Session expired. Please log in again.');
      }

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Workflow not found');
        }
        if (response.status === 403) {
          throw new Error('Access denied');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Workflow not found') {
          throw error;
        }
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          throw new Error('Network request failed');
        }
        throw error;
      }
      throw new Error('Network request failed');
    }
  }

  async save(workflow: Workflow): Promise<Workflow> {
    const body = {
      name: workflow.name,
      content: JSON.stringify({
        id: workflow.id,
        name: workflow.name,
        version: workflow.version,
        nodes: workflow.nodes,
        connections: workflow.connections,
        inputs: workflow.inputs,
        outputs: workflow.outputs,
        metadata: workflow.metadata,
      }),
      version: workflow.version,
    };

    try {
      const result = await this.request<{ data: ApiWorkflow }>(`/workflows/${workflow.id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      return { ...workflow, id: result.data.id };
    } catch (err) {
      if (err instanceof Error && err.message.includes('not found')) {
        const result = await this.request<{ data: ApiWorkflow }>('/workflows', {
          method: 'POST',
          body: JSON.stringify({
            name: workflow.name,
            content: body.content,
            version: workflow.version,
          }),
        });
        const parsedContent = JSON.parse(result.data.content);
        return {
          ...workflow,
          id: result.data.id,
          content: parsedContent,
        } as Workflow;
      }
      throw err;
    }
  }

  async load(id: string): Promise<Workflow> {
    const response = await this.request<{ data: ApiWorkflow }>(`/workflows/${id}`);
    const workflow = JSON.parse(response.data.content);
    return workflow as Workflow;
  }

  async list(): Promise<WorkflowMeta[]> {
    const response = await this.request<ApiListResponse>('/workflows?limit=100');
    return response.data.map((item) => ({
      id: item.id,
      name: item.name,
      version: item.version,
      status: item.status.toLowerCase() as 'draft' | 'published',
      description: item.description,
      category: item.category,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  }

  async delete(id: string): Promise<void> {
    await this.request<{ success: boolean }>(`/workflows/${id}`, {
      method: 'DELETE',
    });
  }

  async createWorkflow(
    name: string,
    description?: string,
    category?: string
  ): Promise<{ meta: WorkflowMeta; content: Workflow }> {
    const response = await this.request<{ data: ApiWorkflow }>('/workflows', {
      method: 'POST',
      body: JSON.stringify({
        name,
        description,
        category,
        content: JSON.stringify({
          id: '',
          name,
          version: '1.0.0',
          nodes: [],
          connections: [],
          inputs: [],
          outputs: [],
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      }),
    });

    const workflow = JSON.parse(response.data.content);
    const meta: WorkflowMeta = {
      id: response.data.id,
      name: response.data.name,
      version: response.data.version,
      status: response.data.status.toLowerCase() as 'draft' | 'published',
      description: response.data.description,
      category: response.data.category,
      createdAt: response.data.createdAt,
      updatedAt: response.data.updatedAt,
    };

    return { meta, content: workflow as Workflow };
  }

  async updateWorkflowMeta(id: string, patch: Partial<WorkflowMeta>): Promise<void> {
    await this.request<{ data: ApiWorkflow }>(`/workflows/${id}/meta`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  }

  async exportToJson(workflow: Workflow): Promise<string> {
    const response = await this.request<{
      name: string;
      description?: string;
      version: string;
      content: string;
      createdAt: string;
      updatedAt: string;
    }>(`/workflows/${workflow.id}/export`);
    return JSON.stringify(response, null, 2);
  }

  async importFromJson(json: string): Promise<Workflow> {
    const data = JSON.parse(json);
    const response = await this.request<{ data: ApiWorkflow }>('/workflows/import', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        description: data.description,
        content: typeof data.content === 'string' ? data.content : JSON.stringify(data.content),
        version: data.version,
      }),
    });
    return JSON.parse(response.data.content) as Workflow;
  }

  async getVersions(workflowId: string, page = 1, limit = 20): Promise<{
    data: Array<{ id: string; version: string; createdBy: string | null; createdAt: string }>;
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    return this.request(`/workflows/${workflowId}/versions?page=${page}&limit=${limit}`);
  }

  async getVersionContent(workflowId: string, versionId: string): Promise<{
    id: string;
    version: string;
    content: string;
    createdBy: string | null;
    createdAt: string;
  }> {
    const response = await this.request<{ data: { id: string; version: string; content: string; createdBy: string | null; createdAt: string } }>(
      `/workflows/${workflowId}/versions/${versionId}`
    );
    return response.data;
  }

  async rollbackWorkflow(workflowId: string, versionId: string, newVersion?: string): Promise<void> {
    await this.request(`/workflows/${workflowId}/rollback`, {
      method: 'POST',
      body: JSON.stringify({ versionId, ...(newVersion && { newVersion }) }),
    });
  }

  async diffVersions(workflowId: string, fromId: string, toId: string): Promise<{
    from: { id: string; version: string; createdAt: string };
    to: { id: string; version: string; createdAt: string };
    nodes: { added: NodeDefinition[]; removed: NodeDefinition[]; modified: NodeDefinition[] };
    connections: { added: Connection[]; removed: Connection[]; modified: Connection[] };
  }> {
    const response = await this.request<{
      data: {
        from: { id: string; version: string; createdAt: string };
        to: { id: string; version: string; createdAt: string };
        nodes: { added: NodeDefinition[]; removed: NodeDefinition[]; modified: NodeDefinition[] };
        connections: { added: Connection[]; removed: Connection[]; modified: Connection[] };
      };
    }>(`/workflows/${workflowId}/diff?from=${fromId}&to=${toId}`);
    return response.data;
  }
}