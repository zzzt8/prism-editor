// runWorkflow - workflow execution service
//
// Exported functions:
//   execute(workflow, inputs, setRunState) - executes a published workflow
//   cancel() - cancels the current execution via AbortController

import type { PublishedWorkflow, ExecutionLog, NodeTiming } from '@prism/shared-types';
import type { ExecutionProgress } from '@prism/shared-types';
import { createId } from '@prism/shared-types';
import type { RunState } from './runStore';

export type RunStateSetter = (_state: RunState | ((_prev: RunState) => RunState)) => void;

export interface ExecuteOptions {
  onLog?: (_log: ExecutionLog) => void;
}

// Module-level AbortController for the current execution
let _activeController: AbortController | null = null;

// Module-level execution log tracking
let _currentLog: ExecutionLog | null = null;
const _nodeStartTimes = new Map<string, number>();

export async function execute(
  workflow: PublishedWorkflow,
  inputs: Record<string, unknown>,
  setRunState: RunStateSetter,
  exposedParams?: Record<string, Record<string, unknown>>,
  options?: ExecuteOptions
): Promise<void> {
  // Create a fresh AbortController for this run
  _activeController = new AbortController();
  setRunState({ status: 'running', progress: undefined, result: undefined, error: undefined });

  // Initialize execution log
  const startedAt = Date.now();
  _currentLog = {
    runId: createId(),
    workflowId: workflow.id,
    inputs,
    outputs: {},
    status: 'started',
    startedAt,
    nodeTimings: [],
    errors: [],
  };
  _nodeStartTimes.clear();

  const progressCallback = (progress: ExecutionProgress) => {
    // Record node timing on progress
    if (_currentLog && progress.currentNodeId) {
      const now = Date.now();
      const startTime = _nodeStartTimes.get(progress.currentNodeId) ?? now;

      // Find node type from workflow
      const nodeType = workflow.config.nodeTypes?.[progress.currentNodeId] ?? 'unknown';

      const existingIdx = _currentLog.nodeTimings.findIndex(
        (t) => t.nodeId === progress.currentNodeId
      );
      const timingStatus = (() => {
        if (progress.results.find((r) => r.nodeId === progress.currentNodeId && r.status === 'done')) return 'done';
        if (progress.results.find((r) => r.nodeId === progress.currentNodeId && r.status === 'error')) return 'error';
        return 'running';
      })();

      const timing: NodeTiming = {
        nodeId: progress.currentNodeId,
        nodeType,
        duration: now - startTime,
        status: timingStatus,
        startedAt: startTime,
        completedAt: timingStatus === 'done' || timingStatus === 'error' ? now : undefined,
      };

      if (existingIdx >= 0) {
        _currentLog.nodeTimings[existingIdx] = timing;
      } else {
        _currentLog.nodeTimings.push(timing);
        _nodeStartTimes.set(progress.currentNodeId, now);
      }
    }

    setRunState((prev) => ({ ...prev, progress }));
  };

  try {
    const nodeOps = await import('@prism/image-ops');
    const { PublishedWorkflowExecutor } = await import('@prism/workflow-core');

    const executor = new PublishedWorkflowExecutor(nodeOps.nodeExecutors);

    const result = await executor.execute(workflow, {
      inputs,
      exposedParams,
      signal: _activeController.signal,
      onProgress: progressCallback,
    });

    // Finalize execution log
    if (_currentLog) {
      const completedAt = Date.now();
      _currentLog.completedAt = completedAt;
      _currentLog.duration = completedAt - _currentLog.startedAt;
      _currentLog.status = result.status === 'done' ? 'completed'
        : result.status === 'error' ? 'failed'
        : 'cancelled';
      _currentLog.outputs = result.results as Record<string, unknown>;

      if (result.error) {
        _currentLog.errors.push({
          nodeId: '',
          error: result.error,
          timestamp: completedAt,
        });
      }

      options?.onLog?.(_currentLog);
      _currentLog = null;
      _nodeStartTimes.clear();
    }

    if (result.status === 'done') {
      setRunState({ status: 'done', result: result.results, progress: undefined, error: undefined });
    } else if (result.status === 'cancelled') {
      setRunState({ status: 'cancelled', progress: undefined, result: undefined, error: undefined });
    } else {
      setRunState({ status: 'error', error: result.error ?? '执行失败', progress: undefined, result: undefined });
    }
  } catch (err) {
    // Finalize execution log on error
    if (_currentLog) {
      const completedAt = Date.now();
      _currentLog.completedAt = completedAt;
      _currentLog.duration = completedAt - _currentLog.startedAt;
      _currentLog.status = 'failed';
      _currentLog.errors.push({
        nodeId: '',
        error: err instanceof Error ? err.message : String(err),
        timestamp: completedAt,
      });
      options?.onLog?.(_currentLog);
      _currentLog = null;
      _nodeStartTimes.clear();
    }

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
