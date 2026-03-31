// Published workflow store for the user app
//
// Handles loading and caching of published workflows from localStorage.
// Also holds runtime state: the currently selected workflow, execution status,
// and results.

import type { ExecutionProgress, PublishedWorkflow, PublishedWorkflowExecutionResult } from '@prism/shared-types';

const PREFIX = 'prism:published:';
const INDEX_KEY = `${PREFIX}index`;

/**
 * Cross-port broadcast channel name (must match dev-tool's channel name).
 * BroadcastChannel is origin-scoped and works across different ports on the same host.
 */
const CHANNEL_NAME = 'prism-publish-channel';

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

export interface UserAppState {
  // Workflow list
  workflows: PublishedWorkflowMeta[];
  isLoading: boolean;
  loadError?: string;

  // Selected workflow
  selectedWorkflow: PublishedWorkflow | null;

  // Run state
  runState: RunState;

  // Actions
  loadWorkflows: () => void;
  selectWorkflow: (sourceId: string) => void;
  clearSelection: () => void;
  setRunState: (state: RunState | ((prev: RunState) => RunState)) => void;
}

import { create } from 'zustand';

function loadIndex(): string[] {
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function loadPublishedWorkflow(sourceId: string): PublishedWorkflow | null {
  try {
    const raw = localStorage.getItem(`${PREFIX}${sourceId}`);
    if (!raw) return null;
    return JSON.parse(raw) as PublishedWorkflow;
  } catch {
    return null;
  }
}

function toMeta(pw: PublishedWorkflow): PublishedWorkflowMeta {
  return {
    sourceId: pw.sourceId,
    name: pw.name,
    description: pw.description,
    sourceName: pw.sourceName,
    version: pw.version,
    publishedAt: pw.publishedAt,
    inputCount: pw.inputs.length,
    outputCount: pw.outputs.length,
  };
}

/**
 * Strip base64 dataUrl from imageFile/maskFile params for user-input nodes only.
 *
 * For nodes exposed as user inputs (listed in config.inputs), the URL is injected
 * at runtime via PublishedWorkflowExecutor.reconstruct() from inputValues — the
 * stored dataUrl is not needed.
 *
 * For non-user-input nodes (e.g. a dev-set load-image used as internal data),
 * we preserve the dataUrl so the executor can load it normally.
 */
function stripImageData(pw: PublishedWorkflow): PublishedWorkflow {
  const userInputNodeIds = new Set((pw.config.inputs ?? []).map((ci) => ci.nodeId));

  const configs = { ...pw.config, nodeConfigs: { ...pw.config.nodeConfigs } };
  for (const [nodeId, cfg] of Object.entries(configs.nodeConfigs)) {
    const isUserInput = userInputNodeIds.has(nodeId);
    const params: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(cfg.params)) {
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        const obj = val as Record<string, unknown>;
        if ('dataUrl' in obj) {
          if (isUserInput) {
            // User-input nodes: strip dataUrl (URL comes from inputValues at runtime)
            params[key] = { width: obj['width'], height: obj['height'], fileName: obj['fileName'] };
          } else {
            // Non-user-input nodes: preserve the full object (dataUrl included)
            params[key] = obj;
          }
          continue;
        }
      }
      params[key] = val;
    }
    configs.nodeConfigs[nodeId] = { ...cfg, params };
  }
  return { ...pw, config: configs };
}

/**
 * Save a published workflow into THIS app's localStorage.
 * Called on initial load, on broadcast-received events, and on manual import.
 */
export function syncWorkflowToLocal(pw: PublishedWorkflow): void {
  const safe = stripImageData(pw);
  localStorage.setItem(`${PREFIX}${safe.sourceId}`, JSON.stringify(safe));
  const ids: string[] = loadIndex();
  if (!ids.includes(pw.sourceId)) {
    ids.push(pw.sourceId);
    localStorage.setItem(INDEX_KEY, JSON.stringify(ids));
  }
}

/**
 * Bootstrap BroadcastChannel listener.
 * When dev-tool publishes a workflow, it broadcasts here so user-app
 * immediately syncs without needing a page refresh.
 */
function bootstrapBroadcastListener(store: { loadWorkflows: () => void }) {
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.addEventListener('message', (event: MessageEvent) => {
      if (event.data?.type === 'workflow-published') {
        const pw = event.data.payload as PublishedWorkflow;
        syncWorkflowToLocal(pw);
        store.loadWorkflows();
      }
    });
    channel.addEventListener('error', () => {
      channel.close();
    });
  } catch {
    // BroadcastChannel not supported — silently ignore
  }
}

export const useUserAppStore = create<UserAppState>((set, get) => {
  const store: UserAppState = {
    workflows: [],
    isLoading: false,
    loadError: undefined,
    selectedWorkflow: null,
    runState: { status: 'idle' },
    loadWorkflows() { throw new Error('not yet initialized'); },
    selectWorkflow() { throw new Error('not yet initialized'); },
    clearSelection() { throw new Error('not yet initialized'); },
    setRunState() { throw new Error('not yet initialized'); },
  };

  bootstrapBroadcastListener(store);

  store.loadWorkflows = function loadWorkflows() {
    set({ isLoading: true, loadError: undefined });
    try {
      const ids = loadIndex();
      const metas: PublishedWorkflowMeta[] = [];
      for (const sourceId of ids) {
        const pw = loadPublishedWorkflow(sourceId);
        if (pw) metas.push(toMeta(pw));
      }
      metas.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      set({ workflows: metas, isLoading: false });
    } catch (err) {
      set({ loadError: String(err), isLoading: false });
    }
  };

  store.selectWorkflow = function selectWorkflow(sourceId: string) {
    const pw = loadPublishedWorkflow(sourceId);
    set((state) => ({
      selectedWorkflow: pw,
      runState: { ...state.runState, status: 'idle', progress: undefined, result: undefined, error: undefined },
    }));
  };

  store.clearSelection = function clearSelection() {
    set((state) => ({
      selectedWorkflow: null,
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

  return store;
});
