// Repository module barrel export for user-app
// Phase 1: Wraps existing IndexedDBStorageAdapter, no behavior change

export { PublishedWorkflowRepository } from './publishedWorkflowRepository';
export { NodePackageRepository } from './nodePackageRepository';
export { syncWorkflowToLocal } from './publishedWorkflowRepository';
export { ProductTemplateRepository, productTemplateRepository } from './productTemplateRepository';

export type {
  IPublishedWorkflowRepository,
  INodePackageRepository,
  IProductTemplateRepository,
} from './interfaces';
