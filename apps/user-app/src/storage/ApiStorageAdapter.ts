import type { PublishedWorkflow } from '@prism/shared-types';
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
  content: string;
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
    content: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface PublishedWorkflowListItem {
  sourceId: string;
  name: string;
  description?: string;
  sourceName: string;
  version: string;
  publishedAt: string;
  inputCount: number;
  outputCount: number;
  content: string;
}

export class UserAppStorageAdapter {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

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

  private parseWorkflowMeta(item: ApiPublishedWorkflowRecord): PublishedWorkflowListItem {
    let sourceName = item.workflow.name;
    let inputCount = 0;
    let outputCount = 0;

    try {
      const content = JSON.parse(item.content);
      if (content.sourceName) sourceName = content.sourceName;
      if (content.config?.inputs) inputCount = content.config.inputs.length;
      if (content.config?.outputs) outputCount = content.config.outputs.length;
    } catch {
      // Content parse failed, use defaults from workflow metadata
    }

    return {
      sourceId: item.workflow.id,
      name: item.workflow.name,
      description: item.workflow.description,
      sourceName,
      version: item.workflow.version,
      publishedAt: item.publishedAt,
      inputCount,
      outputCount,
      content: item.content,
    };
  }

  async listPublished(): Promise<PublishedWorkflowListItem[]> {
    const response = await this.request<ApiListResponse>('/published?limit=100');
    return response.data.map((item) => this.parseWorkflowMeta(item));
  }

  async loadPublished(sourceId: string): Promise<PublishedWorkflow> {
    // Fetch all published workflows (list includes content)
    const response = await this.request<ApiListResponse>('/published?limit=100');

    // Find the published workflow that references this workflow ID
    const published = response.data.find(
      (p) => p.workflowId === sourceId || p.workflow.id === sourceId
    );
    if (!published) {
      throw new Error('Published workflow not found');
    }

    // Parse the content stored in PublishedWorkflow.content
    // The content should be a complete PublishedWorkflow JSON
    const workflow = JSON.parse(published.content) as PublishedWorkflow;

    // Merge with metadata from the record if needed
    if (!workflow.sourceId) {
      workflow.sourceId = published.workflow.id;
    }
    if (!workflow.name) {
      workflow.name = published.workflow.name;
    }

    return workflow;
  }

  /**
   * Import a validated published workflow to the server.
   * Saves and publishes the workflow via POST /api/published/import.
   */
  async importWorkflow(workflow: ValidatedPublishedWorkflow): Promise<{ id: string }> {
    // Serialize the complete PublishedWorkflow as the content
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
}
