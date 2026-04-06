// Image compositing with blend modes
// ImageData is a browser built-in
type ImageData = globalThis.ImageData;
import type { BlendMode } from '@prism/shared-types';
import { createCanvas, makeImageData } from './canvas-util';
import { unwrapImageData, type ImageRuntimeObject } from '@prism/shared-types';
import { getImageMemoryManager } from './memory-manager';
import { generatePreviewUrl } from './preview-strategy';
import { getWorkerRunner, type WorkerRunner } from './scheduler/workerRunner';
import type { NodeExecutor, CompositeExecutorOutput } from '@prism/shared-types';
import type { ExecutionContext } from '@prism/shared-types';

/**
 * Wrap raw pixel data into an ImageData object.
 * Used when worker returns transferred Uint8ClampedArray that needs to be
 * re-wrapped as a proper ImageData for downstream consumers.
 */
function wrapImageData(width: number, height: number): ImageData {
  return makeImageData(width, height);
}

function clamp(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

// ──────────────────────────────────────────────────────────────────────────────
// Format detection
// Canvas 2D getImageData() returns PREMULTIPLIED alpha pixels in browsers and
// in the canvas npm package (Node.js). We detect the format at runtime:
// - Premultiplied: any pixel with A < 255 has RGB ≤ A for all channels.
// - Straight: any channel can exceed A. Gray at 50% (R=G=B=A) is ambiguous,
//   so we conservatively treat it as premultiplied to avoid incorrect results.
// ──────────────────────────────────────────────────────────────────────────────

function detectAlphaFormat(pixels: ImageData): 'premultiplied' | 'straight' {
  const limit = Math.min(pixels.data.length, 400);
  for (let i = 0; i < limit; i += 4) {
    const a = pixels.data[i + 3];
    if (a > 0 && a < 255) {
      const r = pixels.data[i];
      const g = pixels.data[i + 1];
      const b = pixels.data[i + 2];
      if (r > a || g > a || b > a) return 'straight';
      if (r === a && g === a && b === a) return 'premultiplied';
      if (r <= a && g <= a && b <= a) return 'premultiplied';
    }
  }
  return 'straight';
}

function unPremultiply(r: number, g: number, b: number, a: number): [number, number, number] {
  if (a === 0) return [0, 0, 0];
  return [
    Math.round((r * 255) / a),
    Math.round((g * 255) / a),
    Math.round((b * 255) / a),
  ];
}

// ──────────────────────────────────────────────────────────────────────────────
// Pixel blend — Porter-Duff Source-Over compositing
//
// Blend mode formulas operate on STRAIGHT ALPHA pixels:
//   normal: cr = or (overlay color is fully the visible color)
//   multiply/screen/etc.: standard formulas using br and or
//
// The Porter-Duff Source-Over compositing step uses:
//   RGB: lerp(baseRGB, cr, oaEff/255)   — premultiplied lerp
//   Alpha: lerp(baseA, oaEff, oaEff/255) — straight alpha lerp (avoids saturation bug)
//     where oaEff = round(oa * opacity)
// ──────────────────────────────────────────────────────────────────────────────

function blendPixel(
  base: [number, number, number, number],
  overlay: [number, number, number, number],
  mode: BlendMode,
  opacity: number
): [number, number, number, number] {
  const [br, bg, bb, ba] = base;
  const [or, og, ob, oa] = overlay;

  if (oa === 0) return [br, bg, bb, ba];

  let cr: number, cg: number, cb: number;

  switch (mode) {
    case 'normal':
      cr = or; cg = og; cb = ob;
      break;

    case 'multiply':
      cr = Math.round((br * or) / 255);
      cg = Math.round((bg * og) / 255);
      cb = Math.round((bb * ob) / 255);
      break;

    case 'screen':
      cr = 255 - Math.round(((255 - br) * (255 - or)) / 255);
      cg = 255 - Math.round(((255 - bg) * (255 - og)) / 255);
      cb = 255 - Math.round(((255 - bb) * (255 - ob)) / 255);
      break;

    case 'overlay': {
      cr = br < 128
        ? Math.round((2 * br * or) / 255)
        : 255 - Math.round((2 * (255 - br) * (255 - or)) / 255);
      cg = bg < 128
        ? Math.round((2 * bg * og) / 255)
        : 255 - Math.round((2 * (255 - bg) * (255 - og)) / 255);
      cb = bb < 128
        ? Math.round((2 * bb * ob) / 255)
        : 255 - Math.round((2 * (255 - bb) * (255 - ob)) / 255);
      break;
    }

    case 'darken':
      cr = Math.min(br, or); cg = Math.min(bg, og); cb = Math.min(bb, ob);
      break;

    case 'lighten':
      cr = Math.max(br, or); cg = Math.max(bg, og); cb = Math.max(bb, ob);
      break;

    case 'color-dodge':
      cr = or === 255 ? 255 : clamp(255 - Math.round(((255 - br) * 255) / (or + 1)));
      cg = og === 255 ? 255 : clamp(255 - Math.round(((255 - bg) * 255) / (og + 1)));
      cb = ob === 255 ? 255 : clamp(255 - Math.round(((255 - bb) * 255) / (ob + 1)));
      break;

    case 'color-burn':
      cr = or === 0 ? 0 : clamp(255 - Math.round(((255 - br) * 255) / (256 - or)));
      cg = og === 0 ? 0 : clamp(255 - Math.round(((255 - bg) * 255) / (256 - og)));
      cb = ob === 0 ? 0 : clamp(255 - Math.round(((255 - bb) * 255) / (256 - ob)));
      break;

    case 'hard-light':
      cr = or < 128
        ? Math.round((2 * br * or) / 255)
        : 255 - Math.round((2 * (255 - br) * (255 - or)) / 255);
      cg = og < 128
        ? Math.round((2 * bg * og) / 255)
        : 255 - Math.round((2 * (255 - bg) * (255 - og)) / 255);
      cb = ob < 128
        ? Math.round((2 * bb * ob) / 255)
        : 255 - Math.round((2 * (255 - bb) * (255 - ob)) / 255);
      break;

    case 'soft-light': {
      const f = (b: number, s: number): number => {
        if (s < 128) return b - Math.round((255 - 2 * s) * b * (255 - b) / 256);
        const d = b < 64
          ? Math.round(((16 * b / 255 - 12) * b / 255 + 4)) * b
          : Math.round(Math.sqrt(b / 255) * 255);
        return clamp(b + Math.round((2 * s - 255) * (d - b) / 256));
      };
      cr = f(br, or); cg = f(bg, og); cb = f(bb, ob);
      break;
    }

    case 'difference':
      cr = Math.abs(br - or); cg = Math.abs(bg - og); cb = Math.abs(bb - ob);
      break;

    case 'exclusion':
      cr = clamp(Math.floor(br + or - (2 * br * or) / 255));
      cg = clamp(Math.floor(bg + og - (2 * bg * og) / 255));
      cb = clamp(Math.floor(bb + ob - (2 * bb * ob) / 255));
      break;

    default:
      cr = or; cg = og; cb = ob;
  }

  // ── Porter-Duff Source-Over compositing ─────────────────────────────────────
  // cr is the blended color (straight alpha). Now composite over the base.
  //
  // Step 1 — Apply global opacity to the overlay's alpha:
  //   oaEff = round(oa * opacity)
  //
  // Step 2 — Lerp RGB using premultiplied formula:
  //   outRGB = round(lerp(br, cr, oaEff/255))
  //          = round(br*(1-t) + cr*t),  t = oaEff/255
  //
  // Step 3 — Lerp alpha using STRAIGHT alpha formula:
  //   outA = round(lerp(ba, oaEff, oaEff/255))
  //        = round(ba*(1-t) + oaEff*t)
  //   (Note: premultiplied alpha lerp saturates: lerp(255,128,128/255) = 255,
  //    but straight alpha lerp gives: round(255*127/255 + 128*128/255) = 191)

  const oaEff = Math.round(oa * opacity);
  if (oaEff === 0) return [br, bg, bb, ba];

  const t = oaEff / 255;
  const invT = 1 - t;

  const outR = clamp(Math.round(br * invT + cr * t));
  const outG = clamp(Math.round(bg * invT + cg * t));
  const outB = clamp(Math.round(bb * invT + cb * t));

  const outA = clamp(Math.round(ba * invT + oaEff * t));

  return [outR, outG, outB, outA];
}

export interface CompositeOptions {
  blendMode?: BlendMode;
  opacity?: number;
  canvasWidth?: number;
  canvasHeight?: number;
  overlayX?: number;
  overlayY?: number;
  /** Force serial composite (for debugging/comparison) */
  forceSerial?: boolean;
}

/**
 * Composite overlay onto base.
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

  const { ctx: baseCtx } = createCanvas(baseData.width, baseData.height);
  baseCtx.putImageData(baseData, 0, 0);

  const { ctx: overlayCtx } = createCanvas(overlayData.width, overlayData.height);
  overlayCtx.putImageData(overlayData, 0, 0);

  const basePixels = baseCtx.getImageData(0, 0, baseData.width, baseData.height);
  const overlayPixels = overlayCtx.getImageData(0, 0, overlayData.width, overlayData.height);

  const baseFormat = detectAlphaFormat(basePixels);

  const resultPixels = makeImageData(canvasWidth, canvasHeight);

  // Copy base into result at (0, 0)
  for (let y = 0; y < baseData.height; y++) {
    for (let x = 0; x < baseData.width; x++) {
      if (x >= canvasWidth || y >= canvasHeight) break;
      const dstIdx = (y * canvasWidth + x) * 4;
      const srcIdx = (y * baseData.width + x) * 4;
      resultPixels.data[dstIdx]     = basePixels.data[srcIdx];
      resultPixels.data[dstIdx + 1] = basePixels.data[srcIdx + 1];
      resultPixels.data[dstIdx + 2] = basePixels.data[srcIdx + 2];
      resultPixels.data[dstIdx + 3] = basePixels.data[srcIdx + 3];
    }
  }

  if (overlayX >= canvasWidth || overlayY >= canvasHeight) return resultPixels;

  const clippedW = Math.min(overlayData.width, canvasWidth - overlayX);
  const clippedH = Math.min(overlayData.height, canvasHeight - overlayY);
  if (clippedW <= 0 || clippedH <= 0) return resultPixels;

  for (let cy = 0; cy < clippedH; cy++) {
    for (let cx = 0; cx < clippedW; cx++) {
      const dstIdx = ((overlayY + cy) * canvasWidth + (overlayX + cx)) * 4;
      const ovIdx = (cy * overlayData.width + cx) * 4;

      let basePx: [number, number, number, number];
      let ovPx: [number, number, number, number];

      if (baseFormat === 'premultiplied') {
        const br = resultPixels.data[dstIdx];
        const bgv = resultPixels.data[dstIdx + 1];
        const bbv = resultPixels.data[dstIdx + 2];
        const ba = resultPixels.data[dstIdx + 3];
        const or = overlayPixels.data[ovIdx];
        const og = overlayPixels.data[ovIdx + 1];
        const ob = overlayPixels.data[ovIdx + 2];
        const oa = overlayPixels.data[ovIdx + 3];
        const [br_s, bg_s, bb_s] = unPremultiply(br, bgv, bbv, ba);
        const [or_s, og_s, ob_s] = unPremultiply(or, og, ob, oa);
        basePx = [br_s, bg_s, bb_s, ba];
        ovPx = [or_s, og_s, ob_s, oa];
      } else {
        basePx = [
          resultPixels.data[dstIdx],
          resultPixels.data[dstIdx + 1],
          resultPixels.data[dstIdx + 2],
          resultPixels.data[dstIdx + 3],
        ];
        ovPx = [
          overlayPixels.data[ovIdx],
          overlayPixels.data[ovIdx + 1],
          overlayPixels.data[ovIdx + 2],
          overlayPixels.data[ovIdx + 3],
        ];
      }

      const [r, g, b, a] = blendPixel(basePx, ovPx, blendMode, opacity);
      resultPixels.data[dstIdx]     = r;
      resultPixels.data[dstIdx + 1] = g;
      resultPixels.data[dstIdx + 2] = b;
      resultPixels.data[dstIdx + 3] = a;
    }
  }

  return resultPixels;
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
