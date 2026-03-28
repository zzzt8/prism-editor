// Execution store - manages workflow execution state
import { create } from 'zustand';
import type { NodeResult, ExecutionProgress, NodeStatus } from '../execution';

export type ExecutionStatus = 'idle' | 'running' | 'done' | 'error' | 'cancelled';

export interface ExecutionState {
  // Global status
  status: ExecutionStatus;
  
  // Workflow context
  workflowId: string | null;
  
  // Progress tracking
  totalNodes: number;
  completedNodes: number;
  currentNodeId: string | null;
  
  // Results
  results: NodeResult[];
  
  // Error tracking
  error: string | null;
  errorNodeId: string | null;
  
  // Abort control
  abortController: AbortController | null;
}

export interface ExecutionActions {
  // Lifecycle
  startExecution: (workflowId: string, nodeIds: string[]) => void;
  endExecution: (status: ExecutionStatus, error?: string) => void;
  
  // Progress tracking
  setCurrentNode: (nodeId: string) => void;
  completeNode: (result: NodeResult) => void;
  failNode: (nodeId: string, error: string) => void;
  incrementProgress: () => void;
  
  // Result access
  getNodeResult: (nodeId: string) => NodeResult | undefined;
  getAllResults: () => NodeResult[];
  clearResults: () => void;
  
  // Abort control
  abort: () => void;
  
  // Reset
  reset: () => void;
}

const initialState: ExecutionState = {
  status: 'idle',
  workflowId: null,
  totalNodes: 0,
  completedNodes: 0,
  currentNodeId: null,
  results: [],
  error: null,
  errorNodeId: null,
  abortController: null,
};

export const useExecutionStore = create<ExecutionState & ExecutionActions>((set, get) => ({
  ...initialState,

  // Lifecycle
  startExecution: (workflowId, nodeIds) => {
    const abortController = new AbortController();
    set({
      status: 'running',
      workflowId,
      totalNodes: nodeIds.length,
      completedNodes: 0,
      currentNodeId: null,
      results: [],
      error: null,
      errorNodeId: null,
      abortController,
    });
  },

  endExecution: (status, error) => {
    const { abortController } = get();
    set({
      status,
      error: error ?? null,
      currentNodeId: null,
      abortController: null,
    });
    // Don't abort after completion, just clear reference
    // abortController would be null anyway after endExecution call
  },

  // Progress tracking
  setCurrentNode: (nodeId) => set({ currentNodeId: nodeId }),

  completeNode: (result) => {
    set((state) => {
      const existingIndex = state.results.findIndex((r) => r.nodeId === result.nodeId);
      const newResults = existingIndex >= 0
        ? state.results.map((r, i) => (i === existingIndex ? result : r))
        : [...state.results, result];
      
      return {
        results: newResults,
        completedNodes: state.completedNodes + 1,
      };
    });
  },

  failNode: (nodeId, error) => {
    const result: NodeResult = {
      nodeId,
      status: 'error',
      outputs: {},
      error,
      startTime: Date.now(),
      endTime: Date.now(),
    };
    set((state) => ({
      results: [...state.results, result],
      status: 'error',
      error,
      errorNodeId: nodeId,
      currentNodeId: null,
    }));
  },

  incrementProgress: () => {
    set((state) => ({
      completedNodes: state.completedNodes + 1,
    }));
  },

  // Result access
  getNodeResult: (nodeId) => {
    return get().results.find((r) => r.nodeId === nodeId);
  },

  getAllResults: () => get().results,

  clearResults: () => set({ results: [] }),

  // Abort control
  abort: () => {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
    }
    set({
      status: 'cancelled',
      error: 'Execution cancelled by user',
      currentNodeId: null,
      abortController: null,
    });
  },

  // Reset
  reset: () => {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
    }
    set(initialState);
  },
}));

// Selectors
export const selectStatus = (state: ExecutionState & ExecutionActions) => state.status;
export const selectProgress = (state: ExecutionState & ExecutionActions) => ({
  current: state.completedNodes,
  total: state.totalNodes,
});
export const selectIsRunning = (state: ExecutionState & ExecutionActions) => state.status === 'running';
export const selectExecutionError = (state: ExecutionState & ExecutionActions) => state.error;
export const selectAbortSignal = (state: ExecutionState & ExecutionActions) => 
  state.abortController?.signal ?? null;
