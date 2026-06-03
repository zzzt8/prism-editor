// Repository interfaces - define the contract for data access

import type { Workflow, WorkflowMeta, PublishedWorkflow, PublishedWorkflowMeta } from '@prism/shared-types';
import type { Template, TemplateSummary } from '@prism/shared-types';
import type { SnippetFragment, SnippetSummary } from '@prism/shared-types';

// Re-export PublishedWorkflowMeta for backward compatibility
export type { PublishedWorkflowMeta } from '@prism/shared-types';

export interface IWorkflowRepository {
  list(): Promise<WorkflowMeta[]>;
  get(_id: string): Promise<Workflow>;
  save(_workflow: Workflow): Promise<Workflow>;
  delete(_id: string): Promise<void>;
  exists(_id: string): Promise<boolean>;
}

export interface WorkflowVersion {
  id: string;
  version: string;
  createdBy: string | null;
  createdAt: string;
}

export interface IVersionRepository {
  list(_workflowId: string): Promise<WorkflowVersion[]>;
  get(_workflowId: string, _versionId: string): Promise<Workflow>;
  create(_workflowId: string, _content: Workflow): Promise<WorkflowVersion>;
  rollback(_workflowId: string, _versionId: string): Promise<Workflow>;
}

export interface IPublishRepository {
  publish(_workflowId: string, _published: PublishedWorkflow): Promise<void>;
  unpublish(_workflowId: string): Promise<void>;
  getPublished(_sourceId: string): Promise<PublishedWorkflow | null>;
  listPublished(): Promise<PublishedWorkflowMeta[]>;
}

export interface ITemplateRepository {
  list(): Promise<TemplateSummary[]>;
  get(_id: string): Promise<Template>;
  save(_template: Template): Promise<void>;
  delete(_id: string): Promise<void>;
  exists(_id: string): Promise<boolean>;
}

export interface TemplateVersion {
  id: string;
  version: string;
  createdBy: string | null;
  createdAt: string;
}

export interface ITemplateVersionRepository {
  list(_templateId: string): Promise<TemplateVersion[]>;
  get(_templateId: string, _versionId: string): Promise<Template>;
  create(_templateId: string, _content: Template): Promise<TemplateVersion>;
  rollback(_templateId: string, _versionId: string): Promise<Template>;
}

export interface ISnippetRepository {
  list(): Promise<SnippetSummary[]>;
  get(_id: string): Promise<SnippetFragment>;
  save(_fragment: SnippetFragment): Promise<string>;
  delete(_id: string): Promise<void>;
}
