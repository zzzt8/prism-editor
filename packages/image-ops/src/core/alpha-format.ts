/**
 * Alpha format detection and conversion utilities.
 *
 * ## Premultiplied Alpha Detection
 *
 * Canvas 2D getImageData() returns PREMULTIPLIED alpha pixels in browsers and
 * in the canvas npm package (Node.js). We detect the format at runtime:
 *
 * - **Premultiplied**: any pixel with A < 255 has RGB ≤ A for all channels.
 *   For example, 50% red with 50% opacity is stored as (128, 0, 0, 128).
 *   The RGB values are scaled by (alpha / 255).
 *
 * - **Straight**: any channel can exceed A. For example, 50% red with 50%
 *   opacity would be stored as (255, 0, 0, 128).
 *
 * - **Ambiguity**: Gray at 50% (R=G=B=A) is ambiguous. We conservatively
 *   treat it as premultiplied to avoid incorrect compositing results.
 */

import type { ImageData } from '@prism/shared-types';

/**
 * Detects whether the given ImageData uses premultiplied or straight alpha.
 *
 * Samples up to 100 pixels (400 bytes) for performance.
 *
 * For fully-opaque images (alpha=255 everywhere), both straight and premultiplied
 * look identical since premultiplied with alpha=255 is just [r, g, b, 255] = [r, g, b, alpha].
 * We conservatively treat them as straight alpha — this is fine for identical inputs
 * (both Browser and Node will detect the same format and use the same path).
 *
 * For pixels with partial transparency, the detection logic is:
 * - **Premultiplied**: R ≤ A, G ≤ A, B ≤ A for each pixel (channels scaled by alpha)
 * - **Straight**: Any channel may exceed alpha (e.g., bright pixel at 50% opacity = [255, 0, 0, 128])
 *
 * Canvas 2D getImageData() returns PREMULTIPLIED pixels.
 * Sharp PNG decode also returns PREMULTIPLIED pixels.
 * Therefore the canvas fixture (created via canvas/OffscreenCanvas) is premultiplied.
 */
export function detectAlphaFormat(pixels: ImageData): 'premultiplied' | 'straight' {
  const limit = Math.min(pixels.data.length, 400);
  for (let i = 0; i < limit; i += 4) {
    const a = pixels.data[i + 3];
    if (a > 0 && a < 255) {
      const r = pixels.data[i];
      const g = pixels.data[i + 1];
      const b = pixels.data[i + 2];
      // Premultiplied: all channels ≤ alpha
      if (r <= a && g <= a && b <= a) return 'premultiplied';
      // Straight: at least one channel > alpha
      if (r > a || g > a || b > a) return 'straight';
    }
  }
  // No partial-alpha pixels found — conservatively treat as straight
  // (both paths will detect this consistently for identical inputs)
  return 'straight';
}

/**
 * Un-premultiplies a premultiplied RGBA pixel to straight alpha.
 *
 * @param r - Premultiplied red channel (0-255)
 * @param g - Premultiplied green channel (0-255)
 * @param b - Premultiplied blue channel (0-255)
 * @param a - Alpha channel (0-255), used as divisor
 * @returns Tuple of [r, g, b] in straight alpha format
 *
 * @example
 * // 50% opaque premultiplied red (128, 0, 0, 128) -> straight (255, 0, 0, 128)
 * unPremultiply(128, 0, 0, 128) // [255, 0, 0]
 */
export function unPremultiply(r: number, g: number, b: number, a: number): [number, number, number] {
  if (a === 0) return [0, 0, 0];
  const clamp = (v: number): number => Math.max(0, Math.min(255, Math.round((v * 255) / a)));
  return [clamp(r), clamp(g), clamp(b)];
}
