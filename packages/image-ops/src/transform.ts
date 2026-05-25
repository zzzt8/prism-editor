// Image transformation operations

// ImageData is a browser built-in
import type { ImageData } from '@prism/shared-types';
import type { TransformOptions } from '@prism/shared-types';
import { unwrapImageData } from '@prism/shared-types';
import { generatePreviewUrl } from './preview-strategy';
import { getWorkerRunner, type WorkerRunner } from './scheduler/workerRunner';
import type { NodeExecutor, TransformExecutorOutput } from '@prism/shared-types';
import type { ExecutionContext } from '@prism/shared-types';

function createCanvas(
  width: number,
  height: number
): { canvas: HTMLCanvasElement | OffscreenCanvas; ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D } {
  let canvas: HTMLCanvasElement | OffscreenCanvas;
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(width, height);
    ctx = canvas.getContext('2d');
  } else {
    canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    ctx = canvas.getContext('2d');
  }

  if (!ctx) throw new Error('Failed to get canvas context');

  return { canvas, ctx };
}

export function transformImage(
  imageData: ImageData,
  options: TransformOptions = {}
): ImageData {
  const {
    scaleX = 1,
    scaleY = 1,
    rotation = 0,
    cropX = 0,
    cropY = 0,
    cropWidth = 0,
    cropHeight = 0,
  } = options;

  const needsTransform =
    scaleX !== 1 ||
    scaleY !== 1 ||
    rotation !== 0 ||
    cropX !== 0 ||
    cropY !== 0 ||
    cropWidth !== 0 ||
    cropHeight !== 0;

  if (!needsTransform) {
    return imageData;
  }

  let srcCanvas: HTMLCanvasElement | OffscreenCanvas;
  let srcCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

  if (typeof OffscreenCanvas !== 'undefined') {
    srcCanvas = new OffscreenCanvas(imageData.width, imageData.height);
    srcCtx = srcCanvas.getContext('2d');
  } else {
    srcCanvas = document.createElement('canvas');
    srcCanvas.width = imageData.width;
    srcCanvas.height = imageData.height;
    srcCtx = srcCanvas.getContext('2d');
  }

  if (!srcCtx) throw new Error('Failed to get source canvas context');

  srcCtx.putImageData(imageData, 0, 0);

  // Determine output dimensions
  let outWidth = cropWidth > 0 ? cropWidth : imageData.width;
  let outHeight = cropHeight > 0 ? cropHeight : imageData.height;
  outWidth = Math.round(outWidth * Math.abs(scaleX));
  outHeight = Math.round(outHeight * Math.abs(scaleY));

  if (outWidth <= 0 || outHeight <= 0) {
    throw new Error('Invalid output dimensions after transform');
  }

  const { canvas: _outCanvas, ctx: outCtx } = createCanvas(outWidth, outHeight);

  outCtx.save();

  // Step 1: Move origin to center of output canvas
  outCtx.translate(outWidth / 2, outHeight / 2);

  // Step 2: Scale in image-local space (before rotation)
  outCtx.scale(scaleX, scaleY);

  // Step 3: Rotate around the image center
  outCtx.rotate((rotation * Math.PI) / 180);

  // Step 4: Shift back so image center sits at canvas origin
  outCtx.translate(-outWidth / 2, -outHeight / 2);

  // Draw with crop offset
  outCtx.drawImage(
    srcCanvas,
    cropX,
    cropY,
    cropWidth > 0 ? cropWidth : imageData.width,
    cropHeight > 0 ? cropHeight : imageData.height,
    0,
    0,
    cropWidth > 0 ? cropWidth : imageData.width,
    cropHeight > 0 ? cropHeight : imageData.height
  );

  outCtx.restore();

  return outCtx.getImageData(0, 0, outWidth, outHeight);
}

