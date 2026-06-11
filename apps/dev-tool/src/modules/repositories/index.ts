// Repository module barrel export
// Phase 1: Wraps existing IndexedDBStorageAdapter, no behavior change

export { WorkflowRepository } from './workflowRepository';
export { VersionRepository } from './versionRepository';
export { PublishRepository } from './publishRepository';
export { TemplateRepository } from './templateRepository';
export { ProductTemplateRepository } from './productTemplateRepository';
export { TemplateVersionRepository } from './templateVersionRepository';
export { SnippetRepository } from './snippetRepository';

export type {
  IWorkflowRepository,
  IVersionRepository,
  IPublishRepository,
  ITemplateRepository,
  IProductTemplateRepository,
  ITemplateVersionRepository,
  TemplateVersion,
  ISnippetRepository,
} from './interfaces';
