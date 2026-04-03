import type { StorageAdapter, WorkflowMeta } from '@prism/shared-types';
import type { Workflow } from '@prism/shared-types';
import { ApiStorageAdapter } from './ApiStorageAdapter';
import { localStorageAdapter } from './LocalStorageAdapter';

const API_CHECK_INTERVAL = 30000; // 30 seconds
const API_CHECK_KEY = 'prism_api_available';

export class MigrationStorageAdapter implements StorageAdapter {
  private apiAdapter: ApiStorageAdapter;
  private isApiAvailable: boolean = false;
  private checkInterval: ReturnType<typeof setInterval> | null = null;

  constructor(baseUrl: string = '/api') {
    this.apiAdapter = new ApiStorageAdapter(baseUrl);
  }

  async init(): Promise<void> {
    // Cleanup any existing interval before starting a new one
    this.destroy();
    await this.checkApiHealth();
    this.startPeriodicHealthCheck();
  }

  private async checkApiHealth(): Promise<boolean> {
    try {
      const response = await fetch('/api/health', {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      this.isApiAvailable = response.ok;
      localStorage.setItem(API_CHECK_KEY, this.isApiAvailable ? 'true' : 'false');
      return this.isApiAvailable;
    } catch {
      this.isApiAvailable = false;
      localStorage.setItem(API_CHECK_KEY, 'false');
      return false;
    }
  }

  private startPeriodicHealthCheck(): void {
    this.checkInterval = setInterval(() => {
      this.checkApiHealth();
    }, API_CHECK_INTERVAL);
  }

  destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  // Token management - delegate to inner ApiStorageAdapter
  setTokens(accessToken: string, refreshToken: string): void {
    this.apiAdapter.setTokens(accessToken, refreshToken);
  }

  clearTokens(): void {
    this.apiAdapter.clearTokens();
  }

  async save(workflow: Workflow): Promise<void> {
    // Dual write: try API first, then localStorage
    const results: { api?: Error; local?: Error } = {};

    // Try API write
    if (this.isApiAvailable) {
      try {
        await this.apiAdapter.save(workflow);
      } catch (error) {
        results.api = error instanceof Error ? error : new Error(String(error));
      }
    }

    // Always write to localStorage as backup
    try {
      await localStorageAdapter.save(workflow);
    } catch (error) {
      results.local = error instanceof Error ? error : new Error(String(error));
    }

    // If either storage failed, throw an error with details
    if (results.api || results.local) {
      const parts: string[] = [];
      if (results.api) parts.push(`API: ${results.api.message}`);
      if (results.local) parts.push(`LocalStorage: ${results.local.message}`);
      throw new Error(`Save partially failed: ${parts.join(', ')}`);
    }
  }

  async load(id: string): Promise<Workflow> {
    // Try API first if available
    if (this.isApiAvailable) {
      try {
        return await this.apiAdapter.load(id);
      } catch (error) {
        if (error instanceof Error && error.message === 'Workflow not found') {
          // Workflow not found in API, try localStorage
        } else {
          // Other API error, fall back to localStorage
        }
      }
    }

    // Fallback to localStorage
    try {
      return await localStorageAdapter.load(id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (this.isApiAvailable) {
        throw new Error(`Workflow not found in API or localStorage: ${message}`);
      }
      throw new Error(`Workflow not found in localStorage: ${message}`);
    }
  }

  async list(): Promise<WorkflowMeta[]> {
    if (this.isApiAvailable) {
      try {
        return await this.apiAdapter.list();
      } catch {
        // Fall through to localStorage
      }
    }

    return localStorageAdapter.list();
  }

  async delete(id: string): Promise<void> {
    const results: { api?: Error; local?: Error } = {};

    if (this.isApiAvailable) {
      try {
        await this.apiAdapter.delete(id);
      } catch (error) {
        results.api = error instanceof Error ? error : new Error(String(error));
      }
    }

    try {
      await localStorageAdapter.delete(id);
    } catch (error) {
      results.local = error instanceof Error ? error : new Error(String(error));
    }

    if (results.api || results.local) {
      const parts: string[] = [];
      if (results.api) parts.push(`API: ${results.api.message}`);
      if (results.local) parts.push(`LocalStorage: ${results.local.message}`);
      throw new Error(`Delete partially failed: ${parts.join(', ')}`);
    }
  }

  async createWorkflow(
    name: string,
    description?: string,
    category?: string
  ): Promise<{ meta: WorkflowMeta; content: Workflow }> {
    if (this.isApiAvailable) {
      try {
        const result = await this.apiAdapter.createWorkflow(name, description, category);
        // Also save to localStorage for offline access
        await localStorageAdapter.save(result.content);
        return result;
      } catch {
        // Fall through to localStorage
      }
    }

    const result = await localStorageAdapter.createWorkflow(name, description, category);
    return result;
  }

  async updateWorkflowMeta(id: string, patch: Partial<WorkflowMeta>): Promise<void> {
    const results: { api?: Error; local?: Error } = {};

    if (this.isApiAvailable) {
      try {
        await this.apiAdapter.updateWorkflowMeta(id, patch);
      } catch (error) {
        results.api = error instanceof Error ? error : new Error(String(error));
      }
    }

    try {
      await localStorageAdapter.updateWorkflowMeta(id, patch);
    } catch (error) {
      results.local = error instanceof Error ? error : new Error(String(error));
    }

    if (results.api && results.local) {
      throw new Error(`Update failed: API (${results.api.message}), LocalStorage (${results.local.message})`);
    }
  }

  async exportToJson(workflow: Workflow): Promise<string> {
    if (this.isApiAvailable) {
      try {
        return await this.apiAdapter.exportToJson(workflow);
      } catch {
        // Fall through to local implementation
      }
    }
    return localStorageAdapter.exportToJson(workflow);
  }

  async importFromJson(json: string): Promise<Workflow> {
    if (this.isApiAvailable) {
      try {
        const workflow = await this.apiAdapter.importFromJson(json);
        // Also import to localStorage
        await localStorageAdapter.importFromJson(json);
        return workflow;
      } catch {
        // Fall through to localStorage
      }
    }
    return localStorageAdapter.importFromJson(json);
  }

  getIsApiAvailable(): boolean {
    return this.isApiAvailable;
  }
}

export const migrationStorageAdapter = new MigrationStorageAdapter();
