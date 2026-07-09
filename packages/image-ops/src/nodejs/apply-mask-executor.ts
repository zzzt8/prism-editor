/**
 * Node.js apply-mask executor using sharp.
 * Applies alpha, brightness, or luminance mask to an image.
 *
 * Pure logic: core/mask/mask.ts
 */

import type { NodeExecutor, ApplyMaskExecutorOutput } from '@prism/shared-types'
import type { ImageData } from '@prism/shared-types'
import { imageDataToSharp } from './sharp-utils'
import { applyMask, type MaskOptions } from '../core/mask/mask'

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

  // Apply mask based on type
  // Note: core/mask/mask.ts handles dimension mismatch via resizeMaskData (nearest-neighbor)
  const maskOptions: MaskOptions = { type: maskType, threshold, invert }
  const result = applyMask(rawImage, rawMask, maskOptions)

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
