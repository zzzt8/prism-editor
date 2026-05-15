// executionSlice - manages workflow execution state
// Runtime state (not persisted)

export type ExecutionStatus = 'idle' | 'running' | 'done' | 'error' | 'cancelled';

export interface ExecutionSlice {
  // State
  _executionStatus: ExecutionStatus;
  _currentNodeId: string | null;
  _executionAbort: (() => void) | null;
  /** In-memory execution log (C5: execution-log pre-fill) */
  _executionLog: import('@prism/shared-types').ExecutionLog | null;

  // Operations
  startExecution: () => void;
  updateProgress: (nodeId: string | null) => void;
  finishExecution: (status: 'done' | 'error' | 'cancelled', error?: string) => void;
  cancelExecution: () => void;
  clearExecution: () => void;
  setAbortHandler: (abort: () => void) => void;
}

export function createExecutionSlice(): Pick<ExecutionSlice, keyof ExecutionSlice> {
  return {
    // Initial state
    _executionStatus: 'idle' as ExecutionStatus,
    _currentNodeId: null,
    _executionAbort: null,
    _executionLog: null,

    // Operations
    startExecution() {
      const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const log = {
        runId,
        workflowId: '' as string,
        inputs: {} as Record<string, unknown>,
        outputs: {} as Record<string, unknown>,
        status: 'started' as const,
        startedAt: Date.now(),
        nodeTimings: [] as import('@prism/shared-types').NodeTiming[],
        errors: [] as import('@prism/shared-types').ExecutionError[],
      };
      return {
        _executionStatus: 'running' as ExecutionStatus,
        _currentNodeId: null,
        _executionLog: log,
      };
    },

    updateProgress(_nodeId) {
      return _nodeId;
    },

    finishExecution(_status, _error) {
      return {
        _executionStatus: _status,
        _currentNodeId: null,
        _executionAbort: null,
      };
    },

    cancelExecution() {
      // Returns null to clear abort handler
      return null;
    },

    clearExecution() {
      return {
        _executionStatus: 'idle' as ExecutionStatus,
        _currentNodeId: null,
      };
    },

    setAbortHandler(_abort) {
      return _abort;
    },
  };
}
