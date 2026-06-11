// Repository interfaces for user-app

import type { PublishedWorkflow, PublishedWorkflowMeta } from '@prism/shared-types';
import type { NodePackageManifest } from '@prism/shared-types';

// Re-export PublishedWorkflowMeta for backward compatibility
export type { PublishedWorkflowMeta } from '@prism/shared-types';

export interface IPublishedWorkflowRepository {
  listPublished(): Promise<PublishedWorkflowMeta[]>;
  getPublished(_sourceId: string): Promise<PublishedWorkflow>;
  savePublished(_published: PublishedWorkflow): Promise<void>;
  updateWorkflowMeta(_sourceId: string, _patch: { name?: string; description?: string }): Promise<void>;
  deletePublished(_sourceId: string): Promise<void>;
}

export interface INodePackageRepository {
  getFromCache(_url: string): NodePackageManifest | null;
  cache(_pkg: NodePackageManifest): void;
  listCached(): NodePackageManifest[];
}
