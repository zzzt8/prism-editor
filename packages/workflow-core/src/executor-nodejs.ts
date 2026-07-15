// WorkflowExecutorNodeJs - Node.js specific workflow executor
//
// This executor is designed for server-side production rendering where
// image processing should use high-quality production assets and sharp library.
//
// Usage:
//   import { WorkflowExecutorNodeJs } from '@prism/workflow-core';
//   import { nodeExecutors } from '@prism/image-ops/nodejs';
//
//   const executor = new WorkflowExecutorNodeJs({ nodeExecutors });
//   const result = await executor.execute(workflow, options);

import { WorkflowExecutor, type WorkflowExecutorOptions, type ExecutorResult } from './executor';
import type { Workflow, NodeExecutor } from '@prism/shared-types';

export interface NodeJsExecutorOptions extends WorkflowExecutorOptions {
  /**
   * Node executors to use for execution.
   * For production Node.js rendering, pass executors from '@prism/image-ops/nodejs'.
   * For testing, pass mock executors.
   */
  nodeExecutors?: Record<string, NodeExecutor>;
}

export class WorkflowExecutorNodeJs {
  private executor: WorkflowExecutor;

  constructor(options: NodeJsExecutorOptions = {}) {
    const executors = options.nodeExecutors ?? {};
    this.executor = new WorkflowExecutor(executors);
  }

  register(type: string, fn: NodeExecutor): void {
    this.executor.register(type, fn);
  }

  getExecutor(type: string): NodeExecutor | undefined {
    return this.executor.getExecutor(type);
  }

  async execute(
    workflow: Workflow,
    options: WorkflowExecutorOptions = {}
  ): Promise<ExecutorResult> {
    return this.executor.execute(workflow, options);
  }

  // M2-C: Delegate executeFromDesignState from the wrapped WorkflowExecutor.
  // Both WorkflowExecutorNodeJs (server) and WorkflowExecutor (tests) expose the same
  // executeFromDesignState contract; only the nodeExecutors differ.
  async executeFromDesignState(
    designState: import('@prism/shared-types').DesignState,
    options: import('./executor').ExecuteFromDesignStateOptions = {},
  ): Promise<import('./executor').ExecuteFromDesignStateResult> {
    return this.executor.executeFromDesignState(designState, options);
  }
}

/**
 * Convenience function to execute a workflow with Node.js executors.
 *
 * @example
 * import { executeNodejs } from '@prism/workflow-core';
 * import { nodeExecutors } from '@prism/image-ops/nodejs';
 *
 * const result = await executeNodejs(workflow, { nodeExecutors }, options);
 */
export async function executeNodejs(
  workflow: Workflow,
  nodeExecutors: Record<string, NodeExecutor>,
  options: WorkflowExecutorOptions = {}
): Promise<ExecutorResult> {
  const executor = new WorkflowExecutorNodeJs({ nodeExecutors });
  return executor.execute(workflow, options);
}
