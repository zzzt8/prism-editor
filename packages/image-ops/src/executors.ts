// Node executor registry — re-exports all executors from their respective node files.
//
// Split from monolithic executors.ts (openspec/changes/codebase-cleanup/design.md §Decision 5):
//   load-image.ts  → loadImageExecutor, loadMaskExecutor
//   apply-mask.ts  → applyMaskExecutor
//   composite.ts   → compositeExecutor
//   transform.ts   → transformExecutor
//   export-image.ts → exportExecutor

import type { NodeExecutor } from '@prism/shared-types';
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

export const nodeExecutors: Record<string, NodeExecutor> = {
  'load-image': loadImageExecutor,
  'load-mask': loadMaskExecutor,
  'apply-mask': applyMaskExecutor,
  'composite': compositeExecutor,
  'transform': transformExecutor,
  'export': exportExecutor,
  'empty-input': emptyInputExecutor,
};
