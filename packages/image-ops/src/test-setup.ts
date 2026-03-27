// Vitest setup: polyfill browser-only globals needed by image-ops.
//
// The 'canvas' npm package provides Node.js Canvas/ImageData implementations
// that match the browser API. We wire them into the global scope so that both
// the source files and the test helpers can use the standard browser class
// names without any import changes.
//
// IMPORTANT: We do NOT set global.OffscreenCanvas. The 'canvas' npm package's
// drawImage does not accept custom classes (instanceof checks against canvas.Canvas).
// By omitting global.OffscreenCanvas, the source code falls through to the
// HTMLCanvasElement path, which works correctly with canvas npm instances.
// The HTMLCanvasElement code path is functionally identical to OffscreenCanvas
// for all image-ops operations.

import * as canvas from 'canvas';

// Register ImageData — canvas npm provides a fully-compatible implementation.
(global as Record<string, unknown>).ImageData = canvas.ImageData;

// Attach toBlob / toDataURL shims onto canvas.Canvas.prototype so that
// all instances (including those created inside source code) have both APIs.
// canvas.Canvas.prototype exists at runtime (verified via Node.js); TypeScript's
// d.ts simply doesn't declare it, so we cast through `as unknown`.
const proto = canvas.Canvas.prototype as unknown as Record<string, unknown>;

// Capture toBuffer with correct `this` binding using a factory per-call.
function makeToBuffer(c: canvas.Canvas) {
  return canvas.Canvas.prototype.toBuffer.bind(c);
}

function canvasToBlob(c: canvas.Canvas, type: string, quality?: number): Blob {
  const mimeType: 'image/png' | 'image/jpeg' =
    type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
  const toBuffer = makeToBuffer(c);
  let buf: Buffer;
  if (mimeType === 'image/jpeg') {
    buf = toBuffer(mimeType, { quality: quality ?? 0.92 } as canvas.JpegConfig) as Buffer;
  } else {
    buf = toBuffer(mimeType) as Buffer;
  }
  return new Blob([buf.buffer as ArrayBuffer], { type });
}

function canvasToDataURL(c: canvas.Canvas, type: string, quality?: number): string {
  const mimeType: 'image/png' | 'image/jpeg' =
    type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
  const toBuffer = makeToBuffer(c);
  let buf: Buffer;
  if (mimeType === 'image/jpeg') {
    buf = toBuffer(mimeType, { quality: quality ?? 0.92 } as canvas.JpegConfig) as Buffer;
  } else {
    buf = toBuffer(mimeType) as Buffer;
  }
  return `data:${type};base64,${buf.toString('base64')}`;
}

// Install shims on the Canvas prototype — all instances created by createCanvas
// (including those in source code) inherit them automatically.
(proto as Record<string, unknown>).toBlob = function (
  this: canvas.Canvas,
  callback: (blob: Blob | null) => void,
  type = 'image/png',
  quality?: number
) {
  try {
    callback(canvasToBlob(this, type, quality));
  } catch {
    callback(null);
  }
} as HTMLCanvasElement['toBlob'];

(proto as Record<string, unknown>).toDataURL = function (
  this: canvas.Canvas,
  type = 'image/png',
  quality?: number
): string {
  return canvasToDataURL(this, type, quality);
} as HTMLCanvasElement['toDataURL'];

// Wire document.createElement to return a canvas (with the shimmed prototype).
const origCreateCanvas = canvas.createCanvas.bind(canvas);
(global as Record<string, unknown>).document = {
  createElement: (tag: string) => {
    if (tag === 'canvas') {
      return origCreateCanvas(1, 1) as unknown as HTMLCanvasElement;
    }
    throw new Error(`document.createElement('${tag}') not implemented in test environment`);
  },
};

// URL.createObjectURL is a browser-only API; provide a no-op shim.
(global as Record<string, unknown>).URL = URL ?? class {
  static createObjectURL(_blob: Blob): string {
    return 'blob:test-shim';
  }
  static revokeObjectURL(_url: string): void {}
};