export function cropImage(
  imageData: ImageData,
  x: number,
  y: number,
  width: number,
  height: number
): ImageData {
  if (x < 0 || y < 0 || x + width > imageData.width || y + height > imageData.height) {
    throw new Error('Crop region exceeds image bounds');
  }

  let canvas: HTMLCanvasElement | OffscreenCanvas;
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(imageData.width, imageData.height);
    ctx = canvas.getContext('2d');
  } else {
    canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx = canvas.getContext('2d');
  }

  if (!ctx) throw new Error('Failed to get canvas context');

  ctx.putImageData(imageData, 0, 0);

  const { canvas: _outCanvas, ctx: outCtx } = createCanvas(width, height);
  outCtx.drawImage(canvas, x, y, width, height, 0, 0, width, height);

  return outCtx.getImageData(0, 0, width, height);
}

export function resizeImageData(
  imageData: ImageData,
  width: number,
  height: number
): ImageData {
  if (width <= 0 || height <= 0) {
    throw new Error('Invalid resize dimensions');
  }

  let canvas: HTMLCanvasElement | OffscreenCanvas;
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(imageData.width, imageData.height);
    ctx = canvas.getContext('2d');
  } else {
    canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx = canvas.getContext('2d');
  }

  if (!ctx) throw new Error('Failed to get canvas context');

  ctx.putImageData(imageData, 0, 0);

  const { canvas: _outCanvas, ctx: outCtx } = createCanvas(width, height);
  outCtx.drawImage(canvas, 0, 0, width, height);

  return outCtx.getImageData(0, 0, width, height);
}

export function flipHorizontal(imageData: ImageData): ImageData {
  const result = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );

  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const srcIdx = (y * imageData.width + x) * 4;
      const dstIdx = (y * imageData.width + (imageData.width - 1 - x)) * 4;
      result.data[dstIdx] = imageData.data[srcIdx];
      result.data[dstIdx + 1] = imageData.data[srcIdx + 1];
      result.data[dstIdx + 2] = imageData.data[srcIdx + 2];
      result.data[dstIdx + 3] = imageData.data[srcIdx + 3];
    }
  }

  return result;
}

export function flipVertical(imageData: ImageData): ImageData {
  const result = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );

  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const srcIdx = (y * imageData.width + x) * 4;
      const dstIdx = ((imageData.height - 1 - y) * imageData.width + x) * 4;
      result.data[dstIdx] = imageData.data[srcIdx];
      result.data[dstIdx + 1] = imageData.data[srcIdx + 1];
      result.data[dstIdx + 2] = imageData.data[srcIdx + 2];
      result.data[dstIdx + 3] = imageData.data[srcIdx + 3];
    }
  }

  return result;
}

// ─── Transform executor ────────────────────────────────────────────────────────

let _workerRunner: WorkerRunner | null = null;

function getTransformWorkerRunner(): WorkerRunner {
  if (!_workerRunner) {
    _workerRunner = getWorkerRunner();
  }
  return _workerRunner;
}

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

  console.log('[Transform] params:', JSON.stringify(params));
  console.log('[Transform] extracted values:', { scaleX, scaleY, cropWidth, cropHeight, translateX, translateY, rotation });

  const workerRunner = getTransformWorkerRunner();
  const transformOptions: TransformOptions = {
    scaleX,
    scaleY,
    rotation,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
  };

  // Try worker lane first; fall back to main-thread transformImage if workers unavailable
  let transformed: ImageData;
  if (workerRunner.isWorkerAvailable()) {
    const workerResult = await workerRunner.transform(image, transformOptions);
    console.log('[Transform] worker result:', workerResult);
    transformed = workerResult.data;
  } else {
    transformed = transformImage(image, transformOptions);
  }

  const finalX = Math.floor(translateX);
  const finalY = Math.floor(translateY);
  const finalW = Math.max(0, transformed.width + finalX);
  const finalH = Math.max(0, transformed.height + finalY);

  let finalData: ImageData;
  if (finalW === 0 || finalH === 0) {
    finalData = new ImageData(1, 1);
  } else if (finalX !== 0 || finalY !== 0) {
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

  const previewCanvas = new OffscreenCanvas(finalW, finalH);
  const previewCtx = previewCanvas.getContext('2d');
  if (!previewCtx) throw new Error('Failed to get 2D context for preview canvas');
  previewCtx.putImageData(finalData, 0, 0);
  const previewRef = await generatePreviewUrl(finalData, finalW, finalH);

  console.log('[Transform] finalW, finalH:', finalW, finalH, 'transformed.size:', transformed.width, transformed.height);
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
