// LocalStorageAdapter - MVP storage implementation using browser localStorage

import type { StorageAdapter, WorkflowMeta } from '@prism/shared-types';
import type { Workflow } from '@prism/shared-types';

const DEFAULT_PREFIX = 'prism:';

const LEGACY_WORKFLOW_PREFIX = 'prism:workflow:';
const LEGACY_META_PREFIX = 'prism:meta:';
const LEGACY_INDEX_KEY = 'prism:workflows';

export class LocalStorageAdapter implements StorageAdapter {
  private readonly prefix: string;

  constructor(prefix = DEFAULT_PREFIX) {
    this.prefix = prefix;
    this.runMigration();
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

  private migrationFlagKey(): string {
    return `${this.prefix}migration:1`;
  }

  private runMigration(): void {
    if (localStorage.getItem(this.migrationFlagKey()) === 'done') return;

    // Legacy format: workflow stored at 'prism:workflow:{id}' with no prism:meta:{id} entry
    const legacyKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(LEGACY_WORKFLOW_PREFIX)) {
        legacyKeys.push(key);
      }
    }

    for (const legacyKey of legacyKeys) {
      const id = legacyKey.replace(LEGACY_WORKFLOW_PREFIX, '');
      const existingMetaKey = `${this.prefix}meta:${id}`;

      // Skip if already migrated (new-format meta exists)
      if (localStorage.getItem(existingMetaKey) !== null) continue;

      try {
        const raw = localStorage.getItem(legacyKey);
        if (!raw) continue;

        const workflow = JSON.parse(raw) as Workflow;
        const now = new Date().toISOString();

        const meta: WorkflowMeta = {
          id,
          name: workflow.name,
          version: workflow.version,
          status: 'draft',
          createdAt: workflow.metadata?.createdAt ?? now,
          updatedAt: workflow.metadata?.updatedAt ?? now,
          description: workflow.metadata?.description,
        };

        // Store new-format meta alongside the existing workflow content key
        localStorage.setItem(existingMetaKey, JSON.stringify(meta));

        const ids = this.getStoredIds();
        if (!ids.includes(id)) {
          localStorage.setItem(this.indexKey(), JSON.stringify([...ids, id]));
        }
      } catch {
        // skip corrupted entries
      }
    }

    localStorage.setItem(this.migrationFlagKey(), 'done');
  }

  private getLegacyStoredIds(): string[] {
    const ids: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(LEGACY_WORKFLOW_PREFIX)) {
        ids.push(key.replace(LEGACY_WORKFLOW_PREFIX, ''));
      }
    }
    return ids;
  }

  async save(workflow: Workflow): Promise<void> {
    const existingMeta = await this.loadMeta(workflow.id).catch(() => null);
    const now = new Date().toISOString();

    const meta: WorkflowMeta = {
      id: workflow.id,
      name: workflow.name,
      version: workflow.version,
      status: existingMeta?.status ?? 'draft',
      createdAt: existingMeta?.createdAt ?? workflow.metadata?.createdAt ?? now,
      updatedAt: now,
      description: existingMeta?.description ?? workflow.metadata?.description,
      category: existingMeta?.category,
      icon: existingMeta?.icon,
    };

    localStorage.setItem(this.key(workflow.id), JSON.stringify(workflow));
    localStorage.setItem(this.metaKey(workflow.id), JSON.stringify(meta));

    const ids = this.getStoredIds();
    if (!ids.includes(workflow.id)) {
      localStorage.setItem(this.indexKey(), JSON.stringify([...ids, workflow.id]));
    }
  }

  async createWorkflow(
    name: string,
    description?: string,
    category?: string
  ): Promise<{ meta: WorkflowMeta; content: Workflow }> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const meta: WorkflowMeta = {
      id,
      name,
      version: '1.0.0',
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      description,
      category,
    };

    const content: Workflow = {
      id,
      name,
      version: '1.0.0',
      nodes: [],
      connections: [],
      inputs: [],
      outputs: [],
      metadata: { createdAt: now, updatedAt: now },
    };

    localStorage.setItem(this.key(id), JSON.stringify(content));
    localStorage.setItem(this.metaKey(id), JSON.stringify(meta));

    const ids = this.getStoredIds();
    localStorage.setItem(this.indexKey(), JSON.stringify([...ids, id]));

    return { meta, content };
  }

  async updateWorkflowMeta(id: string, patch: Partial<WorkflowMeta>): Promise<void> {
    const meta = await this.loadMeta(id);
    const updated: WorkflowMeta = { ...meta, ...patch, updatedAt: new Date().toISOString() };
    localStorage.setItem(this.metaKey(id), JSON.stringify(updated));
  }

  private async loadMeta(id: string): Promise<WorkflowMeta> {
    const raw = localStorage.getItem(this.metaKey(id));
    if (!raw) throw new Error(`Workflow meta not found: ${id}`);
    return JSON.parse(raw) as WorkflowMeta;
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
