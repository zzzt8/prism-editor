// Image Worker - OffscreenCanvas-based image processing in Web Worker
// This worker runs image operations off the main thread to avoid blocking UI

import * as Comlink from 'comlink';
import type { BlendMode, TransformOptions, MaskOptions, ExportOptions } from '@prism/shared-types';

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
 */
export class ImageWorker {
  private canvas: OffscreenCanvas | null = null;
  private ctx: OffscreenCanvasRenderingContext2D | null = null;
  private id: string;
  private processedCount = 0;
  private errorCount = 0;
  private lastError: string | undefined;

  constructor(id: string = 'worker-1') {
    this.id = id;
    this.initCanvas();
  }

  /**
   * Initialize OffscreenCanvas for this worker.
   * Canvas is lazily sized on first operation.
   */
  private initCanvas(): void {
    if (!hasOffscreenCanvas) {
      this.lastError = 'OffscreenCanvas not supported';
      this.errorCount++;
      return;
    }

    try {
      // Create a reasonable default canvas size
      this.canvas = new OffscreenCanvas(1, 1);
      this.ctx = this.canvas.getContext('2d', {
        willReadFrequently: true,
      });
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'Canvas init failed';
      this.errorCount++;
    }
  }

  /**
   * Ensure canvas is sized for the given dimensions
   */
  private ensureCanvas(width: number, height: number): void {
    if (!this.canvas || !this.ctx) {
      this.initCanvas();
    }

    if (this.canvas && (this.canvas.width !== width || this.canvas.height !== height)) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    }
  }

  /**
   * Load image from URL using fetch + createImageBitmap.
   * Runs entirely in worker thread.
   */
  async loadImage(url: string, crossOrigin?: 'anonymous' | 'use-credentials'): Promise<WorkerLoadResult> {
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

      this.ensureCanvas(width, height);

      if (!this.ctx) {
        throw new Error('Canvas context not available');
      }

      this.ctx.clearRect(0, 0, width, height);
      this.ctx.drawImage(imageBitmap, 0, 0);
      const imageData = this.ctx.getImageData(0, 0, width, height);

      // Close the bitmap to free memory
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
    }
  }

  /**
   * Resize image to target dimensions.
   * Uses high-quality bicubic interpolation.
   */
  async resize(data: ImageData, width: number, height: number): Promise<WorkerImageResult> {
    try {
      this.ensureCanvas(data.width, data.height);

      if (!this.ctx) {
        throw new Error('Canvas context not available');
      }

      // Draw original to temp canvas
      const srcCanvas = new OffscreenCanvas(data.width, data.height);
      const srcCtx = srcCanvas.getContext('2d')!;
      srcCtx.putImageData(data, 0, 0);

      // Create destination canvas
      this.ensureCanvas(width, height);
      if (!this.ctx) {
        throw new Error('Canvas context not available');
      }

      // Use better quality settings
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';
      this.ctx.clearRect(0, 0, width, height);
      this.ctx.drawImage(srcCanvas, 0, 0, width, height);

      const result = this.ctx.getImageData(0, 0, width, height);
      this.processedCount++;

      return { data: result, width, height };
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'Resize failed';
      this.errorCount++;
      throw err;
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
    try {
      const width = base.width;
      const height = base.height;

      // If overlay is different size, resize it
      let overlayData = overlay;
      if (overlay.width !== width || overlay.height !== height) {
        overlayData = (await this.resize(overlay, width, height)).data;
      }

      this.ensureCanvas(width, height);
      if (!this.ctx) {
        throw new Error('Canvas context not available');
      }

      // Draw base
      const baseCanvas = new OffscreenCanvas(width, height);
      const baseCtx = baseCanvas.getContext('2d')!;
      baseCtx.putImageData(base, 0, 0);

      // Draw overlay with blend mode
      this.ctx.clearRect(0, 0, width, height);
      this.ctx.globalAlpha = opacity;
      this.ctx.globalCompositeOperation = this.convertBlendMode(mode);
      this.ctx.drawImage(baseCanvas, 0, 0);

      // Draw overlay on top
      const overlayCanvas = new OffscreenCanvas(width, height);
      const overlayCtx = overlayCanvas.getContext('2d')!;
      overlayCtx.putImageData(overlayData, 0, 0);
      this.ctx.drawImage(overlayCanvas, 0, 0);

      // Reset composite operation
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.globalAlpha = 1;

      const result = this.ctx.getImageData(0, 0, width, height);
      this.processedCount++;

      return { data: result, width, height };
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'Composite failed';
      this.errorCount++;
      throw err;
    }
  }

  /**
   * Apply mask to image
   */
  async applyMask(
    image: ImageData,
    mask: ImageData,
    options: MaskOptions
  ): Promise<WorkerImageResult> {
    try {
      const { type, threshold = 128, invert = false } = options;
      const width = image.width;
      const height = image.height;

      this.ensureCanvas(width, height);
      if (!this.ctx) {
        throw new Error('Canvas context not available');
      }

      // Resize mask if needed
      let maskData = mask;
      if (mask.width !== width || mask.height !== height) {
        maskData = (await this.resize(mask, width, height)).data;
      }

      const result = this.ctx.createImageData(width, height);
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

      return { data: result, width, height };
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'ApplyMask failed';
      this.errorCount++;
      throw err;
    }
  }

  /**
   * Transform image with translate, scale, rotate, crop
   */
  async transform(image: ImageData, options: TransformOptions): Promise<WorkerImageResult> {
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
      } = options;

      const srcWidth = cropWidth > 0 ? cropWidth : image.width;
      const srcHeight = cropHeight > 0 ? cropHeight : image.height;
      const dstWidth = Math.round(srcWidth * scaleX);
      const dstHeight = Math.round(srcHeight * scaleY);

      this.ensureCanvas(dstWidth, dstHeight);
      if (!this.ctx) {
        throw new Error('Canvas context not available');
      }

      // Create source canvas with optional crop
      const srcCanvas = new OffscreenCanvas(srcWidth, srcHeight);
      const srcCtx = srcCanvas.getContext('2d')!;
      srcCtx.putImageData(image, cropX > 0 || cropY > 0 ? -cropX : 0, cropY > 0 || cropY > 0 ? -cropY : 0);

      // Apply transformations
      this.ctx.save();
      this.ctx.clearRect(0, 0, dstWidth, dstHeight);

      if (rotation !== 0) {
        // Rotate around center
        this.ctx.translate(dstWidth / 2, dstHeight / 2);
        this.ctx.rotate((rotation * Math.PI) / 180);
        this.ctx.translate(-dstWidth / 2, -dstHeight / 2);
      }

      if (translateX !== 0 || translateY !== 0) {
        this.ctx.translate(translateX, translateY);
      }

      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';
      this.ctx.drawImage(srcCanvas, 0, 0, dstWidth, dstHeight);
      this.ctx.restore();

      const result = this.ctx.getImageData(0, 0, dstWidth, dstHeight);
      this.processedCount++;

      return { data: result, width: dstWidth, height: dstHeight };
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'Transform failed';
      this.errorCount++;
      throw err;
    }
  }

  /**
   * Export image to blob
   */
  async exportImage(
    data: ImageData,
    options: ExportOptions
  ): Promise<WorkerExportResult> {
    try {
      const {
        format = 'png',
        quality = 0.92,
        width = 0,
        height = 0,
      } = options;

      const exportWidth = width > 0 ? width : data.width;
      const exportHeight = height > 0 ? height : data.height;

      this.ensureCanvas(exportWidth, exportHeight);
      if (!this.ctx) {
        throw new Error('Canvas context not available');
      }

      // Resize if needed
      let imageData = data;
      if (data.width !== exportWidth || data.height !== exportHeight) {
        imageData = (await this.resize(data, exportWidth, exportHeight)).data;
      }

      this.ctx.putImageData(imageData, 0, 0);

      const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
      const blob = await this.canvas!.convertToBlob({ type: mimeType, quality });

      this.processedCount++;

      return { blob, width: exportWidth, height: exportHeight, mimeType };
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'Export failed';
      this.errorCount++;
      throw err;
    }
  }

  /**
   * Get worker health status
   */
  getStatus(): WorkerStatus {
    return {
      id: this.id,
      ready: this.canvas !== null && this.ctx !== null,
      processedCount: this.processedCount,
      errorCount: this.errorCount,
      lastError: this.lastError,
    };
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
