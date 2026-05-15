// TaskScheduler - High-level task scheduling over WorkerPool
//
// Provides a unified interface for:
// - Sync tasks: executed directly on the main thread
// - Async tasks: dispatched to the WorkerPool
// - Timeout handling per task
// - Progress callbacks

import type { WorkerPool } from './scheduler/workerPool';
import { TaskType } from '@prism/shared-types';

export interface ScheduledTask {
  id: string;
  type: TaskType;
  label: string;
  status: 'pending' | 'running' | 'done' | 'error' | 'timeout';
  startTime?: number;
  endTime?: number;
  error?: string;
  result?: unknown;
  /** Rejects the scheduled promise — used by cancel() and timeout() */
  rejectFn?: (err: Error) => void;
  /** Resolves the scheduled promise — set only on completion */
  resolveFn?: (val: unknown) => void;
}

export interface TaskSchedulerOptions {
  workerPool: WorkerPool;
  defaultTimeout?: number;
  onTaskStart?: (task: ScheduledTask) => void;
  onTaskComplete?: (task: ScheduledTask) => void;
  onTaskError?: (task: ScheduledTask, error: Error) => void;
  onTaskTimeout?: (task: ScheduledTask) => void;
}

const DEFAULT_TIMEOUT_MS = 30000;

/**
 * TaskScheduler — dispatches tasks to the WorkerPool and manages lifecycle.
 *
 * Usage:
 * ```
 * const scheduler = new TaskScheduler({ workerPool });
 * scheduler.schedule('task-1', 'async', async () => worker.loadImage(url));
 * const result = await scheduler.waitFor('task-1');
 * scheduler.cancel('task-1');
 * ```
 */
export class TaskScheduler {
  private tasks = new Map<string, ScheduledTask>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private options: Required<TaskSchedulerOptions>;

  constructor(options: TaskSchedulerOptions) {
    this.options = {
      workerPool: options.workerPool,
      defaultTimeout: options.defaultTimeout ?? DEFAULT_TIMEOUT_MS,
      onTaskStart: options.onTaskStart ?? (() => {}),
      onTaskComplete: options.onTaskComplete ?? (() => {}),
      onTaskError: options.onTaskError ?? (() => {}),
      onTaskTimeout: options.onTaskTimeout ?? (() => {}),
    };
  }

  /**
   * Schedule a task for execution.
   * - SYNC: runs immediately on the caller's thread
   * - ASYNC/POLL: dispatched to the WorkerPool
   */
  schedule<T>(
    id: string,
    type: TaskType,
    fn: () => Promise<T>,
    timeoutMs?: number
  ): Promise<T> {
    const task: ScheduledTask = {
      id,
      type,
      label: id,
      status: 'pending',
    };

    this.tasks.set(id, task);
    this.startTimer(id, timeoutMs ?? this.options.defaultTimeout);

    // Wrap the user's promise so we can resolve/reject it from cancel() or timeout()
    return new Promise<T>((resolve, reject) => {
      task.resolveFn = resolve as (val: unknown) => void;
      task.rejectFn = reject;

      // Capture start/end to avoid stale closures
      const startTask = () => {
        const captured = this.tasks.get(id);
        if (!captured) { reject(new Error(`Task ${id} not found`)); return; }
        captured.status = 'running';
        captured.startTime = Date.now();
        this.options.onTaskStart(captured);
      };

      const completeTask = (result: T) => {
        const _val = this.tasks.get(id);
        if (!_val) return;
        this.clearTimer(id);
        captured.status = 'done';
        captured.endTime = Date.now();
        captured.result = result;
        this.options.onTaskComplete(captured);
        resolve(result);
      };

      const failTask = (_err: Error) => {
        const captured = this.tasks.get(id);
        if (!captured) return;
        this.clearTimer(id);
        captured.status = 'error';
        captured.endTime = Date.now();
        captured.error = err.message;
        this.options.onTaskError(captured, err);
        reject(err);
      };

      // Mark task as running immediately before executing user function
      startTask();

      fn()
        .then((result) => {
          // Check task still exists and wasn't cancelled/timeout'd
          const captured = this.tasks.get(id);
          if (!captured) return;
          if (captured.status === 'pending' || captured.status === 'running') {
            completeTask(result);
          }
        })
        .catch((err) => {
          failTask(err instanceof Error ? err : new Error(String(err)));
        });
    });
  }

  /**
   * Schedule a task that wraps a WorkerPool.execute() call.
   * This is the preferred method for image processing tasks.
   */
  scheduleWorker<T>(
    id: string,
    fn: (_pool: NonNullable<TaskSchedulerOptions['workerPool']>) => Promise<T>,
    timeoutMs?: number
  ): Promise<T> {
    return this.schedule(id, TaskType.ASYNC, () => fn(this.options.workerPool), timeoutMs);
  }

  private startTimer(id: string, timeoutMs: number): void {
    this.clearTimer(id);
    const timer = setTimeout(() => {
      this.timeoutTask(id);
    }, timeoutMs);
    this.timers.set(id, timer);
  }

  private clearTimer(id: string): void {
    const existing = this.timers.get(id);
    if (existing) {
      clearTimeout(existing);
      this.timers.delete(id);
    }
  }

  private timeoutTask(id: string): void {
    const task = this.tasks.get(id);
    if (!task || (task.status !== 'pending' && task.status !== 'running')) return;

    this.clearTimer(id);
    task.status = 'timeout';
    task.endTime = Date.now();
    task.error = `Task '${id}' timed out after ${this.options.defaultTimeout}ms`;
    this.options.onTaskTimeout(task);
    task.rejectFn?.(new Error(task.error));
  }

  /**
   * Cancel a pending or running task.
   * Returns true if the task was found and cancelled.
   */
  cancel(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;

    if (task.status === 'pending' || task.status === 'running') {
      this.clearTimer(id);
      task.status = 'error';
      task.endTime = Date.now();
      task.error = 'Cancelled';
      task.rejectFn?.(new Error('Cancelled'));
      return true;
    }
    return false;
  }

  /**
   * Get the status of a task
   */
  getTask(id: string): ScheduledTask | undefined {
    return this.tasks.get(id);
  }

  /**
   * Get all tracked tasks
   */
  getAllTasks(): ScheduledTask[] {
    return [...this.tasks.values()];
  }

  /**
   * Clear all tasks and timers
   */
  reset(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.tasks.clear();
  }

  /**
   * Get scheduler statistics
   */
  getStats(): { total: number; pending: number; running: number; done: number; error: number; timeout: number } {
    const tasks = this.getAllTasks();
    return {
      total: tasks.length,
      pending: tasks.filter((t) => t.status === 'pending').length,
      running: tasks.filter((t) => t.status === 'running').length,
      done: tasks.filter((t) => t.status === 'done').length,
      error: tasks.filter((t) => t.status === 'error').length,
      timeout: tasks.filter((t) => t.status === 'timeout').length,
    };
  }
}
