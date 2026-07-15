/**
 * @prism/image-ops/browser
 *
 * Browser-only entry point — exports ONLY browser executors and helpers.
 * Does NOT export Sharp, Node executors, or any Node.js built-ins.
 *
 * Usage:
 * ```typescript
 * import { browserExecutors, createCanvas } from '@prism/image-ops/browser';
 * ```
 *
 * This entry point is suitable for:
 * - @prism/browser-runtime (M3)
 * - Browser-only applications
 * - Chromium test hosts
 *
 * DO NOT use this entry point in:
 * - Server-side rendering
 * - Node.js production workflows
 * - Applications requiring Sharp
 */

// Browser executors
export { browserExecutors } from './browser/index';
export { compositeExecutor } from './browser/CompositeExecutor';

// Canvas utilities
export {
  createCanvas,
  makeImageData,
  getImageData,
  putImageData,
} from './browser/canvas-utils';

// Preview strategy
export {
  generatePreviewUrl,
  lazyPreviewStrategy,
  eagerPreviewStrategy,
  createPreviewStrategy,
  type PreviewStrategy,
  type PreviewRef,
} from './preview-strategy';

// Re-export core algorithms for reference (pure, no platform deps)
export {
  compositeImages,
  type CompositeOptions,
} from './core/composite/composite';
export { applyMask } from './core/mask/mask';
export { blendPixel, clamp } from './core/blend-modes';
