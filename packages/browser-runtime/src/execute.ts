/**
 * Execute function stub for @prism/browser-runtime
 *
 * M3: Initial implementation will be added in T.3.3.2
 * This stub satisfies the package exports while the implementation is built.
 */

import type { RenderRequest, RenderResult } from '@prism/shared-types';
import type { BrowserRuntimeOptions, RuntimeExecutionOptions } from './types';

/**
 * Execute a RenderRequest in the browser.
 *
 * Input: complete RenderRequest (NOT designState + separate RenderOptions)
 * Output: RenderResult (M2 protocol, unchanged)
 *
 * @throws ValidationError on invalid RenderRequest
 * @throws FlowResolverError on resolution failure
 * @throws Error on executor failure
 *
 * @deprecated - Full implementation coming in T.3.3.2
 */
export async function execute(
  _request: RenderRequest,
  _options: BrowserRuntimeOptions,
  _runtimeOptions?: RuntimeExecutionOptions
): Promise<RenderResult> {
  throw new Error('execute() not yet implemented - see T.3.3.2');
}
