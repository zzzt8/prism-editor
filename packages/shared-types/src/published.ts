// PublishedWorkflow - the published state of a workflow

import type { PortType } from './node';
import type { Connection } from './workflow';

/** Minimal metadata for listing published workflows */
export interface PublishedWorkflowMeta {
  sourceId: string;
  publishedId: string;
  name: string;
  description?: string;
  sourceName: string;
  version: string;
  publishedAt: string;
  inputCount: number;
  outputCount: number;
}

/** Export format options for published output nodes */
export type ExportFormat = 'png' | 'jpeg' | 'webp';

/** Control type for user-facing parameter widgets */
export type ParamControlType = 'select' | 'number' | 'string' | 'boolean' | 'image-file';

/** Validation rules for a published parameter */
export interface PublishedParamValidation {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
}

/**
 * Full parameter definition for a published exposed param.
 * Richer than PublishedParamConfig — carries UI metadata for user-app rendering.
 */
export interface PublishedParamDefinition {
  nodeId: string;
  paramId: string;
  label: string;
  controlType: ParamControlType;
  options?: Array<{ label: string; value: unknown }>;
  defaultValue?: unknown;
  validation?: PublishedParamValidation;
  visibility?: 'visible' | 'hidden' | 'locked';
  description?: string;
}

/**
 * Configuration for a single user-facing input entry in the published workflow.
 * Represents a source node (e.g. load-image) that the end user must provide.
 */
export interface PublishedInputConfig {
  /** Canvas node ID (UUID, stable across re-publishes) */
  nodeId: string;
  /** Developer-assigned user-facing label shown in the user app (e.g. "产品白底图") */
  label: string;
  /** Type of the input content */
  type: 'image' | 'mask' | 'string';
}

/**
 * Configuration for a single exposed parameter in the published workflow.
 * Represents a parameter that the developer has explicitly opted to expose to end users.
 */
export interface PublishedParamConfig {
  /** Canvas node ID (UUID) */
  nodeId: string;
  /** Parameter ID from the node definition (e.g. "opacity", "mode") */
  paramId: string;
  /** Developer-assigned user-facing label (e.g. "透明度") */
  label: string;
}

/**
 * Configuration for a single output entry in the published workflow.
 * Represents an export/leaf node that produces the final result shown to the user.
 */
export interface PublishedOutputConfig {
  /** Canvas node ID (UUID, stable across re-publishes) */
  nodeId: string;
  /** Developer-assigned user-facing label shown in the user app (e.g. "生成结果图") */
  label: string;
  /** Export format; defaults to 'png' */
  format: ExportFormat;
}

export type PublishedParamVisibility = 'visible' | 'hidden' | 'locked';

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
   * Node type registry: canvas nodeId (UUID) → node type string.
   * Keyed by UUID for stability across re-publishes.
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

  // ── New fields (v2 publish dialog) ──────────────────────────────────────

  /** Auto-detected source nodes that the end user must provide */
  inputs: PublishedInputConfig[];
  /** Explicitly white-listed parameters exposed to the end user */
  exposedParams: PublishedParamConfig[];
  /** Auto-detected output nodes that produce the final result */
  outputs: PublishedOutputConfig[];

  /** Rich parameter definitions for exposed params (includes UI metadata) */
  paramDefinitions?: PublishedParamDefinition[];

  // ── Custom node packages ─────────────────────────────────────────────────

  /**
   * Node packages required by this workflow.
   * Maps package name → { version, url? }
   * If url is provided, the package can be loaded from that URL.
   * Otherwise, the user app should prompt the user to import the package.
   */
  requiredNodes?: Record<string, { version: string; url?: string }>;
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
  /** Target platform for workflow execution */
  targetPlatform?: 'browser' | 'nodejs';
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
