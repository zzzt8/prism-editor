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

export interface LoadCrossOriginImageOptions extends Omit<ImageLoadOptions, 'crossOrigin'> {
  timeout?: number;
  /** 'none' = load like a normal <img> (cross-origin pixels will throw at getImageData). */
  crossOrigin?: 'anonymous' | 'use-credentials' | 'none';
}

/**
 * True when url is http(s) and targets a different origin than the current page (browser only).
 */
export function isCrossOriginHttpUrl(urlString: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const parsed = new URL(urlString, window.location.href);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    return parsed.origin !== window.location.origin;
  } catch {
    return false;
  }
}

/**
 * Load a cross-origin image with explicit CORS header validation.
 *
 * Flow:
 * 1. Fetch with CORS mode so the server sees the origin header
 * 2. Check Access-Control-Allow-Origin against the current origin
 * 3. If invalid, reject with a clear CORS error (before touching the canvas)
 * 4. If valid, create an Object URL and draw into a canvas
 *
 * For cross-origin http(s) URLs, CORS mode is used by default so getImageData() does not throw.
 * Same-origin responses often omit ACAO; header check is skipped in that case.
 */
export async function loadCrossOriginImage(
  url: string,
  options: LoadCrossOriginImageOptions = {}
): Promise<ImageLoadResult> {
  const explicit = options.crossOrigin;
  const optOut = explicit === 'none';
  const credentialMode = explicit === 'use-credentials';
  const anonymousByParam = explicit === 'anonymous';
  const isCrossOrigin = isCrossOriginHttpUrl(url);
  const useAnonymous =
    !optOut && !credentialMode && (anonymousByParam || isCrossOrigin);

  const validateCors = credentialMode || useAnonymous;

  // Phase 1: fetch so we can inspect response headers when we need CORS-safe pixels.
  if (validateCors) {
    let response: Response;
    try {
      response = await fetch(url, {
        mode: 'cors',
        credentials: credentialMode ? 'include' : 'omit',
      });
    } catch {
      throw new Error(`Failed to fetch image (network error or CORS blocked): ${url}`);
    }

    if (!response.ok) {
      throw new Error(`Image fetch returned ${response.status}: ${url}`);
    }

    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '<unknown>';
    if (isCrossOrigin) {
      if (!validateCorsHeaders(response, currentOrigin)) {
        throw new Error(
          `CORS policy denied: server must include 'Access-Control-Allow-Origin: *' ` +
            `or 'Access-Control-Allow-Origin: ${currentOrigin}' for ${url}`
        );
      }
    }
  }

  // Phase 2: load into an Image element so we get width/height cheaply.
  const img = new Image();
  if (credentialMode) {
    img.crossOrigin = 'use-credentials';
  } else if (useAnonymous) {
    img.crossOrigin = 'anonymous';
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
        // Cancel any in-flight request and release the image element.
        // No blob URL to revoke since this is a direct network load, not a blob/data URL.
        cleanup: () => {
          img.src = '';
        },
      };

      resolve({
        imageData,
        imageRef,
        crossOriginUsed: useAnonymous || credentialMode,
      });
    };

    img.onerror = () => {
      if (timeoutId) clearTimeout(timeoutId);
      reject(new Error(`Failed to load image: ${url}`));
    };

    img.src = url;
  });
}

