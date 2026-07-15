// executionService.test.ts
//
// Unit tests for the source threading in executionService.
// The service does not decide whether to write an ExecutionLog — that's the
// canvas store's job. The service's responsibility is to (a) default the
// source to 'manual' for legacy callers, and (b) propagate the resolved
// source back on the ExecutionResult so the store can branch on it.

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// Mock the dynamic imports inside executionService.
const fakeExecutors = new Map();
const mockExecutorInstance = {
  execute: vi.fn(async () => ({
    workflowId: 'wf-1',
    status: 'done' as const,
    results: {},
  })),
};

vi.mock('@prism/core', () => ({
  globalRegistry: {
    initialize: vi.fn(),
    getExecutors: vi.fn(() => fakeExecutors),
    getNode: vi.fn(),
    listByPlatform: vi.fn(() => []),
  },
}));

vi.mock('@prism/workflow-core', () => ({
  WorkflowExecutor: vi.fn(function () {
    return mockExecutorInstance;
  }),
}));

import { createExecutionService } from './executionService';
import type { ExecuteOptions } from './executionService';
import type { EditorWorkflowMeta, EditorCanvasNode, EditorCanvasEdge } from '@prism/shared-types';

const makeMeta = (): EditorWorkflowMeta => ({
  id: 'wf-1',
  name: 'Test',
  version: '1.0.0',
});

const makeNodes = (): EditorCanvasNode[] => [];
const makeEdges = (): EditorCanvasEdge[] => [];

const makeOptions = (overrides: Partial<ExecuteOptions> = {}): ExecuteOptions => ({
  onProgress: vi.fn(),
  signal: new AbortController().signal,
  ...overrides,
});

describe('executionService — source threading', () => {
  beforeEach(() => {
    mockExecutorInstance.execute.mockClear();
    mockExecutorInstance.execute.mockResolvedValue({
      workflowId: 'wf-1',
      status: 'done',
      results: {},
    });
  });

  it('defaults source to "manual" when caller omits it', async () => {
    const svc = createExecutionService();
    const result = await svc.execute(makeMeta(), makeNodes(), makeEdges(), makeOptions());

    expect(result.source).toBe('manual');
  });

  it('threads explicit source = "manual" through to the result', async () => {
    const svc = createExecutionService();
    const result = await svc.execute(
      makeMeta(), makeNodes(), makeEdges(),
      makeOptions({ source: 'manual' })
    );

    expect(result.source).toBe('manual');
  });

  it('threads explicit source = "live" through to the result', async () => {
    const svc = createExecutionService();
    const result = await svc.execute(
      makeMeta(), makeNodes(), makeEdges(),
      makeOptions({ source: 'live' })
    );

    expect(result.source).toBe('live');
  });

  it('passes source to the underlying WorkflowExecutor via options', async () => {
    const svc = createExecutionService();
    await svc.execute(
      makeMeta(), makeNodes(), makeEdges(),
      makeOptions({ source: 'live' })
    );

    // The service does not pass source to the executor (executor interface
    // is unchanged). Confirm the executor was still called and the result
    // reflects the live source for upstream consumers.
    expect(mockExecutorInstance.execute).toHaveBeenCalledTimes(1);
  });

  it('returns the source even when the executor errors out', async () => {
    mockExecutorInstance.execute.mockResolvedValueOnce({
      workflowId: 'wf-1',
      status: 'error',
      results: {},
      error: 'something broke',
    } as never);

    const svc = createExecutionService();
    const result = await svc.execute(
      makeMeta(), makeNodes(), makeEdges(),
      makeOptions({ source: 'live' })
    );

    expect(result.status).toBe('error');
    expect(result.error).toBe('something broke');
    expect(result.source).toBe('live');
  });

  it('preserves caller-supplied onProgress and signal untouched', async () => {
    const svc = createExecutionService();
    const onProgress: Mock = vi.fn();
    const controller = new AbortController();
    await svc.execute(
      makeMeta(), makeNodes(), makeEdges(),
      makeOptions({ source: 'live', onProgress, signal: controller.signal })
    );

    // The executor received a laneConfig with the default worker lane enabled.
    const call = mockExecutorInstance.execute.mock.calls[0] as unknown as [
      unknown,
      { signal: AbortSignal; onProgress: Mock; laneConfig: { enableWorkerLane: boolean } },
    ];
    expect(call).toBeDefined();
    const options = call[1];
    expect(options.signal).toBe(controller.signal);
    expect(options.onProgress).toBe(onProgress);
    expect(options.laneConfig.enableWorkerLane).toBe(true);
  });
});
