// runStore - workflow execution state
//
// State: runState
// Actions: setRunState

import { create } from 'zustand';
import type { ExecutionProgress, PublishedWorkflowExecutionResult, ExecutionLog } from '@prism/shared-types';

export interface RunState {
  status: 'idle' | 'running' | 'cancelling' | 'done' | 'cancelled' | 'error';
  error?: string;
  result?: PublishedWorkflowExecutionResult;
  progress?: ExecutionProgress;
}

export interface RunStoreState {
  runState: RunState;
  executionLogs: ExecutionLog[];
  setRunState: (state: RunState | ((prev: RunState) => RunState)) => void;
  addExecutionLog: (log: ExecutionLog) => void;
  exportExecutionLogs: () => string;
  downloadExecutionLogs: () => void;
}

export const useRunStore = create<RunStoreState>((set, get) => {
  return {
    runState: { status: 'idle' },
    executionLogs: [],

    setRunState: function setRunState(stateOrUpdater: RunState | ((prev: RunState) => RunState)): void {
      set((state) => ({
        runState:
          typeof stateOrUpdater === 'function'
            ? stateOrUpdater(state.runState)
            : stateOrUpdater,
      }));
    },

    addExecutionLog(_log: ExecutionLog): void {
      set((state) => ({
        executionLogs: [...state.executionLogs, _log],
      }));
    },

    exportExecutionLogs(): string {
      const logs = get().executionLogs;
      const exportData = {
        exportedAt: new Date().toISOString(),
        totalRuns: logs.length,
        logs: logs.map((log) => ({
          runId: log.runId,
          status: log.status,
          startedAt: new Date(log.startedAt).toISOString(),
          completedAt: log.completedAt ? new Date(log.completedAt).toISOString() : null,
          duration: log.duration ? `${log.duration}ms` : null,
          nodeTimings: log.nodeTimings.map((t) => ({
            nodeId: t.nodeId,
            nodeType: t.nodeType,
            status: t.status,
            duration: t.duration ? `${t.duration}ms` : null,
            startedAt: t.startedAt ? new Date(t.startedAt).toISOString() : null,
            completedAt: t.completedAt ? new Date(t.completedAt).toISOString() : null,
          })),
          errors: log.errors,
          inputs: log.inputs,
          outputs: Object.fromEntries(
            Object.entries(log.outputs).map(([k, v]) => {
              // Replace non-serializable values with a description
              if (v && typeof v === 'object') {
                if ('previewUrl' in (v as Record<string, unknown>)) {
                  return [k, '[image preview]'];
                }
                if ('data' in (v as Record<string, unknown>) || 'image' in (v as Record<string, unknown>)) {
                  return [k, '[image data]'];
                }
              }
              return [k, v];
            })
          ),
        })),
      };
      try {
        return JSON.stringify(exportData, null, 2);
      } catch {
        return JSON.stringify({ ...exportData, logs: '[serialization error]' }, null, 2);
      }
    },

    downloadExecutionLogs(): void {
      const json = get().exportExecutionLogs();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `execution-logs-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  };
});
