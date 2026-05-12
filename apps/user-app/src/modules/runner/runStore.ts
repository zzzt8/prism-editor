// runStore - workflow execution state
//
// State: runState
// Actions: setRunState

import { create } from 'zustand';
import type { ExecutionProgress, PublishedWorkflowExecutionResult } from '@prism/shared-types';

export interface RunState {
  status: 'idle' | 'running' | 'cancelling' | 'done' | 'cancelled' | 'error';
  error?: string;
  result?: PublishedWorkflowExecutionResult;
  progress?: ExecutionProgress;
}

export interface RunStoreState {
  runState: RunState;
  setRunState: (state: RunState | ((prev: RunState) => RunState)) => void;
}

export const useRunStore = create<RunStoreState>((set) => {
  return {
    runState: { status: 'idle' },

    setRunState: function setRunState(stateOrUpdater: RunState | ((prev: RunState) => RunState)): void {
      set((state) => ({
        runState:
          typeof stateOrUpdater === 'function'
            ? stateOrUpdater(state.runState)
            : stateOrUpdater,
      }));
    },
  };
});
