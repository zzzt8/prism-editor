// Repository interfaces - define the contract for data access

import type { Workflow, WorkflowMeta } from '@prism/shared-types';

export interface IWorkflowRepository {
  list(): Promise<WorkflowMeta[]>;
  get(_id: string): Promise<Workflow>;
  save(_workflow: Workflow): Promise<Workflow>;
  delete(_id: string): Promise<void>;
  exists(_id: string): Promise<boolean>;
}
