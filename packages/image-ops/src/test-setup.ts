// Vitest setup: polyfill browser-only globals needed by image-ops.
//
// The 'canvas' npm package provides Node.js Canvas/OffscreenCanvas/ImageData
// implementations that match the browser API. We wire them into the global scope
// so that both the source files and the test helpers can use the standard
// browser class names without any import changes.

import * as canvas from 'canvas';

(global as Record<string, unknown>).ImageData = canvas.ImageData;
(global as Record<string, unknown>).OffscreenCanvas = canvas.OffscreenCanvas;
(global as Record<string, unknown>).HTMLCanvasElement = canvas.Canvas;

// canvas.createCanvas does not have toBlob (browser API). Shim it using toBuffer.
function shimCanvasElement(c: canvas.Canvas): canvas.Canvas & { toBlob: NonNullable<HTMLCanvasElement['toBlob']> } {
  (c as canvas.Canvas & { toBlob?: unknown }).toBlob = (
    callback: (blob: Blob | null) => void,
    type = 'image/png',
    quality?: number
  ) => {
    try {
      const mimeType =
        type === 'image/jpeg' ? 'image/jpeg' :
        type === 'image/webp' ? 'image/webp' :
        'image/png';
      const buffer = c.toBuffer(mimeType as canvas.MimeType, quality as number);
      const blob = new Blob([buffer], { type: mimeType });
      callback(blob);
    } catch {
      callback(null);
    }
  };
  return c as canvas.Canvas & { toBlob: NonNullable<HTMLCanvasElement['toBlob']> };
}

(global as Record<string, unknown>).document = {
  createElement: (tag: string) => {
    if (tag === 'canvas') {
      return shimCanvasElement(canvas.createCanvas(1, 1));
    }
    throw new Error(`document.createElement('${tag}') not implemented in test environment`);
  },
};
