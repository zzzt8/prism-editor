// NodePackageRepository - implements INodePackageRepository using nodeCache
// Phase 1: Wraps existing nodeCache utilities, no behavior change

import type { NodePackageManifest } from '@prism/shared-types';
import type { INodePackageRepository } from './interfaces';
import {
  getNodePackageFromCache,
  storeNodePackageInCache,
  clearNodePackageCache,
} from '../../storage/nodeCache';

export class NodePackageRepository implements INodePackageRepository {
  getFromCache(url: string): NodePackageManifest | null {
    const cached = getNodePackageFromCache(url);
    return cached?.manifest ?? null;
  }

  cache(pkg: NodePackageManifest): void {
    // Use package name as URL key when no URL is available
    const url = pkg.name;
    storeNodePackageInCache(url, pkg);
  }

  listCached(): NodePackageManifest[] {
    // Note: nodeCache doesn't expose a list method, return empty for now
    // This could be enhanced by iterating localStorage keys with STORAGE_PREFIX
    return [];
  }
}
