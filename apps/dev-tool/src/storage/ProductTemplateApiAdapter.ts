import type {
  ProductTemplate,
  ProductTemplateSummary,
  ProductTemplateSummaryMetadata,
} from '@prism/shared-types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

interface ApiProductTemplate {
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

interface ApiProductTemplateSummary {
  id: string;
  name: string;
  description?: string;
  version: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiListResponse {
  data: ApiProductTemplateSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class ProductTemplateApiAdapter {
  private accessToken: string | null = null;

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  private async request<T>(url: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers: {
        ...headers,
        ...(options?.headers || {}),
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Product template not found');
      }
      if (response.status === 403) {
        throw new Error('Access denied');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed: ${response.status}`);
    }

    return response.json();
  }

  async list(page = 1, limit = 100): Promise<ProductTemplateSummary[]> {
    const response = await this.request<ApiListResponse>(
      `/product-templates?page=${page}&limit=${limit}`
    );

    return response.data.map((item) => this.toSummary(item));
  }

  async get(id: string): Promise<ProductTemplate> {
    const response = await this.request<{ data: ApiProductTemplate }>(
      `/product-templates/${id}`
    );
    return this.toFullTemplate(response.data);
  }

  async create(template: Partial<ProductTemplate>): Promise<ProductTemplate> {
    const response = await this.request<{ data: ApiProductTemplate }>(
      '/product-templates',
      {
        method: 'POST',
        body: JSON.stringify({
          name: template.name,
          description: template.description,
          version: template.version || '1.0.0',
          content: JSON.stringify(template),
        }),
      }
    );
    return this.toFullTemplate(response.data);
  }

  async update(id: string, template: ProductTemplate): Promise<ProductTemplate> {
    const response = await this.request<{ data: ApiProductTemplate }>(
      `/product-templates/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          name: template.name,
          description: template.description,
          content: JSON.stringify(template),
        }),
      }
    );
    return this.toFullTemplate(response.data);
  }

  async delete(id: string): Promise<void> {
    await this.request<{ success: boolean }>(`/product-templates/${id}`, {
      method: 'DELETE',
    });
  }

  async publish(id: string, workflowId: string): Promise<ProductTemplate> {
    const response = await this.request<{ data: ApiProductTemplate }>(
      `/product-templates/${id}/publish`,
      {
        method: 'POST',
        body: JSON.stringify({ workflowId }),
      }
    );
    return this.toFullTemplate(response.data);
  }

  private toSummary(item: ApiProductTemplateSummary): ProductTemplateSummary {
    const metadata: ProductTemplateSummaryMetadata = {
      inputCount: 0,
      designParamCount: 0,
      assetCount: 0,
    };

    return {
      id: item.id,
      name: item.name,
      description: item.description,
      version: item.version,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      metadata,
    };
  }

  private toFullTemplate(item: ApiProductTemplate): ProductTemplate {
    let template: Partial<ProductTemplate>;
    try {
      template = JSON.parse(item.content);
    } catch {
      template = {};
    }

    return {
      id: item.id,
      name: item.name,
      description: item.description,
      version: item.version,
      inputs: template.inputs || [],
      assets: template.assets || [],
      designParams: template.designParams || [],
      preview: template.preview || { canvas: {}, flow: { type: 'workflow' } },
      production: template.production || { output: {}, flow: { type: 'none' } },
      publishState: item.publishedId
        ? { publishedWorkflowId: item.publishedId, publishedAt: item.updatedAt }
        : undefined,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
