/**
 * Node.js crop executor using sharp's extract API.
 */

import type { NodeExecutor, TransformExecutorOutput } from '@prism/shared-types';
import type { ImageData } from '@prism/shared-types';
import sharp from 'sharp';
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

export const cropExecutor: NodeExecutor = async (
  inputs,
  params,
  _ctx
) => {
  const base64 = inputs['image'] as string | undefined;

  if (!base64) {
    throw new Error('image input (base64 string) is required for crop executor');
  }

  const imageData = await decodeToImageData(base64);

  const x = (params['x'] as number | undefined) ?? 0;
  const y = (params['y'] as number | undefined) ?? 0;
  const width = (params['width'] as number | undefined) ?? imageData.width;
  const height = (params['height'] as number | undefined) ?? imageData.height;

  const sharpInstance = imageDataToSharp(imageData);
  const cropped = await sharpInstance
    .extract({ left: x, top: y, width, height })
    .toBuffer();

  const resultImageData = await sharpToImageData(sharp(cropped));
  const resultBase64 = await encodeToBase64(resultImageData);

  return {
    type: 'transform',
    image: {
      data: resultImageData,
      width: resultImageData.width,
      height: resultImageData.height,
      canvasWidth: resultImageData.width,
      canvasHeight: resultImageData.height,
      position: { x: 0, y: 0 },
      previewUrl: `data:image/png;base64,${resultBase64}`,
    },
    previewUrl: `data:image/png;base64,${resultBase64}`,
    width: resultImageData.width,
    height: resultImageData.height,
  } satisfies TransformExecutorOutput;
};
