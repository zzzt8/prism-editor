// Execution log types for tracking workflow execution lifecycle

export type ExecutionLogStatus = 'started' | 'completed' | 'failed' | 'cancelled';

export type NodeTimingStatus = 'pending' | 'running' | 'done' | 'error';

/** Timing and status information for a single node execution */
export interface NodeTiming {
  nodeId: string;
  nodeType: string;
  duration?: number; // in milliseconds
  status: NodeTimingStatus;
  startedAt?: number; // Unix timestamp ms
  completedAt?: number; // Unix timestamp ms
}

/** Error information for a failed node execution */
export interface ExecutionError {
  nodeId: string;
  error: string;
  timestamp: number; // Unix timestamp ms
}

/**
 * Execution log — records the complete lifecycle of a single workflow run.
 *
 * Stored in memory (in executionSlice) and optionally persisted via server.
 * This is the data model for P1-6 "Execution Log / Error Log / Node Timing Stats".
 */
export interface ExecutionLog {
  /** Unique identifier for this run */
  runId: string;
  /** Workflow being executed */
  workflowId: string;
  /** Published config ID (if this was a published workflow run) */
  publishedConfigId?: string;
  /** Execution inputs provided by the user */
  inputs: Record<string, unknown>;
  /** Execution outputs produced by the workflow */
  outputs: Record<string, unknown>;
  /** Overall execution status */
  status: ExecutionLogStatus;
  /** When the run started */
  startedAt: number; // Unix timestamp ms
  /** When the run completed (undefined if still running) */
  completedAt?: number; // Unix timestamp ms
  /** Total duration in milliseconds (computed on completion) */
  duration?: number;
  /** Per-node timing records */
  nodeTimings: NodeTiming[];
  /** Errors encountered during execution */
  errors: ExecutionError[];
}
