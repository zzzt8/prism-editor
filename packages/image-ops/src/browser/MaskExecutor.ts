/**
 * Browser Mask Executor using Canvas 2D API.
 *
 * Architecture:
 * - browser/MaskExecutor.ts: Canvas 2D wrapper
 * - core/mask/mask.ts: Pure algorithm (no platform dependencies)
 */

import type { NodeExecutor, ApplyMaskExecutorOutput } from '@prism/shared-types'
import { applyMask } from '../core/mask/mask'
import { unwrapImageData } from '@prism/shared-types'
import { generatePreviewUrl } from '../preview-strategy'
import type { ExecutionContext } from '@prism/shared-types'
import type { MaskOptions } from '../core/mask/types'

/**
 * Browser-specific mask executor.
 * Uses Canvas 2D API for efficient mask operations.
 */
export const maskExecutor: NodeExecutor = async (inputs, params, _ctx: ExecutionContext) => {
  const rawImage = inputs['image'] as Parameters<typeof unwrapImageData>[0] | undefined
  const rawMask = inputs['mask'] as Parameters<typeof unwrapImageData>[0] | undefined
  const image = rawImage ? unwrapImageData(rawImage) : undefined
  const mask = rawMask ? unwrapImageData(rawMask) : undefined

  if (!image) {
    throw new Error('image input is required for mask executor')
  }
  if (!mask) {
    throw new Error('mask input is required for mask executor')
  }

  const maskType = (params['maskType'] as MaskOptions['type']) ?? 'alpha'
  const threshold = (params['threshold'] as number) ?? 128
  const invert = (params['invert'] as boolean) ?? false

  const maskOptions: MaskOptions = { type: maskType, threshold, invert }
  const result = applyMask(image, mask, maskOptions)

  const previewRef = await generatePreviewUrl(result, result.width, result.height)

  return {
    type: 'apply-mask',
    image: {
      data: result,
      previewUrl: previewRef.url,
      width: result.width,
      height: result.height,
    },
    previewUrl: previewRef.url,
    width: result.width,
    height: result.height,
  } satisfies ApplyMaskExecutorOutput
}
