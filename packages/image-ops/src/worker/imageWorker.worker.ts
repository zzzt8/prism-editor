// Image Worker - OffscreenCanvas-based image processing in Web Worker
// This worker runs image operations off the main thread to avoid blocking UI

import * as Comlink from 'comlink';
import type { BlendMode, TransformOptions, MaskOptions, ExportOptions } from '@prism/shared-types';
import { registerImageDataTransferHandler } from '../comlink-image-data-transfer';
import { CanvasPool, getCanvasPool } from './canvasPool';
import { applyMask as applyMaskJS } from '../apply-mask';

registerImageDataTransferHandler();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const selfAny = typeof self !== 'undefined' ? self as any : null;

// Check if OffscreenCanvas is supported
const hasOffscreenCanvas = typeof OffscreenCanvas !== 'undefined';

/**
 * Image processing results returned from worker methods.
 * All ImageData is transferable for efficient memory management.
 */
export interface WorkerImageResult {
  data: ImageData;
  width: number;
  height: number;
  colorSpace: PredefinedColorSpace;
}

/**
 * Load image result with metadata
 */
export interface WorkerLoadResult {
  data: ImageData;
  width: number;
  height: number;
  crossOriginUsed: boolean;
}

/**
 * Export result with blob
 */
export interface WorkerExportResult {
  blob: Blob;
  width: number;
  height: number;
  mimeType: string;
}

/**
 * Worker status for health monitoring
 */
export interface WorkerStatus {
  id: string;
  ready: boolean;
  processedCount: number;
  errorCount: number;
  lastError?: string;
}

/**
 * ImageWorker - Comlink-exposed API for image processing operations.
 * All operations run on OffscreenCanvas within this worker thread.
 * Uses CanvasPool for efficient canvas reuse.
 */
export class ImageWorker {
  private canvasPool: CanvasPool;
  private id: string;
  private processedCount = 0;
  private errorCount = 0;
  private lastError: string | undefined;

  constructor(id: string = 'worker-1', poolConfig?: { maxCanvases?: number; ttlMs?: number; enabled?: boolean }) {
    this.id = id;
    this.canvasPool = poolConfig ? new CanvasPool(poolConfig) : getCanvasPool();
    this.initCanvas();
  }

  /**
   * Initialize - verify canvas pool is ready.
   */
  private initCanvas(): void {
    if (!hasOffscreenCanvas) {
      this.lastError = 'OffscreenCanvas not supported';
      this.errorCount++;
    }
  }

  /**
   * Get a canvas from the pool for the given dimensions.
   */
  private getCanvas(width: number, height: number): OffscreenCanvas {
    return this.canvasPool.acquire(width, height);
  }

  /**
   * Release a canvas back to the pool.
   */
  private releaseCanvas(width: number, height: number): void {
    this.canvasPool.release(width, height);
  }

  /**
   * Get pool stats for debugging/monitoring.
   */
  getPoolStats() {
    return this.canvasPool.getStats();
  }

  /**
   * Configure the canvas pool.
   */
  configurePool(config: { maxCanvases?: number; ttlMs?: number; enabled?: boolean }): void {
    this.canvasPool.configure(config);
  }

  /**
   * Get memory usage stats for monitoring.
   * Returns canvas pool stats that can be used to verify memory doesn't grow unbounded.
   */
  getMemoryStats() {
    const poolStats = this.canvasPool.getStats();
    return {
      poolStats,
      memoryBound: this.canvasPool.getConfig().maxCanvases,
      description: 'Canvas pool prevents unbounded memory growth by limiting cached canvases',
    };
  }

