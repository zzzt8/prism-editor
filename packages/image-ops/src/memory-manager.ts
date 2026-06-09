// ImageMemoryManager - manages ObjectURL lifecycle with reference counting

import type { ImageRef, ImageMemoryStats } from '@prism/shared-types';

interface RefCount {
  count: number;
  ref: ImageRef;
}

const DEFAULT_MEMORY_LIMIT_BYTES = 500 * 1024 * 1024; // 500MB

export class ImageMemoryManager {
  private registry = new Map<string, RefCount>();
  private memoryUsed = 0;

  constructor(private _memoryLimit = DEFAULT_MEMORY_LIMIT_BYTES) {}

  createObjectURL(blob: Blob, width: number, height: number): ImageRef {
    const url = URL.createObjectURL(blob);
    // Canvas 2D memory = width * height * 4 bytes (RGBA)
    const estimatedSize = width * height * 4;

    const ref: ImageRef = {
      type: 'blob-url',
      url,
      width,
      height,
      mimeType: blob.type,
      cleanup: () => this.revoke(url),
    };

    this.registry.set(url, { count: 1, ref });
    this.memoryUsed += estimatedSize;

    if (this.memoryUsed > this._memoryLimit) {
      this.evictLargest();
    }

    return ref;
  }

  registerRef(ref: ImageRef): void {
    const existing = this.registry.get(ref.url);
    if (existing) {
      existing.count++;
    } else {
      // Estimate memory: width * height * 4 bytes (RGBA)
      const estimatedSize = ref.width * ref.height * 4;
      this.registry.set(ref.url, { count: 1, ref });
      this.memoryUsed += estimatedSize;

      if (this.memoryUsed > this._memoryLimit) {
        this.evictLargest();
      }
    }
  }

  revoke(url: string): void {
    const entry = this.registry.get(url);
    if (!entry) return;

    entry.count--;
    if (entry.count <= 0) {
      URL.revokeObjectURL(url);
      this.registry.delete(url);
      this.memoryUsed -= entry.ref.width * entry.ref.height * 4;
    }
  }

  revokeAll(): void {
    for (const [url, _entry] of this.registry) {
      URL.revokeObjectURL(url);
    }
    this.registry.clear();
    this.memoryUsed = 0;
  }

  private evictLargest(): void {
    // Evict largest images first (by pixel area) until under limit
    const entries = [...this.registry.entries()].sort(
      ([, a], [, b]) => b.ref.width * b.ref.height - a.ref.width * a.ref.height
    );

    for (const [url] of entries) {
      if (this.memoryUsed <= this._memoryLimit * 0.7) break; // stop at 70% capacity
      this.revoke(url);
    }
  }

  getStats(): ImageMemoryStats {
    return {
      totalUrls: this.registry.size,
      totalSizeBytes: this.memoryUsed,
      urlRegistry: [...this.registry.keys()],
    };
  }
}

// Singleton instance for use across the app
let _instance: ImageMemoryManager | null = null;

export function getImageMemoryManager(): ImageMemoryManager {
  if (!_instance) {
    _instance = new ImageMemoryManager();
  }
  return _instance;
}
