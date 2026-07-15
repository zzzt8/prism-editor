/**
 * Sharp ↔ ImageData conversion utilities.
 * These functions bridge between sharp (Node.js) and the browser ImageData interface.
 */

import sharp from 'sharp';
import type { ImageData } from '@prism/shared-types';

/**
 * Converts a sharp instance to an ImageData object.
 * Extracts raw RGBA pixels from sharp and wraps them in ImageData format.
 *
 * CRITICAL: Must call .raw() before toBuffer() to decode to raw RGBA pixels.
 * Without .raw(), toBuffer() returns the image in its native format (e.g., PNG compressed
 * data), which is NOT the decoded pixel data.
 */
export async function sharpToImageData(sharpInstance: sharp.Sharp): Promise<ImageData> {
  // Force raw RGBA output (decode PNG/JPEG/etc to pixels)
  const result = await sharpInstance.raw().toBuffer({ resolveWithObject: true });
  if (!('data' in result) || !('info' in result)) {
    throw new Error('Unexpected sharp output format');
  }
  const { width, height } = result.info;
  // Copy into a fresh Uint8ClampedArray so byteOffset = 0
  const fresh = new Uint8ClampedArray(result.data);
  return makeImageData(fresh, width, height);
}

function makeImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): ImageData {
  const Ctor = (globalThis as { ImageData?: new (d: Uint8ClampedArray, w: number, h: number) => ImageData }).ImageData;
  if (typeof Ctor === 'function') {
    return new Ctor(data, width, height);
  }
  return { data, width, height, colorSpace: 'srgb' } as unknown as ImageData;
}

/**
 * Converts an ImageData object to a sharp instance.
 * Wraps ImageData pixel data as a sharp image for further processing.
 *
 * IMPORTANT: Must use Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength)
 * instead of Buffer.from(arr) to avoid reading preceding garbage bytes from the
 * shared ArrayBuffer. Uint8ClampedArray may have a byteOffset > 0 and/or
 * ArrayBuffer.byteLength > Uint8ClampedArray.byteLength.
 * See: https://github.com/lovell/sharp/issues/3749
 */
export function imageDataToSharp(imageData: ImageData): sharp.Sharp {
  // Create a Buffer pointing to exactly the Uint8ClampedArray's data region
  const byteLength = imageData.width * imageData.height * 4;
  const pixelBuffer = Buffer.from(imageData.data.buffer, imageData.data.byteOffset, byteLength);
  return sharp(pixelBuffer, {
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
  const byteLength = imageData.width * imageData.height * 4;
  return Buffer.from(imageData.data.buffer, imageData.data.byteOffset, byteLength);
}
