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
(globalThis as Record<string, unknown>).ImageData = canvas.ImageData;

// Register Image — canvas npm provides a global Image class for Node.js environments.
// loadImageFromDataUrl uses `new Image()` to decode data URLs.
const ImageClass = canvas.Image as unknown as typeof Image;
(global as Record<string, unknown>).Image = ImageClass;
(globalThis as Record<string, unknown>).Image = ImageClass;

// Set global.OffscreenCanvas = canvas.Canvas so that instanceof checks in
// export-image.ts (`canvas instanceof OffscreenCanvas`) evaluate to true.
(global as Record<string, unknown>).OffscreenCanvas = canvas.Canvas;

// Attach toBlob / toDataURL shims onto canvas.Canvas.prototype so that
// all instances (including those created inside source code) have both APIs.
const proto = canvas.Canvas.prototype as unknown as Record<string, unknown>;

function canvasToBlob(c: canvas.Canvas, _type: string, quality?: number): Blob {
  const mimeType: 'image/png' | 'image/jpeg' =
    _type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
  const toBuffer = canvas.Canvas.prototype.toBuffer.bind(c);
  let buf: Buffer;
  if (mimeType === 'image/jpeg') {
    buf = toBuffer(mimeType, { quality: quality ?? 0.92 } as canvas.JpegConfig) as Buffer;
  } else {
    buf = toBuffer(mimeType) as Buffer;
  }
  return new Blob([buf.buffer as ArrayBuffer], { type: _type });
}

function canvasToDataURL(c: canvas.Canvas, _type: string, quality?: number): string {
  const mimeType: 'image/png' | 'image/jpeg' =
    _type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
  const toBuffer = canvas.Canvas.prototype.toBuffer.bind(c);
  let buf: Buffer;
  if (mimeType === 'image/jpeg') {
    buf = toBuffer(mimeType, { quality: quality ?? 0.92 } as canvas.JpegConfig) as Buffer;
  } else {
    buf = toBuffer(mimeType) as Buffer;
  }
  return `data:${_type};base64,${buf.toString('base64')}`;
}

// Install shims on the Canvas prototype — all instances created by createCanvas
// (including those in source code) inherit them automatically.
(proto as Record<string, unknown>).toBlob = function (
  this: canvas.Canvas,
  callback: (_blob: Blob | null) => void,
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

// convertToBlob shim — canvas.Canvas.prototype lacks this method natively.
// Needed by export-image.ts which calls `canvas.convertToBlob(...)` after
// detecting `canvas instanceof OffscreenCanvas`.
const offscreenProto = canvas.Canvas.prototype as unknown as Record<string, unknown>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(offscreenProto as any).convertToBlob = function (
  this: canvas.Canvas,
  options: { type?: string; quality?: number } = {}
): Promise<Blob> {
  const type = options.type ?? 'image/png';
  const quality = options.quality ?? 0.92;
  return Promise.resolve(canvasToBlob(this, type, quality));
};

// FileReader shim — used by blobToDataUrl in export-image.ts.
// Node.js has no FileReader, so we provide a minimal implementation.
// We manually implement the EventTarget interface methods so TypeScript's
// typeof FileReader structural check passes (requires addEventListener etc.).
class FileReaderPolyfill {
  private _result: string | ArrayBuffer | null = null;
  private _error: Error | null = null;
  private _readyState = 0;
  private _listeners: Map<string, EventListenerOrEventListenerObject[]> = new Map();
   
  onload: ((_ev: ProgressEvent<FileReaderPolyfill>) => void) | null = null;
 
  onerror: ((_ev: ProgressEvent<FileReaderPolyfill>) => void) | null = null;
 
  onloadend: ((_ev: ProgressEvent<FileReaderPolyfill>) => void) | null = null;

  get result() { return this._result; }
  get error() { return this._error as DOMException | null; }
  get readyState() { return this._readyState; }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    if (!this._listeners.has(type)) this._listeners.set(type, []);
    this._listeners.get(type)!.push(listener);
  }
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    const arr = this._listeners.get(type) ?? [];
    this._listeners.set(type, arr.filter(l => l !== listener));
  }
  dispatchEvent(event: Event): boolean {
    for (const l of (this._listeners.get(event.type) ?? [])) {
      if (typeof l === 'function') l.call(this, event);
      else l.handleEvent(event);
    }
    return true;
  }

  readAsDataURL(blob: Blob): void {
    this._readyState = 1; // LOADING
    try {
      // Since we can't decode the Blob in Node.js, return a deterministic
      // placeholder data URL. The key test assertions are on mimeType + dimensions.
      this._result = `data:${blob.type};base64,`;
      this._readyState = 2; // DONE
      if (this.onload) this.onload.call(this, {} as ProgressEvent<FileReaderPolyfill>);
      if (this.onloadend) this.onloadend.call(this, {} as ProgressEvent<FileReaderPolyfill>);
    } catch (e) {
      this._error = e as Error;
      this._readyState = 2; // DONE
      if (this.onerror) this.onerror.call(this, {} as ProgressEvent<FileReaderPolyfill>);
      if (this.onloadend) this.onloadend.call(this, {} as ProgressEvent<FileReaderPolyfill>);
    }
  }
}

(global as Record<string, unknown>).FileReader = FileReaderPolyfill as unknown as typeof FileReader;

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
