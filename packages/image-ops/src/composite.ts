// Image compositing with blend modes
// ImageData is a browser built-in
import type { ImageData } from '@prism/shared-types';
import type { BlendMode } from '@prism/shared-types';
import { createCanvas, makeImageData } from './canvas-util';
import { unwrapImageData, type ImageRuntimeObject } from '@prism/shared-types';
import { generatePreviewUrl } from './preview-strategy';
import { getWorkerRunner, type WorkerRunner } from './scheduler/workerRunner';
import type { NodeExecutor, CompositeExecutorOutput } from '@prism/shared-types';
import type { ExecutionContext } from '@prism/shared-types';

import { compositeImages as coreCompositeImages, type CompositeOptions } from './core';

export type { CompositeOptions };

/**
 * Wrap raw pixel data into an ImageData object.
 * Used when worker returns transferred Uint8ClampedArray that needs to be
 * re-wrapped as a proper ImageData for downstream consumers.
 */
function wrapImageData(width: number, height: number): ImageData {
  return makeImageData(width, height);
}

// ──────────────────────────────────────────────────────────────────────────────
// Browser wrapper for compositeImages
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Composite overlay onto base.
 *
 * This is a browser-specific wrapper that uses canvas to get premultiplied alpha
 * pixels from the raw ImageData. The actual compositing logic is in core/composite-math.ts.
 *
 * Canvas 2D getImageData() returns premultiplied alpha pixels.
 * We detect the format at runtime and un-premultiply before blend math so that
 * semi-transparent overlay edges composite cleanly without black fringing.
 */
export function compositeImages(
  baseData: ImageData,
  overlayData: ImageData,
  options: CompositeOptions = {}
): ImageData {
  const {
    blendMode = 'normal',
    opacity = 1,
    canvasWidth = baseData.width,
    canvasHeight = baseData.height,
    overlayX = 0,
    overlayY = 0,
  } = options;

  // Get premultiplied alpha pixels from canvas
  const { ctx: baseCtx } = createCanvas(baseData.width, baseData.height);
  baseCtx.putImageData(baseData, 0, 0);

  const { ctx: overlayCtx } = createCanvas(overlayData.width, overlayData.height);
  overlayCtx.putImageData(overlayData, 0, 0);

  const premultipliedBase = baseCtx.getImageData(0, 0, baseData.width, baseData.height);
  const premultipliedOverlay = overlayCtx.getImageData(0, 0, overlayData.width, overlayData.height);

  // Use core compositing logic
  const result = coreCompositeImages(premultipliedBase, premultipliedOverlay, {
    blendMode,
    opacity,
    canvasWidth,
    canvasHeight,
    overlayX,
    overlayY,
  });

  // Wrap in ImageData with makeImageData for compatibility
  const resultData = makeImageData(result.width, result.height);
  resultData.data.set(result.data);
  return resultData;
}

// ─── Serial composite ─────────────────────────────────────────────────────────

export async function serialComposite(
  base: ImageData,
  overlays: ImageData[],
  options: {
    mode: BlendMode;
    opacity: number;
    workerRunner: WorkerRunner;
    canvasWidth?: number;
    canvasHeight?: number;
  }
): Promise<ImageData> {
  const { mode, opacity, workerRunner, canvasWidth, canvasHeight } = options;

  const executeComposite = async (currentBase: ImageData, overlay: ImageData): Promise<ImageData> => {
    if (workerRunner.isWorkerAvailable()) {
      const result = await workerRunner.composite(currentBase, overlay, mode, opacity);
      return result.data;
    }
    return compositeImages(currentBase, overlay, { blendMode: mode, opacity, canvasWidth, canvasHeight });
  };

  let result = base;
  for (const overlay of overlays) {
    result = await executeComposite(result, overlay);
  }
  return result;
}

// ─── Parallel composite ───────────────────────────────────────────────────────

/**
 * Grouped parallel composite algorithm.
 * Divides overlays into N groups (N = available workers), executes each group in parallel,
 * then accumulates the results sequentially.
 */
