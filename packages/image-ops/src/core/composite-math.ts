/**
 * Pure image compositing functions.
 *
 * This module contains the pixel-level compositing logic extracted from composite.ts.
 * All functions are pure - no canvas, no platform APIs.
 */

import type { ImageData } from '@prism/shared-types';
import type { BlendMode } from '@prism/shared-types';

import { detectAlphaFormat, unPremultiply } from './alpha-format';
import { blendPixel } from './blend-modes';
import { compositePixel } from './porter-duff';

/**
 * Options for image compositing.
 */
export interface CompositeOptions {
  blendMode?: BlendMode;
  opacity?: number;
  canvasWidth?: number;
  canvasHeight?: number;
  overlayX?: number;
  overlayY?: number;
}

/**
 * Composites overlay onto base pixel-by-pixel.
 *
 * This is the pure version - no canvas, no platform APIs.
 * Uses core/blend-modes.ts for blend formulas and core/porter-duff.ts for compositing.
 *
 * @param baseData - Base ImageData
 * @param overlayData - Overlay ImageData
 * @param options - Compositing options
 * @returns Result ImageData (same dimensions as canvasWidth x canvasHeight)
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

  // Create result buffer
  const result = new Uint8ClampedArray(canvasWidth * canvasHeight * 4);

  // Copy base into result at (0, 0)
  for (let y = 0; y < baseData.height; y++) {
    for (let x = 0; x < baseData.width; x++) {
      if (x >= canvasWidth || y >= canvasHeight) break;
      const dstIdx = (y * canvasWidth + x) * 4;
      const srcIdx = (y * baseData.width + x) * 4;
      result[dstIdx]     = baseData.data[srcIdx];
      result[dstIdx + 1] = baseData.data[srcIdx + 1];
      result[dstIdx + 2] = baseData.data[srcIdx + 2];
      result[dstIdx + 3] = baseData.data[srcIdx + 3];
    }
  }

  if (overlayX >= canvasWidth || overlayY >= canvasHeight) {
    return new ImageData(result, canvasWidth, canvasHeight);
  }

  // Detect base alpha format
  const baseFormat = detectAlphaFormat(baseData);

  const clippedW = Math.min(overlayData.width, canvasWidth - overlayX);
  const clippedH = Math.min(overlayData.height, canvasHeight - overlayY);
  if (clippedW <= 0 || clippedH <= 0) {
    return new ImageData(result, canvasWidth, canvasHeight);
  }

  // Composite overlay pixels
  for (let cy = 0; cy < clippedH; cy++) {
    for (let cx = 0; cx < clippedW; cx++) {
      const dstIdx = ((overlayY + cy) * canvasWidth + (overlayX + cx)) * 4;
      const ovIdx = (cy * overlayData.width + cx) * 4;

      let basePx: [number, number, number, number];
      let ovPx: [number, number, number, number];

      if (baseFormat === 'premultiplied') {
        // Unpremultiply base
        const br = result[dstIdx];
        const bgv = result[dstIdx + 1];
        const bbv = result[dstIdx + 2];
        const ba = result[dstIdx + 3];
        const [br_s, bg_s, bb_s] = unPremultiply(br, bgv, bbv, ba);
        basePx = [br_s, bg_s, bb_s, ba];

        // Unpremultiply overlay
        const or = overlayData.data[ovIdx];
        const og = overlayData.data[ovIdx + 1];
        const ob = overlayData.data[ovIdx + 2];
        const oa = overlayData.data[ovIdx + 3];
        const [or_s, og_s, ob_s] = unPremultiply(or, og, ob, oa);
        ovPx = [or_s, og_s, ob_s, oa];
      } else {
        basePx = [
          result[dstIdx],
          result[dstIdx + 1],
          result[dstIdx + 2],
          result[dstIdx + 3],
        ];
        ovPx = [
          overlayData.data[ovIdx],
          overlayData.data[ovIdx + 1],
          overlayData.data[ovIdx + 2],
          overlayData.data[ovIdx + 3],
        ];
      }

      // Step 1: Blend
      const blended = blendPixel(basePx, ovPx, blendMode);

      // Step 2: Composite with opacity
      const [r, g, b, a] = compositePixel(basePx, blended, opacity);

      result[dstIdx]     = r;
      result[dstIdx + 1] = g;
      result[dstIdx + 2] = b;
      result[dstIdx + 3] = a;
    }
  }

  return new ImageData(result, canvasWidth, canvasHeight);
}
