// Node.js executors — re-exports all nodejs-specific executors.

export { compositeExecutor } from './composite-executor';
export { cropExecutor } from './crop-executor';
export { exportExecutor } from './export-executor';

import type { NodeExecutor } from '@prism/shared-types';
import { compositeExecutor } from './composite-executor';
import { cropExecutor } from './crop-executor';
import { exportExecutor } from './export-executor';

export const nodeExecutors: Record<string, NodeExecutor> = {
  composite: compositeExecutor,
  crop: cropExecutor,
  export: exportExecutor,
};
