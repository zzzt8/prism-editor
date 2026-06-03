// VersionRepository - implements IVersionRepository using IndexedDBStorageAdapter
// Phase 1: Wraps existing adapter version methods, no behavior change

import type { Workflow } from '@prism/shared-types';
import type { IVersionRepository, WorkflowVersion } from './interfaces';
import { createId } from '@prism/shared-types';

interface VersionAdapter {
  getVersions(_workflowId: string, _page?: number, _limit?: number): Promise<{
    data: Array<{ id: string; version: string; createdBy: string | null; createdAt: string }>;
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>;
  getVersionContent(_workflowId: string, _versionId: string): Promise<{
    id: string;
    version: string;
    content: string;
    createdBy: string | null;
    createdAt: string;
  }>;
  rollbackWorkflow(_workflowId: string, _versionId: string, _newVersion?: string): Promise<void>;
}

export class VersionRepository implements IVersionRepository {
  constructor(private _adapter: VersionAdapter) {}

  async list(_workflowId: string): Promise<WorkflowVersion[]> {
    const result = await this._adapter.getVersions(_workflowId, 1, 50);
    return result.data;
  }

  async get(_workflowId: string, _versionId: string): Promise<Workflow> {
    const content = await this._adapter.getVersionContent(_workflowId, _versionId);
    return JSON.parse(content.content) as Workflow;
  }

  async create(_workflowId: string, content: Workflow): Promise<WorkflowVersion> {
    const id = createId();
    const version: WorkflowVersion = {
      id,
      version: content.version,
      createdBy: null,
      createdAt: new Date().toISOString(),
    };
    return version;
  }

  async rollback(_workflowId: string, _versionId: string): Promise<Workflow> {
    await this._adapter.rollbackWorkflow(_workflowId, _versionId);
    return this.get(_workflowId, _versionId);
  }
}
