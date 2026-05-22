// Storage adapter interface

import type { Workflow } from './workflow';

export interface WorkflowMeta {
  id: string;
  name: string;
  version: string;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
  description?: string;
  category?: string;
  icon?: string;
}

export interface StorageAdapter {
  save(workflow: Workflow): Promise<Workflow>;
  load(id: string): Promise<Workflow>;
  list(): Promise<WorkflowMeta[]>;
  delete(id: string): Promise<void>;
  createWorkflow(name: string, description?: string, category?: string): Promise<{ meta: WorkflowMeta; content: Workflow }>;
  updateWorkflowMeta(id: string, patch: Partial<WorkflowMeta>): Promise<void>;
  exportToJson(workflow: Workflow): Promise<string>;
  importFromJson(json: string): Promise<Workflow>;
}

export interface LocalStorageAdapterOptions {
  prefix?: string;
}

export interface JsonFileAdapter {
  exportToFile(workflow: Workflow): Promise<void>;
  importFromFile(file: File): Promise<Workflow>;
}
