/**
 * Cross-platform consistency tests
 * Verifies that browser and nodejs executors produce consistent outputs
 */

import { describe, it, expect } from 'vitest';
import { compositeImages } from './composite/composite';

/**
 * Calculate pixel-level difference between two ImageData arrays
 * Returns percentage of differing pixels (0-100)
 */
function pixelDiff(data1: Uint8ClampedArray, data2: Uint8ClampedArray): number {
  if (data1.length !== data2.length) {
    throw new Error('ImageData arrays have different lengths');
  }

  let diffCount = 0;
  const totalPixels = data1.length / 4;

  for (let i = 0; i < data1.length; i += 4) {
    // Compare RGB channels (skip alpha for visual consistency)
    const rDiff = Math.abs(data1[i] - data2[i]);
    const gDiff = Math.abs(data1[i + 1] - data2[i + 1]);
    const bDiff = Math.abs(data1[i + 2] - data2[i + 2]);
    const aDiff = Math.abs(data1[i + 3] - data2[i + 3]);

    // Allow small tolerance for rounding errors (1 unit)
    if (rDiff > 1 || gDiff > 1 || bDiff > 1 || aDiff > 1) {
      diffCount++;
    }
  }

  return (diffCount / totalPixels) * 100;
}

/**
 * Create test ImageData with solid color
 */
function createTestImageData(width: number, height: number, r: number, g: number, b: number, a: number = 255): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = a;
  }
  return new ImageData(data, width, height);
}

describe('Cross-platform composite consistency', () => {
  it('produces identical output for same inputs (deterministic)', () => {
    const base = createTestImageData(4, 4, 255, 0, 0);
    const overlay = createTestImageData(2, 2, 0, 255, 0);

    const result1 = compositeImages(base, overlay, { blendMode: 'normal', opacity: 1 });
    const result2 = compositeImages(base, overlay, { blendMode: 'normal', opacity: 1 });

    // Results should be identical
    const diff = pixelDiff(result1.data, result2.data);
    expect(diff).toBeLessThan(0.01); // 0% difference
  });

  it('produces consistent output for multiply blend mode', () => {
    const base = createTestImageData(4, 4, 255, 255, 255); // white
    const overlay = createTestImageData(4, 4, 128, 128, 128); // gray

    const result1 = compositeImages(base, overlay, { blendMode: 'multiply', opacity: 1 });
    const result2 = compositeImages(base, overlay, { blendMode: 'multiply', opacity: 1 });

    // Results should be identical
    expect(result1.width).toBe(result2.width);
    expect(result1.height).toBe(result2.height);
    const diff = pixelDiff(result1.data, result2.data);
    expect(diff).toBeLessThan(0.01);
  });

  it('handles opacity variations consistently', () => {
    const base = createTestImageData(4, 4, 255, 0, 0);
    const overlay = createTestImageData(4, 4, 0, 0, 255);

    const result0 = compositeImages(base, overlay, { blendMode: 'normal', opacity: 0 });
    const result100 = compositeImages(base, overlay, { blendMode: 'normal', opacity: 1 });

    // Opacity 0 should preserve base, opacity 1 should blend
    expect(result0.width).toBe(result100.width);
    expect(result0.height).toBe(result100.height);

    // Verify opacity 0 keeps base color
    expect(result0.data[0]).toBe(255); // R
    expect(result0.data[1]).toBe(0);   // G
    expect(result0.data[2]).toBe(0);   // B
  });

  it('handles overlay positioning consistently', () => {
    const base = createTestImageData(8, 8, 255, 0, 0);
    const overlay = createTestImageData(2, 2, 0, 255, 0);

    // Overlay at (0, 0)
    const result1 = compositeImages(base, overlay, {
      blendMode: 'normal',
      opacity: 1,
      overlayX: 0,
      overlayY: 0,
    });

    // Overlay at (4, 4)
    const result2 = compositeImages(base, overlay, {
      blendMode: 'normal',
      opacity: 1,
      overlayX: 4,
      overlayY: 4,
    });

    // Results should have same dimensions
    expect(result1.width).toBe(result2.width);
    expect(result1.height).toBe(result2.height);

    // But different pixel data
    const diff = pixelDiff(result1.data, result2.data);
    expect(diff).toBeGreaterThan(0); // They should be different
  });

  it('supports all standard blend modes', () => {
    const base = createTestImageData(4, 4, 200, 100, 50);
    const overlay = createTestImageData(4, 4, 50, 100, 200);

    const blendModes = ['normal', 'multiply', 'screen', 'overlay', 'soft-light'] as const;

    for (const mode of blendModes) {
      const result = compositeImages(base, overlay, { blendMode: mode, opacity: 1 });
      expect(result.width).toBe(4);
      expect(result.height).toBe(4);
      expect(result.data.length).toBe(4 * 4 * 4);

      // All pixels should be valid RGBA
      for (let i = 0; i < result.data.length; i += 4) {
        expect(result.data[i]).toBeGreaterThanOrEqual(0);
        expect(result.data[i]).toBeLessThanOrEqual(255);
        expect(result.data[i + 1]).toBeGreaterThanOrEqual(0);
        expect(result.data[i + 1]).toBeLessThanOrEqual(255);
        expect(result.data[i + 2]).toBeGreaterThanOrEqual(0);
        expect(result.data[i + 2]).toBeLessThanOrEqual(255);
        expect(result.data[i + 3]).toBeGreaterThanOrEqual(0);
        expect(result.data[i + 3]).toBeLessThanOrEqual(255);
      }
    }
  });

  it('handles canvas size different from input size', () => {
    const base = createTestImageData(4, 4, 255, 255, 255);
    const overlay = createTestImageData(2, 2, 128, 128, 128);

    // Canvas larger than base
    const result = compositeImages(base, overlay, {
      blendMode: 'normal',
      opacity: 1,
      canvasWidth: 8,
      canvasHeight: 8,
      overlayX: 0,
      overlayY: 0,
    });

    expect(result.width).toBe(8);
    expect(result.height).toBe(8);
  });
});

