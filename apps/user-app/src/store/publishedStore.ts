// Published workflow store for the user app
//
// Handles loading and caching of published workflows from the API.
// Supports loading custom node packages required by published workflows.

import { create } from 'zustand';
import {
  safeValidateNodePackage,
  type NodePackageManifest,
  type NodeDefinition,
  type NodeExecutor,
} from '@prism/shared-types';
import { globalRegistry, parseInlineExecutor } from '@prism/core';
import { userAppStorage } from '../storage';
import { getNodePackageFromCache, storeNodePackageInCache } from '../storage/nodeCache';
import type {
  ExecutionProgress,
  PublishedWorkflow,
  PublishedWorkflowExecutionResult,
} from '@prism/shared-types';
import type { ValidatedPublishedWorkflow } from '../utils/workflowImport';

export interface PublishedWorkflowMeta {
  sourceId: string;
  name: string;
  description?: string;
  sourceName: string;
  version: string;
  publishedAt: string;
  inputCount: number;
  outputCount: number;
}

export interface RunState {
  status: 'idle' | 'running' | 'done' | 'error';
  error?: string;
  result?: PublishedWorkflowExecutionResult;
  progress?: ExecutionProgress;
}

export interface NodeLoadError {
  packageName: string;
  message: string;
}

export interface UserAppState {
  // Workflow list
  workflows: PublishedWorkflowMeta[];
  isLoading: boolean;
  loadError?: string;

  // Selected workflow
  selectedWorkflow: PublishedWorkflow | null;
  nodeLoadErrors: NodeLoadError[];

  // Run state
  runState: RunState;

  // Actions
  loadWorkflows: () => void;
  selectWorkflow: (sourceId: string) => void;
  clearSelection: () => void;
  setRunState: (state: RunState | ((prev: RunState) => RunState)) => void;
  importRequiredNode: (pkg: NodePackageManifest) => void;
  clearNodeLoadErrors: () => void;
}

