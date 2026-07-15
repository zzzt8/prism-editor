// Thumbnail generation utilities for node execution results
// Split from PrismNodeControls.tsx (makeThumbnail + getExecThumb)

import { unwrapImageData, unwrapPreviewUrl } from '@prism/shared-types';
import type { CanvasNodeData } from '../../../modules/editor/stores/types';

/**
 * Generate a data URL thumbnail from ImageData, capped at maxPx.
 * Uses canvas scaling for smooth downsampling.
 */
export function makeThumbnail(data: ImageData, maxPx = 200): string | null {
  try {
    const scale = Math.min(maxPx / data.width, maxPx / data.height, 1);
    const c = document.createElement('canvas');
    c.width = Math.round(data.width * scale); c.height = Math.round(data.height * scale);
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = false;
    const t = document.createElement('canvas');
    t.width = data.width; t.height = data.height;
    const tc = t.getContext('2d');
    if (!tc) return null;
    tc.putImageData(data, 0, 0);
    ctx.drawImage(t, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  } catch { return null; }
}

/**
 * Extract a preview data URL from an execution result object.
 * Checks multiple formats: previewUrl top-level, imageRuntimeObject, raw ImageData.
 */
export function getExecThumb(executionResult: CanvasNodeData['executionResult']): string | null {
  if (!executionResult) return null;
  const topPreview = executionResult['previewUrl'];
  if (typeof topPreview === 'string' && topPreview.length > 0) return topPreview;

  const rawImage = executionResult['image'];
  const fromImage = unwrapPreviewUrl(rawImage as Parameters<typeof unwrapPreviewUrl>[0], undefined);
  if (fromImage) return fromImage;

  const imageData = unwrapImageData(rawImage as Parameters<typeof unwrapImageData>[0]);
  if (!imageData?.width || !imageData?.height) return null;
  try {
    return makeThumbnail(imageData);
  } catch {
    return null;
  }
}
