/**
 * Browser platform executors - Canvas 2D implementation.
 *
 * This module re-exports all browser-specific executors.
 * Each executor wraps core algorithms with Canvas 2D API.
 *
 * @example
 * import { compositeExecutor } from '@prism/image-ops/browser';
 */

export { compositeExecutor } from './CompositeExecutor';
export { maskExecutor } from './MaskExecutor';
export { transformExecutor } from './TransformExecutor';
export { exportExecutor } from './ExportExecutor';

import type { NodeExecutor } from '@prism/shared-types';
import { compositeExecutor } from './CompositeExecutor';
import { maskExecutor } from './MaskExecutor';
import { transformExecutor } from './TransformExecutor';
import { exportExecutor } from './ExportExecutor';

export const browserExecutors: Record<string, NodeExecutor> = {
  composite: compositeExecutor,
  'apply-mask': maskExecutor,
  transform: transformExecutor,
  export: exportExecutor,
};
