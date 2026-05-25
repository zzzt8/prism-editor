/**
 * Node.js composite executor using sharp for I/O.
 *
 * I/O layer: sharp Buffer → ImageData → compositeImages → ImageData → sharp Buffer
 * Pure logic: core/composite-math.ts
 */

import type { NodeExecutor, BlendMode, CompositeExecutorOutput } from '@prism/shared-types';
import type { ImageData } from '@prism/shared-types';
import sharp from 'sharp';
import { compositeImages, type CompositeOptions } from '../core/composite-math';
import { sharpToImageData, imageDataToSharp } from './sharp-utils';

/**
 * Decodes a base64-encoded image string to ImageData using sharp.
 */
async function decodeToImageData(base64Data: string): Promise<ImageData> {
  const buffer = Buffer.from(base64Data, 'base64');
  const sharpInstance = sharp(buffer);
  return sharpToImageData(sharpInstance);
}

/**
 * Encodes ImageData to PNG base64 string using sharp.
 */
async function encodeToBase64(imageData: ImageData): Promise<string> {
  const sharpInstance = imageDataToSharp(imageData);
  const buffer = await sharpInstance.png().toBuffer();
  return buffer.toString('base64');
}

export const compositeExecutor: NodeExecutor = async (
  inputs,
  params,
  _ctx
) => {
  const base64 = inputs['base'] as string | undefined;
  const overlayBase64 = inputs['overlay'] as string | undefined;

  if (!base64) {
    throw new Error('base input (base64 string) is required for composite executor');
  }

  const baseData = await decodeToImageData(base64);

  const blendMode = ((params['blendMode'] as BlendMode) ?? 'normal') as BlendMode;
  const opacity = (params['opacity'] as number) ?? 1;
  const canvasWidth = (params['canvasWidth'] as number | undefined) ?? baseData.width;
  const canvasHeight = (params['canvasHeight'] as number | undefined) ?? baseData.height;
  const overlayX = (params['overlayX'] as number | undefined) ?? 0;
  const overlayY = (params['overlayY'] as number | undefined) ?? 0;

  const result: ImageData = overlayBase64
    ? compositeImages(baseData, await decodeToImageData(overlayBase64), {
        blendMode,
        opacity,
        canvasWidth,
        canvasHeight,
        overlayX,
        overlayY,
      } satisfies CompositeOptions)
    : baseData;

  const resultBase64 = await encodeToBase64(result);

  return {
    type: 'composite',
    image: {
      data: result,
      width: result.width,
      height: result.height,
      canvasWidth: result.width,
      canvasHeight: result.height,
      position: { x: 0, y: 0 },
      previewUrl: `data:image/png;base64,${resultBase64}`,
    },
    previewUrl: `data:image/png;base64,${resultBase64}`,
    width: result.width,
    height: result.height,
  } satisfies CompositeExecutorOutput;
};