export const useUserAppStore = create<UserAppState>((set, get) => {
  const store: UserAppState = {
    workflows: [],
    isLoading: false,
    loadError: undefined,
    selectedWorkflow: null,
    nodeLoadErrors: [],
    runState: { status: 'idle' },
    loadWorkflows() { throw new Error('not yet initialized'); },
    selectWorkflow() { throw new Error('not yet initialized'); },
    clearSelection() { throw new Error('not yet initialized'); },
    setRunState() { throw new Error('not yet initialized'); },
    importRequiredNode() { throw new Error('not yet initialized'); },
    clearNodeLoadErrors() { throw new Error('not yet initialized'); },
  };

  // Initialize global registry
  globalRegistry.initialize();

  store.loadWorkflows = async function loadWorkflows() {
    set({ isLoading: true, loadError: undefined });
    try {
      const metas = await userAppStorage.listPublished();
      // Use the metas directly from the adapter (already parsed with inputCount/outputCount)
      const workflowMetas: PublishedWorkflowMeta[] = metas.map((m) => ({
        sourceId: m.sourceId,
        name: m.name,
        description: m.description,
        sourceName: m.sourceName,
        version: m.version,
        publishedAt: m.publishedAt,
        inputCount: m.inputCount,
        outputCount: m.outputCount,
      }));
      workflowMetas.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      set({ workflows: workflowMetas, isLoading: false });
    } catch (err) {
      set({ loadError: String(err), isLoading: false });
    }
  };

  store.selectWorkflow = async function selectWorkflow(sourceId: string) {
    try {
      // Load the complete PublishedWorkflow from the API
      const workflow = await userAppStorage.loadPublished(sourceId);

      set((state) => ({
        selectedWorkflow: workflow,
        runState: { ...state.runState, status: 'idle', progress: undefined, result: undefined, error: undefined },
      }));

      // Load required nodes
      const errors = await loadRequiredNodes(workflow);
      if (errors.length > 0) {
        set({ nodeLoadErrors: errors });
      }
    } catch (err) {
      set({ loadError: String(err) });
    }
  };

  store.clearSelection = function clearSelection() {
    set((state) => ({
      selectedWorkflow: null,
      nodeLoadErrors: [],
      runState: { ...state.runState, status: 'idle', progress: undefined, result: undefined, error: undefined },
    }));
  };

  store.setRunState = function setRunState(stateOrUpdater: RunState | ((prev: RunState) => RunState)): void {
    set((state) => ({
      runState:
        typeof stateOrUpdater === 'function'
          ? stateOrUpdater(state.runState)
          : stateOrUpdater,
    }));
  };

  store.importRequiredNode = function importRequiredNode(manifest: NodePackageManifest) {
    const errors: NodeLoadError[] = [];

    // Parse inline executors
    const executors: Record<string, NodeExecutor> = {};
    for (const execDef of manifest.executors) {
      const source = execDef.source;
      if (source.type === 'inline') {
        executors[execDef.id] = parseInlineExecutor(source.code, execDef.id);
      } else if (source.type === 'url') {
        // For URL executors, create a simple proxy (full implementation would use workerLoader)
        const url = source.url;
        executors[execDef.id] = async (inputs, params, context) => {
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inputs, params }),
          });
          if (!response.ok) {
            throw new Error(`Executor URL returned ${response.status}`);
          }
          return response.json();
        };
      }
    }

    // Register nodes
    for (const def of manifest.definitions as NodeDefinition[]) {
      if (globalRegistry.getNode(def.type)) {
        errors.push({ packageName: manifest.name, message: `Node "${def.type}" is already registered` });
        continue;
      }
      globalRegistry.registerNode(def, true);

      // Register executor
      const executorId = def.executor ?? def.type;
      if (executors[executorId]) {
        globalRegistry.registerExecutor(executorId, executors[executorId]);
      }
    }

    // Update errors
    const currentErrors = get().nodeLoadErrors.filter((e) => e.packageName !== manifest.name);
    set({ nodeLoadErrors: [...currentErrors, ...errors] });
  };

  store.clearNodeLoadErrors = function clearNodeLoadErrors() {
    set({ nodeLoadErrors: [] });
  };

  /**
   * Load all required node packages for a workflow.
   * Checks if nodes are already registered, loads from cache if available,
   * or collects errors for packages that need to be imported.
   */
  async function loadRequiredNodes(workflow: PublishedWorkflow): Promise<NodeLoadError[]> {
    const errors: NodeLoadError[] = [];
    const requiredNodes = workflow.config?.requiredNodes;

    if (!requiredNodes || Object.keys(requiredNodes).length === 0) {
      return errors;
    }

    for (const [packageName, pkgInfo] of Object.entries(requiredNodes)) {
      if (pkgInfo.url) {
        try {
          const cached = getNodePackageFromCache(pkgInfo.url);
          if (cached) {
            get().importRequiredNode(cached.manifest);
            continue;
          }

          const response = await fetch(pkgInfo.url);
          if (!response.ok) {
            errors.push({ packageName, message: `Failed to fetch package: ${response.status}` });
            continue;
          }

          const json = await response.json();
          const result = safeValidateNodePackage(json);
          if (!result.success) {
            const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
            errors.push({ packageName, message: `Invalid package: ${issues}` });
            continue;
          }

          storeNodePackageInCache(pkgInfo.url, result.data);
        } catch (err) {
          errors.push({ packageName, message: `Failed to load: ${String(err)}` });
        }
      } else {
        errors.push({
          packageName,
          message: `Package "${packageName}" is required but not available. Please import it manually.`,
        });
      }
    }

    return errors;
  }

  return store;
});

/**
 * Sync a validated workflow to the server via the API adapter.
 * This replaces the previous placeholder that did nothing.
 */
export async function syncWorkflowToLocal(workflow: ValidatedPublishedWorkflow): Promise<string> {
  const result = await userAppStorage.importWorkflow(workflow);
  return result.id;
}