export async function parallelComposite(
  base: ImageData,
  overlays: ImageData[],
  options: {
    mode: BlendMode;
    opacity: number;
    workerRunner: WorkerRunner;
    canvasWidth?: number;
    canvasHeight?: number;
    forceSerial?: boolean;
  }
): Promise<ImageData> {
  const { mode, opacity, workerRunner, canvasWidth, canvasHeight, forceSerial } = options;

  // Fallback to serial if requested or workers unavailable
  if (forceSerial || !workerRunner.isWorkerAvailable() || overlays.length <= 1) {
    return serialComposite(base, overlays, { mode, opacity, workerRunner, canvasWidth, canvasHeight });
  }

  const workerCount = workerRunner.getPoolSize();
  const groupSize = Math.min(workerCount, overlays.length);

  // If only one group or few overlays, use serial for simplicity
  if (overlays.length <= groupSize) {
    return serialComposite(base, overlays, { mode, opacity, workerRunner, canvasWidth, canvasHeight });
  }

  // 1. Group overlays
  const groups: ImageData[][] = [];
  for (let i = 0; i < overlays.length; i += groupSize) {
    groups.push(overlays.slice(i, i + groupSize));
  }

  // 2. Execute each group in parallel (creates intermediate results)
  const groupPromises = groups.map(group =>
    workerRunner.createGroupComposite(base, group, mode, opacity)
  );
  const groupResults = await Promise.all(groupPromises);

  // 3. Accumulate merge results sequentially (maintain order dependency)
  let result = base;
  for (const groupResult of groupResults) {
    const mergedResult = await workerRunner.composite(result, groupResult.data, mode, opacity);
    result = mergedResult.data;
  }

  return result;
}

let _workerRunner: WorkerRunner | null = null;

function getCompositeWorkerRunner(): WorkerRunner {
  if (!_workerRunner) {
    _workerRunner = getWorkerRunner();
  }
  return _workerRunner;
}

export const compositeExecutor: NodeExecutor = async (
  inputs,
  params,
  ctx: ExecutionContext
) => {
  const rawBase = ctx.requireInput<Parameters<typeof unwrapImageData>[0]>('base', 'Composite');
  const base    = unwrapImageData(rawBase);
  if (!base) throw new Error('base input must be ImageData for Composite');

  const baseIRO = (rawBase && typeof rawBase === 'object' && 'data' in rawBase)
    ? rawBase as ImageRuntimeObject
    : undefined;

  const canvasWidth =
    (params['canvasWidth']  as number | undefined) ??
    baseIRO?.canvasWidth  ??
    base.width;
  const canvasHeight =
    (params['canvasHeight'] as number | undefined) ??
    baseIRO?.canvasHeight ??
    base.height;

  const blendMode = (params['blendMode'] as BlendMode) ?? 'normal';
  const opacity   = (params['opacity']   as number)   ?? 1;
  const forceSerial = (params['forceSerial'] as boolean) ?? false;

  const overlayKeys = Object.keys(inputs)
    .filter((k) => k !== 'base' && (k === 'overlay' || /^overlay\d+$/.test(k)))
    .sort((a, b) => {
      if (a === 'overlay') return -1;
      if (b === 'overlay') return 1;
      return parseInt(a.slice(7), 10) - parseInt(b.slice(7), 10);
    });

  const workerRunner = getCompositeWorkerRunner();

  // Collect all overlay images
  const overlays: ImageData[] = [];
  for (const key of overlayKeys) {
    const raw = inputs[key] as Parameters<typeof unwrapImageData>[0];
    const img = unwrapImageData(raw);
    if (img) {
      overlays.push(img);
    }
  }

  let result: ImageData;

  if (overlays.length === 0) {
    result = base;
  } else if (overlays.length === 1) {
    // Single overlay - use existing logic
    if (workerRunner.isWorkerAvailable()) {
      const workerResult = await workerRunner.composite(base, overlays[0], blendMode, opacity);
      result = workerResult.data;
    } else {
      result = compositeImages(base, overlays[0], {
        blendMode,
        opacity,
        canvasWidth,
        canvasHeight,
      });
    }
  } else {
    // Multiple overlays - use parallel composite
    result = await parallelComposite(base, overlays, {
      mode: blendMode,
      opacity,
      workerRunner,
      canvasWidth,
      canvasHeight,
      forceSerial,
    });
  }

  const previewCanvas = new OffscreenCanvas(result.width, result.height);
  const previewCtx = previewCanvas.getContext('2d');
  if (!previewCtx) throw new Error('Failed to get 2D context for preview canvas');
  previewCtx.putImageData(result, 0, 0);
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
