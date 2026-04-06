// Repository module barrel export
// Phase 1: Wraps existing IndexedDBStorageAdapter, no behavior change

export { WorkflowRepository } from './workflowRepository';
export { VersionRepository } from './versionRepository';
export { PublishRepository } from './publishRepository';

export type {
  IWorkflowRepository,
  IVersionRepository,
  IPublishRepository,
} from './interfaces';
