// ProductTemplateRepository - wraps ApiStorageAdapter ProductTemplate methods
// Phase 2: ProductTemplate multi-flow

import { activeStorageAdapter } from '../../storage';

export interface TemplateMeta {
  id: string;
  name: string;
  description?: string;
  version: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateDetail extends TemplateMeta {
  content: string;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  content?: string;
}

export class ProductTemplateRepository {
  async list(): Promise<TemplateMeta[]> {
    return activeStorageAdapter.listTemplates();
  }

  async get(id: string): Promise<TemplateDetail> {
    return activeStorageAdapter.getTemplate(id);
  }

  async create(data: CreateTemplateInput): Promise<TemplateDetail> {
    return activeStorageAdapter.createTemplate({
      name: data.name,
      description: data.description,
      content: data.content ?? '{}',
    });
  }

  async update(id: string, data: Partial<CreateTemplateInput>): Promise<void> {
    await activeStorageAdapter.updateTemplate(id, data);
  }

  async delete(id: string): Promise<void> {
    await activeStorageAdapter.deleteTemplate(id);
  }
}
