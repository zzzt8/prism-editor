// Image compositing with blend modes
// ImageData is a browser built-in
type ImageData = globalThis.ImageData;
import type { BlendMode } from '@prism/shared-types';

function clamp(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function blendPixel(
  base: [number, number, number, number],
  overlay: [number, number, number, number],
  mode: BlendMode,
  opacity: number
): [number, number, number, number] {
  const [br, bg, bb, ba] = base;
  const [or, og, ob, oa] = overlay;
  const oaEff = oa * opacity;

  if (oaEff === 0) return [br, bg, bb, ba];

  const invBaseAlpha = 1 - ba / 255;

  let cr: number, cg: number, cb: number;

  switch (mode) {
    case 'normal':
      cr = or; cg = og; cb = ob;
      break;

    case 'multiply':
      cr = (br * or) / 255; cg = (bg * og) / 255; cb = (bb * ob) / 255;
      break;

    case 'screen':
      cr = 255 - ((255 - br) * (255 - or)) / 255;
      cg = 255 - ((255 - bg) * (255 - og)) / 255;
      cb = 255 - ((255 - bb) * (255 - ob)) / 255;
      break;

    case 'overlay': {
      cr = br < 128 ? (2 * br * or) / 255 : 255 - (2 * (255 - br) * (255 - or)) / 255;
      cg = bg < 128 ? (2 * bg * og) / 255 : 255 - (2 * (255 - bg) * (255 - og)) / 255;
      cb = bb < 128 ? (2 * bb * ob) / 255 : 255 - (2 * (255 - bb) * (255 - ob)) / 255;
      break;
    }

    case 'darken':
      cr = Math.min(br, or); cg = Math.min(bg, og); cb = Math.min(bb, ob);
      break;

    case 'lighten':
      cr = Math.max(br, or); cg = Math.max(bg, og); cb = Math.max(bb, ob);
      break;

    case 'color-dodge':
      cr = or === 255 ? 255 : clamp(255 - ((255 - br) * 255) / (or + 1));
      cg = og === 255 ? 255 : clamp(255 - ((255 - bg) * 255) / (og + 1));
      cb = ob === 255 ? 255 : clamp(255 - ((255 - bb) * 255) / (ob + 1));
      break;

    case 'color-burn':
      cr = or === 0 ? 0 : clamp(255 - ((255 - br) * 255) / (256 - or));
      cg = og === 0 ? 0 : clamp(255 - ((255 - bg) * 255) / (256 - og));
      cb = ob === 0 ? 0 : clamp(255 - ((255 - bb) * 255) / (256 - ob));
      break;

    case 'hard-light':
      cr = or < 128 ? (2 * br * or) / 255 : 255 - (2 * (255 - br) * (255 - or)) / 255;
      cg = og < 128 ? (2 * bg * og) / 255 : 255 - (2 * (255 - bg) * (255 - og)) / 255;
      cb = ob < 128 ? (2 * bb * ob) / 255 : 255 - (2 * (255 - bb) * (255 - ob)) / 255;
      break;

    case 'soft-light': {
      const f = (b: number, s: number): number => {
        if (s < 128) return b - (255 - 2 * s) * b * (255 - b) / 256;
        const d = b < 64 ? ((16 * b / 255 - 12) * b / 255 + 4) * b : Math.sqrt(b / 255) * 255;
        return b + (2 * s - 255) * (d - b) / 256;
      };
      cr = clamp(f(br, or)); cg = clamp(f(bg, og)); cb = clamp(f(bb, ob));
      break;
    }

    case 'difference':
      cr = Math.abs(br - or); cg = Math.abs(bg - og); cb = Math.abs(bb - ob);
      break;

    case 'exclusion':
      cr = br + or - (2 * br * or) / 255;
      cg = bg + og - (2 * bg * og) / 255;
      cb = bb + ob - (2 * bb * ob) / 255;
      break;

    default:
      cr = or; cg = og; cb = ob;
  }

  const outR = clamp(br * invBaseAlpha + cr * oaEff / 255);
  const outG = clamp(bg * invBaseAlpha + cg * oaEff / 255);
  const outB = clamp(bb * invBaseAlpha + cb * oaEff / 255);
  const outA = clamp(ba + oaEff * (1 - ba / 255));

  return [outR, outG, outB, outA];
}

export interface CompositeOptions {
  blendMode?: BlendMode;
  opacity?: number;
  /** Output canvas width (defaults to base canvas width) */
  canvasWidth?: number;
  /** Output canvas height (defaults to base canvas height) */
  canvasHeight?: number;
  /** Overlay top-left X within the output canvas */
  overlayX?: number;
  /** Overlay top-left Y within the output canvas */
  overlayY?: number;
}

/**
 * Composite overlay onto base using canvas coordinate system.
 *
 * The output canvas size is determined by `canvasWidth`/`canvasHeight`
 * (or base's canvas dimensions). The overlay is drawn at (`overlayX`, `overlayY`)
 * WITHOUT any scaling — it retains its original pixel dimensions.
 *
 * If the overlay extends beyond the canvas boundary, it is clipped.
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

  const outCanvas = new OffscreenCanvas(canvasWidth, canvasHeight);
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) throw new Error('Failed to get 2D context');

  // --- Pixel-by-pixel blend ---
  // We draw both images into canvases so we can read raw pixel data,
  // then blend each overlay pixel manually (Canvas 2D compositing is limited).
  const baseCanvas = new OffscreenCanvas(baseData.width, baseData.height);
  const baseCtx = baseCanvas.getContext('2d')!;
  baseCtx.putImageData(baseData, 0, 0);

  const overlayCanvas = new OffscreenCanvas(overlayData.width, overlayData.height);
  const overlayCtx = overlayCanvas.getContext('2d')!;
  overlayCtx.putImageData(overlayData, 0, 0);

  const basePixels = baseCtx.getImageData(0, 0, baseData.width, baseData.height);
  const overlayPixels = overlayCtx.getImageData(0, 0, overlayData.width, overlayData.height);

  // Fill result with base pixels first, then blend overlay region
  const resultPixels = outCtx.createImageData(canvasWidth, canvasHeight);

  // Copy base into result at (0, 0)
  for (let y = 0; y < baseData.height; y++) {
    for (let x = 0; x < baseData.width; x++) {
      const dstIdx = (y * canvasWidth + x) * 4;
      const srcIdx = (y * baseData.width + x) * 4;
      resultPixels.data[dstIdx]     = basePixels.data[srcIdx];
      resultPixels.data[dstIdx + 1] = basePixels.data[srcIdx + 1];
      resultPixels.data[dstIdx + 2] = basePixels.data[srcIdx + 2];
      resultPixels.data[dstIdx + 3] = basePixels.data[srcIdx + 3];
    }
  }

  // Clip overlay region to canvas bounds
  if (overlayX >= canvasWidth || overlayY >= canvasHeight) {
    // Overlay is entirely off-canvas
    return resultPixels;
  }

  const clippedW = Math.min(overlayData.width, canvasWidth - overlayX);
  const clippedH = Math.min(overlayData.height, canvasHeight - overlayY);

  if (clippedW <= 0 || clippedH <= 0) {
    return resultPixels;
  }

  // Blend overlay pixels into result at (overlayX, overlayY)
  for (let cy = 0; cy < clippedH; cy++) {
    for (let cx = 0; cx < clippedW; cx++) {
      const dstIdx = ((overlayY + cy) * canvasWidth + (overlayX + cx)) * 4;
      const ovIdx  = cy * overlayData.width + cx;

      const basePx: [number, number, number, number] = [
        resultPixels.data[dstIdx],
        resultPixels.data[dstIdx + 1],
        resultPixels.data[dstIdx + 2],
        resultPixels.data[dstIdx + 3],
      ];
      const ovPx: [number, number, number, number] = [
        overlayPixels.data[ovIdx * 4],
        overlayPixels.data[ovIdx * 4 + 1],
        overlayPixels.data[ovIdx * 4 + 2],
        overlayPixels.data[ovIdx * 4 + 3],
      ];

      const [r, g, b, a] = blendPixel(basePx, ovPx, blendMode, opacity);
      resultPixels.data[dstIdx]     = r;
      resultPixels.data[dstIdx + 1] = g;
      resultPixels.data[dstIdx + 2] = b;
      resultPixels.data[dstIdx + 3] = a;
    }
  }

  return resultPixels;
}
