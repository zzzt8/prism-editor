/**
 * Node.js load-image executor using sharp.
 * Supports three input sources: URL, FilePath, Buffer.
 */

import type { NodeExecutor, LoadImageExecutorOutput } from '@prism/shared-types'
import type { ImageData } from '@prism/shared-types'
import sharp from 'sharp'

type ImageSource =
  | { type: 'url'; value: string }
  | { type: 'path'; value: string }
  | { type: 'buffer'; value: Buffer }

/** Parse the source parameter into a structured ImageSource */
function parseImageSource(params: Record<string, unknown>): ImageSource {
  // Source 1: url (HTTP/HTTPS URL)
  if (params['url'] !== undefined) {
    const url = params['url'] as string
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return { type: 'url', value: url }
    }
    // If it looks like a file path, treat it as such
    return { type: 'path', value: url }
  }

  // Source 2: path (local file path)
  if (params['path'] !== undefined) {
    return { type: 'path', value: params['path'] as string }
  }

  // Source 3: buffer (raw image buffer from base64 or binary)
  if (params['buffer'] !== undefined) {
    const buffer = params['buffer']
    if (Buffer.isBuffer(buffer)) {
      return { type: 'buffer', value: buffer }
    }
    if (typeof buffer === 'string') {
      // Assume base64 encoded string
      return { type: 'buffer', value: Buffer.from(buffer, 'base64') }
    }
    throw new Error('buffer param must be a string (base64) or Buffer')
  }

  // Source 4: dataUrl (data URL format)
  if (params['dataUrl'] !== undefined) {
    const dataUrl = params['dataUrl'] as string
    if (dataUrl.startsWith('data:')) {
      // Extract base64 portion from data URL
      const match = dataUrl.match(/^data:[^;]+;base64,(.+)$/)
      if (match) {
        return { type: 'buffer', value: Buffer.from(match[1], 'base64') }
      }
      throw new Error('Unsupported data URL format')
    }
    throw new Error('dataUrl param must be a data URL starting with data:')
  }

  throw new Error('url, path, buffer, or dataUrl param is required for load-image executor')
}

/** Infer mime type from buffer magic bytes */
function inferMimeType(buffer: Buffer): string {
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png'
  }
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg'
  }
  // WebP: RIFF....WEBP
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    return 'image/webp'
  }
  // GIF: 47 49 46 38
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
    return 'image/gif'
  }
  return 'image/png'
}

/** Load image from HTTP/HTTPS URL */
async function loadFromUrl(url: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  const mimeType = response.headers.get('content-type') ?? inferMimeType(buffer)
  return { buffer, mimeType }
}

/** Load image from local file path */
async function loadFromPath(filePath: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const fs = await import('fs/promises')
  const buffer = await fs.readFile(filePath)
  const mimeType = inferMimeType(buffer)
  return { buffer, mimeType }
}

export const loadImageExecutor: NodeExecutor = async (_inputs, params) => {
  const source = parseImageSource(params)

  let buffer: Buffer

  switch (source.type) {
    case 'url':
      ;({ buffer } = await loadFromUrl(source.value))
      break
    case 'path':
      ;({ buffer } = await loadFromPath(source.value))
      break
    case 'buffer':
      buffer = source.value
      break
  }

  // Decode to RGBA raw pixels
  const sharpInstance = sharp(buffer)
  const metadata = await sharpInstance.metadata()

  // Ensure RGBA format for consistent ImageData output
  const rgbaBuffer = await sharpInstance.ensureAlpha().raw().toBuffer({ resolveWithObject: true })

  const width = metadata.width ?? rgbaBuffer.info.width
  const height = metadata.height ?? rgbaBuffer.info.height

  const imageData: ImageData = new ImageData(new Uint8ClampedArray(rgbaBuffer.data), width, height)

  // Generate preview URL
  const previewBuffer = await sharp(buffer).ensureAlpha().png().toBuffer()
  const previewUrl = `data:image/png;base64,${previewBuffer.toString('base64')}`

  return {
    type: 'load-image',
    image: {
      data: imageData,
      previewUrl,
      width,
      height,
      canvasWidth: width,
      canvasHeight: height,
      position: { x: 0, y: 0 },
    },
    previewUrl,
    width,
    height,
  } satisfies LoadImageExecutorOutput
}
