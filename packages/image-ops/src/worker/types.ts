// Worker-level type definitions
// Split from imageWorker.worker.ts (lines 1-59)

export interface WorkerImageResult {
  data: ImageData;
  width: number;
  height: number;
  colorSpace: PredefinedColorSpace;
}

export interface WorkerLoadResult {
  data: ImageData;
  width: number;
  height: number;
  crossOriginUsed: boolean;
}

export interface WorkerExportResult {
  blob: Blob;
  width: number;
  height: number;
  mimeType: string;
}

export interface WorkerStatus {
  id: string;
  ready: boolean;
  processedCount: number;
  errorCount: number;
  lastError?: string;
}

/** Environment check — true when OffscreenCanvas is available */
export const hasOffscreenCanvas = typeof OffscreenCanvas !== 'undefined';
