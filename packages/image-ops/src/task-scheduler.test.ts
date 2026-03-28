import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskScheduler } from './task-scheduler';
import { TaskType } from '@prism/shared-types';

const mockWorkerPool = () => {
  let busy = false;
  return {
    execute: vi.fn(async (fn: (w: unknown) => Promise<unknown>) => {
      if (busy) throw new Error('Worker busy');
      busy = true;
      try {
        return await fn({});
      } finally {
        busy = false;
      }
    }),
  };
};

describe('TaskScheduler — schedule()', () => {
  let pool: ReturnType<typeof mockWorkerPool>;

  beforeEach(() => {
    pool = mockWorkerPool();
  });

  it('marks task as done and returns result on success', async () => {
    const scheduler = new TaskScheduler({ workerPool: pool as never });
    const result = await scheduler.schedule('task-1', TaskType.SYNC, async () => 42);
    expect(result).toBe(42);

    const task = scheduler.getTask('task-1');
    expect(task?.status).toBe('done');
    expect(task?.result).toBe(42);
  });

  it('marks task as error and propagates error', async () => {
    const scheduler = new TaskScheduler({ workerPool: pool as never });
    await expect(
      scheduler.schedule('fail-task', TaskType.SYNC, async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');

    const task = scheduler.getTask('fail-task');
    expect(task?.status).toBe('error');
    expect(task?.error).toBe('boom');
  });

  it('calls onTaskStart and onTaskComplete callbacks', async () => {
    const onStart = vi.fn();
    const onComplete = vi.fn();
    const scheduler = new TaskScheduler({
      workerPool: pool as never,
      onTaskStart: onStart,
      onTaskComplete: onComplete,
    });

    await scheduler.schedule('cb-task', TaskType.SYNC, async () => 'ok');

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onStart.mock.calls[0][0].id).toBe('cb-task');
    expect(onComplete.mock.calls[0][0].id).toBe('cb-task');
  });

  it('calls onTaskError callback on failure', async () => {
    const onError = vi.fn();
    const scheduler = new TaskScheduler({
      workerPool: pool as never,
      onTaskError: onError,
    });

    await expect(
      scheduler.schedule('err-task', TaskType.SYNC, async () => {
        throw new Error('fail');
      })
    ).rejects.toThrow();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][1].message).toBe('fail');
  });

  it('times out tasks that exceed default timeout', async () => {
    const onTimeout = vi.fn();
    const scheduler = new TaskScheduler({
      workerPool: pool as never,
      defaultTimeout: 50,
      onTaskTimeout: onTimeout,
    });

    // Use Promise.race so timeout wins over the slow function
    const result = Promise.race([
      scheduler.schedule(
        'slow-task',
        TaskType.SYNC,
        async () => new Promise((r) => setTimeout(() => r('done'), 200))
      ),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout-won')), 100)
      ),
    ]).catch((e) => { throw e; });

    await expect(result).rejects.toThrow();
    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(scheduler.getTask('slow-task')?.status).toBe('timeout');
  });

  it('cancel() returns true for a running task and sets its status to error', async () => {
    const scheduler = new TaskScheduler({
      workerPool: pool as never,
      defaultTimeout: 5000,
    });

    // Start a task that settles after 10ms — cancel should interrupt it
    const taskPromise = scheduler.schedule('cancel-task', TaskType.SYNC, async () => {
      await new Promise((r) => setTimeout(r, 10));
      return 'should not complete';
    });

    // Cancel immediately — the task is 'running' but the promise hasn't settled yet
    const result = scheduler.cancel('cancel-task');

    // The rejection is unhandled in this test context — suppress it
    taskPromise.catch(() => {});

    expect(result).toBe(true);
    // Task status should be error (cancelled)
    expect(scheduler.getTask('cancel-task')?.status).toBe('error');
    expect(scheduler.getTask('cancel-task')?.error).toBe('Cancelled');
  });

  it('cancel() returns false for a task that has already completed', async () => {
    const scheduler = new TaskScheduler({ workerPool: pool as never });
    await scheduler.schedule('done-task', TaskType.SYNC, async () => 'done');
    const result = scheduler.cancel('done-task');
    expect(result).toBe(false);
    expect(scheduler.getTask('done-task')?.status).toBe('done');
  });

  it('does not cancel a task that already completed', async () => {
    const scheduler = new TaskScheduler({ workerPool: pool as never });
    await scheduler.schedule('done-task', TaskType.SYNC, async () => 'done');
    const result = scheduler.cancel('done-task');
    expect(result).toBe(false);
    expect(scheduler.getTask('done-task')?.status).toBe('done');
  });

  it('scheduleWorker() dispatches to pool.execute()', async () => {
    pool.execute.mockResolvedValueOnce('pool-result');
    const scheduler = new TaskScheduler({ workerPool: pool as never });

    const result = await scheduler.scheduleWorker('w-task', async (p) => {
      return (await p.execute(async () => 'pool-result')) as string;
    });

    expect(result).toBe('pool-result');
    expect(pool.execute).toHaveBeenCalledTimes(1);
  });

  it('getStats() returns correct counts', async () => {
    const scheduler = new TaskScheduler({ workerPool: pool as never });
    await scheduler.schedule('t1', TaskType.SYNC, async () => 1);
    scheduler.schedule('t2', TaskType.SYNC, async () => new Promise(() => {}));
    await expect(scheduler.schedule('t3', TaskType.SYNC, async () => { throw new Error('e'); })).rejects.toThrow();

    const stats = scheduler.getStats();
    expect(stats.total).toBe(3);
    expect(stats.done).toBe(1);
    expect(stats.error).toBe(1);
    expect(stats.pending).toBe(0);
  });

  it('reset() clears all tasks and timers', async () => {
    const scheduler = new TaskScheduler({
      workerPool: pool as never,
      defaultTimeout: 5000,
    });

    scheduler.schedule('r1', TaskType.SYNC, async () => 1);
    scheduler.schedule('r2', TaskType.SYNC, async () => 2);

    scheduler.reset();

    expect(scheduler.getAllTasks()).toHaveLength(0);
    expect(scheduler.getStats().total).toBe(0);
  });

  it('getTask returns undefined for unknown id', () => {
    const scheduler = new TaskScheduler({ workerPool: pool as never });
    expect(scheduler.getTask('nonexistent')).toBeUndefined();
  });
});
