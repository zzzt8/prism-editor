import type { PublishedWorkflow, PublishedWorkflowMeta as SharedPublishedWorkflowMeta } from '@prism/shared-types';
import type { ValidatedPublishedWorkflow } from '../utils/workflowImport';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

interface ApiPublishedWorkflowRecord {
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
  content?: string | PublishedWorkflow;
}

interface ApiListResponse {
  data: Array<{
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
    content?: string | PublishedWorkflow;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type PublishedWorkflowMeta = SharedPublishedWorkflowMeta;

export class UserAppStorageAdapter {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${this.baseUrl}${url}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Published workflow not found');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timed out');
        }
        if (error.message === 'Published workflow not found') {
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

  private parseWorkflowMeta(item: ApiPublishedWorkflowRecord): PublishedWorkflowMeta {
    let sourceName = item.workflow.name;
    let inputCount = 0;
    let outputCount = 0;

    try {
      const content = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
      if (content?.sourceName) sourceName = content.sourceName;
      if (content?.config?.inputs) inputCount = content.config.inputs.length;
      if (content?.config?.outputs) outputCount = content.config.outputs.length;
    } catch {
      // Content parse failed, use defaults from workflow metadata
    }

    return {
      sourceId: item.workflow.id,
      publishedId: item.id,
      name: item.workflow.name,
      description: item.workflow.description,
      sourceName,
      version: item.workflow.version,
      publishedAt: item.publishedAt,
      inputCount,
      outputCount,
    };
  }

  async listPublished(): Promise<PublishedWorkflowMeta[]> {
    const response = await this.request<ApiListResponse>('/published?limit=100');
    return response.data.map((item) => this.parseWorkflowMeta(item));
  }

  async loadPublished(id: string): Promise<PublishedWorkflow> {
    const response = await this.request<{ data: ApiPublishedWorkflowRecord }>(`/published/${id}`);
    const published = response.data;

    const workflow = typeof published.content === 'string'
      ? JSON.parse(published.content)
      : published.content;

    if (!workflow || typeof workflow !== 'object') {
      throw new Error('Published workflow content is missing or invalid');
    }

    const typedWorkflow = workflow as PublishedWorkflow;
    if (!typedWorkflow.sourceId) {
      typedWorkflow.sourceId = published.workflow.id;
    }
    if (!typedWorkflow.name) {
      typedWorkflow.name = published.workflow.name;
    }
    if (!typedWorkflow.sourceName) {
      typedWorkflow.sourceName = published.workflow.name;
    }

    return typedWorkflow;
  }

  async importWorkflow(workflow: ValidatedPublishedWorkflow): Promise<{ id: string }> {
    const content = JSON.stringify(workflow);

    const response = await this.request<{ data: { id: string; workflowId: string } }>('/published/import', {
      method: 'POST',
      body: JSON.stringify({
        name: workflow.name,
        description: workflow.description,
        content,
        category: 'imported',
        version: workflow.version,
      }),
    });

    return { id: response.data.workflowId };
  }

  async deletePublished(_sourceId: string): Promise<void> {
    throw new Error('Delete is not available on the public API');
  }

  async updateWorkflowMeta(_sourceId: string, _patch: { name?: string; description?: string }): Promise<void> {
    throw new Error('Update meta is not available on the public API');
  }
}
