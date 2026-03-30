// Node executor implementations - bridge between node definitions and image ops

// ImageData is a browser built-in
type ImageData = globalThis.ImageData;
import type {
  NodeExecutor,
  LoadImageExecutorOutput,
  LoadMaskExecutorOutput,
  ApplyMaskExecutorOutput,
  CompositeExecutorOutput,
  TransformExecutorOutput,
  ExportExecutorOutput,
  BlendMode,
  ExecutionContext,
} from '@prism/shared-types';
import {
  unwrapImageData,
  type ImageRuntimeObject,
  type ImagePosition,
} from '@prism/shared-types';
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

// Load Mask executor — identical to Load Image but outputs MASK type
interface MaskFileValue {
  dataUrl: string;
  width: number;
  height: number;
  fileName: string;
}

export const loadMaskExecutor: NodeExecutor = async (
  inputs,
  params,
  ctx
) => {
  // Support both plain URL strings (v2 user-app) and structured maskFile objects (dev-tool picker)
  const urlValue = params['url'] as string | undefined;
  const maskFile = params['maskFile'] as MaskFileValue | undefined;
  const sourceUrl = urlValue ?? maskFile?.dataUrl;

  if (!sourceUrl) {
    throw new Error('maskFile param is required for LoadMask node');
  }

  // Route to the correct loader based on URL type
  const isDataUrl = sourceUrl.startsWith('data:');
  const result = isDataUrl
    ? await loadImageFromDataUrl(sourceUrl)
    : await loadCrossOriginImage(sourceUrl);
  const imageData = result.imageData;

  // Create preview
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
  const rawBase    = ctx.requireInput<Parameters<typeof unwrapImageData>[0]>('base',    'Composite');
  const rawOverlay = ctx.requireInput<Parameters<typeof unwrapImageData>[0]>('overlay', 'Composite');
  const base    = unwrapImageData(rawBase);
  const overlay = unwrapImageData(rawOverlay);
  if (!base)    throw new Error('base input must be ImageData for Composite');
  if (!overlay) throw new Error('overlay input must be ImageData for Composite');

  // Read base as ImageRuntimeObject to get its canvas/position metadata
  const baseIRO = (rawBase && typeof rawBase === 'object' && 'data' in rawBase)
    ? rawBase as ImageRuntimeObject
    : undefined;

  // Read overlay as ImageRuntimeObject to get its canvas/position metadata
  const overlayIRO = (rawOverlay && typeof rawOverlay === 'object' && 'data' in rawOverlay)
    ? rawOverlay as ImageRuntimeObject
    : undefined;

  // Output canvas size: params override > base canvas > base native
  const canvasWidth =
    (params['canvasWidth']  as number | undefined) ??
    baseIRO?.canvasWidth  ??
    base.width;
  const canvasHeight =
    (params['canvasHeight'] as number | undefined) ??
    baseIRO?.canvasHeight ??
    base.height;

  // Blend parameters
  const blendMode = (params['blendMode'] as BlendMode) ?? 'normal';
  const opacity   = (params['opacity']   as number)   ?? 1;

  // Overlay position: params override > overlay position metadata
  const overlayX =
    (params['overlayX'] as number | undefined) ??
    overlayIRO?.position?.x ??
    0;
  const overlayY =
    (params['overlayY'] as number | undefined) ??
    overlayIRO?.position?.y ??
    0;

  const result = compositeImages(base, overlay, {
    blendMode,
    opacity,
    canvasWidth,
    canvasHeight,
    overlayX,
    overlayY,
  });

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
      canvasWidth: result.width,
      canvasHeight: result.height,
      position: { x: 0, y: 0 },
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

  const translateX = (params['translateX'] as number) ?? 0;
  const translateY = (params['translateY'] as number) ?? 0;
  const scaleX = (params['scaleX'] as number) ?? 1;
  const scaleY = (params['scaleY'] as number) ?? 1;
  const rotation = (params['rotation'] as number) ?? 0;
  const cropX = (params['cropX'] as number) ?? 0;
  const cropY = (params['cropY'] as number) ?? 0;
  const cropWidth = (params['cropWidth'] as number) ?? 0;
  const cropHeight = (params['cropHeight'] as number) ?? 0;

  // Run scale + rotate + crop through transformImage
  const transformed = transformImage(image, {
    translateX: 0,
    translateY: 0,
    scaleX,
    scaleY,
    rotation,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
  });

  // Canvas expansion: translateX/Y both grows the canvas and offsets the image
  // within it. Positive → image shifts right/down, left/top margin grows.
  // Negative → image shifts left/up, right/bottom margin shrinks (clipped).
  const finalX = Math.floor(translateX);
  const finalY = Math.floor(translateY);
  const finalW = Math.max(0, transformed.width + finalX);
  const finalH = Math.max(0, transformed.height + finalY);

  let finalData: ImageData;
  if (finalW === 0 || finalH === 0) {
    finalData = new ImageData(1, 1);
  } else if (finalX !== 0 || finalY !== 0) {
    // Create output canvas and draw image at (finalX, finalY)
    // Positive finalX → left margin; negative → right clipped
    const outCanvas = new OffscreenCanvas(finalW, finalH);
    const outCtx = outCanvas.getContext('2d')!;
    const srcCanvas = new OffscreenCanvas(transformed.width, transformed.height);
    const sc = srcCanvas.getContext('2d')!;
    sc.putImageData(transformed, 0, 0);
    outCtx.drawImage(srcCanvas, finalX, finalY);
    finalData = outCtx.getImageData(0, 0, finalW, finalH);
  } else {
    finalData = transformed;
  }

  // Create preview
  const previewCanvas = new OffscreenCanvas(finalW, finalH);
  const previewCtx = previewCanvas.getContext('2d');
  if (!previewCtx) throw new Error('Failed to get 2D context for preview canvas');
  previewCtx.putImageData(finalData, 0, 0);
  const blob = await previewCanvas.convertToBlob({ type: 'image/png' });
  const previewRef = getImageMemoryManager().createObjectURL(blob, finalW, finalH);

  return {
    type: 'transform',
    image: {
      data: finalData,
      previewUrl: previewRef.url,
      width: finalW,
      height: finalH,
      canvasWidth: finalW,
      canvasHeight: finalH,
      position: { x: finalX > 0 ? finalX : 0, y: finalY > 0 ? finalY : 0 },
    },
    previewUrl: previewRef.url,
    width: finalW,
    height: finalH,
  } satisfies TransformExecutorOutput;
};

// Export executor
export const exportExecutor: NodeExecutor = async (
  inputs,
  _params,
  ctx: ExecutionContext
) => {
  const rawImage = ctx.requireInput<Parameters<typeof unwrapImageData>[0]>('image', 'Export');
  const image = unwrapImageData(rawImage);
  if (!image) throw new Error('image input must be ImageData for Export');

  // Export as PNG by default
  const exportResult = await exportImage(image, {
    format: 'png',
    quality: 0.92,
    width: 0,
    height: 0,
  });

  // Create preview ref
  const previewRef = getImageMemoryManager().createObjectURL(
    exportResult.blob,
    exportResult.width,
    exportResult.height
  );

  return {
    type: 'export',
    previewUrl: previewRef.url,
    width: exportResult.width,
    height: exportResult.height,
    mimeType: exportResult.mimeType,
    dataUrl: exportResult.dataUrl,
  } satisfies ExportExecutorOutput;
};

// Registry of all built-in executors
export const nodeExecutors: Record<string, NodeExecutor> = {
  'load-image': loadImageExecutor,
  'load-mask': loadMaskExecutor,
  'apply-mask': applyMaskExecutor,
  'composite': compositeExecutor,
  'transform': transformExecutor,
  'export': exportExecutor,
};
