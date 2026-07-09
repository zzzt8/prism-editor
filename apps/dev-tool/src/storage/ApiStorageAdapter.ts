// ApiStorageAdapter - Phase 2 refactor
// API Key auth (PRD §6.3 mall trust mode) replaces JWT.
// All methods use X-PRISM-SECRET header. Old JWT methods removed.

import type { StorageAdapter, WorkflowMeta, Workflow } from '@prism/shared-types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export class ApiStorageAdapter implements StorageAdapter {
  private baseUrl: string;
  private secret: string;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
    const envSecret = import.meta.env.VITE_PRISM_SECRET;
    if (!envSecret) {
      console.warn('[ApiStorageAdapter] VITE_PRISM_SECRET not set; X-PRISM-SECRET will be empty');
    }
    this.secret = envSecret ?? '';
  }

  // --- HTTP client ---

  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-PRISM-SECRET': this.secret,
    };

    const response = await fetch(`${this.baseUrl}${url}`, {
      ...options,
      headers: {
        ...headers,
        ...(options?.headers || {}),
      },
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const msg = typeof body === 'object' && body !== null && 'error' in body
        ? (body as { error: string }).error
        : `Request failed: ${response.status}`;
      throw new Error(msg);
    }

    // Handle 204 No Content
    if (response.status === 204) return {} as T;
    return response.json() as T;
  }

  // --- StorageAdapter interface (legacy Workflow methods — kept for compatibility) ---

  async save(workflow: Workflow): Promise<Workflow> {
    // Phase 2: save is a no-op via API (IndexedDB handles autosave)
    // This method kept for interface compliance only
    return workflow;
  }

  async load(id: string): Promise<Workflow> {
    // Phase 2: load via API template → flow path
    // This method kept for interface compliance only
    throw new Error('load() not implemented in Phase 2 ApiStorageAdapter. Use getTemplate + getFlow instead.');
  }

  async list(): Promise<WorkflowMeta[]> {
    // Phase 2: list templates instead
    const templates = await this.listTemplates();
    return templates.map((t) => ({
      id: t.id,
      name: t.name,
      version: t.version,
      status: 'draft' as const,
      description: t.description ?? undefined,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
  }

  async delete(id: string): Promise<void> {
    await this.request(`/templates/${id}`, { method: 'DELETE' });
  }

  async createWorkflow(
    name: string,
    description?: string,
    category?: string
  ): Promise<{ meta: WorkflowMeta; content: Workflow }> {
    const template = await this.createTemplate({ name, description, content: '{}' });
    return {
      meta: {
        id: template.id,
        name: template.name,
        version: template.version,
        status: 'draft',
        description: template.description ?? undefined,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      },
      content: { id: '', name, version: template.version, nodes: [], connections: [], inputs: [], outputs: [], metadata: { createdAt: '', updatedAt: '' } },
    };
  }

  async updateWorkflowMeta(id: string, patch: Partial<WorkflowMeta>): Promise<void> {
    await this.request(`/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name: patch.name, description: patch.description }),
    });
  }

  async exportToJson(_workflow: Workflow): Promise<string> {
    throw new Error('exportToJson() not supported in Phase 2');
  }

  async importFromJson(_json: string): Promise<Workflow> {
    throw new Error('importFromJson() not supported in Phase 2');
  }

  // --- ProductTemplate API methods ---

  async listTemplates(): Promise<Array<{
    id: string;
    name: string;
    description?: string;
    version: string;
    createdAt: string;
    updatedAt: string;
  }>> {
    return this.request('/templates');
  }

  async getTemplate(id: string): Promise<{
    id: string;
    name: string;
    description?: string;
    version: string;
    content: string;
    createdAt: string;
    updatedAt: string;
  }> {
    return this.request(`/templates/${id}`);
  }

  async createTemplate(data: {
    name: string;
    description?: string;
    content: string;
  }): Promise<{
    id: string;
    name: string;
    description?: string;
    version: string;
    content: string;
    createdAt: string;
    updatedAt: string;
  }> {
    return this.request('/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTemplate(
    id: string,
    data: {
      name?: string;
      description?: string;
      content?: string;
    }
  ): Promise<unknown> {
    return this.request(`/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.request(`/templates/${id}`, { method: 'DELETE' });
  }

  // --- Flow API methods ---

  async listFlows(templateId: string): Promise<Array<{
    id: string;
    templateId: string;
    name: string;
    platform: string;
    createdAt: string;
    updatedAt: string;
  }>> {
    return this.request(`/templates/${templateId}/flows`);
  }

  async addFlow(
    templateId: string,
    data: { name: string; platform: string; content: string }
  ): Promise<{
    id: string;
    templateId: string;
    name: string;
    platform: string;
    content: string;
    createdAt: string;
    updatedAt: string;
  }> {
    return this.request(`/templates/${templateId}/flows`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFlow(
    templateId: string,
    flowId: string,
    data: { name?: string; platform?: string; content?: string }
  ): Promise<unknown> {
    return this.request(`/templates/${templateId}/flows/${flowId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteFlow(templateId: string, flowId: string): Promise<void> {
    await this.request(`/templates/${templateId}/flows/${flowId}`, { method: 'DELETE' });
  }

  // --- Render ---

  async renderTemplate(opts: {
    templateId: string;
    userParams?: Record<string, unknown>;
    inputs?: Record<string, unknown>;
    format?: string;
  }): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/render/template`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-PRISM-SECRET': this.secret,
      },
      body: JSON.stringify(opts),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const msg = typeof body === 'object' && body !== null && 'error' in body
        ? (body as { error: string }).error
        : `Render failed: ${response.status}`;
      throw new Error(msg);
    }

    const contentType = response.headers.get('Content-Type') ?? 'image/png';
    const blob = await response.blob();
    return new Blob([blob], { type: contentType });
  }
}