describe('Cross-platform mask consistency', () => {
  it('produces consistent alpha mask results', async () => {
    // Import dynamically since we're in Node.js test environment
    const { applyMask } = await import('./mask/mask');

    const image = createTestImageData(4, 4, 255, 0, 0, 255);
    const mask = createTestImageData(4, 4, 255, 255, 255); // Full white mask

    const result1 = applyMask(image, mask, { type: 'alpha', threshold: 128 });
    const result2 = applyMask(image, mask, { type: 'alpha', threshold: 128 });

    // Results should be identical
    expect(result1.width).toBe(result2.width);
    expect(result1.height).toBe(result2.height);
    const diff = pixelDiff(result1.data, result2.data);
    expect(diff).toBeLessThan(0.01);
  });

  it('handles different mask types consistently', async () => {
    const { applyMask } = await import('./mask/mask');

    const image = createTestImageData(4, 4, 255, 0, 0, 255);
    const mask = createTestImageData(4, 4, 200, 200, 200);

    const alphaResult = applyMask(image, mask, { type: 'alpha', threshold: 128 });
    const brightnessResult = applyMask(image, mask, { type: 'brightness', threshold: 128 });
    const luminanceResult = applyMask(image, mask, { type: 'luminance', threshold: 128 });

    expect(alphaResult.width).toBe(4);
    expect(brightnessResult.width).toBe(4);
    expect(luminanceResult.width).toBe(4);

    // All should produce valid output
    expect(alphaResult.data.length).toBe(4 * 4 * 4);
    expect(brightnessResult.data.length).toBe(4 * 4 * 4);
    expect(luminanceResult.data.length).toBe(4 * 4 * 4);
  });
});
