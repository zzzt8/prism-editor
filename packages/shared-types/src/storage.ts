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
  save(_workflow: Workflow): Promise<Workflow>;
  load(_id: string): Promise<Workflow>;
  list(): Promise<WorkflowMeta[]>;
  delete(_id: string): Promise<void>;
  createWorkflow(_name: string, _description?: string, _category?: string): Promise<{ meta: WorkflowMeta; content: Workflow }>;
  updateWorkflowMeta(_id: string, _patch: Partial<WorkflowMeta>): Promise<void>;
  exportToJson(_workflow: Workflow): Promise<string>;
  importFromJson(_json: string): Promise<Workflow>;
}

export interface LocalStorageAdapterOptions {
  prefix?: string;
}

export interface JsonFileAdapter {
  exportToFile(_workflow: Workflow): Promise<void>;
  importFromFile(_file: File): Promise<Workflow>;
}
