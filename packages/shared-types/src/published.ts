// PublishedWorkflow - the published state of a workflow

import type { PortType } from './node';

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
  internalParams: Record<string, unknown>;
  nodeConfigs: Record<string, {
    params: Record<string, unknown>;
  }>;
}

export interface PublishedWorkflow {
  id: string;
  sourceId: string;
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
