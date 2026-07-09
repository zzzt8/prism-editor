// Worker pool sizing helpers — pure functions for calculating optimal worker count.
// Extracted from workerPool.ts (split-tiles-core-edges T1).

import type { WorkerPoolConfig } from './workerPool';

/**
 * Calculate the optimal number of workers based on device capabilities.
 *
 * Formula: min(maxSize, max(minSize, hardwareConcurrency - 1))
 * Reserves 1 core for the main thread to avoid Worker and UI resource contention.
 */
export function calculateWorkerCount(
  hardwareConcurrency: number,
  maxSize: number = 4,
  minSize: number = 1
): number {
  const cores = hardwareConcurrency || 2;
  const calculated = Math.max(minSize, cores - 1);
  return Math.min(maxSize, calculated);
}

/**
 * Get the effective pool size based on config and device capabilities.
 *
 * If dynamic is false, uses fixed size (size or baseSize).
 * If dynamic is true (default), calculates based on hardwareConcurrency.
 */
export function getEffectiveSize(config: WorkerPoolConfig): number {
  if (config.dynamic === false) {
    return config.size ?? config.baseSize ?? 2;
  }

  const maxSize = config.maxSize ?? 4;
  const minSize = config.minSize ?? 1;
  const cores = typeof navigator !== 'undefined'
    ? (navigator.hardwareConcurrency || 2)
    : 2;

  return calculateWorkerCount(cores, maxSize, minSize);
}