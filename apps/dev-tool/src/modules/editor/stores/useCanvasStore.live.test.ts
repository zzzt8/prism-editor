// useCanvasStore.live.test.ts
//
// Unit tests for the live preview subscription installed at module load.
// Verifies that:
//  - targetPlatform === 'browser' && livePreviewEnabled === true triggers execute
//  - debounce collapses consecutive changes into a single execute
//  - targetPlatform !== 'browser' does NOT trigger
//  - livePreviewEnabled === false does NOT trigger
//  - _executionStatus === 'running' does NOT trigger
//  - position-only changes (onNodesChange position) do NOT trigger
//  - destroyLiveSubscription tears down timers and listeners

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from '@testing-library/react';

// Mock the workflow execution to keep tests fast and deterministic. We only
// care about the call site (manual vs live), not the actual execution.
const executeWorkflowMock = vi.fn(async (_source?: string) => ({
  status: 'done' as const,
}));

vi.mock('../services/executionService', async () => {
  const actual = await vi.importActual<typeof import('../services/executionService')>('../services/executionService');
  return {
    ...actual,
    getExecutionService: () => ({
      execute: executeWorkflowMock,
      cancel: vi.fn(),
    }),
  };
});

import { useCanvasStore } from './useCanvasStore';
import { useAppStore } from '../../../store/appStore';
import { getLivePreviewService, destroyLivePreviewService } from '../services/livePreviewService';

const advanceTimers = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
};

const seedBrowserNodes = (count = 1) => {
  const nodes = Array.from({ length: count }).map((_, i) => ({
    id: `n-${i}`,
    type: 'prismNode' as const,
    position: { x: 0, y: 0 },
    data: {
      label: `n${i}`,
      nodeType: 'load-image',
      params: { url: `test${i}.png` },
    },
  }));
  act(() => {
    useCanvasStore.setState({
      nodes,
      workflowMeta: {
        ...useCanvasStore.getState().workflowMeta,
        targetPlatform: 'browser',
      },
    });
  });
};

