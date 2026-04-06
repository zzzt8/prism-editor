// runWorkflow - workflow execution service
//
// Exported functions:
//   execute(workflow, inputs, setRunState) - executes a published workflow
//   cancel() - cancels the current execution (placeholder)

import type { PublishedWorkflow } from '@prism/shared-types';
import type { ExecutionProgress } from '@prism/shared-types';
import type { RunState } from './runStore';

export type RunStateSetter = (state: RunState | ((prev: RunState) => RunState)) => void;

export async function execute(
  workflow: PublishedWorkflow,
  inputs: Record<string, unknown>,
  setRunState: RunStateSetter
): Promise<void> {
  setRunState({ status: 'running', progress: undefined, result: undefined, error: undefined });

  try {
    const nodeOps = await import('@prism/image-ops');
    const { PublishedWorkflowExecutor } = await import('@prism/workflow-core');

    const executor = new PublishedWorkflowExecutor(nodeOps.nodeExecutors);

    const result = await executor.execute(workflow, {
      inputs,
      onProgress: (progress: ExecutionProgress) => {
        setRunState((prev) => ({ ...prev, progress }));
      },
    });

    if (result.status === 'done') {
      setRunState({ status: 'done', result: result.results as Record<string, unknown>, progress: undefined, error: undefined });
    } else {
      setRunState({ status: 'error', error: result.error ?? '执行失败', progress: undefined, result: undefined });
    }
  } catch (err) {
    console.error('[runWorkflow] execution error:', err);
    setRunState({ status: 'error', error: String(err), progress: undefined, result: undefined });
  }
}

export function cancel(): void {
  console.warn('[runWorkflow] cancel not yet implemented');
}
