/**
 * Pure mask application functions for the core layer.
 *
 * This module contains mask algorithm logic extracted from the original
 * apply-mask.ts. All functions are pure - no canvas, no platform APIs.
 *
 * Architecture:
 * - core/mask/mask.ts: Pure algorithm, no platform dependencies
 * - browser/MaskExecutor.ts: Browser-specific implementation using Canvas 2D
 * - nodejs/MaskExecutor.ts: Node.js-specific implementation using sharp
 *
 * @example
 * import { applyMask, applyAlphaMask } from '@prism/image-ops/core/mask';
 */

import type { ImageData } from '@prism/shared-types'
import type { MaskOptions, MaskType } from './types'

export type { MaskOptions, MaskType }

/**
 * Calculates luminance from RGB values.
 * Uses standard coefficients for Rec. 601.
 */
export function getLuminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

/**
 * Calculates brightness from RGB values.
 * Simple average of RGB channels.
 */
export function getBrightness(r: number, g: number, b: number): number {
  return (r + g + b) / 3
}

/**
 * Creates a threshold function based on invert setting.
 */
function createThresholdFn(threshold: number, invert: boolean): (_value: number) => number {
  return invert
    ? (_value: number) => (_value < threshold ? 255 : 0)
    : (_value: number) => (_value >= threshold ? 255 : 0)
}

/**
 * Applies alpha mask to image data.
 *
 * @param imageData - The base image data
 * @param maskData - The mask image data
 * @param threshold - Alpha threshold (0-255)
 * @param invert - Invert the mask before applying
 * @returns New ImageData with masked alpha channel
 */
export function applyAlphaMask(
  imageData: ImageData,
  maskData: ImageData,
  threshold: number = 128,
  invert: boolean = false,
): ImageData {
  const result = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height,
    { colorSpace: imageData.colorSpace },
  )

  const thresholdFn = createThresholdFn(threshold, invert)

  for (let i = 0; i < result.data.length; i += 4) {
    const maskValue = maskData.data[i]
    const alphaValue = thresholdFn(maskValue)
    result.data[i + 3] = Math.round((result.data[i + 3] * alphaValue) / 255)
  }

  return result
}

/**
 * Applies brightness mask to image data.
 *
 * @param imageData - The base image data
 * @param maskData - The mask image data (used for brightness calculation)
 * @param threshold - Brightness threshold (0-255)
 * @param invert - Invert the mask before applying
 * @returns New ImageData with masked alpha channel
 */
export function applyBrightnessMask(
  imageData: ImageData,
  maskData: ImageData,
  threshold: number = 128,
  invert: boolean = false,
): ImageData {
  const result = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height,
    { colorSpace: imageData.colorSpace },
  )

  const thresholdFn = createThresholdFn(threshold, invert)

  for (let i = 0; i < result.data.length; i += 4) {
    const brightness = getBrightness(maskData.data[i], maskData.data[i + 1], maskData.data[i + 2])
    const factor = thresholdFn(Math.round(brightness))
    result.data[i + 3] = Math.round((result.data[i + 3] * factor) / 255)
  }

  return result
}

/**
 * Applies luminance mask to image data.
 *
 * @param imageData - The base image data
 * @param maskData - The mask image data (used for luminance calculation)
 * @param threshold - Luminance threshold (0-255)
 * @param invert - Invert the mask before applying
 * @returns New ImageData with masked alpha channel
 */
export function applyLuminanceMask(
  imageData: ImageData,
  maskData: ImageData,
  threshold: number = 128,
  invert: boolean = false,
): ImageData {
  const result = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height,
    { colorSpace: imageData.colorSpace },
  )

  const thresholdFn = createThresholdFn(threshold, invert)

  for (let i = 0; i < result.data.length; i += 4) {
    const luminance = getLuminance(maskData.data[i], maskData.data[i + 1], maskData.data[i + 2])
    const factor = thresholdFn(Math.round(luminance))
    result.data[i + 3] = Math.round((result.data[i + 3] * factor) / 255)
  }

  return result
}

/**
 * Unified mask application function.
 * Automatically resizes mask to match image dimensions if needed.
 *
 * @param imageData - The base image data
 * @param maskData - The mask image data
 * @param options - Mask options (type, threshold, invert)
 * @returns New ImageData with mask applied
 */
export function applyMask(
  imageData: ImageData,
  maskData: ImageData,
  options: MaskOptions = { type: 'alpha' },
): ImageData {
  const { type, threshold = 128, invert = false } = options

  // If dimensions don't match, resize mask to fit
  if (imageData.width !== maskData.width || imageData.height !== maskData.height) {
    const resizedMask = resizeMaskData(maskData, imageData.width, imageData.height)
    return applyMaskWithType(imageData, resizedMask, type, threshold, invert)
  }

  return applyMaskWithType(imageData, maskData, type, threshold, invert)
}

/**
 * Internal helper to apply mask with specified type.
 */
function applyMaskWithType(
  imageData: ImageData,
  maskData: ImageData,
  type: MaskType,
  threshold: number,
  invert: boolean,
): ImageData {
  switch (type) {
    case 'alpha':
      return applyAlphaMask(imageData, maskData, threshold, invert)
    case 'brightness':
      return applyBrightnessMask(imageData, maskData, threshold, invert)
    case 'luminance':
      return applyLuminanceMask(imageData, maskData, threshold, invert)
    default:
      throw new Error(`Unknown mask type: ${type}`)
  }
}

/**
 * Resizes mask data to target dimensions using nearest-neighbor sampling.
 * This is a pure function with no platform dependencies.
 *
 * @param src - Source mask data
 * @param targetWidth - Target width
 * @param targetHeight - Target height
 * @returns Resized ImageData
 */
export function resizeMaskData(
  src: ImageData,
  targetWidth: number,
  targetHeight: number,
): ImageData {
  if (src.width === targetWidth && src.height === targetHeight) {
    return src
  }

  const result = new ImageData(targetWidth, targetHeight, { colorSpace: src.colorSpace })
  const xRatio = src.width / targetWidth
  const yRatio = src.height / targetHeight

  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const srcX = Math.floor(x * xRatio)
      const srcY = Math.floor(y * yRatio)
      const srcIdx = (srcY * src.width + srcX) * 4
      const dstIdx = (y * targetWidth + x) * 4

      // Nearest neighbor sampling
      result.data[dstIdx] = src.data[srcIdx]
      result.data[dstIdx + 1] = src.data[srcIdx + 1]
      result.data[dstIdx + 2] = src.data[srcIdx + 2]
      result.data[dstIdx + 3] = src.data[srcIdx + 3]
    }
  }

  return result
}

/**
 * Checks if the mask module has any platform dependencies.
 */
export function isMaskPlatformIndependent(): boolean {
  return true
}
