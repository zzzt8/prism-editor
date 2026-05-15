/**
 * Preview generation strategies for image nodes.
 *
 * - EagerPreviewStrategy: generates a blob URL immediately (original behavior)
 * - LazyPreviewStrategy: generates a data URL only when accessed (faster for 4K images)
 */

import { getImageMemoryManager } from './memory-manager';

type ImageData = globalThis.ImageData;

export interface PreviewStrategy {
  /**
   * Generate a preview URL for the given ImageData.
   * Returns an object with the URL and a cleanup function.
   */
  generatePreview(_imageData: ImageData, _width: number, _height: number): Promise<PreviewRef>;
}

export interface PreviewRef {
  url: string;
  /** Cleanup function to release resources when the preview is no longer needed. */
  cleanup: (() => void) | undefined;
}

/** Original behavior: convert to blob URL immediately */
export const eagerPreviewStrategy: PreviewStrategy = {
  async generatePreview(
    imageData: ImageData,
    width: number,
    height: number
  ): Promise<PreviewRef> {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context for preview canvas');
    ctx.putImageData(imageData, 0, 0);
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    const ref = getImageMemoryManager().createObjectURL(blob, width, height);
    return {
      url: ref.url,
      cleanup: () => {
        getImageMemoryManager().revoke(ref.url);
      },
    };
  },
};

/** Optimized: encode as data URL on-demand, no blob URL needed */
export const lazyPreviewStrategy: PreviewStrategy = {
  async generatePreview(
    imageData: ImageData,
    width: number,
    height: number
  ): Promise<PreviewRef> {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context for preview canvas');
    ctx.putImageData(imageData, 0, 0);
    const dataUrl = canvas.convertToBlob({ type: 'image/png' }).then((blob) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      })
    );
    return {
      url: await dataUrl,
      cleanup: undefined, // data URLs are self-contained, no cleanup needed
    };
  },
};

/**
 * Helper function to generate a preview URL from ImageData.
 * Uses the global preview mode setting (defaults to lazy for performance).
 *
 * @param imageData - The image data to generate preview for
 * @param width - Target width
 * @param height - Target height
 * @param mode - 'eager' for blob URL, 'lazy' for data URL (default: 'lazy')
 */
export async function generatePreviewUrl(
  imageData: ImageData,
  width: number,
  height: number,
  mode: 'eager' | 'lazy' = 'lazy'
): Promise<PreviewRef> {
  const strategy = mode === 'eager' ? eagerPreviewStrategy : lazyPreviewStrategy;
  return strategy.generatePreview(imageData, width, height);
}

/** Create the default preview strategy. Default is lazy for performance. */
export function createPreviewStrategy(mode: 'eager' | 'lazy' = 'lazy'): PreviewStrategy {
  switch (mode) {
    case 'eager':
      return eagerPreviewStrategy;
    case 'lazy':
    default:
      return lazyPreviewStrategy;
  }
}
