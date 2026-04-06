// Repository interfaces for user-app

import type { PublishedWorkflow } from '@prism/shared-types';
import type { NodePackageManifest } from '@prism/shared-types';

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

export interface IPublishedWorkflowRepository {
  listPublished(): Promise<PublishedWorkflowMeta[]>;
  getPublished(sourceId: string): Promise<PublishedWorkflow>;
  savePublished(published: PublishedWorkflow): Promise<void>;
  deletePublished(sourceId: string): Promise<void>;
}

export interface INodePackageRepository {
  getFromCache(url: string): NodePackageManifest | null;
  cache(pkg: NodePackageManifest): void;
  listCached(): NodePackageManifest[];
}
