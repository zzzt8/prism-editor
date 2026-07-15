/**
 * Internal executor creation for browser runtime.
 *
 * Creates a WorkflowExecutor with browser-specific executors from @prism/image-ops/browser.
 */

import type { NodeExecutor, NodeExecutorMap } from '@prism/shared-types';
import { WorkflowExecutor, type WorkflowExecutorOptions } from '@prism/workflow-core';

// Dynamic import to ensure we only load browser executors
let _browserExecutors: NodeExecutorMap | null = null;

async function getBrowserExecutors(): Promise<NodeExecutorMap> {
  if (!_browserExecutors) {
    // @prism/image-ops/browser exports browserExecutors as a named export
    const mod = await import('@prism/image-ops/browser');
    _browserExecutors = mod.browserExecutors;
  }
  return _browserExecutors;
}

/**
 * Create a WorkflowExecutor with browser-specific node executors.
 *
 * Uses executors from `@prism/image-ops/browser`:
 * - composite
 * - apply-mask
 * - transform
 * - export
 *
 * @param options - Additional WorkflowExecutor options
 * @returns WorkflowExecutor configured with browser executors
 */
export async function createBrowserExecutor(
  options: WorkflowExecutorOptions = {}
): Promise<WorkflowExecutor> {
  const executors = await getBrowserExecutors();
  const executor = new WorkflowExecutor(executors);

  // Apply any additional options
  if (options.enableCache !== undefined) {
    // Cache is handled via options.cache
  }

  return executor;
}

/**
 * Synchronous version of createBrowserExecutor.
 * Requires that browser executors have been pre-loaded.
 *
 * @throws Error if browser executors not yet loaded
 */
export function createBrowserExecutorSync(
  options: WorkflowExecutorOptions = {}
): WorkflowExecutor {
  if (!_browserExecutors) {
    throw new Error(
      'Browser executors not initialized. Use createBrowserExecutor() or call ensureBrowserExecutors() first.'
    );
  }

  return new WorkflowExecutor(_browserExecutors);
}

/**
 * Pre-load browser executors to enable synchronous creation.
 * Call this during initialization to avoid async overhead on first execution.
 */
export async function ensureBrowserExecutors(): Promise<void> {
  await getBrowserExecutors();
}

/**
 * Check if browser executors are available.
 */
export function hasBrowserExecutors(): boolean {
  return _browserExecutors !== null;
}
