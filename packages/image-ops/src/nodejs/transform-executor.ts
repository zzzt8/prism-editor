/**
 * Node.js transform executor using sharp.
 * Supports translate, scale, rotate, and crop operations.
 */

import type { NodeExecutor, TransformExecutorOutput } from '@prism/shared-types';
import type { ImageData } from '@prism/shared-types';
import sharp from 'sharp';
import { imageDataToSharp, sharpToImageData } from './sharp-utils';

export const transformExecutor: NodeExecutor = async (
  inputs,
  params
) => {
  const imageData = inputs['image'] as ImageData | undefined;

  if (!imageData) {
    throw new Error('image input (ImageData) is required for transform executor');
  }

  const translateX = (params['translateX'] as number | undefined) ?? 0;
  const translateY = (params['translateY'] as number | undefined) ?? 0;
  const scaleX = (params['scaleX'] as number | undefined) ?? 1;
  const scaleY = (params['scaleY'] as number | undefined) ?? 1;
  const rotation = (params['rotation'] as number | undefined) ?? 0;
  const cropX = (params['cropX'] as number | undefined) ?? 0;
  const cropY = (params['cropY'] as number | undefined) ?? 0;
  const cropWidth = (params['cropWidth'] as number | undefined) ?? 0;
  const cropHeight = (params['cropHeight'] as number | undefined) ?? 0;

  let sharpInstance = imageDataToSharp(imageData);

  // Apply crop if specified
  if (cropX > 0 || cropY > 0 || cropWidth > 0 || cropHeight > 0) {
    const left = Math.max(0, Math.round(cropX));
    const top = Math.max(0, Math.round(cropY));
    const width = cropWidth > 0 ? Math.round(cropWidth) : imageData.width;
    const height = cropHeight > 0 ? Math.round(cropHeight) : imageData.height;

    // Clamp to image bounds
    const clampedWidth = Math.min(width, imageData.width - left);
    const clampedHeight = Math.min(height, imageData.height - top);

    if (clampedWidth > 0 && clampedHeight > 0) {
      sharpInstance = sharpInstance.extract({ left, top, width: clampedWidth, height: clampedHeight });
    }
  }

  // Apply resize (scale)
  if (scaleX !== 1 || scaleY !== 1) {
    const targetWidth = Math.round((cropWidth > 0 ? (cropWidth > 0 ? cropWidth : imageData.width) : imageData.width) * Math.abs(scaleX));
    const targetHeight = Math.round((cropHeight > 0 ? cropHeight : imageData.height) * Math.abs(scaleY));
    sharpInstance = sharpInstance.resize(targetWidth, targetHeight, {
      fit: 'fill',
    });
  }

  // Apply rotation
  if (rotation !== 0) {
    sharpInstance = sharpInstance.rotate(rotation, {
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });
  }

  // Convert to ImageData
  const resultImageData = await sharpToImageData(sharpInstance);

  // Apply translation by adjusting position in output
  // sharp handles the pixel manipulation, we just need to track the offset
  const finalX = Math.floor(translateX);
  const finalY = Math.floor(translateY);

  // Generate preview
  const previewSharp = imageDataToSharp(resultImageData);
  const previewBuffer = await previewSharp.png().toBuffer();
  const previewUrl = `data:image/png;base64,${previewBuffer.toString('base64')}`;

  return {
    type: 'transform',
    image: {
      data: resultImageData,
      previewUrl,
      width: resultImageData.width,
      height: resultImageData.height,
      canvasWidth: resultImageData.width,
      canvasHeight: resultImageData.height,
      position: { x: finalX, y: finalY },
    },
    previewUrl,
    width: resultImageData.width,
    height: resultImageData.height,
  } satisfies TransformExecutorOutput;
};
