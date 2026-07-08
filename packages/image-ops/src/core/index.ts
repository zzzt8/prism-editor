/**
 * Core layer: pure image compositing functions.
 *
 * @example
 * import { compositeImages, detectAlphaFormat } from '@prism/image-ops/core';
 */

// Alpha format detection
export { detectAlphaFormat, unPremultiply } from './alpha-format';

// Blend mode formulas
export { blendPixel, clamp } from './blend-modes';

// Porter-Duff compositing
export { compositePixel } from './porter-duff';

// High-level compositing (re-export from composite-math for backward compatibility)
export { compositeImages, type CompositeOptions } from './composite-math';

// Subdirectory exports (Phase 1.2 architecture)
export * from './composite/types';
export * from './composite/composite'; // Re-export for new architecture
export * from './mask/types';
export * from './mask/mask'; // Re-export for new architecture
export * from './transform/types';
export * from './export/types';
