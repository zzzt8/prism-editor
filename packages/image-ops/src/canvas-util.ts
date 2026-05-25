// Shared canvas factory — works in both browser (OffscreenCanvas) and Node.js (canvas npm)
import type { ImageData } from '@prism/shared-types';

let _canvasModule: typeof import('canvas') | null = null;
function getCanvasModule(): typeof import('canvas') | null {
  if (_canvasModule === null) {
    try {
       
      _canvasModule = require('canvas') as typeof import('canvas');
    } catch {
      _canvasModule = null;
    }
  }
  return _canvasModule;
}

export function createCanvas(
  width: number,
  height: number
): { canvas: HTMLCanvasElement | OffscreenCanvas; ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D } {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    return { canvas, ctx };
  }

  const cm = getCanvasModule();
  if (cm) {
    const canvas = cm.createCanvas(width, height) as unknown as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    return { canvas, ctx };
  }

  throw new Error('No canvas implementation available');
}

/** Create an ImageData object compatible with the current environment. */
export function makeImageData(
  width: number,
  height: number
): ImageData {
  if (typeof ImageData !== 'undefined') {
    return new ImageData(width, height);
  }
  const cm = getCanvasModule();
  if (cm) {
    return new cm.ImageData(width, height) as unknown as ImageData;
  }
  throw new Error('No ImageData implementation available');
}
