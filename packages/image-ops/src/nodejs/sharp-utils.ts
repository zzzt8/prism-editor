/**
 * Sharp ↔ ImageData conversion utilities.
 * These functions bridge between sharp (Node.js) and the browser ImageData interface.
 */

import sharp from 'sharp';
import type { ImageData } from '@prism/shared-types';

/**
 * Converts a sharp instance to an ImageData object.
 * Extracts raw RGBA pixels from sharp and wraps them in ImageData format.
 */
export async function sharpToImageData(sharpInstance: sharp.Sharp): Promise<ImageData> {
  const result = await sharpInstance.toBuffer({ resolveWithObject: true });
  if (!('data' in result) || !('info' in result)) {
    throw new Error('Unexpected sharp output format');
  }
  return new ImageData(new Uint8ClampedArray(result.data), result.info.width, result.info.height);
}

/**
 * Converts an ImageData object to a sharp instance.
 * Wraps ImageData pixel data as a sharp image for further processing.
 */
export function imageDataToSharp(imageData: ImageData): sharp.Sharp {
  return sharp(Buffer.from(imageData.data), {
    raw: {
      width: imageData.width,
      height: imageData.height,
      channels: 4,
    },
  });
}

/**
 * Converts a Buffer (raw RGBA) to ImageData.
 */
export function bufferToImageData(buffer: Buffer, width: number, height: number): ImageData {
  return new ImageData(new Uint8ClampedArray(buffer), width, height);
}

/**
 * Converts ImageData to a raw RGBA Buffer.
 */
export function imageDataToBuffer(imageData: ImageData): Buffer {
  return Buffer.from(imageData.data);
}
