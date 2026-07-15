/**
 * Type definitions for composite operations.
 */

import type { ImageData } from '@prism/shared-types'
import type { BlendMode } from '@prism/shared-types'

/**
 * Options for image compositing.
 */
export interface CompositeOptions {
  blendMode?: BlendMode
  opacity?: number
  canvasWidth?: number
  canvasHeight?: number
  overlayX?: number
  overlayY?: number
}

/**
 * Composite input with base and overlay images.
 */
export interface CompositeInput {
  base: ImageData
  overlay: ImageData
  options?: CompositeOptions
}

/**
 * Composite output with result ImageData.
 */
export interface CompositeOutput {
  result: ImageData
}

/**
 * Platform executor interface for composite operations.
 * Each platform (browser/nodejs) implements this interface.
 */
export interface PlatformCompositeExecutor {
  execute(_base: ImageData, _overlay: ImageData, _options: CompositeOptions): ImageData
}
