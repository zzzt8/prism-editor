// Image export operations

// ImageData is a browser built-in
type ImageData = globalThis.ImageData;
import type { ExportOptions } from '@prism/shared-types';
import { resizeImageData } from './transform';

/**
 * Creates a canvas with ImageData drawn on it.
 * For opaque formats (JPEG), fills the canvas with white before compositing
 * so that transparent pixels render as white rather than black.
 */
function imageDataToCanvas(
  data: ImageData,
  format: string
): { canvas: HTMLCanvasElement | OffscreenCanvas; ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D } {
  let canvas: HTMLCanvasElement | OffscreenCanvas;
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(data.width, data.height);
    ctx = canvas.getContext('2d');
  } else {
    canvas = document.createElement('canvas');
    canvas.width = data.width;
    canvas.height = data.height;
    ctx = canvas.getContext('2d');
  }

  if (!ctx) throw new Error('Failed to get canvas context');

  ctx.putImageData(data, 0, 0);

  // JPEG has no alpha channel — composite transparent pixels over white
  const isOpaque = format === 'jpeg';
  if (isOpaque) {
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  return { canvas, ctx };
}

export function imageDataToBlob(
  imageData: ImageData,
  options: ExportOptions
): Promise<Blob> {
  const { format = 'png', quality = 0.92, width = 0, height = 0 } = options;

  let data = imageData;

  if (width > 0 || height > 0) {
    data = resizeImageData(imageData, width || imageData.width, height || imageData.height);
  }

  const mimeType =
    format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';

  const { canvas } = imageDataToCanvas(data, format);

  if (typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type: mimeType, quality });
  } else {
    return new Promise((resolve, reject) => {
      (canvas as HTMLCanvasElement).toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob'));
        },
        mimeType,
        quality
      );
    });
  }
}

export async function imageDataToDataUrl(
  imageData: ImageData,
  options: ExportOptions
): Promise<string> {
  const { format = 'png', quality = 0.92, width = 0, height = 0 } = options;

  let data = imageData;

  if (width > 0 || height > 0) {
    data = resizeImageData(imageData, width || imageData.width, height || imageData.height);
  }

  const mimeType =
    format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';

  const { canvas } = imageDataToCanvas(data, format);

  let blob: Blob;
  if (typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas) {
    blob = await canvas.convertToBlob({ type: mimeType, quality });
  } else {
    blob = await new Promise<Blob>((resolve, reject) => {
      (canvas as HTMLCanvasElement).toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Failed to create blob'))),
        mimeType,
        quality
      );
    });
  }

  return blobToDataUrl(blob);
}

export interface ExportResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  mimeType: string;
}

export async function exportImage(
  imageData: ImageData,
  options: ExportOptions = {}
): Promise<ExportResult> {
  const { format = 'png', quality = 0.92, width = 0, height = 0 } = options;

  let data = imageData;
  if (width > 0 || height > 0) {
    data = resizeImageData(imageData, width || imageData.width, height || imageData.height);
  }

  const mimeType =
    format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';

  // Single canvas: draw ImageData + optional white bg → export both blob + dataUrl
  const { canvas } = imageDataToCanvas(data, format);

  let blob: Blob;
  let dataUrl: string;

  if (typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas) {
    blob = await canvas.convertToBlob({ type: mimeType, quality });
    dataUrl = await blobToDataUrl(blob);
  } else {
    blob = await new Promise<Blob>((resolve, reject) => {
      (canvas as HTMLCanvasElement).toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Failed to create blob'))),
        mimeType,
        quality
      );
    });
    dataUrl = (canvas as HTMLCanvasElement).toDataURL(mimeType, quality);
  }

  return {
    blob,
    dataUrl,
    width: data.width,
    height: data.height,
    mimeType,
  };
}

/** Convert a Blob to a data URL */
async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
