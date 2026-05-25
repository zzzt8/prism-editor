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
 * Samples up to 100 pixels (400 bytes) for performance. A single pixel with
 * channel values exceeding its alpha indicates straight alpha format.
 */
export function detectAlphaFormat(pixels: ImageData): 'premultiplied' | 'straight' {
  const limit = Math.min(pixels.data.length, 400);
  for (let i = 0; i < limit; i += 4) {
    const a = pixels.data[i + 3];
    if (a > 0 && a < 255) {
      const r = pixels.data[i];
      const g = pixels.data[i + 1];
      const b = pixels.data[i + 2];
      if (r > a || g > a || b > a) return 'straight';
      if (r === a && g === a && b === a) return 'premultiplied';
      if (r <= a && g <= a && b <= a) return 'premultiplied';
    }
  }
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
  return [
    Math.round((r * 255) / a),
    Math.round((g * 255) / a),
    Math.round((b * 255) / a),
  ];
}
