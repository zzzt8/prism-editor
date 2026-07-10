// useImageFilePreview - shared hook for LoadImage/LoadMask file preview
// Extracts preview URL from imageFileValue or executionResult
// Used by both LoadImageBody and LoadMaskBody

import { useMemo } from 'react';
import { unwrapImageData, unwrapPreviewUrl } from '@prism/shared-types';
import { makeThumbnail } from '../components/nodes/PrismNodeControls/imageThumbnails';
import type { CanvasNodeData } from '../modules/editor/stores/types';

export interface ImageFileValue {
  dataUrl: string;
  width: number;
  height: number;
  fileName: string;
}

export interface UseImageFilePreviewResult {
  /** Combined preview URL: file value > execution previewUrl > generated thumbnail */
  previewUrl: string | null;
  /** Display width: file value > execution width */
  displayWidth: number | undefined;
  /** Display height: file value > execution height */
  displayHeight: number | undefined;
  /** File name from loaded image */
  fileName: string | undefined;
}

/**
 * Extract preview URL and dimensions from file value or execution result.
 * Priority: explicit dataUrl > execution previewUrl > generated thumbnail
 */
export function useImageFilePreview(
  imageFileValue: ImageFileValue | undefined,
  executionResult: CanvasNodeData['executionResult'],
  executionImageKey: string
): UseImageFilePreviewResult {
  return useMemo(() => {
    // 1. Check explicit file value
    if (imageFileValue?.dataUrl) {
      return {
        previewUrl: imageFileValue.dataUrl,
        displayWidth: imageFileValue.width,
        displayHeight: imageFileValue.height,
        fileName: imageFileValue.fileName,
      };
    }

    // 2. Check execution result for previewUrl
    if (executionResult) {
      const topPreview = executionResult['previewUrl'];
      if (typeof topPreview === 'string' && topPreview.length > 0) {
        const w = executionResult['width'] as number | undefined;
        const h = executionResult['height'] as number | undefined;
        return {
          previewUrl: topPreview,
          displayWidth: w,
          displayHeight: h,
          fileName: undefined,
        };
      }

      // 3. Check execution result for image runtime object
      const rawImage = executionResult[executionImageKey];
      const fromRuntime = unwrapPreviewUrl(rawImage as Parameters<typeof unwrapPreviewUrl>[0], undefined);
      if (fromRuntime) {
        const w = executionResult['width'] as number | undefined;
        const h = executionResult['height'] as number | undefined;
        return {
          previewUrl: fromRuntime,
          displayWidth: w,
          displayHeight: h,
          fileName: undefined,
        };
      }

      // 4. Generate thumbnail from ImageData
      const imageData = unwrapImageData(rawImage as Parameters<typeof unwrapImageData>[0]);
      if (imageData?.width && imageData?.height) {
        const thumb = makeThumbnail(imageData);
        if (thumb) {
          return {
            previewUrl: thumb,
            displayWidth: imageData.width,
            displayHeight: imageData.height,
            fileName: undefined,
          };
        }
      }
    }

    return {
      previewUrl: null,
      displayWidth: undefined,
      displayHeight: undefined,
      fileName: undefined,
    };
  }, [imageFileValue, executionResult, executionImageKey]);
}

/**
 * Process an image File into ImageFileValue.
 * Loads the file via FileReader and extracts dimensions.
 */
export function processImageFile(
  file: File
): Promise<ImageFileValue> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        resolve({
          dataUrl,
          width: img.naturalWidth,
          height: img.naturalHeight,
          fileName: file.name,
        });
      };
      img.onerror = () => {
        resolve({
          dataUrl,
          width: 0,
          height: 0,
          fileName: file.name,
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}
