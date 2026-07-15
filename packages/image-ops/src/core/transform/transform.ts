/**
 * Pure image transformation functions for the core layer.
 *
 * This module contains transformation algorithm logic extracted from the original
 * transform.ts. All functions are pure - no canvas, no platform APIs.
 *
 * Architecture:
 * - core/transform/transform.ts: Pure algorithms (resize, flip, rotate, crop)
 * - browser/TransformExecutor.ts: Browser-specific implementation using Canvas 2D
 * - nodejs/TransformExecutor.ts: Node.js-specific implementation using sharp
 *
 * @example
 * import { flipHorizontal, flipVertical } from '@prism/image-ops/core/transform';
 */

import type { ImageData } from '@prism/shared-types'
import type { TransformOptions } from './types'

export type { TransformOptions }

/**
 * Flips an image horizontally.
 *
 * @param imageData - The source image data
 * @returns New ImageData with horizontal flip applied
 */
export function flipHorizontal(imageData: ImageData): ImageData {
  const result = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height,
    { colorSpace: imageData.colorSpace },
  )

  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const srcIdx = (y * imageData.width + x) * 4
      const dstIdx = (y * imageData.width + (imageData.width - 1 - x)) * 4
      result.data[dstIdx] = imageData.data[srcIdx]
      result.data[dstIdx + 1] = imageData.data[srcIdx + 1]
      result.data[dstIdx + 2] = imageData.data[srcIdx + 2]
      result.data[dstIdx + 3] = imageData.data[srcIdx + 3]
    }
  }

  return result
}

/**
 * Flips an image vertically.
 *
 * @param imageData - The source image data
 * @returns New ImageData with vertical flip applied
 */
export function flipVertical(imageData: ImageData): ImageData {
  const result = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height,
    { colorSpace: imageData.colorSpace },
  )

  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const srcIdx = (y * imageData.width + x) * 4
      const dstIdx = ((imageData.height - 1 - y) * imageData.width + x) * 4
      result.data[dstIdx] = imageData.data[srcIdx]
      result.data[dstIdx + 1] = imageData.data[srcIdx + 1]
      result.data[dstIdx + 2] = imageData.data[srcIdx + 2]
      result.data[dstIdx + 3] = imageData.data[srcIdx + 3]
    }
  }

  return result
}

/**
 * Crops a region from an image.
 *
 * @param imageData - The source image data
 * @param x - Top-left X coordinate
 * @param y - Top-left Y coordinate
 * @param width - Crop width
 * @param height - Crop height
 * @returns New ImageData with crop applied
 */
export function cropImage(
  imageData: ImageData,
  x: number,
  y: number,
  width: number,
  height: number,
): ImageData {
  if (x < 0 || y < 0 || x + width > imageData.width || y + height > imageData.height) {
    throw new Error('Crop region exceeds image bounds')
  }

  const result = new ImageData(width, height, { colorSpace: imageData.colorSpace })

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const srcIdx = ((y + row) * imageData.width + (x + col)) * 4
      const dstIdx = (row * width + col) * 4

      result.data[dstIdx] = imageData.data[srcIdx]
      result.data[dstIdx + 1] = imageData.data[srcIdx + 1]
      result.data[dstIdx + 2] = imageData.data[srcIdx + 2]
      result.data[dstIdx + 3] = imageData.data[srcIdx + 3]
    }
  }

  return result
}

/**
 * Resizes an image using bilinear interpolation.
 * This is a pure algorithm implementation.
 *
 * @param imageData - The source image data
 * @param targetWidth - Target width
 * @param targetHeight - Target height
 * @returns New ImageData with resize applied
 */
export function resizeImageData(
  imageData: ImageData,
  targetWidth: number,
  targetHeight: number,
): ImageData {
  if (targetWidth <= 0 || targetHeight <= 0) {
    throw new Error('Invalid resize dimensions')
  }

  // If dimensions are the same, return a clone
  if (imageData.width === targetWidth && imageData.height === targetHeight) {
    return new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height, {
      colorSpace: imageData.colorSpace,
    })
  }

  const result = new ImageData(targetWidth, targetHeight, { colorSpace: imageData.colorSpace })
  const xRatio = imageData.width / targetWidth
  const yRatio = imageData.height / targetHeight

  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      // Calculate source coordinates for bilinear interpolation
      const srcX = x * xRatio
      const srcY = y * yRatio
      const x1 = Math.floor(srcX)
      const y1 = Math.floor(srcY)
      const x2 = Math.min(x1 + 1, imageData.width - 1)
      const y2 = Math.min(y1 + 1, imageData.height - 1)

      // Calculate weights
      const xWeight = srcX - x1
      const yWeight = srcY - y1

      // Get four corner pixels
      const p1 = getPixel(imageData, x1, y1)
      const p2 = getPixel(imageData, x2, y1)
      const p3 = getPixel(imageData, x1, y2)
      const p4 = getPixel(imageData, x2, y2)

      // Bilinear interpolation
      const dstIdx = (y * targetWidth + x) * 4
      for (let c = 0; c < 4; c++) {
        const top = p1[c] * (1 - xWeight) + p2[c] * xWeight
        const bottom = p3[c] * (1 - xWeight) + p4[c] * xWeight
        result.data[dstIdx + c] = Math.round(top * (1 - yWeight) + bottom * yWeight)
      }
    }
  }

  return result
}

