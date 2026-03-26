// Image loading with CORS support

// ImageData is a browser built-in
type ImageData = globalThis.ImageData;
import type { ImageRef, ImageLoadOptions, ImageLoadResult } from '@prism/shared-types';

/** Infer MIME type from URL path extension */
function inferMimeType(url: string): string {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'bmp':
      return 'image/bmp';
    case 'ico':
      return 'image/x-icon';
    default:
      return 'image/png'; // conservative default
  }
}

export interface LoadCrossOriginImageOptions extends ImageLoadOptions {
  timeout?: number;
}

/**
 * Load a cross-origin image with explicit CORS header validation.
 *
 * Flow:
 * 1. Fetch with CORS mode so the server sees the origin header
 * 2. Check Access-Control-Allow-Origin against the current origin
 * 3. If invalid, reject with a clear CORS error (before touching the canvas)
 * 4. If valid, create an Object URL and draw into a canvas
 */
export async function loadCrossOriginImage(
  url: string,
  options: LoadCrossOriginImageOptions = {}
): Promise<ImageLoadResult> {
  const crossOrigin = options.crossOrigin;

  // Only attempt CORS validation when the user opted in (anonymous / use-credentials).
  const validateCors = crossOrigin === 'anonymous' || crossOrigin === 'use-credentials';

  // Phase 1: fetch so we can inspect response headers.
  if (validateCors) {
    let response: Response;
    try {
      response = await fetch(url, { mode: 'cors' });
    } catch {
      throw new Error(`Failed to fetch image (network error or CORS blocked): ${url}`);
    }

    if (!response.ok) {
      throw new Error(`Image fetch returned ${response.status}: ${url}`);
    }

    // Check CORS headers before touching the canvas — fail fast.
    if (!validateCorsHeaders(response)) {
      const origin = typeof window !== 'undefined' ? window.location.origin : '<unknown>';
      throw new Error(
        `CORS policy denied: server must include 'Access-Control-Allow-Origin: *' ` +
        `or 'Access-Control-Allow-Origin: ${origin}' for ${url}`
      );
    }
  }

  // Phase 2: load into an Image element so we get width/height cheaply.
  const img = new Image();
  if (crossOrigin) {
    img.crossOrigin = crossOrigin;
  }

  return new Promise((resolve, reject) => {
    const timeoutId =
      options.timeout && options.timeout > 0
        ? setTimeout(() => {
            img.src = '';
            reject(new Error(`Image load timeout: ${url}`));
          }, options.timeout)
        : null;

    img.onload = () => {
      if (timeoutId) clearTimeout(timeoutId);

      let canvas: HTMLCanvasElement | OffscreenCanvas;
      let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

      if (typeof OffscreenCanvas !== 'undefined') {
        canvas = new OffscreenCanvas(img.width, img.height);
        ctx = canvas.getContext('2d');
      } else {
        canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx = canvas.getContext('2d');
      }

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);

      const imageRef: ImageRef = {
        type: 'cross-origin-url',
        url,
        width: img.width,
        height: img.height,
        mimeType: inferMimeType(url),
        cleanup: () => {
          img.src = '';
        },
      };

      resolve({
        imageData,
        imageRef,
        crossOriginUsed: crossOrigin === 'anonymous',
      });
    };

    img.onerror = () => {
      if (timeoutId) clearTimeout(timeoutId);
      reject(new Error(`Failed to load image: ${url}`));
    };

    img.src = url;
  });
}

export async function loadImageFromBlob(blob: Blob): Promise<ImageLoadResult> {
  const url = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      let canvas: HTMLCanvasElement | OffscreenCanvas;
      let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

      if (typeof OffscreenCanvas !== 'undefined') {
        canvas = new OffscreenCanvas(img.width, img.height);
        ctx = canvas.getContext('2d');
      } else {
        canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx = canvas.getContext('2d');
      }

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);

      const imageRef: ImageRef = {
        type: 'blob-url',
        url,
        width: img.width,
        height: img.height,
        mimeType: blob.type,
        cleanup: () => {
          URL.revokeObjectURL(url);
        },
      };

      resolve({
        imageData,
        imageRef,
        crossOriginUsed: false,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image from blob'));
    };

    img.src = url;
  });
}

export function validateCorsHeaders(response: Response, origin = window.location.origin): boolean {
  const allow = response.headers.get('Access-Control-Allow-Origin');
  // Pass: wildcard OR exact origin match
  // Fail: null (no header), or a different specific origin
  return allow === '*' || allow === origin;
}
