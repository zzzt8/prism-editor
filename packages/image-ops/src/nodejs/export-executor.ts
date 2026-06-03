/**
 * Node.js export executor using sharp.
 * Receives ImageData and outputs PNG/JPEG Buffer.
 */

import type { NodeExecutor, ExportExecutorOutput } from '@prism/shared-types';
import type { ImageData } from '@prism/shared-types';
import { imageDataToSharp } from './sharp-utils';

export const exportExecutor: NodeExecutor = async (
  inputs,
  params,
  _ctx
) => {
  const imageData = inputs['image'] as ImageData | undefined;

  if (!imageData) {
    throw new Error('image input (ImageData) is required for export executor');
  }

  const format = (params['format'] as string | undefined) ?? 'png';
  const quality = (params['quality'] as number | undefined) ?? 80;

  const sharpInstance = imageDataToSharp(imageData);

  let buffer: Buffer;
  let mimeType: string;

  switch (format.toLowerCase()) {
    case 'jpeg':
    case 'jpg':
      buffer = await sharpInstance.jpeg({ quality }).toBuffer();
      mimeType = 'image/jpeg';
      break;
    case 'webp':
      buffer = await sharpInstance.webp({ quality }).toBuffer();
      mimeType = 'image/webp';
      break;
    case 'png':
    default:
      buffer = await sharpInstance.png().toBuffer();
      mimeType = 'image/png';
      break;
  }

  const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;

  return {
    type: 'export',
    previewUrl: dataUrl,
    width: imageData.width,
    height: imageData.height,
    mimeType,
    dataUrl,
  } satisfies ExportExecutorOutput;
};