export async function loadImageFromBlob(blobOrUrl: Blob | string): Promise<ImageLoadResult> {
  // Handle blob URL string by fetching the blob first
  if (typeof blobOrUrl === 'string') {
    if (!blobOrUrl.startsWith('blob:')) {
      throw new Error('loadImageFromBlob: string argument must be a blob: URL');
    }
    const response = await fetch(blobOrUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch blob URL: ${response.status}`);
    }
    const blob = await response.blob();
    return loadImageFromBlob(blob);
  }

  const blob = blobOrUrl;
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

/** Load image from a base64 data URL (e.g., from UI file picker) */
export async function loadImageFromDataUrl(dataUrl: string): Promise<ImageLoadResult> {
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

      // Infer mime type from data URL prefix
      const mimeMatch = dataUrl.match(/^data:([^;]+);/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';

      const imageRef: ImageRef = {
        type: 'data-url',
        url: dataUrl,
        width: img.width,
        height: img.height,
        mimeType,
        cleanup: undefined,
      };

      resolve({ imageData, imageRef, crossOriginUsed: false });
    };

    img.onerror = () => {
      reject(new Error('Failed to decode image data URL'));
    };

    img.src = dataUrl;
  });
}

export function validateCorsHeaders(response: Response, origin: string): boolean {
  const allow = response.headers.get('Access-Control-Allow-Origin');
  return allow === '*' || allow === origin;
}

// ─── Load Image executor ───────────────────────────────────────────────────────

import type { NodeExecutor, LoadImageExecutorOutput } from '@prism/shared-types';
import { getImageMemoryManager } from './memory-manager';

// ImageFile param value shape (from UI file picker)
interface ImageFileValue {
  dataUrl: string;
  width: number;
  height: number;
  fileName: string;
}

/** Assert a required param is present and non-empty */
function requireParam<T>(
  params: Record<string, unknown>,
  key: string,
  nodeName: string
): T {
  const value = params[key] as T | undefined;
  if (value === undefined || value === null) {
    throw new Error(`${key} param is required for ${nodeName} node`);
  }
  return value;
}

/**
 * LoadImage executor — supports three input sources:
 * 1. imageFile  — data URL from UI file picker  (preferred, no network)
 * 2. url        — HTTP/HTTPS URL (legacy, CORS-aware)
 * 3. blob       — Blob object (future: drag-drop)
 */
export const loadImageExecutor: NodeExecutor = async (
  inputs,
  params,
  ctx
) => {
  let imageData: globalThis.ImageData;
  let imageRef: import('@prism/shared-types').ImageRef;

  // ── Source 1: imageFile (from UI file picker via ParamPanel) ──────────────
  const imageFile = params['imageFile'] as ImageFileValue | undefined;
  if (imageFile?.dataUrl) {
    const result = await loadImageFromDataUrl(imageFile.dataUrl);
    imageData = result.imageData;
    imageRef = result.imageRef;
  }
  // ── Source 2: url (legacy URL string, including blob URLs and data URLs from user uploads) ─
  else if (params['url'] !== undefined) {
    const url = requireParam<string>(params, 'url', 'LoadImage');
    // Handle data: URLs from user uploads (base64 encoded via FileReader.readAsDataURL)
    if (url.startsWith('data:')) {
      const result = await loadImageFromDataUrl(url);
      imageData = result.imageData;
      imageRef = result.imageRef;
    }
    // Handle blob: URLs from user uploads (e.g., legacy from InputSection file picker)
    else if (url.startsWith('blob:')) {
      const result = await loadImageFromBlob(url);
      imageData = result.imageData;
      imageRef = result.imageRef;
    } else {
      const crossOrigin = params['crossOrigin'] as string | undefined;
      const loadOptions: LoadCrossOriginImageOptions =
        crossOrigin === 'none'
          ? { crossOrigin: 'none' }
          : crossOrigin && crossOrigin !== 'none'
            ? { crossOrigin: crossOrigin as 'anonymous' | 'use-credentials' }
            : {};
      const result = await loadCrossOriginImage(url, loadOptions);
      imageData = result.imageData;
      imageRef = result.imageRef;
    }
  }
  // ── Source 3: blob ──────────────────────────────────────────────────────
  else if (params['blob'] !== undefined) {
    const blob = requireParam<Blob>(params, 'blob', 'LoadImage');
    const result = await loadImageFromBlob(blob);
    imageData = result.imageData;
    imageRef = result.imageRef;
  }
  else {
    throw new Error('imageFile, url, or blob param is required for LoadImage node');
  }

  // Store imageRef in execution context
  if (imageRef.type !== 'data-url') {
    ctx.imageRefs.set(imageRef.url, imageRef);
    getImageMemoryManager().registerRef(imageRef);
  }

  // Create blob URL for preview
  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  const cctx = canvas.getContext('2d');
  if (!cctx) throw new Error('Failed to get 2D context for preview canvas');
  cctx.putImageData(imageData, 0, 0);
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  const previewRef = getImageMemoryManager().createObjectURL(
    blob,
    imageData.width,
    imageData.height
  );

  return {
    type: 'load-image',
    image: {
      data: imageData,
      previewUrl: previewRef.url,
      width: imageData.width,
      height: imageData.height,
      sourceFileName: imageFile?.fileName,
    },
    previewUrl: previewRef.url,
    width: imageData.width,
    height: imageData.height,
  } satisfies LoadImageExecutorOutput;
};

// ─── Load Mask executor ────────────────────────────────────────────────────────

import type { LoadMaskExecutorOutput } from '@prism/shared-types';

interface MaskFileValue {
  dataUrl: string;
  width: number;
  height: number;
  fileName: string;
}

/** LoadMask executor — identical to Load Image but outputs MASK type */
export const loadMaskExecutor: NodeExecutor = async (
  inputs,
  params,
  ctx
) => {
  const urlValue = params['url'] as string | undefined;
  const maskFile = params['maskFile'] as MaskFileValue | undefined;
  const sourceUrl = urlValue ?? maskFile?.dataUrl;

  if (!sourceUrl) {
    throw new Error('maskFile param is required for LoadMask node');
  }

  const isDataUrl = sourceUrl.startsWith('data:');
  const result = isDataUrl
    ? await loadImageFromDataUrl(sourceUrl)
    : await loadCrossOriginImage(sourceUrl);
  const imageData = result.imageData;

  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  const cctx = canvas.getContext('2d');
  if (!cctx) throw new Error('Failed to get 2D context for preview canvas');
  cctx.putImageData(imageData, 0, 0);
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  const previewRef = getImageMemoryManager().createObjectURL(
    blob,
    imageData.width,
    imageData.height
  );

  return {
    type: 'load-mask',
    mask: {
      data: imageData,
      previewUrl: previewRef.url,
      width: imageData.width,
      height: imageData.height,
      sourceFileName: maskFile?.fileName,
    },
    previewUrl: previewRef.url,
    width: imageData.width,
    height: imageData.height,
  } satisfies LoadMaskExecutorOutput;
};
