/**
 * Browser canvas utilities.
 *
 * Cross-platform canvas factory - works in browser with OffscreenCanvas.
 */

import type { ImageData } from '@prism/shared-types';

/**
 * Creates an OffscreenCanvas with 2D context in browser environment.
 */
export function createCanvas(
  width: number,
  height: number
): { canvas: OffscreenCanvas; ctx: OffscreenCanvasRenderingContext2D } {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D context');
  return { canvas, ctx };
}

/**
 * Creates an ImageData object using OffscreenCanvas.
 */
export function makeImageData(width: number, height: number): ImageData {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D context');
  return ctx.createImageData(width, height);
}

/**
 * Gets ImageData from canvas.
 */
export function getImageData(
  canvas: OffscreenCanvas,
  x: number,
  y: number,
  width: number,
  height: number
): ImageData {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D context');
  return ctx.getImageData(x, y, width, height);
}

/**
 * Puts ImageData to canvas.
 */
export function putImageData(
  canvas: OffscreenCanvas,
  imageData: ImageData,
  x: number,
  y: number
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D context');
  ctx.putImageData(imageData, x, y);
}
