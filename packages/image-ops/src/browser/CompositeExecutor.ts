/**
 * Browser Composite Executor using Canvas 2D API.
 *
 * Architecture:
 * - browser/CompositeExecutor.ts: Canvas 2D wrapper
 * - core/composite/composite.ts: Pure algorithm (no platform dependencies)
 */

import type { NodeExecutor, BlendMode, CompositeExecutorOutput } from '@prism/shared-types';
import type { ImageData } from '@prism/shared-types';
import { compositeImages, type CompositeOptions } from '../core/composite/composite';
import { createCanvas, makeImageData } from './canvas-utils';
import { unwrapImageData } from '@prism/shared-types';
import { generatePreviewUrl } from '../preview-strategy';
import type { ExecutionContext } from '@prism/shared-types';

/**
 * Browser-specific composite executor.
 * Uses Canvas 2D API to get premultiplied alpha pixels for accurate compositing.
 */
export const compositeExecutor: NodeExecutor = async (
  inputs,
  params,
  _ctx: ExecutionContext
) => {
  const rawBase = inputs['base'] as Parameters<typeof unwrapImageData>[0] | undefined;
  const base = rawBase ? unwrapImageData(rawBase) : undefined;

  if (!base) {
    throw new Error('base input is required for composite executor');
  }

  const blendMode = ((params['blendMode'] as BlendMode) ?? 'normal') as BlendMode;
  const opacity = (params['opacity'] as number) ?? 1;
  const canvasWidth = (params['canvasWidth'] as number | undefined) ?? base.width;
  const canvasHeight = (params['canvasHeight'] as number | undefined) ?? base.height;
  const overlayX = (params['overlayX'] as number | undefined) ?? 0;
  const overlayY = (params['overlayY'] as number | undefined) ?? 0;

  // Collect overlay images
  const overlayKeys = Object.keys(inputs)
    .filter((k) => k !== 'base' && (k === 'overlay' || /^overlay\d+$/.test(k)));

  const overlays: ImageData[] = [];
  for (const key of overlayKeys) {
    const rawOverlay = inputs[key] as Parameters<typeof unwrapImageData>[0];
    const overlay = unwrapImageData(rawOverlay);
    if (overlay) {
      overlays.push(overlay);
    }
  }

  let result: ImageData = base;

  if (overlays.length > 0) {
    // Get premultiplied alpha pixels from canvas for accurate compositing
    const { ctx: baseCtx } = createCanvas(base.width, base.height);
    baseCtx.putImageData(base, 0, 0);
    const premultipliedBase = baseCtx.getImageData(0, 0, base.width, base.height);

    let currentBase = premultipliedBase;

    for (const overlay of overlays) {
      const { ctx: overlayCtx } = createCanvas(overlay.width, overlay.height);
      overlayCtx.putImageData(overlay, 0, 0);
      const premultipliedOverlay = overlayCtx.getImageData(0, 0, overlay.width, overlay.height);

      const compositeResult = compositeImages(currentBase, premultipliedOverlay, {
        blendMode,
        opacity,
        canvasWidth,
        canvasHeight,
        overlayX,
        overlayY,
      });

      currentBase = compositeResult;
    }

    result = makeImageData(currentBase.width, currentBase.height);
    result.data.set(currentBase.data);
  }

  const previewRef = await generatePreviewUrl(result, result.width, result.height);

  return {
    type: 'composite',
    image: {
      data: result,
      previewUrl: previewRef.url,
      width: result.width,
      height: result.height,
      canvasWidth: result.width,
      canvasHeight: result.height,
      position: { x: 0, y: 0 },
    },
    previewUrl: previewRef.url,
    width: result.width,
    height: result.height,
  } satisfies CompositeExecutorOutput;
};
