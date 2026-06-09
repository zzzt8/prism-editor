// PublishedWorkflowRepository - implements IPublishedWorkflowRepository via userAppStorage
// Phase 1: Wraps existing IndexedDBStorageAdapter, no behavior change

import type { PublishedWorkflow } from '@prism/shared-types';
import { userAppStorage } from '../../storage';
import type { IPublishedWorkflowRepository, PublishedWorkflowMeta } from './interfaces';
import type { ValidatedPublishedWorkflow } from '../../utils/workflowImport';

export class PublishedWorkflowRepository implements IPublishedWorkflowRepository {
  async listPublished(): Promise<PublishedWorkflowMeta[]> {
    return userAppStorage.listPublished();
  }

  async getPublished(sourceId: string): Promise<PublishedWorkflow> {
    return userAppStorage.loadPublished(sourceId);
  }

  async savePublished(_published: PublishedWorkflow): Promise<void> {
    throw new Error('Direct save is not available on the public API');
  }

  async deletePublished(sourceId: string): Promise<void> {
    await userAppStorage.deletePublished(sourceId);
  }

  async updateWorkflowMeta(sourceId: string, patch: { name?: string; description?: string }): Promise<void> {
    await userAppStorage.updateWorkflowMeta(sourceId, patch);
  }
}

export async function syncWorkflowToLocal(workflow: ValidatedPublishedWorkflow): Promise<string> {
  const result = await userAppStorage.importWorkflow(workflow);
  return result.id;
}

