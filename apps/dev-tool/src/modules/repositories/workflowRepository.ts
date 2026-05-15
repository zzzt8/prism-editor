// WorkflowRepository - implements IWorkflowRepository using IndexedDBStorageAdapter
// Phase 1: Wraps existing adapter, no behavior change

import type { StorageAdapter } from '@prism/shared-types';
import type { Workflow, WorkflowMeta } from '@prism/shared-types';
import type { IWorkflowRepository } from './interfaces';

export class WorkflowRepository implements IWorkflowRepository {
  constructor(private _adapter: StorageAdapter) {}

  async list(): Promise<WorkflowMeta[]> {
    return this._adapter.list();
  }

  async get(id: string): Promise<Workflow> {
    return this._adapter.load(id);
  }

  async save(workflow: Workflow): Promise<void> {
    return this._adapter.save(workflow);
  }

  async delete(id: string): Promise<void> {
    return this._adapter.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    try {
      await this._adapter.load(id);
      return true;
    } catch {
      return false;
    }
  }
}