/**
 * Rotates an image by 90-degree increments.
 * Pure implementation without canvas.
 *
 * @param imageData - The source image data
 * @param degrees - Rotation angle (90, 180, 270, or -90/-270)
 * @returns New ImageData with rotation applied
 */
export function rotateImage(imageData: ImageData, degrees: number): ImageData {
  const normalizedDegrees = ((degrees % 360) + 360) % 360

  // Handle 90, 180, 270 degree rotations
  switch (normalizedDegrees) {
    case 90:
    case -270:
      return rotate90(imageData, true)
    case 180:
    case -180:
      return rotate180(imageData)
    case 270:
    case -90:
      return rotate90(imageData, false)
    default:
      // For other angles, we would need canvas - but this is a pure implementation
      // For now, throw an error for non-90-degree rotations
      throw new Error(`Pure rotation only supports 90-degree increments. Got ${degrees}°`)
  }
}

/**
 * Internal helper to get a pixel as an array.
 */
function getPixel(imageData: ImageData, x: number, y: number): [number, number, number, number] {
  const idx = (y * imageData.width + x) * 4
  return [
    imageData.data[idx],
    imageData.data[idx + 1],
    imageData.data[idx + 2],
    imageData.data[idx + 3],
  ]
}

/**
 * Rotates image by 90 degrees.
 *
 * @param imageData - The source image data
 * @param clockwise - If true, rotate clockwise; if false, rotate counter-clockwise
 */
function rotate90(imageData: ImageData, clockwise: boolean): ImageData {
  const newWidth = imageData.height
  const newHeight = imageData.width
  const result = new ImageData(newWidth, newHeight, { colorSpace: imageData.colorSpace })

  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const srcIdx = (y * imageData.width + x) * 4
      let dstX: number, dstY: number

      if (clockwise) {
        dstX = imageData.height - 1 - y
        dstY = x
      } else {
        dstX = y
        dstY = imageData.width - 1 - x
      }

      const dstIdx = (dstY * newWidth + dstX) * 4
      result.data[dstIdx] = imageData.data[srcIdx]
      result.data[dstIdx + 1] = imageData.data[srcIdx + 1]
      result.data[dstIdx + 2] = imageData.data[srcIdx + 2]
      result.data[dstIdx + 3] = imageData.data[srcIdx + 3]
    }
  }

  return result
}

/**
 * Rotates image by 180 degrees.
 */
function rotate180(imageData: ImageData): ImageData {
  const result = new ImageData(imageData.width, imageData.height, {
    colorSpace: imageData.colorSpace,
  })

  for (let y = 0; y < imageData.height; y++) {
    for (let x = 0; x < imageData.width; x++) {
      const srcIdx = (y * imageData.width + x) * 4
      const dstIdx = ((imageData.height - 1 - y) * imageData.width + (imageData.width - 1 - x)) * 4
      result.data[dstIdx] = imageData.data[srcIdx]
      result.data[dstIdx + 1] = imageData.data[srcIdx + 1]
      result.data[dstIdx + 2] = imageData.data[srcIdx + 2]
      result.data[dstIdx + 3] = imageData.data[srcIdx + 3]
    }
  }

  return result
}

/**
 * Transforms an image based on options.
 * This is a high-level function that combines multiple transformations.
 *
 * @param imageData - The source image data
 * @param options - Transformation options
 * @returns New ImageData with transformations applied
 */
export function transformImage(imageData: ImageData, options: TransformOptions = {}): ImageData {
  const {
    scaleX = 1,
    scaleY = 1,
    rotation = 0,
    cropX = 0,
    cropY = 0,
    cropWidth = 0,
    cropHeight = 0,
  } = options

  let result = imageData

  // Apply crop first
  if (cropX > 0 || cropY > 0 || cropWidth > 0 || cropHeight > 0) {
    const width = cropWidth > 0 ? cropWidth : imageData.width
    const height = cropHeight > 0 ? cropHeight : imageData.height
    result = cropImage(result, cropX, cropY, width, height)
  }

  // Apply scale
  if (scaleX !== 1 || scaleY !== 1) {
    const newWidth = Math.round(result.width * Math.abs(scaleX))
    const newHeight = Math.round(result.height * Math.abs(scaleY))
    result = resizeImageData(result, newWidth, newHeight)
  }

  // Apply rotation (90-degree increments only for pure algorithm)
  if (rotation !== 0) {
    result = rotateImage(result, rotation)
  }

  // Note: translateX/Y require canvas for arbitrary positioning
  // For pure algorithm, we just apply what's possible

  return result
}

/**
 * Checks if the transform module has any platform dependencies.
 */
export function isTransformPlatformIndependent(): boolean {
  return true
}
