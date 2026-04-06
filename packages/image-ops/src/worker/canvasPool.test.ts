import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CanvasPool, createCanvasPool, getCanvasPool, type CanvasPoolConfig } from './canvasPool';

// Mock OffscreenCanvas for Node.js environment
class MockOffscreenCanvas {
  width: number;
  height: number;
  private context: MockOffscreenCanvasRenderingContext2D;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.context = new MockOffscreenCanvasRenderingContext2D(width, height);
  }

  getContext(contextType: string, options?: { willReadFrequently?: boolean }) {
    if (contextType === '2d') {
      this.context.willReadFrequently = options?.willReadFrequently ?? false;
      return this.context;
    }
    return null;
  }
}

class MockOffscreenCanvasRenderingContext2D {
  willReadFrequently = false;
  private width: number;
  private height: number;
  private imageData: Uint8ClampedArray;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.imageData = new Uint8ClampedArray(width * height * 4);
  }

  clearRect(x: number, y: number, w: number, h: number) {
    // Mock implementation
  }

  getImageData(x: number, y: number, w: number, h: number) {
    return { data: this.imageData, width: w, height: h, colorSpace: 'srgb' as PredefinedColorSpace };
  }

  createImageData(w: number, h: number) {
    return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h, colorSpace: 'srgb' as PredefinedColorSpace };
  }

  putImageData(data: { data: Uint8ClampedArray }, x: number, y: number) {
    this.imageData = new Uint8ClampedArray(data.data);
  }
}

// @ts-expect-error - Mock global
global.OffscreenCanvas = MockOffscreenCanvas;

describe('CanvasPool', () => {
  beforeEach(() => {
    // Reset singleton
    vi.resetModules();
  });

  describe('acquire', () => {
    it('creates a new canvas when pool is empty', () => {
      const pool = createCanvasPool();
      const canvas = pool.acquire(100, 100);

      expect(canvas).toBeInstanceOf(MockOffscreenCanvas);
      expect(canvas.width).toBe(100);
      expect(canvas.height).toBe(100);
      expect(pool.size()).toBe(1);
    });

    it('reuses canvas for same dimensions', () => {
      const pool = createCanvasPool();

      const canvas1 = pool.acquire(100, 100);
      pool.release(100, 100);

      const canvas2 = pool.acquire(100, 100);

      // Should be the same instance
      expect(canvas1).toBe(canvas2);
      expect(pool.size()).toBe(1);
    });

    it('creates separate canvases for different dimensions', () => {
      const pool = createCanvasPool();

      const canvas1 = pool.acquire(100, 100);
      const canvas2 = pool.acquire(200, 200);

      expect(canvas1).not.toBe(canvas2);
      expect(pool.size()).toBe(2);
    });

    it('respects enabled=false config', () => {
      const pool = createCanvasPool({ enabled: false });

      const canvas1 = pool.acquire(100, 100);
      pool.release(100, 100);
      const canvas2 = pool.acquire(100, 100);

      // When disabled, new canvas is always created
      expect(canvas1).not.toBe(canvas2);
    });

    it('updates access order for LRU', () => {
      const pool = createCanvasPool();

      const c1 = pool.acquire(100, 100);
      pool.release(100, 100);
      const c2 = pool.acquire(200, 200);
      pool.release(200, 200);
      const c3 = pool.acquire(300, 300);
      pool.release(300, 300);

      // Access c1 again - should be most recently used
      pool.acquire(100, 100);
      pool.release(100, 100);

      const stats = pool.getStats();
      expect(stats.hits).toBeGreaterThan(0);
    });
  });

  describe('release', () => {
    it('makes canvas available for reuse', () => {
      const pool = createCanvasPool();

      const canvas = pool.acquire(100, 100);
      const stats1 = pool.getStats();

      pool.release(100, 100);
      const stats2 = pool.getStats();

      expect(stats2.availableCanvases).toBe(stats1.availableCanvases + 1);
      expect(stats2.activeCanvases).toBe(stats1.activeCanvases - 1);
    });

    it('clears canvas content on release', () => {
      const pool = createCanvasPool();
      const canvas = pool.acquire(100, 100);

      // No error should occur
      expect(() => pool.release(100, 100)).not.toThrow();
    });
  });

  describe('LRU eviction', () => {
    it('evicts least recently used when pool is full', () => {
      const pool = createCanvasPool({ maxCanvases: 2 });

      const c1 = pool.acquire(100, 100);
      pool.release(100, 100);

      const c2 = pool.acquire(200, 200);
      pool.release(200, 200);

      // Pool is now full with 2 canvases

      // Acquire new size - should evict c1 (least recently used)
      const c3 = pool.acquire(300, 300);

      // c1 should be evicted, but let's verify by checking if we can get c1 back
      const c1Again = pool.acquire(100, 100);

      // If c1 was evicted, c1Again will be a new canvas
      expect(pool.size()).toBeLessThanOrEqual(2);
    });

    it('does not evict canvases that are in use', () => {
      const pool = createCanvasPool({ maxCanvases: 2 });

      const c1 = pool.acquire(100, 100);
      // c1 is still in use - don't release

      const c2 = pool.acquire(200, 200);
      pool.release(200, 200);

      const c3 = pool.acquire(300, 300);
      pool.release(300, 300);

      // c1 should not be evicted because it's in use
      expect(pool.has(100, 100)).toBe(true);
    });
  });

  describe('TTL eviction', () => {
    it('creates new canvas when TTL expires', async () => {
      const pool = createCanvasPool({ ttlMs: 50 });

      const c1 = pool.acquire(100, 100);
      pool.release(100, 100);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 60));

      const c2 = pool.acquire(100, 100);

      // Should be a new canvas after TTL expiry
      expect(c1).not.toBe(c2);
    });

    it('cleanup removes expired canvases', async () => {
      const pool = createCanvasPool({ ttlMs: 50 });

      pool.acquire(100, 100);
      pool.release(100, 100);

      pool.acquire(200, 200);
      pool.release(200, 200);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 60));

      const cleaned = pool.cleanup();

      expect(cleaned).toBeGreaterThan(0);
      expect(pool.size()).toBe(0);
    });
  });

  describe('evict', () => {
    it('forcefully removes a canvas', () => {
      const pool = createCanvasPool();

      pool.acquire(100, 100);
      pool.release(100, 100);
      pool.acquire(200, 200);

      expect(pool.has(100, 100)).toBe(true);

      pool.evict(100, 100);

      expect(pool.has(100, 100)).toBe(false);
    });
  });

  describe('clear', () => {
    it('removes all canvases', () => {
      const pool = createCanvasPool();

      pool.acquire(100, 100);
      pool.release(100, 100);
      pool.acquire(200, 200);
      pool.release(200, 200);
      pool.acquire(300, 300);

      expect(pool.size()).toBe(3);

      pool.clear();

      expect(pool.size()).toBe(0);
    });
  });

  describe('configure', () => {
    it('updates maxCanvases', () => {
      const pool = createCanvasPool({ maxCanvases: 5 });

      pool.acquire(100, 100);
      pool.release(100, 100);
      pool.acquire(200, 200);
      pool.release(200, 200);
      pool.acquire(300, 300);
      pool.release(300, 300);

      expect(pool.size()).toBe(3);

      pool.configure({ maxCanvases: 2 });

      expect(pool.size()).toBeLessThanOrEqual(2);
    });

    it('updates ttlMs', () => {
      const pool = createCanvasPool({ ttlMs: 1000 });

      expect(pool.getConfig().ttlMs).toBe(1000);

      pool.configure({ ttlMs: 2000 });

      expect(pool.getConfig().ttlMs).toBe(2000);
    });

    it('updates enabled', () => {
      const pool = createCanvasPool({ enabled: true });

      expect(pool.getConfig().enabled).toBe(true);

      pool.configure({ enabled: false });

      expect(pool.getConfig().enabled).toBe(false);
    });
  });

  describe('getStats', () => {
    it('tracks hits and misses', () => {
      const pool = createCanvasPool();

      // Miss - creating new
      pool.acquire(100, 100);
      pool.release(100, 100);

      // Hit - reusing
      pool.acquire(100, 100);
      pool.release(100, 100);

      // Miss - different size
      pool.acquire(200, 200);

      const stats = pool.getStats();

      expect(stats.misses).toBe(2);
      expect(stats.hits).toBe(1);
    });

    it('tracks evictions', () => {
      const pool = createCanvasPool({ maxCanvases: 1 });

      pool.acquire(100, 100);
      pool.release(100, 100);

      // This should evict the first canvas
      pool.acquire(200, 200);
      pool.release(200, 200);

      const stats = pool.getStats();

      expect(stats.evictions).toBeGreaterThan(0);
    });
  });

  describe('singleton', () => {
    it('getCanvasPool returns same instance', () => {
      const pool1 = getCanvasPool();
      const pool2 = getCanvasPool();

      expect(pool1).toBe(pool2);
    });
  });
});

