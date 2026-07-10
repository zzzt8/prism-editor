// livePreviewService - manages live preview subscription and debouncing
// Extracted from useCanvasStore.ts to reduce store complexity
// Follows the factory pattern used by autosaveService and executionService

import type { StoreApi } from 'zustand';
import type { EditorCanvasNode, ExecutionProgress } from '@prism/shared-types';
import type { ExecutionSource } from './executionService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LivePreviewService {
  subscribe: (store: StoreApi<unknown>) => () => void;
  triggerPreview: (debounceMs: number) => void;
  isActive: () => boolean;
  destroy: () => void;
}

// ─── Module-level state ────────────────────────────────────────────────────────

let _liveTimer: ReturnType<typeof setTimeout> | null = null;
let _liveSubscriptionTeardown: (() => void) | null = null;
let _pendingLiveResults: ExecutionProgress['results'] = [];
let _lastNodesFingerprint = '';
let _activeStore: StoreApi<unknown> | null = null;

// ─── Internal helpers ──────────────────────────────────────────────────────────

function getStoreState<T>(): T {
  if (!_activeStore) {
    throw new Error('LivePreviewService not subscribed to a store');
  }
  return _activeStore.getState() as T;
}

// Stable signature of a node's "exec-relevant" fields. Position and runtime
// execution results are intentionally excluded so dragging a node around the
// canvas (or receiving progress updates) does not retrigger live execution.
function nodeExecFingerprint(n: { id: string; data: { params: unknown; extraInputs?: unknown; extraOutputs?: unknown } }): string {
  const params = n.data.params ?? {};
  const extras = JSON.stringify([n.data.extraInputs ?? null, n.data.extraOutputs ?? null]);
  return `${n.id}|${JSON.stringify(params)}|${extras}`;
}

function nodesExecFingerprint(nodes: ReadonlyArray<{ id: string; data: { params: unknown; extraInputs?: unknown; extraOutputs?: unknown } }>): string {
  return nodes.map(nodeExecFingerprint).join('\n');
}

function applyResultsToStore(nodes: EditorCanvasNode[], results: ExecutionProgress['results']): EditorCanvasNode[] {
  if (results.length === 0) return nodes;
  return nodes.map((n) => {
    const r = results.find((x) => x.nodeId === n.id);
    if (!r) return n;
    return {
      ...n,
      data: {
        ...n.data,
        executionResult: r.status === 'done' ? r.outputs : undefined,
        executionError: r.status === 'error' ? r.error : undefined,
        _executingNodeId: r.nodeId,
      },
    };
  });
}

function shouldFireLive(
  nodes: EditorCanvasNode[],
  targetPlatform: string | undefined,
  livePreviewEnabled: boolean,
  executionStatus: string,
  isInteracting: boolean
): boolean {
  if (targetPlatform !== 'browser') return false;
  if (!livePreviewEnabled) return false;
  if (executionStatus === 'running') return false;
  if (isInteracting) return false;
  if (nodes.length === 0) return false;
  return true;
}

function clearLiveTimer(): void {
  if (_liveTimer !== null) {
    clearTimeout(_liveTimer);
    _liveTimer = null;
  }
}

