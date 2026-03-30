// Image transformation operations

// ImageData is a browser built-in
type ImageData = globalThis.ImageData;
import type { TransformOptions } from '@prism/shared-types';

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
    (cropWidth > 0 && cropHeight > 0);

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

  const { canvas: outCanvas, ctx: outCtx } = createCanvas(outWidth, outHeight);

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

  const { canvas: outCanvas, ctx: outCtx } = createCanvas(width, height);
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

  const { canvas: outCanvas, ctx: outCtx } = createCanvas(width, height);
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
