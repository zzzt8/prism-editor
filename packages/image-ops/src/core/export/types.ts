/**
 * Type definitions for export operations.
 */

import type { ImageData } from '@prism/shared-types'

/**
 * Supported export formats.
 */
export type ExportFormat = 'png' | 'jpeg' | 'webp'

/**
 * Options for image export.
 */
export interface ExportOptions {
  format?: ExportFormat
  quality?: number
}

/**
 * Export input with image and options.
 */
export interface ExportInput {
  image: ImageData
  options?: ExportOptions
}

/**
 * Export output with raw buffer data.
 */
export interface ExportOutput {
  data: Buffer | Uint8Array
  format: ExportFormat
  width: number
  height: number
}

/**
 * Platform executor interface for export operations.
 */
export interface PlatformExportExecutor {
  export(_image: ImageData, _options: ExportOptions): Buffer | Uint8Array
}
