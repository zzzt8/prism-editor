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
  BlendMode,
} from '@prism/shared-types';
import { loadCrossOriginImage } from './load-image';
import { applyMask } from './apply-mask';
import { compositeImages } from './composite';
import { transformImage } from './transform';
import { exportImage } from './export-image';
import { getImageMemoryManager } from './memory-manager';

/** Assert a required input is present, or throw with a clear message */
function requireInput<T>(
  inputs: Record<string, unknown>,
  key: string,
  nodeName: string
): T {
  const value = inputs[key] as T | undefined;
  if (value === undefined || value === null) {
    throw new Error(`${key} input is required for ${nodeName} node`);
  }
  return value;
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

// Load Image executor
export const loadImageExecutor: NodeExecutor = async (
  inputs,
  params,
  ctx
) => {
  const url = requireParam<string>(params, 'url', 'LoadImage');
  const crossOrigin = params['crossOrigin'] as string | undefined;

  const loadOptions = crossOrigin && crossOrigin !== 'none'
    ? { crossOrigin: crossOrigin as 'anonymous' | 'use-credentials' }
    : {};

  const result = await loadCrossOriginImage(url, loadOptions);

  // Store imageRef in execution context
  ctx.imageRefs.set(url, result.imageRef);
  getImageMemoryManager().registerRef(result.imageRef);

  // Create blob URL for preview
  const canvas = new OffscreenCanvas(result.imageData.width, result.imageData.height);
  const cctx = canvas.getContext('2d')!;
  cctx.putImageData(result.imageData, 0, 0);
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  const previewRef = getImageMemoryManager().createObjectURL(
    blob,
    result.imageData.width,
    result.imageData.height
  );

  return {
    type: 'load-image',
    image: result.imageData,
    previewUrl: previewRef.url,
    width: result.imageData.width,
    height: result.imageData.height,
    crossOriginWarning: result.crossOriginUsed ? 'CORS headers may be missing' : undefined,
  } satisfies LoadImageExecutorOutput;
};

// Apply Mask executor
export const applyMaskExecutor: NodeExecutor = async (
  inputs,
  params,
  ctx
) => {
  const image = requireInput<ImageData>(inputs, 'image', 'ApplyMask');
  const mask = requireInput<ImageData>(inputs, 'mask', 'ApplyMask');

  const maskType = (params['maskType'] as 'alpha' | 'brightness' | 'luminance') ?? 'alpha';
  const threshold = (params['threshold'] as number) ?? 128;
  const invert = (params['invert'] as boolean) ?? false;

  const result = applyMask(image, mask, { type: maskType, threshold, invert });

  // Create preview
  const canvas = new OffscreenCanvas(result.width, result.height);
  const cctx = canvas.getContext('2d')!;
  cctx.putImageData(result, 0, 0);
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  const previewRef = getImageMemoryManager().createObjectURL(blob, result.width, result.height);

  return {
    type: 'apply-mask',
    result,
    previewUrl: previewRef.url,
    width: result.width,
    height: result.height,
  } satisfies ApplyMaskExecutorOutput;
};

// Composite executor
export const compositeExecutor: NodeExecutor = async (
  inputs,
  params,
  ctx
) => {
  const base = requireInput<ImageData>(inputs, 'base', 'Composite');
  const overlay = requireInput<ImageData>(inputs, 'overlay', 'Composite');

  const blendMode = (params['blendMode'] as BlendMode) ?? 'normal';
  const opacity = (params['opacity'] as number) ?? 1;

  const result = compositeImages(base, overlay, { blendMode, opacity });

  // Create preview
  const canvas = new OffscreenCanvas(result.width, result.height);
  const cctx = canvas.getContext('2d')!;
  cctx.putImageData(result, 0, 0);
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  const previewRef = getImageMemoryManager().createObjectURL(blob, result.width, result.height);

  return {
    type: 'composite',
    result,
    previewUrl: previewRef.url,
    width: result.width,
    height: result.height,
  } satisfies CompositeExecutorOutput;
};

// Transform executor
export const transformExecutor: NodeExecutor = async (
  inputs,
  params,
  ctx
) => {
  const image = requireInput<ImageData>(inputs, 'image', 'Transform');

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
  const cctx = canvas.getContext('2d')!;
  cctx.putImageData(result, 0, 0);
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  const previewRef = getImageMemoryManager().createObjectURL(blob, result.width, result.height);

  return {
    type: 'transform',
    result,
    previewUrl: previewRef.url,
    width: result.width,
    height: result.height,
  } satisfies TransformExecutorOutput;
};

// Export executor
export const exportExecutor: NodeExecutor = async (
  inputs,
  params,
  ctx
) => {
  const image = requireInput<ImageData>(inputs, 'image', 'Export');

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
    result: exportResult.blob,
    previewUrl: previewRef.url,
    dataUrl: exportResult.dataUrl,
    width: exportResult.width,
    height: exportResult.height,
    mimeType: exportResult.mimeType,
  } satisfies ExportExecutorOutput;
};

// Registry of all built-in executors
export const nodeExecutors: Record<string, NodeExecutor> = {
  'load-image': loadImageExecutor,
  'apply-mask': applyMaskExecutor,
  'composite': compositeExecutor,
  'transform': transformExecutor,
  'export': exportExecutor,
};
