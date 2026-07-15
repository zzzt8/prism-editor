/**
 * Browser Transform Executor using Canvas 2D API.
 *
 * Architecture:
 * - browser/TransformExecutor.ts: Canvas 2D wrapper
 * - core/transform/transform.ts: Pure algorithm (no platform dependencies)
 */

import type { NodeExecutor, TransformExecutorOutput } from '@prism/shared-types'
import { unwrapImageData } from '@prism/shared-types'
import { generatePreviewUrl } from '../preview-strategy'
import type { ExecutionContext } from '@prism/shared-types'
import { createCanvas, getImageData, putImageData } from './canvas-utils'

/**
 * Browser-specific transform executor.
 * Uses Canvas 2D API for efficient transformation operations.
 */
export const transformExecutor: NodeExecutor = async (inputs, params, _ctx: ExecutionContext) => {
  const rawImage = inputs['image'] as Parameters<typeof unwrapImageData>[0] | undefined
  const image = rawImage ? unwrapImageData(rawImage) : undefined

  if (!image) {
    throw new Error('image input is required for transform executor')
  }

  const translateX = (params['translateX'] as number) ?? 0
  const translateY = (params['translateY'] as number) ?? 0
  const scaleX = (params['scaleX'] as number) ?? 1
  const scaleY = (params['scaleY'] as number) ?? 1
  const rotation = (params['rotation'] as number) ?? 0
  const cropX = (params['cropX'] as number) ?? 0
  const cropY = (params['cropY'] as number) ?? 0
  const cropWidth = (params['cropWidth'] as number) ?? 0
  const cropHeight = (params['cropHeight'] as number) ?? 0

  // Use Canvas 2D for transformations (supports arbitrary rotation, scale, translate)
  const { canvas } = createCanvas(image.width, image.height)
  putImageData(canvas, image, 0, 0)

  // Calculate output dimensions
  let outWidth = cropWidth > 0 ? cropWidth : image.width
  let outHeight = cropHeight > 0 ? cropHeight : image.height
  outWidth = Math.round(outWidth * Math.abs(scaleX))
  outHeight = Math.round(outHeight * Math.abs(scaleY))

  if (outWidth <= 0 || outHeight <= 0) {
    throw new Error('Invalid output dimensions after transform')
  }

  const outCanvas = new OffscreenCanvas(outWidth, outHeight)
  const outCtx = outCanvas.getContext('2d')
  if (!outCtx) throw new Error('Failed to get 2D context')

  outCtx.save()

  // Move origin to center of output canvas
  outCtx.translate(outWidth / 2, outHeight / 2)
  // Scale
  outCtx.scale(scaleX, scaleY)
  // Rotate
  outCtx.rotate((rotation * Math.PI) / 180)
  // Apply translation
  outCtx.translate(translateX, translateY)
  // Shift back to center
  outCtx.translate(-outWidth / 2, -outHeight / 2)

  // Draw with crop offset
  outCtx.drawImage(
    canvas,
    cropX,
    cropY,
    cropWidth > 0 ? cropWidth : image.width,
    cropHeight > 0 ? cropHeight : image.height,
    0,
    0,
    cropWidth > 0 ? cropWidth : image.width,
    cropHeight > 0 ? cropHeight : image.height,
  )

  outCtx.restore()

  const result = getImageData(outCanvas, 0, 0, outWidth, outHeight)
  const previewRef = await generatePreviewUrl(result, outWidth, outHeight)

  return {
    type: 'transform',
    image: {
      data: result,
      previewUrl: previewRef.url,
      width: outWidth,
      height: outHeight,
      canvasWidth: outWidth,
      canvasHeight: outHeight,
      position: { x: 0, y: 0 },
    },
    previewUrl: previewRef.url,
    width: outWidth,
    height: outHeight,
  } satisfies TransformExecutorOutput
}
