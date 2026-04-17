// Repository interfaces - define the contract for data access

import type { Workflow, WorkflowMeta, PublishedWorkflow } from '@prism/shared-types';
import type { Template, TemplateSummary } from '@prism/shared-types';
import type { SnippetFragment, SnippetSummary } from '@prism/shared-types';

export interface PublishedWorkflowMeta {
  sourceId: string;
  name: string;
  description?: string;
  sourceName: string;
  version: string;
  publishedAt: string;
  inputCount: number;
  outputCount: number;
}

export interface IWorkflowRepository {
  list(): Promise<WorkflowMeta[]>;
  get(id: string): Promise<Workflow>;
  save(workflow: Workflow): Promise<void>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
}

export interface WorkflowVersion {
  id: string;
  version: string;
  createdBy: string | null;
  createdAt: string;
}

export interface IVersionRepository {
  list(workflowId: string): Promise<WorkflowVersion[]>;
  get(workflowId: string, versionId: string): Promise<Workflow>;
  create(workflowId: string, content: Workflow): Promise<WorkflowVersion>;
  rollback(workflowId: string, versionId: string): Promise<Workflow>;
}

export interface IPublishRepository {
  publish(workflowId: string, published: PublishedWorkflow): Promise<void>;
  unpublish(workflowId: string): Promise<void>;
  getPublished(sourceId: string): Promise<PublishedWorkflow | null>;
  listPublished(): Promise<PublishedWorkflowMeta[]>;
}

export interface ITemplateRepository {
  list(): Promise<TemplateSummary[]>;
  get(id: string): Promise<Template>;
  save(template: Template): Promise<void>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
}

export interface TemplateVersion {
  id: string;
  version: string;
  createdBy: string | null;
  createdAt: string;
}

export interface ITemplateVersionRepository {
  list(templateId: string): Promise<TemplateVersion[]>;
  get(templateId: string, versionId: string): Promise<Template>;
  create(templateId: string, content: Template): Promise<TemplateVersion>;
  rollback(templateId: string, versionId: string): Promise<Template>;
}

export interface ISnippetRepository {
  list(): Promise<SnippetSummary[]>;
  get(id: string): Promise<SnippetFragment>;
  save(fragment: SnippetFragment): Promise<string>;
  delete(id: string): Promise<void>;
}