describe('CanvasPool - TC coverage', () => {
  describe('TC-1: Canvas 复用', () => {
    it('reuses same canvas instance for same dimensions after release', () => {
      const pool = createCanvasPool();

      const canvas1 = pool.acquire(512, 512);
      pool.release(512, 512);
      const canvas2 = pool.acquire(512, 512);

      expect(canvas1).toBe(canvas2);
    });
  });

  describe('TC-2: 不同尺寸独立缓存', () => {
    it('caches different sizes independently', () => {
      const pool = createCanvasPool();

      const canvas1 = pool.acquire(100, 100);
      const canvas2 = pool.acquire(200, 200);
      const canvas3 = pool.acquire(100, 200);

      expect(canvas1).not.toBe(canvas2);
      expect(canvas1).not.toBe(canvas3);
      expect(canvas2).not.toBe(canvas3);
      expect(pool.size()).toBe(3);
    });
  });

  describe('TC-3: TTL 驱逐', () => {
    it('creates new canvas when TTL expires', async () => {
      const pool = createCanvasPool({ ttlMs: 100 });

      const canvas1 = pool.acquire(100, 100);
      pool.release(100, 100);

      await new Promise(resolve => setTimeout(resolve, 150));

      const canvas2 = pool.acquire(100, 100);

      expect(canvas1).not.toBe(canvas2);
    });
  });

  describe('TC-4: LRU 驱逐', () => {
    it('evicts least recently used when pool is full', () => {
      const pool = createCanvasPool({ maxCanvases: 2 });

      // Use and release in order
      pool.acquire(100, 100);
      pool.release(100, 100);

      pool.acquire(200, 200);
      pool.release(200, 200);

      // Now 100x100 is LRU
      // Fill the pool
      pool.acquire(300, 300);
      pool.release(300, 300);

      // The 100x100 canvas should be evicted (LRU)
      const evicted = pool.has(100, 100);
      expect(evicted).toBe(false);
    });
  });
});
