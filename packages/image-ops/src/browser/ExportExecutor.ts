/**
 * Browser Export Executor using Canvas 2D API.
 *
 * Architecture:
 * - browser/ExportExecutor.ts: Canvas 2D wrapper
 * - core/export/export.ts: Pure algorithm (no platform dependencies)
 */

import type { NodeExecutor, ExportExecutorOutput } from '@prism/shared-types';
import type { ImageData } from '@prism/shared-types';
import { unwrapImageData } from '@prism/shared-types';
import type { ExecutionContext } from '@prism/shared-types';
import { createCanvas } from './canvas-utils';

/**
 * Browser-specific export executor.
 * Uses Canvas 2D API to export images as blob data URLs.
 */
export const exportExecutor: NodeExecutor = async (
  inputs,
  _params,
  _ctx: ExecutionContext
) => {
  const rawImage = inputs['image'] as Parameters<typeof unwrapImageData>[0] | undefined;
  const image = rawImage ? unwrapImageData(rawImage) : undefined;

  if (!image) {
    throw new Error('image input is required for export executor');
  }

  const { canvas, ctx } = createCanvas(image.width, image.height);
  ctx.putImageData(image, 0, 0);

  // Export as PNG blob
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  return {
    type: 'export',
    previewUrl: dataUrl,
    width: image.width,
    height: image.height,
    mimeType: 'image/png',
    dataUrl,
  } satisfies ExportExecutorOutput;
};
