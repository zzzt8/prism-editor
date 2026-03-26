// Workflow data structures (nodes, connections, inputs, outputs)

import type { PortType } from './node';

export interface Position {
  x: number;
  y: number;
}

export interface Port {
  id: string;
  name: string;
  type: PortType;
}

export interface Connection {
  id: string;
  from: {
    nodeId: string;
    port: string;
  };
  to: {
    nodeId: string;
    port: string;
  };
}

export interface WorkflowInput {
  id: string;
  name: string;
  type: PortType;
  required: boolean;
  defaultValue?: unknown;
}

export interface WorkflowOutput {
  id: string;
  name: string;
  type: PortType;
}

export interface WorkflowMetadata {
  description?: string;
  author?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Workflow {
  id: string;
  name: string;
  version: string;
  nodes: WorkflowNode[];
  connections: Connection[];
  inputs: WorkflowInput[];
  outputs: WorkflowOutput[];
  metadata: WorkflowMetadata;
}

export interface WorkflowNode {
  id: string;
  type: string;
  position: Position;
  params: Record<string, unknown>;
}
