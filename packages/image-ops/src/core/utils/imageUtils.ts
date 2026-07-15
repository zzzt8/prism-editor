/**
 * @prism/image-ops/core/utils
 * Shared utility functions for image operations.
 * These utilities are platform-independent and can be used by both browser and nodejs implementations.
 */

import type { ImageData } from '@prism/shared-types';

/**
 * Creates a new ImageData object with specified dimensions.
 */
export function createImageData(width: number, height: number): ImageData {
  return new ImageData(width, height);
}

/**
 * Clones an ImageData object.
 */
export function cloneImageData(src: ImageData): ImageData {
  return new ImageData(
    new Uint8ClampedArray(src.data),
    src.width,
    src.height,
    { colorSpace: src.colorSpace }
  );
}

/**
 * Checks if two ImageData objects have the same dimensions.
 */
export function hasSameDimensions(a: ImageData, b: ImageData): boolean {
  return a.width === b.width && a.height === b.height;
}

/**
 * Calculates the byte size of an ImageData object.
 */
export function getImageDataByteSize(image: ImageData): number {
  return image.data.byteLength;
}
