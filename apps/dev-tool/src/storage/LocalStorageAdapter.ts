// LocalStorageAdapter - MVP storage implementation using browser localStorage

import type { StorageAdapter, WorkflowMeta } from '@prism/shared-types';
import type { Workflow } from '@prism/shared-types';

const DEFAULT_PREFIX = 'prism:';

export class LocalStorageAdapter implements StorageAdapter {
  private readonly prefix: string;

  constructor(prefix = DEFAULT_PREFIX) {
    this.prefix = prefix;
  }

  private key(id: string): string {
    return `${this.prefix}workflow:${id}`;
  }

  private metaKey(id: string): string {
    return `${this.prefix}meta:${id}`;
  }

  private indexKey(): string {
    return `${this.prefix}workflows`;
  }

  async save(workflow: Workflow): Promise<void> {
    const meta: WorkflowMeta = {
      id: workflow.id,
      name: workflow.name,
      description: workflow.metadata.description,
      tags: workflow.metadata.tags,
      createdAt: workflow.metadata.createdAt,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(this.key(workflow.id), JSON.stringify(workflow));
    localStorage.setItem(this.metaKey(workflow.id), JSON.stringify(meta));

    // Update index
    const ids = this.getStoredIds();
    if (!ids.includes(workflow.id)) {
      ids.push(workflow.id);
      localStorage.setItem(this.indexKey(), JSON.stringify(ids));
    }
  }

  async load(id: string): Promise<Workflow> {
    const raw = localStorage.getItem(this.key(id));
    if (!raw) {
      throw new Error(`Workflow not found: ${id}`);
    }
    return JSON.parse(raw) as Workflow;
  }

  async list(): Promise<WorkflowMeta[]> {
    const ids = this.getStoredIds();
    const metas: WorkflowMeta[] = [];

    for (const id of ids) {
      const raw = localStorage.getItem(this.metaKey(id));
      if (raw) {
        try {
          metas.push(JSON.parse(raw) as WorkflowMeta);
        } catch {
          // skip corrupted entries
        }
      }
    }

    return metas.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async delete(id: string): Promise<void> {
    localStorage.removeItem(this.key(id));
    localStorage.removeItem(this.metaKey(id));

    const ids = this.getStoredIds().filter((storedId) => storedId !== id);
    localStorage.setItem(this.indexKey(), JSON.stringify(ids));
  }

  async exportToJson(workflow: Workflow): Promise<string> {
    return JSON.stringify(workflow, null, 2);
  }

  async importFromJson(json: string): Promise<Workflow> {
    try {
      const parsed = JSON.parse(json);
      if (!parsed.id || !parsed.name || !Array.isArray(parsed.nodes)) {
        throw new Error('Invalid workflow JSON');
      }
      return parsed as Workflow;
    } catch {
      throw new Error('Failed to parse workflow JSON');
    }
  }

  private getStoredIds(): string[] {
    const raw = localStorage.getItem(this.indexKey());
    if (!raw) return [];
    try {
      const ids = JSON.parse(raw);
      return Array.isArray(ids) ? ids : [];
    } catch {
      return [];
    }
  }
}

// Singleton instance for use across the app
export const localStorageAdapter = new LocalStorageAdapter();
