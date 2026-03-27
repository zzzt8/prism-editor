// PublishedWorkflow - the published state of a workflow

import type { PortType } from './node';
import type { Connection } from './workflow';

export type PublishedParamVisibility = 'visible' | 'hidden' | 'locked';

export interface PublishedParamConfig {
  id: string;
  visibility: PublishedParamVisibility;
  lockedValue?: unknown;
}

export interface PublishedInput {
  id: string;
  name: string;
  type: PortType;
  required: boolean;
  description?: string;
  visible: boolean;
  defaultValue?: unknown;
}

export interface PublishedOutput {
  id: string;
  name: string;
  type: PortType;
  description?: string;
}

export interface PublishedConfig {
  /** Connections between nodes (needed to reconstruct Workflow at runtime) */
  connections?: Connection[];
  /**
   * Ordered list of node type entries.
   * key: topological index (0, 1, 2…) ensures stable publish across re-renders.
   * value: node type string (e.g. "load-image", "transform")
   */
  nodeTypes?: Record<string, string>;
  /**
   * Maps canvas node IDs (from the canvas store) to their topological index.
   * Used at runtime to resolve connection endpoints (which use canvas IDs)
   * back to index-keyed nodeTypes and nodeConfigs.
   */
  nodeIndexMap?: Record<string, string>;
  internalParams: Record<string, unknown>;
  nodeConfigs: Record<string, {
    params: Record<string, unknown>;
    _internalParams?: Record<string, unknown>;
  }>;
  /** Per-node, per-param visibility for the user-facing app */
  paramVisibility?: Record<string, Record<string, PublishedParamVisibility>>;
}

export interface PublishedWorkflow {
  id: string;
  sourceId: string;
  /** User-facing display name (may differ from sourceName) */
  name: string;
  description?: string;
  sourceName: string;
  version: string;
  inputs: PublishedInput[];
  outputs: PublishedOutput[];
  config: PublishedConfig;
  publishedAt: string;
  publishedBy?: string;
}

// Map of output-id -> execution result value (typed as unknown, validated at runtime)
export type PublishedWorkflowExecutionResult = Record<string, unknown>;

export interface PublishedWorkflowExecution {
  workflowId: string;
  inputs: Record<string, unknown>;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'done' | 'error';
  result?: PublishedWorkflowExecutionResult;
  error?: string;
}

export interface PublishOptions {
  hideInternalParams?: boolean;
  lockNodeConfigs?: boolean;
  customInputs?: Partial<PublishedInput>[];
  customOutputs?: Partial<PublishedOutput>[];
}
