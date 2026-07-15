/**
 * Type definitions for mask operations.
 */

import type { ImageData } from '@prism/shared-types'

/**
 * Mask types supported by the system.
 */
export type MaskType = 'alpha' | 'brightness' | 'luminance'

/**
 * Options for mask application.
 */
export interface MaskOptions {
  type: MaskType
  threshold?: number
  invert?: boolean
}

/**
 * Mask input with image and mask data.
 */
export interface MaskInput {
  image: ImageData
  mask: ImageData
  options?: MaskOptions
}

/**
 * Mask output with result ImageData.
 */
export interface MaskOutput {
  result: ImageData
}

/**
 * Platform executor interface for mask operations.
 */
export interface PlatformMaskExecutor {
  apply(_image: ImageData, _mask: ImageData, _options: MaskOptions): ImageData
}
