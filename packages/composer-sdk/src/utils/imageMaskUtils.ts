// Mask utilities for composer canvas
// Split from ComposerCanvas.tsx (lines 24-78)

import type { MaskState } from '../types';

/**
 * Apply a mask to ImageData by modifying the alpha channel
 */
export function applyMaskToImageData(
  imageData: ImageData,
  mask: MaskState,
  canvasWidth: number,
  canvasHeight: number,
): ImageData {
  const data = new Uint8ClampedArray(imageData.data);
  const { width, height } = imageData;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const alpha = data[i + 3];

      let maskAlpha = 1;
      if (mask.type === 'brightness') {
        maskAlpha = mask.threshold !== undefined ? mask.threshold / 255 : 1;
      } else if (mask.type === 'gradient') {
        if (mask.startPoint && mask.endPoint) {
          const dx = mask.endPoint.x - mask.startPoint.x;
          const dy = mask.endPoint.y - mask.startPoint.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          if (length > 0) {
            maskAlpha = Math.max(
              0,
              Math.min(
                1,
                ((x - mask.startPoint.x) * dx + (y - mask.startPoint.y) * dy) /
                  (length * length),
              ),
            );
          }
        }
      } else if (mask.type === 'feather') {
        const radius = mask.radius ?? 50;
        const cx = canvasWidth / 2;
        const cy = canvasHeight / 2;
        const dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
        const maxDist = Math.sqrt(cx * cx + cy * cy);
        if (maxDist > 0) {
          maskAlpha = Math.max(0, Math.min(1, 1 - (dist - maxDist + radius) / radius));
        }
      }

      data[i + 3] = alpha * maskAlpha;
    }
  }

  return new ImageData(data, width, height);
}
