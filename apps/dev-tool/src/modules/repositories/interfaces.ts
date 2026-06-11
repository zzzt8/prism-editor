// Repository interfaces - define the contract for data access

import type { Workflow, WorkflowMeta, PublishedWorkflow, PublishedWorkflowMeta } from '@prism/shared-types';

// Re-export PublishedWorkflowMeta for backward compatibility
export type { PublishedWorkflowMeta } from '@prism/shared-types';

export interface IWorkflowRepository {
  list(): Promise<WorkflowMeta[]>;
  get(_id: string): Promise<Workflow>;
  save(_workflow: Workflow): Promise<Workflow>;
  delete(_id: string): Promise<void>;
  exists(_id: string): Promise<boolean>;
}

export interface IPublishRepository {
  publish(_workflowId: string, _published: PublishedWorkflow): Promise<void>;
  unpublish(_workflowId: string): Promise<void>;
  getPublished(_sourceId: string): Promise<PublishedWorkflow | null>;
  listPublished(): Promise<PublishedWorkflowMeta[]>;
}
