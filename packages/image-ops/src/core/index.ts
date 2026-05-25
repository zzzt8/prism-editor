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

// High-level compositing
export { compositeImages, type CompositeOptions } from './composite-math';
