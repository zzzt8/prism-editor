// Mask application operations

// ImageData is a browser built-in, used as interface-only
type ImageData = globalThis.ImageData;
import type { MaskOptions } from '@prism/shared-types';
import { resizeImageData } from './transform';
import { unwrapImageData } from '@prism/shared-types';
import { getImageMemoryManager } from './memory-manager';
import { getWorkerRunner, type WorkerRunner } from './scheduler/workerRunner';
import type { NodeExecutor, ApplyMaskExecutorOutput } from '@prism/shared-types';
import type { ExecutionContext } from '@prism/shared-types';

function getLuminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function getBrightness(r: number, g: number, b: number): number {
  return (r + g + b) / 3;
}

export function applyAlphaMask(
  imageData: ImageData,
  maskData: ImageData,
  threshold: number = 128,
  invert: boolean = false
): ImageData {
  const result = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );

  const thresholdFn = invert
    ? (v: number) => (v < threshold ? 255 : 0)
    : (v: number) => (v >= threshold ? 255 : 0);

  for (let i = 0; i < result.data.length; i += 4) {
    const maskValue = maskData.data[i];
    const alphaValue = thresholdFn(maskValue);
    result.data[i + 3] = (result.data[i + 3] * alphaValue) / 255;
  }

  return result;
}

export function applyBrightnessMask(
  imageData: ImageData,
  maskData: ImageData,
  threshold: number = 128,
  invert: boolean = false
): ImageData {
  const result = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );

  const thresholdFn = invert
    ? (v: number) => (v < threshold ? 255 : 0)
    : (v: number) => (v >= threshold ? 255 : 0);

  for (let i = 0; i < result.data.length; i += 4) {
    const brightness = getBrightness(
      maskData.data[i],
      maskData.data[i + 1],
      maskData.data[i + 2]
    );
    const factor = thresholdFn(Math.round(brightness));
    result.data[i + 3] = (result.data[i + 3] * factor) / 255;
  }

  return result;
}

export function applyLuminanceMask(
  imageData: ImageData,
  maskData: ImageData,
  threshold: number = 128,
  invert: boolean = false
): ImageData {
  const result = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );

  const thresholdFn = invert
    ? (v: number) => (v < threshold ? 255 : 0)
    : (v: number) => (v >= threshold ? 255 : 0);

  for (let i = 0; i < result.data.length; i += 4) {
    const luminance = getLuminance(
      maskData.data[i],
      maskData.data[i + 1],
      maskData.data[i + 2]
    );
    const factor = thresholdFn(Math.round(luminance));
    result.data[i + 3] = (result.data[i + 3] * factor) / 255;
  }

  return result;
}

export function applyMask(
  imageData: ImageData,
  maskData: ImageData,
  options: MaskOptions = { type: 'alpha' }
): ImageData {
  const { type, threshold = 128, invert = false } = options;

  if (imageData.width !== maskData.width || imageData.height !== maskData.height) {
    const resizedMask = resizeImageData(maskData, imageData.width, imageData.height);
    return applyMaskWithResize(imageData, resizedMask, type, threshold, invert);
  }

  switch (type) {
    case 'alpha':
      return applyAlphaMask(imageData, maskData, threshold, invert);
    case 'brightness':
      return applyBrightnessMask(imageData, maskData, threshold, invert);
    case 'luminance':
      return applyLuminanceMask(imageData, maskData, threshold, invert);
    default:
      throw new Error(`Unknown mask type: ${type}`);
  }
}

function applyMaskWithResize(
  imageData: ImageData,
  maskData: ImageData,
  type: MaskOptions['type'],
  threshold: number,
  invert: boolean
): ImageData {
  switch (type) {
    case 'alpha':
      return applyAlphaMask(imageData, maskData, threshold, invert);
    case 'brightness':
      return applyBrightnessMask(imageData, maskData, threshold, invert);
    case 'luminance':
      return applyLuminanceMask(imageData, maskData, threshold, invert);
    default:
      throw new Error(`Unknown mask type: ${type}`);
  }
}

// ─── ApplyMask executor ────────────────────────────────────────────────────────

let _workerRunner: WorkerRunner | null = null;

function getApplyMaskWorkerRunner(): WorkerRunner {
  if (!_workerRunner) {
    _workerRunner = getWorkerRunner();
  }
  return _workerRunner;
}

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

  const maskOptions: MaskOptions = { type: maskType, threshold, invert };
  const workerRunner = getApplyMaskWorkerRunner();

  // Try worker lane first; fall back to main-thread applyMask if workers unavailable
  let result: ImageData;
  if (workerRunner.isWorkerAvailable()) {
    const workerResult = await workerRunner.applyMask(image, mask, maskOptions);
    result = workerResult.data;
  } else {
    result = applyMask(image, mask, maskOptions);
  }

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
