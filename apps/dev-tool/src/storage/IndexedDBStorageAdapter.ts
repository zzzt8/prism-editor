// IndexedDBStorageAdapter - storage implementation using IndexedDB
// Advantages over localStorage: ~50MB+ quota, async API, better performance

import type { StorageAdapter, WorkflowMeta, NodeDefinition, Connection } from '@prism/shared-types';
import type { Workflow } from '@prism/shared-types';
import { createId } from '@prism/shared-types';

const DB_NAME = 'prism-editor';
const DB_VERSION = 2; // Bump version for new stores
const STORE_WORKFLOWS = 'workflows';
const STORE_META = 'meta';
const STORE_INDEX = 'index';
const STORE_VERSIONS = 'versions';
const MAX_VERSION_RECORDS = 50;

// Version data structure
interface VersionRecord {
  id: string;
  workflowId: string;
  version: string;
  content: string;
  createdBy: string | null;
  createdAt: string;
}

export class IndexedDBStorageAdapter implements StorageAdapter {
  private db: IDBDatabase | null = null;
  private dbInitPromise: Promise<IDBDatabase> | null = null;

  private async getDb(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    if (this.dbInitPromise) return this.dbInitPromise;

    this.dbInitPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(new Error(`Failed to open IndexedDB: ${request.error}`));

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Workflows store - stores the full workflow content
        if (!db.objectStoreNames.contains(STORE_WORKFLOWS)) {
          db.createObjectStore(STORE_WORKFLOWS, { keyPath: 'id' });
        }

        // Meta store - stores workflow metadata
        if (!db.objectStoreNames.contains(STORE_META)) {
          const metaStore = db.createObjectStore(STORE_META, { keyPath: 'id' });
          metaStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Index store - stores the list of workflow IDs
        if (!db.objectStoreNames.contains(STORE_INDEX)) {
          db.createObjectStore(STORE_INDEX, { keyPath: 'key' });
        }

        // Versions store - stores workflow version history
        if (!db.objectStoreNames.contains(STORE_VERSIONS)) {
          const versionsStore = db.createObjectStore(STORE_VERSIONS, { keyPath: 'id' });
          versionsStore.createIndex('workflowId', 'workflowId', { unique: false });
          versionsStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });

    return this.dbInitPromise;
  }

