/**
 * Type definitions for transform operations.
 */

import type { ImageData } from '@prism/shared-types'

/**
 * Options for image transformation.
 */
export interface TransformOptions {
  translateX?: number
  translateY?: number
  scaleX?: number
  scaleY?: number
  rotation?: number
  cropX?: number
  cropY?: number
  cropWidth?: number
  cropHeight?: number
}

/**
 * Transform input with image and options.
 */
export interface TransformInput {
  image: ImageData
  options?: TransformOptions
}

/**
 * Transform output with result ImageData.
 */
export interface TransformOutput {
  result: ImageData
}

/**
 * Platform executor interface for transform operations.
 */
export interface PlatformTransformExecutor {
  transform(_image: ImageData, _options: TransformOptions): ImageData
}
