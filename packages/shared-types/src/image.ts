// Image reference types

/** Canonical ImageData type alias — resolves DOM vs globalThis ambiguity */
export type ImageData = globalThis.ImageData;

export type ImageRefType = 'blob-url' | 'data-url' | 'cross-origin-url';

export interface ImageRef {
  type: ImageRefType;
  url: string;
  width: number;
  height: number;
  mimeType: string;
  cleanup?: () => void;
}

export interface ImageLoadOptions {
  crossOrigin?: 'anonymous' | 'use-credentials';
  timeout?: number;
}

export interface ImageLoadResult {
  imageData: ImageData;
  imageRef: ImageRef;
  crossOriginUsed: boolean;
}

export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion';

export interface TransformOptions {
  translateX?: number;
  translateY?: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
  cropMode?: 'center' | 'top-left';
}

export interface ExportOptions {
  format?: 'png' | 'jpeg' | 'webp';
  quality?: number;
  width?: number;
  height?: number;
}

export type MaskType = 'alpha' | 'brightness' | 'luminance';

export interface MaskOptions {
  type: MaskType;
  threshold?: number;
  invert?: boolean;
}

export interface ImageMemoryStats {
  totalUrls: number;
  totalSizeBytes: number;
  urlRegistry: string[];
}