  private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    const db = await this.getDb();
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  private async getAll<T>(storeName: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.getStore(storeName).then((store) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result as T[]);
        request.onerror = () => reject(new Error(`Failed to getAll from ${storeName}`));
      }).catch(reject);
    });
  }

  private async get<T>(storeName: string, key: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      this.getStore(storeName).then((store) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result as T | null);
        request.onerror = () => reject(new Error(`Failed to get ${key} from ${storeName}`));
      }).catch(reject);
    });
  }

  private async put(storeName: string, value: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
      this.getStore(storeName, 'readwrite').then((store) => {
        const request = store.put(value);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(`Failed to put into ${storeName}`));
      }).catch(reject);
    });
  }

  private async remove(storeName: string, key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.getStore(storeName, 'readwrite').then((store) => {
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(`Failed to delete ${key} from ${storeName}`));
      }).catch(reject);
    });
  }

  async save(workflow: Workflow): Promise<Workflow> {
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

    await this.put(STORE_WORKFLOWS, workflow);
    await this.put(STORE_META, meta);

    // Save version history
    await this.saveVersion(workflow);

    const ids = await this.getStoredIds();
    if (!ids.includes(workflow.id)) {
      await this.put(STORE_INDEX, { key: 'ids', ids: [...ids, workflow.id] });
    }

    return workflow;
  }

  async createWorkflow(
    name: string,
    description?: string,
    category?: string
  ): Promise<{ meta: WorkflowMeta; content: Workflow }> {
    const id = createId();
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

    await this.put(STORE_WORKFLOWS, content);
    await this.put(STORE_META, meta);

    const ids = await this.getStoredIds();
    await this.put(STORE_INDEX, { key: 'ids', ids: [...ids, id] });

    return { meta, content };
  }

  async updateWorkflowMeta(id: string, patch: Partial<WorkflowMeta>): Promise<void> {
    const meta = await this.loadMeta(id);
    const updated: WorkflowMeta = { ...meta, ...patch, updatedAt: new Date().toISOString() };
    await this.put(STORE_META, updated);
  }

  private async loadMeta(id: string): Promise<WorkflowMeta> {
    const meta = await this.get<WorkflowMeta>(STORE_META, id);
    if (!meta) throw new Error(`Workflow meta not found: ${id}`);
    return meta;
  }

  async load(id: string): Promise<Workflow> {
    const workflow = await this.get<Workflow>(STORE_WORKFLOWS, id);
    if (!workflow) throw new Error(`Workflow not found: ${id}`);
    return workflow;
  }

  async list(): Promise<WorkflowMeta[]> {
    const metas = await this.getAll<WorkflowMeta>(STORE_META);
    return metas.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async delete(id: string): Promise<void> {
    await this.remove(STORE_WORKFLOWS, id);
    await this.remove(STORE_META, id);

    const ids = await this.getStoredIds();
    await this.put(STORE_INDEX, { key: 'ids', ids: ids.filter((storedId) => storedId !== id) });
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

  private async getStoredIds(): Promise<string[]> {
    const index = await this.get<{ key: string; ids: string[] }>(STORE_INDEX, 'ids');
    return index?.ids ?? [];
  }

  // Save a new version of the workflow
  private async saveVersion(workflow: Workflow): Promise<void> {
    const id = createId();
    const version: VersionRecord = {
      id,
      workflowId: workflow.id,
      version: workflow.version,
      content: JSON.stringify(workflow),
      createdBy: null,
      createdAt: new Date().toISOString(),
    };
    await this.put(STORE_VERSIONS, version);

    // Cleanup old versions, keep only the most recent MAX_VERSION_RECORDS per workflow
    await this.pruneOldVersions(workflow.id);
  }

  // Prune old versions to stay within MAX_VERSION_RECORDS limit
  private async pruneOldVersions(workflowId: string): Promise<void> {
    const allVersions = await this.getAll<VersionRecord>(STORE_VERSIONS);
    const workflowVersions = allVersions
      .filter((v) => v.workflowId === workflowId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (workflowVersions.length > MAX_VERSION_RECORDS) {
      const toDelete = workflowVersions.slice(MAX_VERSION_RECORDS);
      for (const v of toDelete) {
        await this.remove(STORE_VERSIONS, v.id);
      }
    }
  }

  // Get versions for a workflow (paginated)
  async getVersions(workflowId: string, page = 1, limit = 20): Promise<{
    data: Array<{ id: string; version: string; createdBy: string | null; createdAt: string }>;
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const allVersions = await this.getAll<VersionRecord>(STORE_VERSIONS);
    const filtered = allVersions
      .filter((v) => v.workflowId === workflowId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit).map((v) => ({
      id: v.id,
      version: v.version,
      createdBy: v.createdBy,
      createdAt: v.createdAt,
    }));

    return { data, pagination: { page, limit, total, totalPages } };
  }

  // Get version content by ID
  async getVersionContent(workflowId: string, versionId: string): Promise<{
    id: string;
    version: string;
    content: string;
    createdBy: string | null;
    createdAt: string;
  }> {
    const version = await this.get<VersionRecord>(STORE_VERSIONS, versionId);
    if (!version) throw new Error(`Version not found: ${versionId}`);
    return {
      id: version.id,
      version: version.version,
      content: version.content,
      createdBy: version.createdBy,
      createdAt: version.createdAt,
    };
  }

  // Rollback workflow to a specific version
  async rollbackWorkflow(workflowId: string, versionId: string, newVersion?: string): Promise<void> {
    const version = await this.get<VersionRecord>(STORE_VERSIONS, versionId);
    if (!version) throw new Error(`Version not found: ${versionId}`);

    const workflow = JSON.parse(version.content) as Workflow;
    if (newVersion) {
      workflow.version = newVersion;
    }
    await this.save(workflow);
  }

  // Compare two versions
  async diffVersions(workflowId: string, fromId: string, toId: string): Promise<{
    from: { id: string; version: string; createdAt: string };
    to: { id: string; version: string; createdAt: string };
    nodes: { added: NodeDefinition[]; removed: NodeDefinition[]; modified: NodeDefinition[] };
    connections: { added: Connection[]; removed: Connection[]; modified: Connection[] };
  }> {
    const fromVersion = await this.get<VersionRecord>(STORE_VERSIONS, fromId);
    const toVersion = await this.get<VersionRecord>(STORE_VERSIONS, toId);

    if (!fromVersion) throw new Error(`Version not found: ${fromId}`);
    if (!toVersion) throw new Error(`Version not found: ${toId}`);

    const fromWorkflow = JSON.parse(fromVersion.content) as Workflow;
    const toWorkflow = JSON.parse(toVersion.content) as Workflow;

    // Simple diff implementation
    const fromNodeIds = new Set(fromWorkflow.nodes.map((n) => n.id));
    const toNodeIds = new Set(toWorkflow.nodes.map((n) => n.id));
    const fromConnIds = new Set(fromWorkflow.connections.map((c) => c.id));
    const toConnIds = new Set(toWorkflow.connections.map((c) => c.id));

    const nodesAdded = toWorkflow.nodes.filter((n) => !fromNodeIds.has(n.id)) as unknown as NodeDefinition[];
    const nodesRemoved = fromWorkflow.nodes.filter((n) => !toNodeIds.has(n.id)) as unknown as NodeDefinition[];
    const nodesModified = toWorkflow.nodes.filter((toNode) => {
      const fromNode = fromWorkflow.nodes.find((n) => n.id === toNode.id);
      if (!fromNode) return false;
      return JSON.stringify(fromNode) !== JSON.stringify(toNode);
    }) as unknown as NodeDefinition[];

    const connsAdded = toWorkflow.connections.filter((c) => !fromConnIds.has(c.id));
    const connsRemoved = fromWorkflow.connections.filter((c) => !toConnIds.has(c.id));
    const connsModified = toWorkflow.connections.filter((toConn) => {
      const fromConn = fromWorkflow.connections.find((c) => c.id === toConn.id);
      if (!fromConn) return false;
      return JSON.stringify(fromConn) !== JSON.stringify(toConn);
    });

    return {
      from: { id: fromVersion.id, version: fromVersion.version, createdAt: fromVersion.createdAt },
      to: { id: toVersion.id, version: toVersion.version, createdAt: toVersion.createdAt },
      nodes: { added: nodesAdded, removed: nodesRemoved, modified: nodesModified },
      connections: { added: connsAdded, removed: connsRemoved, modified: connsModified },
    };
  }

  // Migration helper: import workflows from localStorage
  async migrateFromLocalStorage(): Promise<{ migrated: number; failed: number }> {
    const _LEGACY_PREFIX = 'prism:';
    const LEGACY_WORKFLOW_PREFIX = 'prism:workflow:';
    const LEGACY_META_PREFIX = 'prism:meta:';

    let migrated = 0;
    let failed = 0;

    // Migrate workflows
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      if (key.startsWith(LEGACY_WORKFLOW_PREFIX) && !key.startsWith(LEGACY_META_PREFIX)) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const workflow = JSON.parse(raw) as Workflow;
            await this.put(STORE_WORKFLOWS, workflow);
            migrated++;
          }
        } catch {
          failed++;
        }
      }

      if (key.startsWith(LEGACY_META_PREFIX)) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const meta = JSON.parse(raw) as WorkflowMeta;
            await this.put(STORE_META, meta);
          }
        } catch {
          failed++;
        }
      }
    }

    return { migrated, failed };
  }
}

// Singleton instance
export const indexedDBStorageAdapter = new IndexedDBStorageAdapter();
