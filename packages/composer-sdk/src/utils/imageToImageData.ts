// Image conversion utilities for ComposerCanvas.
// Extracted from ComposerCanvas.tsx (split-tiles-core-edges T2).

/**
 * Helper: Convert HTMLImageElement to ImageData
 */
export async function imageToImageData(img: HTMLImageElement): Promise<ImageData> {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D context');
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}