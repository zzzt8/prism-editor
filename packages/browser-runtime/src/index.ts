/**
 * @prism/browser-runtime
 *
 * Headless browser execution package for rendering Product Templates.
 * Combines workflow-core with browser executors to provide UI-less rendering.
 *
 * This package:
 * - Accepts a complete RenderRequest (not scattered designState + options)
 * - Uses AssetResolver for input asset resolution
 * - Uses OutputSink for output publication
 * - Returns RenderResult matching M2 protocol
 *
 * @example
 * import { execute } from '@prism/browser-runtime';
 *
 * const result = await execute(renderRequest, {
 *   assetResolver,
 *   templateVersionResolver,
 *   outputSink,
 * });
 */

// Re-export types from shared-types
export type {
  RenderRequest,
  RenderResult,
  ImageRef,
  AssetRef,
  DesignState,
  Flow,
  ExecutionProgress,
} from '@prism/shared-types';

// Re-export interface types
export type { AssetResolver } from './interfaces/asset-resolver';
export type { OutputSink } from './interfaces/output-sink';
export type { TemplateVersionResolver } from './interfaces/template-version-resolver';
export type { BrowserRuntimeOptions, RuntimeExecutionOptions } from './types';

// Main execute function
export { execute, BrowserRuntimeError, BROWSER_RUNTIME_ERROR_CODES } from './execute';
export type { BrowserRuntimeErrorCode } from './execute';
