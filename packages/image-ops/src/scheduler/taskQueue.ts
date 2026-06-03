// Task Queue - Manages pending tasks with priority support

import type { WorkerPool } from './workerPool';

/**
 * Task priority levels
 */
export enum TaskPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
}

/**
 * Represents a queued task
 */
export interface QueuedTask<T = unknown> {
  id: string;
  priority: TaskPriority;
  execute: () => Promise<T>;
  createdAt: number;
  timeout?: number;
  onStart?: () => void;
  onComplete?: (_result: T) => void;
  onError?: (_error: Error) => void;
}

/**
 * Task Queue configuration
 */
export interface TaskQueueConfig {
  /** Maximum concurrent tasks (default: 4) */
  maxConcurrent: number;
  /** Default task timeout in ms (default: 30000) */
  defaultTimeout: number;
  /** Enable priority queue (default: true) */
  enablePriority: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_QUEUE_CONFIG: TaskQueueConfig = {
  maxConcurrent: 4,
  defaultTimeout: 30000,
  enablePriority: true,
};

/**
 * TaskQueue - Manages task execution with concurrency control and priority.
 * Works with WorkerPool to distribute tasks across workers.
 */
export class TaskQueue {
  private queue: QueuedTask[] = [];
  private runningTasks = new Map<string, number>(); // key: taskId, value: startTime
  private config: TaskQueueConfig;
  private workerPool: WorkerPool;

  constructor(workerPool: WorkerPool, config: Partial<TaskQueueConfig> = {}) {
    this.workerPool = workerPool;
    this.config = { ...DEFAULT_QUEUE_CONFIG, ...config };
  }

  /**
   * Add a task to the queue. Starts immediately if capacity is available.
   */
  async enqueue<T>(task: Omit<QueuedTask<T>, 'createdAt'>): Promise<T> {
    const fullTask: QueuedTask<T> = {
      ...task,
      createdAt: Date.now(),
      timeout: task.timeout ?? this.config.defaultTimeout,
    };

    if (this.canExecute()) {
      return this.executeTask(fullTask);
    }

    // Queue is full — add to queue and sort by priority
    return new Promise<T>((resolve, reject) => {
      this.queue.push(fullTask as QueuedTask);
      if (this.config.enablePriority) {
        this.sortQueue();
      }
      (fullTask as QueuedTask).onComplete = (result) => resolve(result as T);
      (fullTask as QueuedTask).onError = reject;
    });
  }

  /**
   * Check if we can start a new task
   */
  private canExecute(): boolean {
    return this.runningTasks.size < this.config.maxConcurrent;
  }

  /**
   * Sort queue by priority (higher first), then by creation time
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.createdAt - b.createdAt;
    });
  }

  /**
   * Execute a single task with timeout and completion notification.
   */
  private async executeTask<T>(task: QueuedTask<T>): Promise<T> {
    const taskId = task.id;

    return new Promise<T>((resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        if (this.runningTasks.has(taskId)) {
          this.runningTasks.delete(taskId);
          reject(new Error(`Task ${taskId} timed out after ${task.timeout}ms`));
          this.processNext();
        }
      }, task.timeout);

      // Track the running task
      this.runningTasks.set(taskId, Date.now());
      task.onStart?.();

      // Submit to worker pool
      this.workerPool.execute(() => task.execute())
        .then((_result) => {
          clearTimeout(timeoutId);
          this.runningTasks.delete(taskId);
          task.onComplete?.(_result as T);
          resolve(_result as T);
        })
        .catch((_err) => {
          clearTimeout(timeoutId);
          this.runningTasks.delete(taskId);
          task.onError?.(_err instanceof Error ? _err : new Error(String(_err)));
          reject(_err instanceof Error ? _err : new Error(String(_err)));
        })
        .finally(() => {
          this.processNext();
        });
    });
  }

  /**
   * Process the next task in the queue
   */
  private processNext(): void {
    if (this.queue.length === 0) return;
    if (!this.canExecute()) return;

    const nextTask = this.queue.shift();
    if (!nextTask) return;

    this.executeTask(nextTask);
  }

  /**
   * Cancel a queued or running task
   */
  cancel(taskId: string): boolean {
    // Check if in queue
    const queueIndex = this.queue.findIndex((t) => t.id === taskId);
    if (queueIndex !== -1) {
      this.queue.splice(queueIndex, 1);
      return true;
    }

    // Check if running - we can't actually cancel, but we mark it
    if (this.runningTasks.has(taskId)) {
      // Task is running, can't be cancelled easily
      return false;
    }

    return false;
  }

  /**
   * Clear all queued tasks (not running ones)
   */
  clear(): void {
    this.queue = [];
  }

  /**
   * Get queue statistics
   */
  getStats(): { queued: number; running: number; maxConcurrent: number } {
    return {
      queued: this.queue.length,
      running: this.runningTasks.size,
      maxConcurrent: this.config.maxConcurrent,
    };
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.length === 0 && this.runningTasks.size === 0;
  }
}