  /**
   * Load image from URL using fetch + createImageBitmap.
   * Runs entirely in worker thread.
   */
  async loadImage(url: string, crossOrigin?: 'anonymous' | 'use-credentials'): Promise<WorkerLoadResult> {
    let canvas: OffscreenCanvas | null = null;
    try {
      const options: RequestInit = {};
      if (crossOrigin) {
        options.headers = { 'Origin': typeof window !== 'undefined' ? window.location.origin : (selfAny?.location?.origin ?? '*') };
      }

      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`Failed to load image: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const imageBitmap = await createImageBitmap(blob);

      const width = imageBitmap.width;
      const height = imageBitmap.height;

      canvas = this.getCanvas(width, height);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        throw new Error('Canvas context not available');
      }

      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(imageBitmap, 0, 0);
      const imageData = ctx.getImageData(0, 0, width, height);

      imageBitmap.close();
      this.processedCount++;

      return {
        data: imageData,
        width,
        height,
        crossOriginUsed: crossOrigin === 'anonymous',
      };
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'Load failed';
      this.errorCount++;
      throw err;
    } finally {
      if (canvas) {
        this.releaseCanvas(canvas.width, canvas.height);
      }
    }
  }

  /**
   * Resize image to target dimensions.
   * Uses high-quality bicubic interpolation.
   */
  async resize(data: ImageData, width: number, height: number): Promise<WorkerImageResult> {
    let srcCanvas: OffscreenCanvas | null = null;
    let dstCanvas: OffscreenCanvas | null = null;
    try {
      srcCanvas = this.getCanvas(data.width, data.height);
      const srcCtx = srcCanvas.getContext('2d')!;
      srcCtx.putImageData(data, 0, 0);

      dstCanvas = this.getCanvas(width, height);
      const dstCtx = dstCanvas.getContext('2d', { willReadFrequently: true })!;

      dstCtx.imageSmoothingEnabled = true;
      dstCtx.imageSmoothingQuality = 'high';
      dstCtx.clearRect(0, 0, width, height);
      dstCtx.drawImage(srcCanvas, 0, 0, width, height);

      const result = dstCtx.getImageData(0, 0, width, height);
      this.processedCount++;

      return { data: result, width, height, colorSpace: result.colorSpace };
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'Resize failed';
      this.errorCount++;
      throw err;
    } finally {
      if (srcCanvas) this.releaseCanvas(srcCanvas.width, srcCanvas.height);
      if (dstCanvas) this.releaseCanvas(dstCanvas.width, dstCanvas.height);
    }
  }

  /**
   * Composite two images using specified blend mode.
   */
  async composite(
    base: ImageData,
    overlay: ImageData,
    mode: BlendMode = 'normal',
    opacity: number = 1
  ): Promise<WorkerImageResult> {
    let baseCanvas: OffscreenCanvas | null = null;
    let overlayCanvas: OffscreenCanvas | null = null;
    let dstCanvas: OffscreenCanvas | null = null;
    try {
      const width = base.width;
      const height = base.height;

      // If overlay is different size, resize it
      let overlayData = overlay;
      if (overlay.width !== width || overlay.height !== height) {
        overlayData = (await this.resize(overlay, width, height)).data;
      }

      baseCanvas = this.getCanvas(width, height);
      const baseCtx = baseCanvas.getContext('2d')!;
      baseCtx.putImageData(base, 0, 0);

      overlayCanvas = this.getCanvas(width, height);
      const overlayCtx = overlayCanvas.getContext('2d')!;
      overlayCtx.putImageData(overlayData, 0, 0);

      dstCanvas = this.getCanvas(width, height);
      const dstCtx = dstCanvas.getContext('2d', { willReadFrequently: true })!;

      // Draw base
      dstCtx.clearRect(0, 0, width, height);
      dstCtx.globalAlpha = opacity;
      dstCtx.globalCompositeOperation = this.convertBlendMode(mode);
      dstCtx.drawImage(baseCanvas, 0, 0);

      // Draw overlay on top
      dstCtx.drawImage(overlayCanvas, 0, 0);

      // Reset composite operation
      dstCtx.globalCompositeOperation = 'source-over';
      dstCtx.globalAlpha = 1;

      const result = dstCtx.getImageData(0, 0, width, height);
      this.processedCount++;

      return { data: result, width, height, colorSpace: result.colorSpace };
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'Composite failed';
      this.errorCount++;
      throw err;
    } finally {
      if (baseCanvas) this.releaseCanvas(baseCanvas.width, baseCanvas.height);
      if (overlayCanvas) this.releaseCanvas(overlayCanvas.width, overlayCanvas.height);
      if (dstCanvas) this.releaseCanvas(dstCanvas.width, dstCanvas.height);
    }
  }

  /**
   * Convert image to grayscale using simple average: RGB = (R + G + B) / 3
   * Used for mask preparation before thresholding.
   */
  async toGrayscale(maskData: ImageData): Promise<ImageData> {
    let srcCanvas: OffscreenCanvas | null = null;
    let dstCanvas: OffscreenCanvas | null = null;
    try {
      const { width, height } = maskData;

      srcCanvas = this.getCanvas(width, height);
      const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true })!;
      srcCtx.putImageData(maskData, 0, 0);

      dstCanvas = this.getCanvas(width, height);
      const dstCtx = dstCanvas.getContext('2d', { willReadFrequently: true })!;

      // Read pixel data and convert to grayscale using simple average
      const imageData = srcCtx.getImageData(0, 0, width, height);
      const result = dstCtx.createImageData(width, height);
      const src = imageData.data;
      const dst = result.data;

      for (let i = 0; i < src.length; i += 4) {
        const gray = (src[i] + src[i + 1] + src[i + 2]) / 3;
        dst[i] = gray;
        dst[i + 1] = gray;
        dst[i + 2] = gray;
        dst[i + 3] = src[i + 3];
      }

      dstCtx.putImageData(result, 0, 0);

      this.processedCount++;

      return result;
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'toGrayscale failed';
      this.errorCount++;
      throw err;
    } finally {
      if (srcCanvas) this.releaseCanvas(srcCanvas.width, srcCanvas.height);
      if (dstCanvas) this.releaseCanvas(dstCanvas.width, dstCanvas.height);
    }
  }

  /**
   * Convert image to luminance using standard formula: Y = 0.299R + 0.587G + 0.114B
   * Perceptual luminance is more accurate than simple grayscale for human vision.
   */
  async toLuminance(maskData: ImageData): Promise<ImageData> {
    let srcCanvas: OffscreenCanvas | null = null;
    let dstCanvas: OffscreenCanvas | null = null;
    try {
      const { width, height } = maskData;

      srcCanvas = this.getCanvas(width, height);
      const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true })!;
      srcCtx.putImageData(maskData, 0, 0);

      dstCanvas = this.getCanvas(width, height);
      const dstCtx = dstCanvas.getContext('2d', { willReadFrequently: true })!;

      // Use canvas filter with proper luminance weights via CSS
      // Note: CSS grayscale doesn't use luminance weights, so we implement manually
      const imageData = srcCtx.getImageData(0, 0, width, height);
      const result = dstCtx.createImageData(width, height);
      const src = imageData.data;
      const dst = result.data;

      for (let i = 0; i < src.length; i += 4) {
        const gray = Math.round(0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2]);
        dst[i] = gray;
        dst[i + 1] = gray;
        dst[i + 2] = gray;
        dst[i + 3] = src[i + 3];
      }

      dstCtx.putImageData(result, 0, 0);

      this.processedCount++;

      return result;
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'toLuminance failed';
      this.errorCount++;
      throw err;
    } finally {
      if (srcCanvas) this.releaseCanvas(srcCanvas.width, srcCanvas.height);
      if (dstCanvas) this.releaseCanvas(dstCanvas.width, dstCanvas.height);
    }
  }

  /**
   * Apply brightness mask using Canvas 2D with destination-in compositing.
   * Brightness = (R + G + B) / 3
   * Steps: 1) Convert mask to grayscale, 2) Apply threshold, 3) Use destination-in composite.
   */
  async applyBrightnessMaskCanvas(
    image: ImageData,
    mask: ImageData,
    threshold: number,
    invert: boolean
  ): Promise<ImageData> {
    let srcCanvas: OffscreenCanvas | null = null;
    let maskCanvas: OffscreenCanvas | null = null;
    let dstCanvas: OffscreenCanvas | null = null;
    try {
      const { width, height } = image;

      // 1. Resize mask if needed
      let maskData = mask;
      if (mask.width !== width || mask.height !== height) {
        maskData = (await this.resize(mask, width, height)).data;
      }

      // 2. Convert to grayscale
      const grayscale = await this.toGrayscale(maskData);

      // 3. Apply threshold to get binary mask
      const binaryMask = this.applyThreshold(grayscale, threshold, invert);

      // 4. Create canvases
      srcCanvas = this.getCanvas(width, height);
      maskCanvas = this.getCanvas(width, height);
      dstCanvas = this.getCanvas(width, height);

      const srcCtx = srcCanvas.getContext('2d')!;
      const maskCtx = maskCanvas.getContext('2d')!;
      const dstCtx = dstCanvas.getContext('2d', { willReadFrequently: true })!;

      // 5. Draw and composite
      srcCtx.putImageData(image, 0, 0);
      maskCtx.putImageData(binaryMask, 0, 0);

      dstCtx.clearRect(0, 0, width, height);
      dstCtx.globalCompositeOperation = 'source-over';
      dstCtx.drawImage(srcCanvas, 0, 0);
      dstCtx.globalCompositeOperation = 'destination-in';
      dstCtx.drawImage(maskCanvas, 0, 0);

      this.processedCount++;

      return dstCtx.getImageData(0, 0, width, height);
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'applyBrightnessMaskCanvas failed';
      this.errorCount++;
      throw err;
    } finally {
      if (srcCanvas) this.releaseCanvas(srcCanvas.width, srcCanvas.height);
      if (maskCanvas) this.releaseCanvas(maskCanvas.width, maskCanvas.height);
      if (dstCanvas) this.releaseCanvas(dstCanvas.width, dstCanvas.height);
    }
  }

  /**
   * Apply luminance mask using Canvas 2D with destination-in compositing.
   * Luminance = 0.299R + 0.587G + 0.114B (ITU-R BT.601 standard)
   * Steps: 1) Convert mask to luminance, 2) Apply threshold, 3) Use destination-in composite.
   */
  async applyLuminanceMaskCanvas(
    image: ImageData,
    mask: ImageData,
    threshold: number,
    invert: boolean
  ): Promise<ImageData> {
    let srcCanvas: OffscreenCanvas | null = null;
    let maskCanvas: OffscreenCanvas | null = null;
    let dstCanvas: OffscreenCanvas | null = null;
    try {
      const { width, height } = image;

      // 1. Resize mask if needed
      let maskData = mask;
      if (mask.width !== width || mask.height !== height) {
        maskData = (await this.resize(mask, width, height)).data;
      }

      // 2. Convert to luminance
      const luminance = await this.toLuminance(maskData);

      // 3. Apply threshold to get binary mask
      const binaryMask = this.applyThreshold(luminance, threshold, invert);

      // 4. Create canvases
      srcCanvas = this.getCanvas(width, height);
      maskCanvas = this.getCanvas(width, height);
      dstCanvas = this.getCanvas(width, height);

      const srcCtx = srcCanvas.getContext('2d')!;
      const maskCtx = maskCanvas.getContext('2d')!;
      const dstCtx = dstCanvas.getContext('2d', { willReadFrequently: true })!;

      // 5. Draw and composite
      srcCtx.putImageData(image, 0, 0);
      maskCtx.putImageData(binaryMask, 0, 0);

      dstCtx.clearRect(0, 0, width, height);
      dstCtx.globalCompositeOperation = 'source-over';
      dstCtx.drawImage(srcCanvas, 0, 0);
      dstCtx.globalCompositeOperation = 'destination-in';
      dstCtx.drawImage(maskCanvas, 0, 0);

      this.processedCount++;

      return dstCtx.getImageData(0, 0, width, height);
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'applyLuminanceMaskCanvas failed';
      this.errorCount++;
      throw err;
    } finally {
      if (srcCanvas) this.releaseCanvas(srcCanvas.width, srcCanvas.height);
      if (maskCanvas) this.releaseCanvas(maskCanvas.width, maskCanvas.height);
      if (dstCanvas) this.releaseCanvas(dstCanvas.width, dstCanvas.height);
    }
  }

  /**
   * Apply threshold to create binary mask.
   * Pixels above threshold become white (255), below become black (0).
   * If invert=true, the logic is reversed.
   */
  applyThreshold(maskData: ImageData, threshold: number, invert: boolean = false): ImageData {
    const { width, height } = maskData;
    const result = new ImageData(width, height, { colorSpace: maskData.colorSpace });
    const src = maskData.data;
    const dst = result.data;

    // Normalize threshold to 0-255 range if needed
    const normalizedThreshold = threshold > 1 ? threshold : threshold * 255;

    for (let i = 0; i < src.length; i += 4) {
      // Use grayscale value (average of RGB) for threshold comparison
      const value = (src[i] + src[i + 1] + src[i + 2]) / 3;
      const aboveThreshold = value >= normalizedThreshold;
      const binary = invert ? !aboveThreshold : aboveThreshold;
      const byte = binary ? 255 : 0;

      dst[i] = byte;
      dst[i + 1] = byte;
      dst[i + 2] = byte;
      dst[i + 3] = 255; // Always fully opaque for binary mask
    }

    this.processedCount++;
    return result;
  }

  /**
   * Build a mask ImageData for Canvas compositing that matches main-thread
   * `applyAlphaMask`: threshold is applied to the **red channel** of the mask
   * (not the mask's alpha channel). Grayscale B&W masks with A=255 everywhere
   * therefore work the same as JS; raw destination-in on the mask RGBA would
   * ignore luminance and keep the full image.
   */
  private buildAlphaMaskFromRedChannel(
    maskData: ImageData,
    threshold: number,
    invert: boolean
  ): ImageData {
    const { width, height } = maskData;
    const out = new ImageData(width, height, { colorSpace: maskData.colorSpace });
    const src = maskData.data;
    const dst = out.data;
    const thresholdFn = invert
      ? (v: number) => (v < threshold ? 255 : 0)
      : (v: number) => (v >= threshold ? 255 : 0);

    for (let i = 0; i < src.length; i += 4) {
      const maskValue = src[i];
      const alphaValue = thresholdFn(maskValue);
      dst[i] = 255;
      dst[i + 1] = 255;
      dst[i + 2] = 255;
      dst[i + 3] = alphaValue;
    }
    return out;
  }

  /**
   * Apply alpha mask using Canvas 2D destination-in compositing.
   * Mask semantics match `applyAlphaMask` (R channel + threshold), not raw mask alpha.
   */
  async applyMaskCanvas(
    image: ImageData,
    mask: ImageData,
    options: MaskOptions
  ): Promise<WorkerImageResult> {
    let srcCanvas: OffscreenCanvas | null = null;
    let maskCanvas: OffscreenCanvas | null = null;
    let dstCanvas: OffscreenCanvas | null = null;

    try {
      const { threshold = 128, invert = false } = options;
      const width = image.width;
      const height = image.height;

      // 1. Resize mask if needed
      let maskData = mask;
      if (mask.width !== width || mask.height !== height) {
        maskData = (await this.resize(mask, width, height)).data;
      }

      // 2. R-channel mask → alpha for destination-in (parity with applyAlphaMask)
      const maskAsAlpha = this.buildAlphaMaskFromRedChannel(maskData, threshold, invert);

      // 3. Create canvas buffers
      srcCanvas = this.getCanvas(width, height);
      maskCanvas = this.getCanvas(width, height);
      dstCanvas = this.getCanvas(width, height);

      const srcCtx = srcCanvas.getContext('2d')!;
      const maskCtx = maskCanvas.getContext('2d')!;
      const dstCtx = dstCanvas.getContext('2d', { willReadFrequently: true })!;

      srcCtx.putImageData(image, 0, 0);
      maskCtx.putImageData(maskAsAlpha, 0, 0);

      dstCtx.clearRect(0, 0, width, height);
      dstCtx.globalCompositeOperation = 'source-over';
      dstCtx.drawImage(srcCanvas, 0, 0);
      dstCtx.globalCompositeOperation = 'destination-in';
      dstCtx.drawImage(maskCanvas, 0, 0);

      const result = dstCtx.getImageData(0, 0, width, height);

      this.processedCount++;

      return { data: result, width, height, colorSpace: result.colorSpace };
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'Canvas alpha mask failed';
      this.errorCount++;
      throw err;
    } finally {
      if (srcCanvas) this.releaseCanvas(srcCanvas.width, srcCanvas.height);
      if (maskCanvas) this.releaseCanvas(maskCanvas.width, maskCanvas.height);
      if (dstCanvas) this.releaseCanvas(dstCanvas.width, dstCanvas.height);
    }
  }

  /**
   * Apply mask to image using Canvas 2D destination-in compositing for alpha type.
   * For type === 'alpha': uses Canvas 2D destination-in for optimal performance.
   * For type === 'brightness' or 'luminance': uses Canvas 2D with destination-in.
   * For other types: falls back to JS pixel-by-pixel processing.
   */
  async applyMask(
    image: ImageData,
    mask: ImageData,
    options: MaskOptions
  ): Promise<WorkerImageResult> {
    const { type, threshold = 128, invert = false } = options;

    // Use Canvas 2D path for alpha type
    if (type === 'alpha' && hasOffscreenCanvas) {
      try {
        return await this.applyMaskCanvas(image, mask, options);
      } catch (err) {
        console.warn('[ImageWorker] applyMaskCanvas failed, falling back to JS:', err);
        const result = this.applyMaskFallbackJS(image, mask, options);
        return { data: result, width: result.width, height: result.height, colorSpace: result.colorSpace };
      }
    }

    // Use Canvas 2D destination-in path for brightness type
    if (type === 'brightness' && hasOffscreenCanvas) {
      try {
        const result = await this.applyBrightnessMaskCanvas(image, mask, threshold, invert);
        return { data: result, width: image.width, height: image.height, colorSpace: result.colorSpace };
      } catch (err) {
        console.warn('[ImageWorker] applyBrightnessMaskCanvas failed, falling back to JS:', err);
        const result = this.applyMaskFallbackJS(image, mask, options);
        return { data: result, width: result.width, height: result.height, colorSpace: result.colorSpace };
      }
    }

    // Use Canvas 2D destination-in path for luminance type
    if (type === 'luminance' && hasOffscreenCanvas) {
      try {
        const result = await this.applyLuminanceMaskCanvas(image, mask, threshold, invert);
        return { data: result, width: image.width, height: image.height, colorSpace: result.colorSpace };
      } catch (err) {
        console.warn('[ImageWorker] applyLuminanceMaskCanvas failed, falling back to JS:', err);
        const result = this.applyMaskFallbackJS(image, mask, options);
        return { data: result, width: result.width, height: result.height, colorSpace: result.colorSpace };
      }
    }

    // JS path for non-Canvas types or when Canvas is unavailable
    let canvas: OffscreenCanvas | null = null;
    try {
      const width = image.width;
      const height = image.height;

      canvas = this.getCanvas(width, height);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        throw new Error('Canvas context not available');
      }

      // Resize mask if needed
      let maskData = mask;
      if (mask.width !== width || mask.height !== height) {
        maskData = (await this.resize(mask, width, height)).data;
      }

      const result = ctx.createImageData(width, height);
      const src = image.data;
      const msk = maskData.data;
      const dst = result.data;

      for (let i = 0; i < src.length; i += 4) {
        // Calculate mask value based on type
        let maskValue: number;
        if (type === 'alpha') {
          maskValue = msk[i + 3] / 255;
        } else if (type === 'brightness') {
          maskValue = ((msk[i] + msk[i + 1] + msk[i + 2]) / 3) / 255;
        } else {
          // luminance
          maskValue = (0.299 * msk[i] + 0.587 * msk[i + 1] + 0.114 * msk[i + 2]) / 255;
        }

        // Apply threshold
        if (invert) {
          maskValue = 1 - maskValue;
        }
        maskValue = maskValue > (threshold / 255) ? 1 : 0;

        // Apply mask to RGB
        dst[i] = src[i] * maskValue;
        dst[i + 1] = src[i + 1] * maskValue;
        dst[i + 2] = src[i + 2] * maskValue;
        dst[i + 3] = src[i + 3];
      }

      this.processedCount++;

      return { data: result, width, height, colorSpace: result.colorSpace };
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'ApplyMask failed';
      this.errorCount++;
      throw err;
    } finally {
      if (canvas) this.releaseCanvas(canvas.width, canvas.height);
    }
  }

  /**
   * Apply mask using pure JavaScript fallback (no Canvas required).
   * Reuses the JS implementation from apply-mask.ts.
   * Used when OffscreenCanvas is unavailable or canvas operations fail.
   */
  applyMaskFallbackJS(
    image: ImageData,
    mask: ImageData,
    options: MaskOptions
  ): ImageData {
    return applyMaskJS(image, mask, options);
  }

  /**
   * Apply mask with automatic fallback to JS implementation.
   * Tries Canvas-based operation first; falls back to pure JS if canvas fails.
   * Useful for environments where OffscreenCanvas may be unavailable or buggy.
   */
  async applyMaskWithFallback(
    image: ImageData,
    mask: ImageData,
    options: MaskOptions
  ): Promise<WorkerImageResult> {
    // If OffscreenCanvas is not supported, use JS directly
    if (!hasOffscreenCanvas) {
      const result = this.applyMaskFallbackJS(image, mask, options);
      return { data: result, width: result.width, height: result.height, colorSpace: result.colorSpace };
    }

    try {
      // Try Canvas-based implementation first
      return await this.applyMask(image, mask, options);
    } catch (err) {
      // Canvas operation failed, fall back to JS
      this.lastError = `Canvas applyMask failed (${err instanceof Error ? err.message : String(err)}), falling back to JS`;
      console.warn('[ImageWorker] Canvas applyMask failed, using JS fallback:', err);

      const result = this.applyMaskFallbackJS(image, mask, options);
      return { data: result, width: result.width, height: result.height, colorSpace: result.colorSpace };
    }
  }

  /**
   * Transform image with translate, scale, rotate, crop
   */
  async transform(image: ImageData, options: TransformOptions): Promise<WorkerImageResult> {
    let srcCanvas: OffscreenCanvas | null = null;
    let dstCanvas: OffscreenCanvas | null = null;
    try {
      const {
        translateX = 0,
        translateY = 0,
        scaleX = 1,
        scaleY = 1,
        rotation = 0,
        cropX = 0,
        cropY = 0,
        cropWidth = 0,
        cropHeight = 0,
        cropMode = 'top-left',
      } = options;

      console.log('[Worker Transform] options:', JSON.stringify(options));
      console.log('[Worker Transform] image:', image.width, 'x', image.height);

      // Scale first, then crop (user's desired order)
      // Full image dimensions after scaling
      const scaledWidth = Math.round(image.width * scaleX);
      const scaledHeight = Math.round(image.height * scaleY);

      // Determine final output dimensions
      // If cropWidth/cropHeight specified, use those as output size; otherwise use scaled dimensions
      const finalWidth = cropWidth > 0 ? cropWidth : scaledWidth;
      const finalHeight = cropHeight > 0 ? cropHeight : scaledHeight;

      // Calculate crop offset based on cropMode
      let effectiveCropX: number;
      let effectiveCropY: number;
      if (cropMode === 'center') {
        effectiveCropX = cropX !== 0 ? cropX : Math.round((scaledWidth - finalWidth) / 2);
        effectiveCropY = cropY !== 0 ? cropY : Math.round((scaledHeight - finalHeight) / 2);
      } else {
        effectiveCropX = cropX;
        effectiveCropY = cropY;
      }

      console.log('[Worker Transform] scaled:', scaledWidth, 'x', scaledHeight);
      console.log('[Worker Transform] final:', finalWidth, 'x', finalHeight);
      console.log('[Worker Transform] crop:', effectiveCropX, 'x', effectiveCropY, '(mode:', cropMode, ')');

      // Create scaled canvas and load image
      srcCanvas = this.getCanvas(scaledWidth, scaledHeight);
      const srcCtx = srcCanvas.getContext('2d')!;
      // First put image data, then create bitmap for scaling
      const tempCanvas = this.getCanvas(image.width, image.height);
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCtx.putImageData(image, 0, 0);
      const tempBitmap = await createImageBitmap(tempCanvas);
      this.releaseCanvas(image.width, image.height);

      srcCtx.imageSmoothingEnabled = true;
      srcCtx.imageSmoothingQuality = 'high';
      srcCtx.clearRect(0, 0, scaledWidth, scaledHeight);
      srcCtx.drawImage(tempBitmap, 0, 0, scaledWidth, scaledHeight);
      tempBitmap.close();

      // Create final output canvas
      dstCanvas = this.getCanvas(finalWidth, finalHeight);
      const dstCtx = dstCanvas.getContext('2d', { willReadFrequently: true })!;

      // Apply transformations
      dstCtx.save();
      dstCtx.clearRect(0, 0, finalWidth, finalHeight);

      if (rotation !== 0) {
        dstCtx.translate(finalWidth / 2, finalHeight / 2);
        dstCtx.rotate((rotation * Math.PI) / 180);
        dstCtx.translate(-finalWidth / 2, -finalHeight / 2);
      }

      if (translateX !== 0 || translateY !== 0) {
        dstCtx.translate(translateX, translateY);
      }

      // Draw the cropped region from scaled image to final canvas
      dstCtx.imageSmoothingEnabled = true;
      dstCtx.imageSmoothingQuality = 'high';
      dstCtx.drawImage(
        srcCanvas,
        effectiveCropX, effectiveCropY, finalWidth, finalHeight,  // source rect (from scaled image)
        0, 0, finalWidth, finalHeight                              // dest rect
      );
      dstCtx.restore();

      const result = dstCtx.getImageData(0, 0, finalWidth, finalHeight);
      console.log('[Worker Transform] result:', finalWidth, 'x', finalHeight);
      this.processedCount++;

      return { data: result, width: finalWidth, height: finalHeight, colorSpace: result.colorSpace };
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'Transform failed';
      this.errorCount++;
      throw err;
    } finally {
      if (srcCanvas) this.releaseCanvas(srcCanvas.width, srcCanvas.height);
      if (dstCanvas) this.releaseCanvas(dstCanvas.width, dstCanvas.height);
    }
  }

  /**
   * Export image to blob
   */
  async exportImage(
    data: ImageData,
    options: ExportOptions
  ): Promise<WorkerExportResult> {
    let canvas: OffscreenCanvas | null = null;
    try {
      const {
        format = 'png',
        quality = 0.92,
        width = 0,
        height = 0,
      } = options;

      const exportWidth = width > 0 ? width : data.width;
      const exportHeight = height > 0 ? height : data.height;

      canvas = this.getCanvas(exportWidth, exportHeight);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        throw new Error('Canvas context not available');
      }

      // Resize if needed
      let imageData = data;
      if (data.width !== exportWidth || data.height !== exportHeight) {
        imageData = (await this.resize(data, exportWidth, exportHeight)).data;
      }

      ctx.putImageData(imageData, 0, 0);

      const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
      const blob = await canvas.convertToBlob({ type: mimeType, quality });

      this.processedCount++;

      return { blob, width: exportWidth, height: exportHeight, mimeType };
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'Export failed';
      this.errorCount++;
      throw err;
    } finally {
      if (canvas) this.releaseCanvas(canvas.width, canvas.height);
    }
  }

  /**
   * Get worker health status
   */
  getStatus(): WorkerStatus {
    return {
      id: this.id,
      ready: this.canvasPool !== null,
      processedCount: this.processedCount,
      errorCount: this.errorCount,
      lastError: this.lastError,
    };
  }

  /**
   * Create group-level composite.
   * Composites multiple overlays onto base in a single operation.
   */
  async createGroupComposite(
    base: ImageData,
    overlays: ImageData[],
    mode: BlendMode = 'normal',
    opacity: number = 1
  ): Promise<WorkerImageResult> {
    let baseCanvas: OffscreenCanvas | null = null;
    let dstCanvas: OffscreenCanvas | null = null;
    const overlayCanvases: OffscreenCanvas[] = [];
    try {
      if (overlays.length === 0) {
        return { data: base, width: base.width, height: base.height, colorSpace: base.colorSpace };
      }

      if (overlays.length === 1) {
        return this.composite(base, overlays[0], mode, opacity);
      }

      const width = base.width;
      const height = base.height;

      baseCanvas = this.getCanvas(width, height);
      const baseCtx = baseCanvas.getContext('2d')!;
      baseCtx.putImageData(base, 0, 0);

      dstCanvas = this.getCanvas(width, height);
      const dstCtx = dstCanvas.getContext('2d', { willReadFrequently: true })!;

      // Draw base to result canvas
      dstCtx.clearRect(0, 0, width, height);
      dstCtx.globalAlpha = 1;
      dstCtx.globalCompositeOperation = 'source-over';
      dstCtx.drawImage(baseCanvas, 0, 0);

      // Batch draw overlays
      dstCtx.globalAlpha = opacity;
      dstCtx.globalCompositeOperation = this.convertBlendMode(mode);

      for (const overlay of overlays) {
        let overlayData = overlay;

        // Resize overlay if different size
        if (overlay.width !== width || overlay.height !== height) {
          const resized = await this.resize(overlay, width, height);
          overlayData = resized.data;
        }

        const overlayCanvas = this.getCanvas(width, height);
        const overlayCtx = overlayCanvas.getContext('2d')!;
        overlayCtx.putImageData(overlayData, 0, 0);
        overlayCanvases.push(overlayCanvas);
        dstCtx.drawImage(overlayCanvas, 0, 0);
      }

      // Reset composite operation
      dstCtx.globalCompositeOperation = 'source-over';
      dstCtx.globalAlpha = 1;

      const result = dstCtx.getImageData(0, 0, width, height);
      this.processedCount++;

      return { data: result, width, height, colorSpace: result.colorSpace };
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'CreateGroupComposite failed';
      this.errorCount++;
      throw err;
    } finally {
      if (baseCanvas) this.releaseCanvas(baseCanvas.width, baseCanvas.height);
      if (dstCanvas) this.releaseCanvas(dstCanvas.width, dstCanvas.height);
      for (const c of overlayCanvases) {
        this.releaseCanvas(c.width, c.height);
      }
    }
  }

  /**
   * Convert our BlendMode type to canvas composite operation string
   */
  private convertBlendMode(mode: BlendMode): GlobalCompositeOperation {
    const modeMap: Record<BlendMode, GlobalCompositeOperation> = {
      'normal': 'source-over',
      'multiply': 'multiply',
      'screen': 'screen',
      'overlay': 'overlay',
      'darken': 'darken',
      'lighten': 'lighten',
      'color-dodge': 'color-dodge',
      'color-burn': 'color-burn',
      'hard-light': 'hard-light',
      'soft-light': 'soft-light',
      'difference': 'difference',
      'exclusion': 'exclusion',
    };
    return modeMap[mode] || 'source-over';
  }
}

// Create worker instance
const worker = new ImageWorker('worker-' + Math.random().toString(36).slice(2, 8));

// Expose via Comlink (only in worker context)
if (selfAny) {
  Comlink.expose(worker, selfAny);
}
