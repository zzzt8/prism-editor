// Node executor registry — re-exports all executors from their respective node files.
//
// Architecture: This file re-exports executors from their respective platform directories.
// Following PRD §6.4 Plan C:
//   - browser/ executors wrap core/ pure algorithms with Canvas 2D API
//   - nodejs/ executors wrap core/ pure algorithms with sharp API
//   - core/ contains pure algorithms with no platform dependencies
//
// Split from monolithic executors.ts (openspec/changes/codebase-cleanup/design.md §Decision 5):
//   load-image.ts  → loadImageExecutor, loadMaskExecutor
//   apply-mask.ts  → applyMaskExecutor
//   composite.ts   → compositeExecutor
//   transform.ts   → transformExecutor
//   export-image.ts → exportExecutor

import type { NodeExecutor } from '@prism/shared-types';

// Browser executors (Canvas 2D) - use core/ pure algorithms
import { browserExecutors } from './browser';

// Legacy exports for backward compatibility
import { loadImageExecutor } from './load-image';
import { loadMaskExecutor } from './load-image';
import { applyMaskExecutor } from './apply-mask';
import { compositeExecutor } from './composite';
import { transformExecutor } from './transform';
import { exportExecutor } from './export-image';
import { emptyInputExecutor } from './empty-input';

export { loadImageExecutor, loadMaskExecutor };
export { applyMaskExecutor };
export { compositeExecutor };
export { transformExecutor };
export { exportExecutor };
export { emptyInputExecutor };

// nodeExecutors registry - prefer browser executors for browser environment
// Note: In Node.js environment, use nodejs/ executors instead
export const nodeExecutors: Record<string, NodeExecutor> = {
  'load-image': loadImageExecutor,
  'load-mask': loadMaskExecutor,
  // Use browser executors which wrap core/ pure algorithms
  'composite': browserExecutors.composite,
  'apply-mask': browserExecutors['apply-mask'],
  'transform': browserExecutors.transform,
  'export': browserExecutors.export,
  'empty-input': emptyInputExecutor,
};
