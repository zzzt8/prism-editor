// ProductTemplateRepository - implements IProductTemplateRepository via API
// Phase 1: Loads from /product-templates API, displays PublishedWorkflow as ProductTemplate

import type {
  ProductTemplate,
  ProductTemplateSummary,
  ProductTemplateSummaryMetadata,
} from '@prism/shared-types';
import { createProductTemplateFromPublishedWorkflow } from '@prism/shared-types';
import type { IProductTemplateRepository } from './interfaces';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

interface ApiProductTemplateRecord {
  id: string;
  name: string;
  description?: string;
  version: string;
  content: string;
  userId: string;
  publishedId?: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiListResponse {
  data: ApiProductTemplateRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProductTemplateRepositoryMeta {
  id: string;
  name: string;
  description?: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  metadata: ProductTemplateSummaryMetadata;
}

export class ProductTemplateRepository implements IProductTemplateRepository {
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
          throw new Error('Product template not found');
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
        if (error.message === 'Product template not found') {
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

  private parseTemplateMeta(record: ApiProductTemplateRecord): ProductTemplateRepositoryMeta {
    let metadata: ProductTemplateSummaryMetadata = {
      inputCount: 0,
      designParamCount: 0,
      assetCount: 0,
    };

    try {
      const content = typeof record.content === 'string'
        ? JSON.parse(record.content)
        : record.content;
      if (content) {
        metadata = {
          inputCount: content.inputs?.length ?? 0,
          designParamCount: content.designParams?.length ?? 0,
          assetCount: content.assets?.length ?? 0,
          publishedWorkflowId: content.publishState?.publishedWorkflowId,
          lastPublishedAt: content.publishState?.publishedAt,
        };
      }
    } catch {
      // Content parse failed, use defaults
    }

    return {
      id: record.id,
      name: record.name,
      description: record.description,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      metadata,
    };
  }

  async list(page: number = 1, limit: number = 20, search?: string): Promise<{
    templates: ProductTemplateRepositoryMeta[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (search) {
      params.set('search', search);
    }

    const response = await this.request<ApiListResponse>(
      `/product-templates?${params.toString()}`
    );

    return {
      templates: response.data.map((record) => this.parseTemplateMeta(record)),
      pagination: response.pagination,
    };
  }

  async get(id: string): Promise<ProductTemplate> {
    const response = await this.request<{ data: ApiProductTemplateRecord }>(
      `/product-templates/${id}`
    );
    const record = response.data;

    const content = typeof record.content === 'string'
      ? JSON.parse(record.content)
      : record.content;

    if (!content || typeof content !== 'object') {
      throw new Error('Product template content is missing or invalid');
    }

    return content as ProductTemplate;
  }
}

// Singleton instance
export const productTemplateRepository = new ProductTemplateRepository();
