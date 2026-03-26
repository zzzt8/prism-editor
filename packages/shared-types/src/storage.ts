// Storage adapter interface

import type { Workflow } from './workflow';

export interface WorkflowMeta {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface StorageAdapter {
  save(workflow: Workflow): Promise<void>;
  load(id: string): Promise<Workflow>;
  list(): Promise<WorkflowMeta[]>;
  delete(id: string): Promise<void>;
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