describe('useCanvasStore — live preview subscription', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    executeWorkflowMock.mockClear();
    executeWorkflowMock.mockResolvedValue({ status: 'done' });

    // Reset to a known clean state: idle, frontend on, no nodes.
    // Note: we do NOT destroy the live subscription here — the production
    // app keeps it alive for the page lifetime. Tests that exercise the
    // destroy path re-install afterwards via installLiveSubscription().
    act(() => {
      useCanvasStore.setState({
        nodes: [],
        _executionStatus: 'idle',
        _liveDebouncing: false,
        workflowMeta: {
          id: 'wf-test',
          name: 'Test',
          version: '1.0.0',
          targetPlatform: 'browser',
        },
      });
      useAppStore.setState({
        livePreviewEnabled: true,
        livePreviewDebounceMs: 50,
      });
    });
  });

  afterEach(() => {
    // Make sure no pending timer leaks into the next test
    // Destroy and recreate the service to reset singleton state
    act(() => {
      destroyLivePreviewService();
      getLivePreviewService().subscribe(useCanvasStore);
    });
    vi.useRealTimers();
  });

  it('does not trigger when nodes are empty', async () => {
    // nodes stay empty
    await advanceTimers(500);
    expect(executeWorkflowMock).not.toHaveBeenCalled();
  });

  it('does not trigger when targetPlatform is nodejs', async () => {
    act(() => {
      useCanvasStore.setState({
        workflowMeta: { ...useCanvasStore.getState().workflowMeta, targetPlatform: 'nodejs' },
        nodes: [{
          id: 'n1',
          type: 'prismNode' as const,
          position: { x: 0, y: 0 },
          data: { label: 'n1', nodeType: 'load-image', params: {} },
        }],
      });
    });
    await advanceTimers(500);
    expect(executeWorkflowMock).not.toHaveBeenCalled();
  });

  it('does not trigger when livePreviewEnabled is false', async () => {
    act(() => {
      useAppStore.setState({ livePreviewEnabled: false });
      useCanvasStore.setState({
        nodes: [{
          id: 'n1',
          type: 'prismNode' as const,
          position: { x: 0, y: 0 },
          data: { label: 'n1', nodeType: 'load-image', params: {} },
        }],
      });
    });
    await advanceTimers(500);
    expect(executeWorkflowMock).not.toHaveBeenCalled();
  });

  it('does not trigger when _executionStatus is running', async () => {
    seedBrowserNodes(1);
    act(() => {
      useCanvasStore.setState({ _executionStatus: 'running' });
    });
    // Change params again while "running" — should not fire.
    act(() => {
      useCanvasStore.setState({
        nodes: useCanvasStore.getState().nodes.map((n) => ({
          ...n,
          data: { ...n.data, params: { url: 'other.png' } },
        })),
      });
    });
    await advanceTimers(500);
    expect(executeWorkflowMock).not.toHaveBeenCalled();
  });

  it('does not trigger on position-only changes', async () => {
    seedBrowserNodes(1);
    // Wait for any initial debounce
    await advanceTimers(500);
    expect(executeWorkflowMock).toHaveBeenCalledTimes(1); // initial seed may have fired

    executeWorkflowMock.mockClear();

    // Position-only change
    act(() => {
      useCanvasStore.setState({
        nodes: useCanvasStore.getState().nodes.map((n) => ({
          ...n,
          position: { x: 100, y: 100 },
        })),
      });
    });
    await advanceTimers(500);
    expect(executeWorkflowMock).not.toHaveBeenCalled();
  });

  it('triggers execute with source = "live" after debounce when params change', async () => {
    seedBrowserNodes(1);
    await advanceTimers(500);

    executeWorkflowMock.mockClear();

    act(() => {
      useCanvasStore.setState({
        nodes: useCanvasStore.getState().nodes.map((n) => ({
          ...n,
          data: { ...n.data, params: { url: 'updated.png' } },
        })),
      });
    });

    // Before debounce elapses, no call yet
    await advanceTimers(30);
    expect(executeWorkflowMock).not.toHaveBeenCalled();

    // After debounce elapses, exactly one call with options.source = 'live'
    await advanceTimers(100);
    expect(executeWorkflowMock).toHaveBeenCalledTimes(1);
    const call = executeWorkflowMock.mock.calls[0] as unknown as unknown[];
    const options = call[3] as { source?: string };
    expect(options.source).toBe('live');
  });

  it('collapses consecutive param changes into a single execute', async () => {
    seedBrowserNodes(1);
    await advanceTimers(500);
    executeWorkflowMock.mockClear();

    // Three rapid param changes within the debounce window
    act(() => {
      useCanvasStore.setState({
        nodes: useCanvasStore.getState().nodes.map((n) => ({
          ...n,
          data: { ...n.data, params: { url: 'a.png' } },
        })),
      });
    });
    await advanceTimers(20);

    act(() => {
      useCanvasStore.setState({
        nodes: useCanvasStore.getState().nodes.map((n) => ({
          ...n,
          data: { ...n.data, params: { url: 'b.png' } },
        })),
      });
    });
    await advanceTimers(20);

    act(() => {
      useCanvasStore.setState({
        nodes: useCanvasStore.getState().nodes.map((n) => ({
          ...n,
          data: { ...n.data, params: { url: 'c.png' } },
        })),
      });
    });
    await advanceTimers(100);

    expect(executeWorkflowMock).toHaveBeenCalledTimes(1);
    const options = (executeWorkflowMock.mock.calls[0] as unknown as unknown[])[3] as { source?: string };
    expect(options.source).toBe('live');
  });

  it('sets _liveDebouncing to true while debounce timer is pending', async () => {
    seedBrowserNodes(1);
    await advanceTimers(500);
    executeWorkflowMock.mockClear();

    act(() => {
      useCanvasStore.setState({
        nodes: useCanvasStore.getState().nodes.map((n) => ({
          ...n,
          data: { ...n.data, params: { url: 'deb.png' } },
        })),
      });
    });
    await advanceTimers(20);
    expect(useCanvasStore.getState()._liveDebouncing).toBe(true);

    await advanceTimers(100);
    // After the timer fires, _liveDebouncing should flip back to false
    expect(useCanvasStore.getState()._liveDebouncing).toBe(false);
  });

  it('clears pending timer and _liveDebouncing when destroyLiveSubscription is called', async () => {
    seedBrowserNodes(1);
    await advanceTimers(500);
    executeWorkflowMock.mockClear();

    act(() => {
      useCanvasStore.setState({
        nodes: useCanvasStore.getState().nodes.map((n) => ({
          ...n,
          data: { ...n.data, params: { url: 'pending.png' } },
        })),
      });
    });
    await advanceTimers(20);
    expect(useCanvasStore.getState()._liveDebouncing).toBe(true);

    act(() => {
      useCanvasStore.getState().destroyLiveSubscription();
    });
    expect(useCanvasStore.getState()._liveDebouncing).toBe(false);

    await advanceTimers(200);
    expect(executeWorkflowMock).not.toHaveBeenCalled();
  });
});
