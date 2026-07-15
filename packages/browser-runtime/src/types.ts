/**
 * Browser Runtime Types
 */

import type { AssetResolver } from './interfaces/asset-resolver';
import type { OutputSink } from './interfaces/output-sink';
import type { TemplateVersionResolver } from './interfaces/template-version-resolver';
import type { ExecutionProgress } from '@prism/shared-types';

export { type ExecutionProgress };

export interface BrowserRuntimeOptions {
  /**
   * Resolves AssetRef from DesignState.inputs.assets to browser-compatible ImageData.
   * Only handles INPUT assets — does NOT generate previews or manage UI state.
   */
  assetResolver: AssetResolver;

  /**
   * Resolves TemplateVersion for given templateId + version.
   * Must be provided explicitly — no implicit fallback.
   */
  templateVersionResolver: TemplateVersionResolver;

  /**
   * Publishes executor outputs to stable ImageRef.
   * Only handles OUTPUT — does NOT resolve input assets.
   */
  outputSink: OutputSink;
}

export interface RuntimeExecutionOptions {
  /**
   * Abort signal to cancel the execution.
   */
  signal?: AbortSignal;

  /**
   * Progress callback for long-running executions.
   */
  onProgress?: (progress: ExecutionProgress) => void;
}
