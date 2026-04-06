// CanvasPool - Object pool for OffscreenCanvas instances
// Implements LRU eviction with TTL support for efficient memory management

import type { BlendMode, TransformOptions, MaskOptions, ExportOptions } from '@prism/shared-types';
import { registerImageDataTransferHandler } from '../comlink-image-data-transfer';

registerImageDataTransferHandler();

export interface CanvasPoolConfig {
  maxCanvases?: number;
  ttlMs?: number;
  enabled?: boolean;
}

interface PooledCanvas {
  canvas: OffscreenCanvas;
  ctx: OffscreenCanvasRenderingContext2D;
  width: number;
  height: number;
  lastUsed: number;
  inUse: boolean;
}

interface PoolStats {
  totalCanvases: number;
  activeCanvases: number;
  availableCanvases: number;
  hits: number;
  misses: number;
  evictions: number;
}

export type { PoolStats };

const DEFAULT_MAX_CANVASES = 16;
const DEFAULT_TTL_MS = 60000; // 60 seconds

/**
 * CanvasPool manages a pool of OffscreenCanvas instances for reuse.
 * Reduces memory allocation churn and GC pressure by recycling canvases
 * with the same dimensions.
 */
export class CanvasPool {
  private pool = new Map<string, PooledCanvas>();
  private accessOrder: string[] = [];
  private config: Required<CanvasPoolConfig>;
  private stats: PoolStats = {
    totalCanvases: 0,
    activeCanvases: 0,
    availableCanvases: 0,
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  constructor(config: CanvasPoolConfig = {}) {
    this.config = {
      maxCanvases: config.maxCanvases ?? DEFAULT_MAX_CANVASES,
      ttlMs: config.ttlMs ?? DEFAULT_TTL_MS,
      enabled: config.enabled ?? true,
    };
  }

  /**
   * Acquire a canvas with the specified dimensions.
   * Returns a cached canvas if available and not expired, or creates a new one.
   */
  acquire(width: number, height: number): OffscreenCanvas {
    if (!this.config.enabled) {
      return new OffscreenCanvas(width, height);
    }

    const key = this.makeKey(width, height);
    const now = Date.now();

    // Check for existing canvas
    const existing = this.pool.get(key);
    if (existing && !existing.inUse) {
      // Check TTL
      if (now - existing.lastUsed <= this.config.ttlMs) {
        existing.inUse = true;
        existing.lastUsed = now;
        this.moveToFront(key);
        this.stats.hits++;
        this.stats.availableCanvases--;
        this.stats.activeCanvases++;
        // CRITICAL: Clear canvas immediately to prevent stale data from previous use
        existing.ctx.clearRect(0, 0, width, height);
        return existing.canvas;
      } else {
        // TTL expired, remove and recreate
        this.removeCanvas(key);
      }
    }

    // Create new canvas
    this.stats.misses++;
    this.evictIfNeeded();

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    const pooled: PooledCanvas = {
      canvas,
      ctx,
      width,
      height,
      lastUsed: now,
      inUse: true,
    };

    this.pool.set(key, pooled);
    this.accessOrder.unshift(key);
    this.stats.totalCanvases++;
    this.stats.activeCanvases++;

    return canvas;
  }

  /**
   * Release a canvas back to the pool.
   */
  release(width: number, height: number): void {
    if (!this.config.enabled) return;

    const key = this.makeKey(width, height);
    const pooled = this.pool.get(key);

    if (pooled) {
      pooled.inUse = false;
      pooled.lastUsed = Date.now();
      this.stats.activeCanvases--;
      this.stats.availableCanvases++;

      // Clear for next use
      pooled.ctx.clearRect(0, 0, width, height);
    }
  }

  /**
   * Force evict a canvas by dimensions.
   */
  evict(width: number, height: number): void {
    const key = this.makeKey(width, height);
    this.removeCanvas(key);
  }

  /**
   * Clear all canvases from the pool.
   */
  clear(): void {
    this.pool.clear();
    this.accessOrder = [];
    this.stats = {
      totalCanvases: 0,
      activeCanvases: 0,
      availableCanvases: 0,
      hits: 0,
      misses: 0,
      evictions: 0,
    };
  }

  /**
   * Update pool configuration.
   */
  configure(config: Partial<CanvasPoolConfig>): void {
    if (config.maxCanvases !== undefined) {
      this.config.maxCanvases = config.maxCanvases;
    }
    if (config.ttlMs !== undefined) {
      this.config.ttlMs = config.ttlMs;
    }
    if (config.enabled !== undefined) {
      this.config.enabled = config.enabled;
    }

    // Evict excess canvases if max decreased
    if (config.maxCanvases !== undefined) {
      this.evictLRU(this.pool.size - this.config.maxCanvases);
    }
  }

  /**
   * Get current pool statistics.
   */
  getStats(): PoolStats {
    return { ...this.stats };
  }

  /**
   * Get the number of canvases currently in the pool.
   */
  size(): number {
    return this.pool.size;
  }

  /**
   * Check if a canvas with the given dimensions exists in the pool.
   */
  has(width: number, height: number): boolean {
    return this.pool.has(this.makeKey(width, height));
  }

  /**
   * Get pool configuration.
   */
  getConfig(): Readonly<Required<CanvasPoolConfig>> {
    return { ...this.config };
  }

  private makeKey(width: number, height: number): string {
    return `${width}x${height}`;
  }

  private moveToFront(key: string): void {
    const idx = this.accessOrder.indexOf(key);
    if (idx > 0) {
      this.accessOrder.splice(idx, 1);
      this.accessOrder.unshift(key);
    }
  }

  private evictIfNeeded(): void {
    // Evict if at or above max capacity before acquiring new canvas
    if (this.pool.size >= this.config.maxCanvases) {
      const toEvict = this.pool.size - this.config.maxCanvases + 1;
      this.evictLRU(toEvict);
    }
  }

  private evictLRU(count: number): void {
    // LRU eviction: remove from the end of accessOrder
    let evicted = 0;
    for (let i = this.accessOrder.length - 1; i >= 0 && evicted < count; i--) {
      const key = this.accessOrder[i];
      const pooled = this.pool.get(key);
      if (pooled && !pooled.inUse) {
        this.removeCanvas(key);
        evicted++;
      }
    }
    this.stats.evictions += evicted;
  }

  private removeCanvas(key: string): void {
    this.pool.delete(key);
    const idx = this.accessOrder.indexOf(key);
    if (idx >= 0) {
      this.accessOrder.splice(idx, 1);
    }
    this.stats.totalCanvases--;
    if (this.pool.size === 0) {
      this.stats.availableCanvases = 0;
    }
  }

  /**
   * Clean up expired canvases (TTL eviction).
   * Should be called periodically or before operations that need to free memory.
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, pooled] of this.pool.entries()) {
      if (!pooled.inUse && now - pooled.lastUsed > this.config.ttlMs) {
        this.removeCanvas(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}

// Singleton instance
let _instance: CanvasPool | null = null;

export function getCanvasPool(): CanvasPool {
  if (!_instance) {
    _instance = new CanvasPool();
  }
  return _instance;
}

export function createCanvasPool(config?: CanvasPoolConfig): CanvasPool {
  return new CanvasPool(config);
}
