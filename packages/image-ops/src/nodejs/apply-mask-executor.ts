/**
 * Node.js apply-mask executor using sharp.
 * Applies alpha, brightness, or luminance mask to an image.
 */

import type { NodeExecutor, ApplyMaskExecutorOutput } from '@prism/shared-types'
import type { ImageData } from '@prism/shared-types'
import { imageDataToSharp, sharpToImageData } from './sharp-utils'

function getLuminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

function getBrightness(r: number, g: number, b: number): number {
  return (r + g + b) / 3
}

function applyAlphaMask(
  imageData: ImageData,
  maskData: ImageData,
  threshold: number = 128,
  invert: boolean = false,
): ImageData {
  const result = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height,
  )

  const thresholdFn = invert
    ? (v: number) => (v < threshold ? 255 : 0)
    : (v: number) => (v >= threshold ? 255 : 0)

  for (let i = 0; i < result.data.length; i += 4) {
    const maskValue = maskData.data[i]
    const alphaValue = thresholdFn(maskValue)
    result.data[i + 3] = (result.data[i + 3] * alphaValue) / 255
  }

  return result
}

function applyBrightnessMask(
  imageData: ImageData,
  maskData: ImageData,
  threshold: number = 128,
  invert: boolean = false,
): ImageData {
  const result = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height,
  )

  const thresholdFn = invert
    ? (v: number) => (v < threshold ? 255 : 0)
    : (v: number) => (v >= threshold ? 255 : 0)

  for (let i = 0; i < result.data.length; i += 4) {
    const brightness = getBrightness(maskData.data[i], maskData.data[i + 1], maskData.data[i + 2])
    const factor = thresholdFn(Math.round(brightness))
    result.data[i + 3] = (result.data[i + 3] * factor) / 255
  }

  return result
}

function applyLuminanceMask(
  imageData: ImageData,
  maskData: ImageData,
  threshold: number = 128,
  invert: boolean = false,
): ImageData {
  const result = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height,
  )

  const thresholdFn = invert
    ? (v: number) => (v < threshold ? 255 : 0)
    : (v: number) => (v >= threshold ? 255 : 0)

  for (let i = 0; i < result.data.length; i += 4) {
    const luminance = getLuminance(maskData.data[i], maskData.data[i + 1], maskData.data[i + 2])
    const factor = thresholdFn(Math.round(luminance))
    result.data[i + 3] = (result.data[i + 3] * factor) / 255
  }

  return result
}

/** Resize mask to match image dimensions using sharp */
async function resizeMaskToImage(
  maskData: ImageData,
  targetWidth: number,
  targetHeight: number,
): Promise<ImageData> {
  const sharpInstance = imageDataToSharp(maskData)
  const resizedSharp = sharpInstance.resize(targetWidth, targetHeight, { fit: 'cover' })
  return sharpToImageData(resizedSharp)
}

export const applyMaskExecutor: NodeExecutor = async (inputs, params) => {
  const rawImage = inputs['image'] as ImageData | undefined
  const rawMask = inputs['mask'] as ImageData | undefined

  if (!rawImage) {
    throw new Error('image input (ImageData) is required for apply-mask executor')
  }
  if (!rawMask) {
    throw new Error('mask input (ImageData) is required for apply-mask executor')
  }

  const maskType = (params['maskType'] as 'alpha' | 'brightness' | 'luminance') ?? 'alpha'
  const threshold = (params['threshold'] as number | undefined) ?? 128
  const invert = (params['invert'] as boolean | undefined) ?? false

  // Resize mask if dimensions don't match
  let maskData = rawMask
  if (rawImage.width !== rawMask.width || rawImage.height !== rawMask.height) {
    maskData = await resizeMaskToImage(rawMask, rawImage.width, rawImage.height)
  }

  // Apply mask based on type
  let result: ImageData
  switch (maskType) {
    case 'alpha':
      result = applyAlphaMask(rawImage, maskData, threshold, invert)
      break
    case 'brightness':
      result = applyBrightnessMask(rawImage, maskData, threshold, invert)
      break
    case 'luminance':
      result = applyLuminanceMask(rawImage, maskData, threshold, invert)
      break
    default:
      throw new Error(`Unknown mask type: ${maskType}`)
  }

  // Generate preview
  const previewSharp = imageDataToSharp(result)
  const previewBuffer = await previewSharp.png().toBuffer()
  const previewUrl = `data:image/png;base64,${previewBuffer.toString('base64')}`

  return {
    type: 'apply-mask',
    image: {
      data: result,
      previewUrl,
      width: result.width,
      height: result.height,
      canvasWidth: result.width,
      canvasHeight: result.height,
      position: { x: 0, y: 0 },
    },
    previewUrl,
    width: result.width,
    height: result.height,
  } satisfies ApplyMaskExecutorOutput
}