function armLiveTimer(debounceMs: number): void {
  clearLiveTimer();

  const state = getStoreState<{
    nodes: EditorCanvasNode[];
    workflowMeta: { targetPlatform?: string };
    livePreviewEnabled?: boolean;
    _executionStatus: string;
    _isInteracting: boolean;
    _liveDebouncing: boolean;
    executeWorkflow: (source: ExecutionSource) => Promise<unknown>;
  }>();

  if (!shouldFireLive(
    state.nodes,
    state.workflowMeta.targetPlatform,
    state.livePreviewEnabled ?? false,
    state._executionStatus,
    state._isInteracting
  )) return;

  // Mark debouncing state
  _activeStore?.setState({ _liveDebouncing: true });

  _liveTimer = setTimeout(() => {
    _liveTimer = null;
    _activeStore?.setState({ _liveDebouncing: false });

    // Re-check at fire time
    const currentState = getStoreState<{
      nodes: EditorCanvasNode[];
      workflowMeta: { targetPlatform?: string };
      livePreviewEnabled?: boolean;
      _executionStatus: string;
      _isInteracting: boolean;
      executeWorkflow: (source: ExecutionSource) => Promise<unknown>;
    }>();

    if (!shouldFireLive(
      currentState.nodes,
      currentState.workflowMeta.targetPlatform,
      currentState.livePreviewEnabled ?? false,
      currentState._executionStatus,
      currentState._isInteracting
    )) return;

    void currentState.executeWorkflow('live');
  }, debounceMs);
}

// ─── Service factory ──────────────────────────────────────────────────────────

export function createLivePreviewService(): LivePreviewService {
  return {
    subscribe(store) {
      _activeStore = store;

      // Initialize fingerprint to current nodes so the first subscription
      // event does not fire a phantom live execution on app boot.
      const initialState = store.getState() as {
        nodes: EditorCanvasNode[];
        workflowMeta: { targetPlatform?: string };
        livePreviewDebounceMs?: number;
        livePreviewEnabled?: boolean;
        _executionStatus: string;
        _isInteracting: boolean;
      };
      _lastNodesFingerprint = nodesExecFingerprint(initialState.nodes);

      const unsubCanvas = store.subscribe((state, prev) => {
        const curr = state as typeof initialState;
        const prevState = prev as typeof initialState;

        if (curr.workflowMeta?.targetPlatform !== prevState.workflowMeta?.targetPlatform) {
          armLiveTimer(curr.livePreviewDebounceMs ?? 50);
          _lastNodesFingerprint = nodesExecFingerprint(curr.nodes);
          return;
        }

        // Only fire when an exec-relevant field changed (params / extra ports)
        const prevFp = _lastNodesFingerprint;
        const nextFp = nodesExecFingerprint(curr.nodes);
        if (nextFp !== prevFp) {
          _lastNodesFingerprint = nextFp;
          armLiveTimer(curr.livePreviewDebounceMs ?? 50);
        }
      });

      const unsubApp = store.subscribe((state, prev) => {
        const curr = state as { livePreviewEnabled?: boolean; livePreviewDebounceMs?: number };
        const prevState = prev as { livePreviewEnabled?: boolean; livePreviewDebounceMs?: number };

        if (
          curr.livePreviewEnabled !== prevState.livePreviewEnabled ||
          curr.livePreviewDebounceMs !== prevState.livePreviewDebounceMs
        ) {
          if (!curr.livePreviewEnabled) {
            clearLiveTimer();
          } else {
            armLiveTimer(curr.livePreviewDebounceMs ?? 50);
          }
        }
      });

      _liveSubscriptionTeardown = () => {
        unsubCanvas();
        unsubApp();
        clearLiveTimer();
      };

      return () => {
        _liveSubscriptionTeardown?.();
        _liveSubscriptionTeardown = null;
        _activeStore = null;
      };
    },

    triggerPreview(debounceMs: number) {
      armLiveTimer(debounceMs);
    },

    isActive() {
      return _liveTimer !== null;
    },

    destroy() {
      _liveSubscriptionTeardown?.();
      _liveSubscriptionTeardown = null;
      _activeStore = null;
    },
  };
}

// ─── Singleton instance ────────────────────────────────────────────────────────

let _serviceInstance: LivePreviewService | null = null;

export function getLivePreviewService(): LivePreviewService {
  if (!_serviceInstance) {
    _serviceInstance = createLivePreviewService();
  }
  return _serviceInstance;
}

export function destroyLivePreviewService(): void {
  if (_serviceInstance) {
    _serviceInstance.destroy();
    _serviceInstance = null;
  }
}
