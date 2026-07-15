/**
 * Mask algorithm unit tests.
 * Tests for core/mask/mask.ts - pure mask application functions.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getLuminance,
  getBrightness,
  applyAlphaMask,
  applyBrightnessMask,
  applyLuminanceMask,
  applyMask,
  resizeMaskData,
} from './mask';

function createImageData(width: number, height: number, fillFn: (x: number, y: number) => [number, number, number, number]): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = fillFn(x, y);
      const idx = (y * width + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = a;
    }
  }
  return new ImageData(data, width, height);
}

describe('getLuminance', () => {
  it('calculates correct luminance for red', () => {
    expect(getLuminance(255, 0, 0)).toBeCloseTo(76.245, 2);
  });

  it('calculates correct luminance for green', () => {
    expect(getLuminance(0, 255, 0)).toBeCloseTo(149.685, 2);
  });

  it('calculates correct luminance for blue', () => {
    expect(getLuminance(0, 0, 255)).toBeCloseTo(29.07, 2);
  });

  it('calculates correct luminance for white', () => {
    expect(getLuminance(255, 255, 255)).toBeCloseTo(255, 2);
  });

  it('calculates correct luminance for black', () => {
    expect(getLuminance(0, 0, 0)).toBeCloseTo(0, 2);
  });

  it('calculates correct luminance for gray', () => {
    expect(getLuminance(128, 128, 128)).toBeCloseTo(128, 2);
  });
});

describe('getBrightness', () => {
  it('calculates correct brightness for red', () => {
    expect(getBrightness(255, 0, 0)).toBeCloseTo(85, 2);
  });

  it('calculates correct brightness for white', () => {
    expect(getBrightness(255, 255, 255)).toBe(255);
  });

  it('calculates correct brightness for black', () => {
    expect(getBrightness(0, 0, 0)).toBe(0);
  });

  it('calculates correct brightness for gray', () => {
    expect(getBrightness(100, 100, 100)).toBe(100);
  });
});

describe('applyAlphaMask', () => {
  it('applies mask with default threshold (128)', () => {
    const image = createImageData(2, 1, () => [255, 0, 0, 255]);
    const mask = createImageData(2, 1, () => [255, 0, 0, 255]); // fully opaque
    const result = applyAlphaMask(image, mask);

    expect(result.data[3]).toBe(255); // alpha unchanged
  });

  it('masks out pixels below threshold', () => {
    const image = createImageData(2, 1, () => [255, 0, 0, 255]);
    const mask = createImageData(2, 1, () => [0, 0, 0, 0]); // fully transparent
    const result = applyAlphaMask(image, mask, 128);

    expect(result.data[3]).toBe(0); // alpha masked out
  });

  it('respects custom threshold', () => {
    const image = createImageData(1, 1, () => [255, 0, 0, 200]);
    const mask = createImageData(1, 1, () => [128, 0, 0, 255]);
    const result = applyAlphaMask(image, mask, 200);

    expect(result.data[3]).toBe(0); // 128 < 200, so masked out
  });

  it('inverts mask when invert=true', () => {
    const image = createImageData(2, 1, () => [255, 0, 0, 255]);
    const mask = createImageData(2, 1, () => [0, 0, 0, 0]); // transparent
    const result = applyAlphaMask(image, mask, 128, true);

    expect(result.data[3]).toBe(255); // inverted, so opaque
  });

  it('preserves RGB channels', () => {
    const image = createImageData(1, 1, () => [100, 150, 200, 255]);
    const mask = createImageData(1, 1, () => [255, 255, 255, 255]);
    const result = applyAlphaMask(image, mask);

    expect(result.data[0]).toBe(100);
    expect(result.data[1]).toBe(150);
    expect(result.data[2]).toBe(200);
    expect(result.data[3]).toBe(255);
  });

  it('does not modify original image data', () => {
    const image = createImageData(1, 1, () => [255, 0, 0, 255]);
    const mask = createImageData(1, 1, () => [0, 0, 0, 0]);
    const originalAlpha = image.data[3];
    applyAlphaMask(image, mask);

    expect(image.data[3]).toBe(originalAlpha);
  });
});

describe('applyBrightnessMask', () => {
  it('masks out dark pixels', () => {
    const image = createImageData(1, 1, () => [255, 0, 0, 255]);
    const mask = createImageData(1, 1, () => [0, 0, 0, 255]); // black mask
    const result = applyBrightnessMask(image, mask, 128);

    expect(result.data[3]).toBe(0); // brightness = 0 < 128
  });

  it('keeps bright pixels', () => {
    const image = createImageData(1, 1, () => [255, 0, 0, 255]);
    const mask = createImageData(1, 1, () => [255, 255, 255, 255]); // white mask
    const result = applyBrightnessMask(image, mask, 128);

    expect(result.data[3]).toBe(255); // brightness = 255 > 128
  });
});

describe('applyLuminanceMask', () => {
  it('masks based on luminance formula', () => {
    const image = createImageData(1, 1, () => [255, 0, 0, 255]);
    const mask = createImageData(1, 1, () => [255, 255, 255, 255]);
    const result = applyLuminanceMask(image, mask, 100);

    // Luminance of white = 255, which is > 100, so should be kept
    expect(result.data[3]).toBe(255);
  });

  it('masks out pixels below luminance threshold', () => {
    const image = createImageData(1, 1, () => [255, 0, 0, 255]);
    const mask = createImageData(1, 1, () => [50, 50, 50, 255]); // dark gray
    const result = applyLuminanceMask(image, mask, 200);

    // Luminance of gray ~50 < 200, should be masked out
    expect(result.data[3]).toBe(0);
  });
});

describe('applyMask', () => {
  it('applies mask with default options', () => {
    const image = createImageData(2, 1, () => [255, 0, 0, 255]);
    const mask = createImageData(2, 1, () => [255, 0, 0, 255]);
    const result = applyMask(image, mask);

    expect(result.width).toBe(2);
    expect(result.height).toBe(1);
  });

  it('uses alpha mask type by default', () => {
    const image = createImageData(1, 1, () => [255, 0, 0, 255]);
    const mask = createImageData(1, 1, () => [0, 0, 0, 255]);
    const result = applyMask(image, mask, { type: 'alpha' });

    expect(result.data[3]).toBe(0);
  });

  it('resizes mask when dimensions do not match', () => {
    const image = createImageData(4, 4, () => [255, 0, 0, 255]);
    const mask = createImageData(2, 2, () => [0, 0, 0, 0]); // different size
    const result = applyMask(image, mask);

    expect(result.width).toBe(4);
    expect(result.height).toBe(4);
  });

  it('does not resize when dimensions match', () => {
    const image = createImageData(2, 2, () => [255, 0, 0, 255]);
    const mask = createImageData(2, 2, () => [255, 0, 0, 255]);
    const result = applyMask(image, mask);

    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
  });
});

describe('resizeMaskData', () => {
  it('returns same data if dimensions match', () => {
    const mask = createImageData(2, 2, () => [255, 0, 0, 255]);
    const result = resizeMaskData(mask, 2, 2);

    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
  });

  it('resizes larger to smaller', () => {
    const mask = createImageData(4, 4, () => [255, 0, 0, 255]);
    const result = resizeMaskData(mask, 2, 2);

    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
  });

  it('resizes smaller to larger', () => {
    const mask = createImageData(2, 2, () => [255, 0, 0, 255]);
    const result = resizeMaskData(mask, 4, 4);

    expect(result.width).toBe(4);
    expect(result.height).toBe(4);
  });

  it('uses nearest-neighbor sampling', () => {
    // Create a simple 2x2 mask with distinct colors
    const mask = createImageData(2, 2, () => [255, 0, 0, 255]);
    const result = resizeMaskData(mask, 1, 1);

    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
    // Nearest neighbor of (0,0) pixel
    expect(result.data[0]).toBe(255);
  });
});
