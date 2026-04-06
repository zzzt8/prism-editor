// VersionRepository - implements IVersionRepository using IndexedDBStorageAdapter
// Phase 1: Wraps existing adapter version methods, no behavior change

import type { Workflow } from '@prism/shared-types';
import type { IVersionRepository, WorkflowVersion } from './interfaces';

interface VersionAdapter {
  getVersions(workflowId: string, page?: number, limit?: number): Promise<{
    data: Array<{ id: string; version: string; createdBy: string | null; createdAt: string }>;
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>;
  getVersionContent(workflowId: string, versionId: string): Promise<{
    id: string;
    version: string;
    content: string;
    createdBy: string | null;
    createdAt: string;
  }>;
  rollbackWorkflow(workflowId: string, versionId: string, newVersion?: string): Promise<void>;
}

export class VersionRepository implements IVersionRepository {
  constructor(private adapter: VersionAdapter) {}

  async list(workflowId: string): Promise<WorkflowVersion[]> {
    const result = await this.adapter.getVersions(workflowId, 1, 50);
    return result.data;
  }

  async get(workflowId: string, versionId: string): Promise<Workflow> {
    const content = await this.adapter.getVersionContent(workflowId, versionId);
    return JSON.parse(content.content) as Workflow;
  }

  async create(workflowId: string, content: Workflow): Promise<WorkflowVersion> {
    const id = crypto.randomUUID();
    const version: WorkflowVersion = {
      id,
      version: content.version,
      createdBy: null,
      createdAt: new Date().toISOString(),
    };
    return version;
  }

  async rollback(workflowId: string, versionId: string): Promise<Workflow> {
    await this.adapter.rollbackWorkflow(workflowId, versionId);
    return this.get(workflowId, versionId);
  }
}
