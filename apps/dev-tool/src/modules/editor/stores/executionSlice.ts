// executionSlice - manages workflow execution state
// Runtime state (not persisted)

export type ExecutionStatus = 'idle' | 'running' | 'done' | 'error' | 'cancelled';

export interface ExecutionSlice {
  // State
  _executionStatus: ExecutionStatus;
  _currentNodeId: string | null;
  _executionAbort: (() => void) | null;

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

    // Operations
    startExecution() {
      return {
        _executionStatus: 'running' as ExecutionStatus,
        _currentNodeId: null,
      };
    },

    updateProgress(nodeId) {
      return nodeId;
    },

    finishExecution(status, error) {
      return {
        _executionStatus: status,
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

    setAbortHandler(abort) {
      return abort;
    },
  };
}
