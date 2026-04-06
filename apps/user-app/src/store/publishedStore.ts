// publishedStore.ts - backward compatibility barrel
//
// Re-exports types from the new split stores/modules.
// The actual store implementations are in:
//   - modules/catalog/workflowCatalogStore.ts
//   - modules/selection/selectedWorkflowStore.ts
//   - modules/runner/runStore.ts
//   - modules/node-runtime/nodePackageLoader.ts

export type { PublishedWorkflowMeta } from '../modules/repositories/interfaces';
export type { RunState } from '../modules/runner/runStore';
export type { NodeLoadError } from '../modules/selection/selectedWorkflowStore';

// Re-export useWorkflowCatalogStore as useUserAppStore for backward compatibility
// with code that still imports from this path
import { useWorkflowCatalogStore } from '../modules/catalog/workflowCatalogStore';
export const useUserAppStore = useWorkflowCatalogStore;

export { syncWorkflowToLocal } from '../modules/repositories/publishedWorkflowRepository';