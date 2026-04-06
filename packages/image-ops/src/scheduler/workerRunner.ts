// Worker runner - handles offloading image operations to Web Workers
// Provides a unified interface for worker-based execution

import type { TransformOptions, MaskOptions, BlendMode } from '@prism/shared-types';
import type { WorkerImageResult, WorkerLoadResult, WorkerExportResult } from '../worker/imageWorker.worker';

/**
 * Unified worker interface for image operations.
 * Abstracts over the ImageWorker API to provide a simple interface.
 */
export interface ImageOperations {
  /**
   * Transform image with translate, scale, rotate, crop
   */
  transform(imageData: ImageData, options: TransformOptions): Promise<WorkerImageResult>;
  
  /**
   * Composite two images using specified blend mode
   */
  composite(
    base: ImageData,
    overlay: ImageData,
    mode: BlendMode,
    opacity: number
  ): Promise<WorkerImageResult>;
  
  /**
   * Apply mask to image
   */
  applyMask(image: ImageData, mask: ImageData, options: MaskOptions): Promise<WorkerImageResult>;
  
  /**
   * Export image to blob
   */
  exportImage(data: ImageData, options: { format?: string; quality?: number }): Promise<WorkerExportResult>;
}

/**
 * Check if we're in a browser environment with Web Worker support
 */
function isWorkerSupported(): boolean {
  return typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined';
}

/**
 * WorkerRunner - provides image operations that can run on worker lane.
 * 
 * When workers are available and enabled, operations are offloaded to
 * Web Workers for non-blocking execution. Falls back to main-thread
 * execution when workers are unavailable.
 */
export class WorkerRunner implements ImageOperations {
  private workerPool: import('./workerPool').WorkerPool | null = null;
  private enableWorker: boolean;

  constructor(options: { enableWorkerLane?: boolean } = {}) {
    this.enableWorker = options.enableWorkerLane ?? isWorkerSupported();
  }

  /**
   * Lazily initialize the worker pool
   */
  private getWorkerPool(): import('./workerPool').WorkerPool | null {
    if (!this.enableWorker || !isWorkerSupported()) {
      return null;
    }

    if (!this.workerPool) {
      // Dynamic import to avoid issues in non-browser environments
      const { getWorkerPool } = require('./workerPool');
      this.workerPool = getWorkerPool();
    }

    return this.workerPool;
  }

  /**
   * Transform image - runs on worker if available, otherwise main thread
   */
  async transform(imageData: ImageData, options: TransformOptions): Promise<WorkerImageResult> {
    const pool = this.getWorkerPool();
    
    if (pool && pool.hasAvailableWorkers()) {
      return pool.execute((worker) => worker.transform(imageData, options));
    }

    // Fallback: use the worker image operations directly
    const { ImageWorker } = require('../worker/imageWorker.worker');
    const worker = new ImageWorker('inline-' + Math.random().toString(36).slice(2, 8));
    return worker.transform(imageData, options);
  }

  /**
   * Composite images - runs on worker if available, otherwise main thread
   */
  async composite(
    base: ImageData,
    overlay: ImageData,
    mode: BlendMode = 'normal',
    opacity: number = 1
  ): Promise<WorkerImageResult> {
    const pool = this.getWorkerPool();

    if (pool && pool.hasAvailableWorkers()) {
      return pool.execute((worker) => worker.composite(base, overlay, mode, opacity));
    }

    // Fallback
    const { ImageWorker } = require('../worker/imageWorker.worker');
    const worker = new ImageWorker('inline-' + Math.random().toString(36).slice(2, 8));
    return worker.composite(base, overlay, mode, opacity);
  }

  /**
   * Apply mask - runs on worker if available, otherwise main thread
   */
  async applyMask(image: ImageData, mask: ImageData, options: MaskOptions): Promise<WorkerImageResult> {
    const pool = this.getWorkerPool();

    if (pool && pool.hasAvailableWorkers()) {
      return pool.execute((worker) => worker.applyMask(image, mask, options));
    }

    // Fallback
    const { ImageWorker } = require('../worker/imageWorker.worker');
    const worker = new ImageWorker('inline-' + Math.random().toString(36).slice(2, 8));
    return worker.applyMask(image, mask, options);
  }

  /**
   * Export image - runs on worker if available, otherwise main thread
   */
  async exportImage(
    data: ImageData,
    options: { format?: 'png' | 'jpeg' | 'webp'; quality?: number; width?: number; height?: number }
  ): Promise<WorkerExportResult> {
    const pool = this.getWorkerPool();

    if (pool && pool.hasAvailableWorkers()) {
      return pool.execute((worker) => worker.exportImage(data, options));
    }

    // Fallback
    const { ImageWorker } = require('../worker/imageWorker.worker');
    const worker = new ImageWorker('inline-' + Math.random().toString(36).slice(2, 8));
    return worker.exportImage(data, options);
  }

  /**
   * Check if worker execution is enabled and available
   */
  isWorkerAvailable(): boolean {
    return this.enableWorker && isWorkerSupported() && (this.getWorkerPool()?.hasAvailableWorkers() ?? false);
  }
}

// Singleton instance
let _runnerInstance: WorkerRunner | null = null;

/**
 * Get or create the singleton WorkerRunner instance
 */
export function getWorkerRunner(): WorkerRunner {
  if (!_runnerInstance) {
    _runnerInstance = new WorkerRunner();
  }
  return _runnerInstance;
}
