/**
 * Tests for user-app stores: workflowCatalogStore, selectedWorkflowStore, runStore.
 * Uses fake-indexeddb for IndexedDB mocking and global fetch overrides.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import {
  useWorkflowCatalogStore,
  type WorkflowCatalogState,
} from './workflowCatalogStore';
import {
  useSelectedWorkflowStore,
  type NodeLoadError,
} from '../selection/selectedWorkflowStore';
import { useRunStore, type RunState, type RunStoreState } from '../runner/runStore';
import type { PublishedWorkflow } from '@prism/shared-types';

// ─── IndexedDB mock via fake-indexeddb ────────────────────────────────────────

let db: IDBDatabase | null = null;

async function withFakedDB(fn: (db: IDBDatabase) => Promise<void>): Promise<void> {
  await act(async () => {
    const openReq = indexedDB.open('prism-user-app', 1);
    openReq.onupgradeneeded = () => {
      const database = openReq.result;
      if (!database.objectStoreNames.contains('published-workflows')) {
        database.createObjectStore('published-workflows', { keyPath: 'sourceId' });
      }
    };
    db = await new Promise<IDBDatabase>((resolve, reject) => {
      openReq.onsuccess = () => resolve(openReq.result);
      openReq.onerror = () => reject(openReq.error);
    });
    await fn(db);
    db?.close();
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeWorkflow = (overrides: Partial<PublishedWorkflow> = {}): PublishedWorkflow =>
  ({
    id: 'wf-001',
    sourceId: 'wf-src-001',
    name: 'Test Workflow',
    description: 'A test workflow',
    version: '1.0.0',
    publishedAt: '2026-01-01T00:00:00.000Z',
    sourceName: 'dev-tool',
    nodes: [],
    connections: [],
    inputs: [],
    outputs: [],
    config: {},
    ...overrides,
  } as PublishedWorkflow);

// ─── runStore tests ────────────────────────────────────────────────────────────

describe('runStore', () => {
  beforeEach(() => {
    const store = useRunStore.getState();
    act(() => {
      store.setRunState({ status: 'idle' });
    });
  });

  describe('initial state', () => {
    it('has idle status', () => {
      expect(useRunStore.getState().runState.status).toBe('idle');
    });
  });

  describe('setRunState (object form)', () => {
    it('transitions to running', () => {
      act(() => {
        useRunStore.getState().setRunState({ status: 'running' });
      });
      expect(useRunStore.getState().runState.status).toBe('running');
    });

    it('transitions to done with result', () => {
      const result = { outputImages: [] };
      act(() => {
        useRunStore.getState().setRunState({ status: 'done', result });
      });
      const state = useRunStore.getState().runState;
      expect(state.status).toBe('done');
      expect((state as RunState & { result: unknown }).result).toBe(result);
    });

    it('transitions to error with message', () => {
      act(() => {
        useRunStore.getState().setRunState({ status: 'error', error: 'Something went wrong' });
      });
      const state = useRunStore.getState().runState;
      expect(state.status).toBe('error');
      expect((state as RunState & { error: string }).error).toBe('Something went wrong');
    });

    it('transitions to cancelled', () => {
      act(() => {
        useRunStore.getState().setRunState({ status: 'cancelled' });
      });
      expect(useRunStore.getState().runState.status).toBe('cancelled');
    });
  });

  describe('setRunState (updater function form)', () => {
    it('uses updater function to set running', () => {
      act(() => {
        useRunStore.getState().setRunState((prev) => ({ ...prev, status: 'running' }));
      });
      expect(useRunStore.getState().runState.status).toBe('running');
    });

    it('preserves existing fields when updating', () => {
      act(() => {
        useRunStore.getState().setRunState({ status: 'running', error: 'oops' });
        useRunStore.getState().setRunState((prev) => ({ ...prev, status: 'done' }));
      });
      const state = useRunStore.getState().runState as RunState & { error: string };
      expect(state.status).toBe('done');
      expect(state.error).toBe('oops');
    });
  });
});

// ─── workflowCatalogStore tests ────────────────────────────────────────────────

describe('workflowCatalogStore', () => {
  beforeEach(async () => {
    // Reset store state
    act(() => {
      useWorkflowCatalogStore.setState({
        workflows: [],
        isLoading: false,
        loadError: undefined,
      });
    });

    // Clear and re-create IndexedDB
    await withFakedDB(async (database) => {
      const tx = database.transaction('published-workflows', 'readwrite');
      const store = tx.objectStore('published-workflows');
      await new Promise<void>((resolve, reject) => {
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    });
  });

  it('starts with empty workflows and no error', () => {
    const { workflows, isLoading, loadError } = useWorkflowCatalogStore.getState();
    expect(workflows).toHaveLength(0);
    expect(isLoading).toBe(false);
    expect(loadError).toBeUndefined();
  });

  it('loadWorkflows sets isLoading then false, with sorted workflows on success', async () => {
    // Seed data
    await withFakedDB(async (database) => {
      const tx = database.transaction('published-workflows', 'readwrite');
      const store = tx.objectStore('published-workflows');
      store.put(makeWorkflow({ sourceId: 'wf-old', name: 'Old', publishedAt: '2026-01-01T00:00:00.000Z' }));
      store.put(makeWorkflow({ sourceId: 'wf-new', name: 'New', publishedAt: '2026-01-03T00:00:00.000Z' }));
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    });

    // Verify loading state is set
    let isLoadingDuring = false;
    act(() => {
      useWorkflowCatalogStore.getState().loadWorkflows();
      isLoadingDuring = useWorkflowCatalogStore.getState().isLoading;
    });
    expect(isLoadingDuring).toBe(true);

    // Wait for completion
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    const { workflows, isLoading, loadError } = useWorkflowCatalogStore.getState();
    expect(workflows).toHaveLength(2);
    // Sorted by publishedAt descending (newest first)
    expect(workflows[0].sourceId).toBe('wf-new');
    expect(workflows[1].sourceId).toBe('wf-old');
    expect(isLoading).toBe(false);
    expect(loadError).toBeUndefined();
  });
});

// ─── selectedWorkflowStore tests ────────────────────────────────────────────────

describe('selectedWorkflowStore', () => {
  beforeEach(async () => {
    act(() => {
      useSelectedWorkflowStore.setState({
        selectedWorkflow: null,
        nodeLoadErrors: [],
      });
    });

    await withFakedDB(async (database) => {
      const tx = database.transaction('published-workflows', 'readwrite');
      const store = tx.objectStore('published-workflows');
      store.put(makeWorkflow({
        sourceId: 'wf-selectable',
        name: 'Selectable Workflow',
        publishedAt: '2026-01-01T00:00:00.000Z',
      }));
    });

    // Mock globalRegistry
    vi.mock('@prism/core', () => ({
      globalRegistry: {
        getNode: vi.fn(() => undefined),
        registerNode: vi.fn(),
        registerExecutor: vi.fn(),
      },
    }));
  });

  it('starts with no selected workflow', () => {
    const { selectedWorkflow, nodeLoadErrors } = useSelectedWorkflowStore.getState();
    expect(selectedWorkflow).toBeNull();
    expect(nodeLoadErrors).toHaveLength(0);
  });

  it('clearSelection resets state', () => {
    act(() => {
      useSelectedWorkflowStore.getState().clearSelection();
    });
    const { selectedWorkflow, nodeLoadErrors } = useSelectedWorkflowStore.getState();
    expect(selectedWorkflow).toBeNull();
    expect(nodeLoadErrors).toHaveLength(0);
  });

  it('clearNodeLoadErrors clears errors without changing workflow', () => {
    act(() => {
      useSelectedWorkflowStore.setState({
        nodeLoadErrors: [{ packageName: 'test', message: 'err' }],
      });
      useSelectedWorkflowStore.getState().clearNodeLoadErrors();
    });
    expect(useSelectedWorkflowStore.getState().nodeLoadErrors).toHaveLength(0);
  });

  it('selectWorkflow loads workflow from IndexedDB', async () => {
    // Override fetch to prevent real network calls in loadRequiredNodes
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ name: 'dummy', version: '1.0.0', definitions: [], executors: [] }),
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock;

    try {
      await act(async () => {
        useSelectedWorkflowStore.getState().selectWorkflow('wf-selectable');
        await new Promise((r) => setTimeout(r, 100));
      });

      const { selectedWorkflow, nodeLoadErrors } = useSelectedWorkflowStore.getState();
      expect(selectedWorkflow).not.toBeNull();
      expect(selectedWorkflow?.sourceId).toBe('wf-selectable');
      expect(nodeLoadErrors).toHaveLength(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('selectWorkflow with invalid sourceId sets error', async () => {
    const fetchMock = vi.fn();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock;

    try {
      await act(async () => {
        useSelectedWorkflowStore.getState().selectWorkflow('nonexistent-id');
        await new Promise((r) => setTimeout(r, 100));
      });

      const { selectedWorkflow, nodeLoadErrors } = useSelectedWorkflowStore.getState();
      expect(selectedWorkflow).toBeNull();
      expect(nodeLoadErrors.some((e: NodeLoadError) => e.packageName === 'system')).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
