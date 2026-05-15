// runWorkflow - workflow execution service
//
// Exported functions:
//   execute(workflow, inputs, setRunState) - executes a published workflow
//   cancel() - cancels the current execution via AbortController

import type { PublishedWorkflow } from '@prism/shared-types';
import type { ExecutionProgress } from '@prism/shared-types';
import type { RunState } from './runStore';

export type RunStateSetter = (_state: RunState | ((_prev: RunState) => RunState)) => void;

// Module-level AbortController for the current execution
let _activeController: AbortController | null = null;

export async function execute(
  workflow: PublishedWorkflow,
  inputs: Record<string, unknown>,
  setRunState: RunStateSetter,
  exposedParams?: Record<string, Record<string, unknown>>
): Promise<void> {
  // Create a fresh AbortController for this run
  _activeController = new AbortController();
  setRunState({ status: 'running', progress: undefined, result: undefined, error: undefined });

  try {
    const nodeOps = await import('@prism/image-ops');
    const { PublishedWorkflowExecutor } = await import('@prism/workflow-core');

    const executor = new PublishedWorkflowExecutor(nodeOps.nodeExecutors);

    const result = await executor.execute(workflow, {
      inputs,
      exposedParams,
      signal: _activeController.signal,
      onProgress: (progress: ExecutionProgress) => {
        setRunState((prev) => ({ ...prev, progress }));
      },
    });

    if (result.status === 'done') {
      setRunState({ status: 'done', result: result.results, progress: undefined, error: undefined });
    } else if (result.status === 'cancelled') {
      setRunState({ status: 'cancelled', progress: undefined, result: undefined, error: undefined });
    } else {
      setRunState({ status: 'error', error: result.error ?? '执行失败', progress: undefined, result: undefined });
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      setRunState({ status: 'cancelled', progress: undefined, result: undefined, error: undefined });
    } else {
      console.error('[runWorkflow] execution error:', err);
      setRunState({ status: 'error', error: String(err), progress: undefined, result: undefined });
    }
  } finally {
    _activeController = null;
  }
}

export function cancel(): void {
  _activeController?.abort();
}
