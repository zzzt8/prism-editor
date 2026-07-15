// Node.js executors — re-exports all nodejs-specific executors.

export { compositeExecutor } from './composite-executor';
export { cropExecutor } from './crop-executor';
export { exportExecutor } from './export-executor';
export { emptyInputExecutor } from './empty-input-executor';
export { loadImageExecutor } from './load-image-executor';
export { loadMaskExecutor } from './load-mask-executor';
export { applyMaskExecutor } from './apply-mask-executor';
export { transformExecutor } from './transform-executor';

import type { NodeExecutor } from '@prism/shared-types';
import { compositeExecutor } from './composite-executor';
import { cropExecutor } from './crop-executor';
import { exportExecutor } from './export-executor';
import { emptyInputExecutor } from './empty-input-executor';
import { loadImageExecutor } from './load-image-executor';
import { loadMaskExecutor } from './load-mask-executor';
import { applyMaskExecutor } from './apply-mask-executor';
import { transformExecutor } from './transform-executor';

export const nodeExecutors: Record<string, NodeExecutor> = {
  composite: compositeExecutor,
  crop: cropExecutor,
  export: exportExecutor,
  'empty-input': emptyInputExecutor,
  'load-image': loadImageExecutor,
  'load-mask': loadMaskExecutor,
  'apply-mask': applyMaskExecutor,
  transform: transformExecutor,
};
