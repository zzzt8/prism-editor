/**
 * OutputSink Interface
 *
 * Host-provided output sink — converts executor outputs to stable ImageRef.
 *
 * M3 scope: interface definition + test host implementation.
 * M4 scope: DevToolOutputSink, ComposerOutputSink.
 *
 * Responsibilities:
 * - Receive executor raw output (ImageData or ImageBitmap)
 * - Convert to stable ImageRef (data URL, blob URL, or CDN URL)
 * - Return ImageRef that can be serialized to RenderResult
 *
 * Constraints:
 * - Must NEVER return Blob/Canvas/ImageBitmap in RenderResult
 * - Blob URLs must have cleanup tracking
 */

import type { ImageRef } from '@prism/shared-types';

export interface OutputSink {
  /**
   * Publish an executor output to a stable reference.
   *
   * @param nodeId - Source node ID for audit
   * @param slot - Output slot name (from Flow.explicitOutputs)
   * @param output - Raw executor output (ImageData in browser memory)
   * @returns ImageRef suitable for RenderResult
   */
  publish(nodeId: string, slot: string, output: unknown): ImageRef;
}
