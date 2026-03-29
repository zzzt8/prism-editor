// Node executor implementations - bridge between node definitions and image ops

// ImageData is a browser built-in
type ImageData = globalThis.ImageData;
import type {
  NodeExecutor,
  LoadImageExecutorOutput,
  ApplyMaskExecutorOutput,
  CompositeExecutorOutput,
  TransformExecutorOutput,
  ExportExecutorOutput,
  PreviewImageExecutorOutput,
  BlendMode,
  ExecutionContext,
} from '@prism/shared-types';
import { unwrapImageData } from '@prism/shared-types';
import { loadCrossOriginImage, loadImageFromDataUrl, loadImageFromBlob } from './load-image';
import { applyMask } from './apply-mask';
import { compositeImages } from './composite';
import { transformImage } from './transform';
import { exportImage } from './export-image';
import { getImageMemoryManager } from './memory-manager';

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

// ─── ImageFile param value shape (from UI file picker) ───────────────────────
interface ImageFileValue {
  dataUrl: string;
  width: number;
  height: number;
  fileName: string;
}

// ─── Load Image executor — supports three input sources ─────────────────────
// 1. imageFile  — data URL from UI file picker  (preferred, no network)
// 2. url        — HTTP/HTTPS URL (legacy, CORS-aware)
// 3. blob       — Blob object (future: drag-drop)
export const loadImageExecutor: NodeExecutor = async (
  inputs,
  params,
  ctx
) => {
  let imageData: ImageData;
  let imageRef: import('@prism/shared-types').ImageRef;

  // ── Source 1: imageFile (from UI file picker via ParamPanel) ──────────────
  const imageFile = params['imageFile'] as ImageFileValue | undefined;
  if (imageFile?.dataUrl) {
    const result = await loadImageFromDataUrl(imageFile.dataUrl);
    imageData = result.imageData;
    imageRef = result.imageRef;
  }
  // ── Source 2: url (legacy URL string) ────────────────────────────────────
  else if (params['url'] !== undefined) {
    const url = requireParam<string>(params, 'url', 'LoadImage');
    const crossOrigin = params['crossOrigin'] as string | undefined;
    const loadOptions = crossOrigin && crossOrigin !== 'none'
      ? { crossOrigin: crossOrigin as 'anonymous' | 'use-credentials' }
      : {};
    const result = await loadCrossOriginImage(url, loadOptions);
    imageData = result.imageData;
    imageRef = result.imageRef;
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

  // Create blob URL for preview (data URLs can't be used as canvas source directly for toBlob)
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

// Apply Mask executor
export const applyMaskExecutor: NodeExecutor = async (
  inputs,
  params,
  ctx: ExecutionContext
) => {
  const rawImage = ctx.requireInput<Parameters<typeof unwrapImageData>[0]>('image', 'ApplyMask');
  const rawMask  = ctx.requireInput<Parameters<typeof unwrapImageData>[0]>('mask',  'ApplyMask');
  const image = unwrapImageData(rawImage);
  const mask  = unwrapImageData(rawMask);
  if (!image) throw new Error('image input must be ImageData for ApplyMask');
  if (!mask)  throw new Error('mask input must be ImageData for ApplyMask');

  const maskType = (params['maskType'] as 'alpha' | 'brightness' | 'luminance') ?? 'alpha';
  const threshold = (params['threshold'] as number) ?? 128;
  const invert = (params['invert'] as boolean) ?? false;

  const result = applyMask(image, mask, { type: maskType, threshold, invert });

  // Create preview
  const canvas = new OffscreenCanvas(result.width, result.height);
  const cctx = canvas.getContext('2d');
  if (!cctx) throw new Error('Failed to get 2D context for preview canvas');
  cctx.putImageData(result, 0, 0);
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  const previewRef = getImageMemoryManager().createObjectURL(blob, result.width, result.height);

  return {
    type: 'apply-mask',
    image: {
      data: result,
      previewUrl: previewRef.url,
      width: result.width,
      height: result.height,
    },
    previewUrl: previewRef.url,
    width: result.width,
    height: result.height,
  } satisfies ApplyMaskExecutorOutput;
};

// Composite executor
export const compositeExecutor: NodeExecutor = async (
  inputs,
  params,
  ctx: ExecutionContext
) => {
  const rawBase     = ctx.requireInput<Parameters<typeof unwrapImageData>[0]>('base',     'Composite');
  const rawOverlay  = ctx.requireInput<Parameters<typeof unwrapImageData>[0]>('overlay',  'Composite');
  const base    = unwrapImageData(rawBase);
  const overlay = unwrapImageData(rawOverlay);
  if (!base)    throw new Error('base input must be ImageData for Composite');
  if (!overlay) throw new Error('overlay input must be ImageData for Composite');

  const blendMode = (params['blendMode'] as BlendMode) ?? 'normal';
  const opacity = (params['opacity'] as number) ?? 1;

  const result = compositeImages(base, overlay, { blendMode, opacity });

  // Create preview
  const canvas = new OffscreenCanvas(result.width, result.height);
  const cctx = canvas.getContext('2d');
  if (!cctx) throw new Error('Failed to get 2D context for preview canvas');
  cctx.putImageData(result, 0, 0);
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  const previewRef = getImageMemoryManager().createObjectURL(blob, result.width, result.height);

  return {
    type: 'composite',
    image: {
      data: result,
      previewUrl: previewRef.url,
      width: result.width,
      height: result.height,
    },
    previewUrl: previewRef.url,
    width: result.width,
    height: result.height,
  } satisfies CompositeExecutorOutput;
};

// Transform executor
export const transformExecutor: NodeExecutor = async (
  inputs,
  params,
  ctx: ExecutionContext
) => {
  const rawImage = ctx.requireInput<Parameters<typeof unwrapImageData>[0]>('image', 'Transform');
  const image = unwrapImageData(rawImage);
  if (!image) throw new Error('image input must be ImageData for Transform');

  const result = transformImage(image, {
    translateX: (params['translateX'] as number) ?? 0,
    translateY: (params['translateY'] as number) ?? 0,
    scaleX: (params['scaleX'] as number) ?? 1,
    scaleY: (params['scaleY'] as number) ?? 1,
    rotation: (params['rotation'] as number) ?? 0,
    cropX: (params['cropX'] as number) ?? 0,
    cropY: (params['cropY'] as number) ?? 0,
    cropWidth: (params['cropWidth'] as number) ?? 0,
    cropHeight: (params['cropHeight'] as number) ?? 0,
  });

  // Create preview
  const canvas = new OffscreenCanvas(result.width, result.height);
  const cctx = canvas.getContext('2d');
  if (!cctx) throw new Error('Failed to get 2D context for preview canvas');
  cctx.putImageData(result, 0, 0);
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  const previewRef = getImageMemoryManager().createObjectURL(blob, result.width, result.height);

  return {
    type: 'transform',
    image: {
      data: result,
      previewUrl: previewRef.url,
      width: result.width,
      height: result.height,
    },
    previewUrl: previewRef.url,
    width: result.width,
    height: result.height,
  } satisfies TransformExecutorOutput;
};

// Export executor
export const exportExecutor: NodeExecutor = async (
  inputs,
  params,
  ctx: ExecutionContext
) => {
  const rawImage = ctx.requireInput<Parameters<typeof unwrapImageData>[0]>('image', 'Export');
  const image = unwrapImageData(rawImage);
  if (!image) throw new Error('image input must be ImageData for Export');

  const format = (params['format'] as 'png' | 'jpeg' | 'webp') ?? 'png';
  const quality = (params['quality'] as number) ?? 0.92;
  const width = params['width'] as number | undefined;
  const height = params['height'] as number | undefined;

  const exportResult = await exportImage(image, {
    format,
    quality,
    width: width || 0,
    height: height || 0,
  });

  // Create preview ref
  const previewRef = getImageMemoryManager().createObjectURL(
    exportResult.blob,
    exportResult.width,
    exportResult.height
  );

  return {
    type: 'export',
    exported: {
      data: exportResult.blob,
      previewUrl: previewRef.url,
      width: exportResult.width,
      height: exportResult.height,
    },
    previewUrl: previewRef.url,
    width: exportResult.width,
    height: exportResult.height,
    mimeType: exportResult.mimeType,
    dataUrl: exportResult.dataUrl,
  } satisfies ExportExecutorOutput;
};

// Preview Image executor — generates previewUrl and passes through image output
export const previewImageExecutor: NodeExecutor = async (
  inputs,
  _params,
  ctx: ExecutionContext
) => {
  const rawImage = ctx.requireInput<Parameters<typeof unwrapImageData>[0]>('image', 'PreviewImage');
  const image = unwrapImageData(rawImage);
  if (!image) throw new Error('image input must be ImageData for PreviewImage');

  // Create preview blob URL
  const canvas = new OffscreenCanvas(image.width, image.height);
  const cctx = canvas.getContext('2d');
  if (!cctx) throw new Error('Failed to get 2D context for preview canvas');
  cctx.putImageData(image, 0, 0);
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  const previewRef = getImageMemoryManager().createObjectURL(blob, image.width, image.height);

  return {
    type: 'preview-image',
    image: {
      data: image,
      previewUrl: previewRef.url,
      width: image.width,
      height: image.height,
    }, // passthrough — does not modify data
    previewUrl: previewRef.url,
    width: image.width,
    height: image.height,
  } satisfies PreviewImageExecutorOutput;
};

// Registry of all built-in executors
export const nodeExecutors: Record<string, NodeExecutor> = {
  'load-image': loadImageExecutor,
  'apply-mask': applyMaskExecutor,
  'composite': compositeExecutor,
  'transform': transformExecutor,
  'export': exportExecutor,
  'preview-image': previewImageExecutor,
};
