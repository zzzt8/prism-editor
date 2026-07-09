// FlowRepository - wraps ApiStorageAdapter Flow methods
// Phase 2: ProductTemplate multi-flow

import { activeStorageAdapter } from '../../storage';

export interface FlowMeta {
  id: string;
  templateId: string;
  name: string;
  platform: 'browser' | 'nodejs';
  createdAt: string;
  updatedAt: string;
}

export interface FlowDetail extends FlowMeta {
  content: string;
}

export interface CreateFlowInput {
  name: string;
  platform: 'browser' | 'nodejs';
  content: string;
}

export class FlowRepository {
  async list(templateId: string): Promise<FlowMeta[]> {
    return activeStorageAdapter.listFlows(templateId);
  }

  async add(templateId: string, data: CreateFlowInput): Promise<FlowDetail> {
    return activeStorageAdapter.addFlow(templateId, data);
  }

  async update(templateId: string, flowId: string, data: Partial<CreateFlowInput>): Promise<void> {
    await activeStorageAdapter.updateFlow(templateId, flowId, data);
  }

  async delete(templateId: string, flowId: string): Promise<void> {
    await activeStorageAdapter.deleteFlow(templateId, flowId);
  }
}
