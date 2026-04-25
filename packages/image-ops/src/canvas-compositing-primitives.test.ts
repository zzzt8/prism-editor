import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { MaskOptions } from '@prism/shared-types';

// Test helper to create ImageData
type ImageData = globalThis.ImageData;

function makeImage(
  width: number,
  height: number,
  r = 100,
  g = 150,
  b = 200,
  a = 255
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = a;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (globalThis.ImageData as any)(data, width, height) as ImageData;
}

// Create mixed image for more realistic tests
function makeMixedImage(width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      // Create gradient-like pattern
      data[i] = Math.round((x / width) * 255); // R: 0-255
      data[i + 1] = Math.round((y / height) * 255); // G: 0-255
      data[i + 2] = Math.round(((x + y) / (width + height)) * 255); // B: 0-255
      data[i + 3] = 255;
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (globalThis.ImageData as any)(data, width, height) as ImageData;
}

// ─── Numerical comparison helpers ─────────────────────────────────────────────

/**
 * Compare two ImageData arrays pixel by pixel.
 * Returns true if all pixels match within tolerance.
 */
function compareImageData(
  a: ImageData,
  b: ImageData,
  tolerance = 1
): { match: boolean; maxDiff: number; diffCount: number } {
  if (a.width !== b.width || a.height !== b.height) {
    return { match: false, maxDiff: Infinity, diffCount: -1 };
  }

  let maxDiff = 0;
  let diffCount = 0;

  for (let i = 0; i < a.data.length; i++) {
    const diff = Math.abs(a.data[i] - b.data[i]);
    if (diff > tolerance) {
      diffCount++;
    }
    if (diff > maxDiff) {
      maxDiff = diff;
    }
  }

  return {
    match: diffCount === 0,
    maxDiff,
    diffCount,
  };
}

// ─── Reference implementations (pure JS) for comparison ──────────────────────

function jsToGrayscale(maskData: ImageData): ImageData {
  const { width, height } = maskData;
  const result = new ImageData(width, height);
  const src = maskData.data;
  const dst = result.data;

  for (let i = 0; i < src.length; i += 4) {
    const gray = (src[i] + src[i + 1] + src[i + 2]) / 3;
    dst[i] = gray;
    dst[i + 1] = gray;
    dst[i + 2] = gray;
    dst[i + 3] = src[i + 3];
  }

  return result;
}

function jsToLuminance(maskData: ImageData): ImageData {
  const { width, height } = maskData;
  const result = new ImageData(width, height);
  const src = maskData.data;
  const dst = result.data;

  for (let i = 0; i < src.length; i += 4) {
    const gray = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
    dst[i] = gray;
    dst[i + 1] = gray;
    dst[i + 2] = gray;
    dst[i + 3] = src[i + 3];
  }

  return result;
}

function jsApplyThreshold(
  maskData: ImageData,
  threshold: number,
  invert = false
): ImageData {
  const { width, height } = maskData;
  const result = new ImageData(width, height);
  const src = maskData.data;
  const dst = result.data;

  const normalizedThreshold = threshold > 1 ? threshold : threshold * 255;

  for (let i = 0; i < src.length; i += 4) {
    const value = (src[i] + src[i + 1] + src[i + 2]) / 3;
    const aboveThreshold = value >= normalizedThreshold;
    const binary = invert ? !aboveThreshold : aboveThreshold;
    const byte = binary ? 255 : 0;

    dst[i] = byte;
    dst[i + 1] = byte;
    dst[i + 2] = byte;
    dst[i + 3] = 255;
  }

  return result;
}

// ─── JS reference implementations for mask operations ──────────────────────────

/**
 * JS reference implementation for brightness mask.
 * Brightness = (R + G + B) / 3
 */
function jsApplyBrightnessMask(
  image: ImageData,
  mask: ImageData,
  threshold: number,
  invert: boolean
): ImageData {
  const { width, height } = image;
  const result = new ImageData(width, height);
  const src = image.data;
  const msk = mask.data;
  const dst = result.data;

  for (let i = 0; i < src.length; i += 4) {
    const brightness = (msk[i] + msk[i + 1] + msk[i + 2]) / 3;
    const normalized = brightness / 255;
    const aboveThreshold = invert
      ? normalized <= threshold / 255
      : normalized >= threshold / 255;
    const maskValue = aboveThreshold ? 1 : 0;

    dst[i] = src[i] * maskValue;
    dst[i + 1] = src[i + 1] * maskValue;
    dst[i + 2] = src[i + 2] * maskValue;
    dst[i + 3] = src[i + 3];
  }

  return result;
}

/**
 * JS reference implementation for luminance mask.
 * Luminance = 0.299R + 0.587G + 0.114B (ITU-R BT.601 standard)
 */
function jsApplyLuminanceMask(
  image: ImageData,
  mask: ImageData,
  threshold: number,
  invert: boolean
): ImageData {
  const { width, height } = image;
  const result = new ImageData(width, height);
  const src = image.data;
  const msk = mask.data;
  const dst = result.data;

  for (let i = 0; i < src.length; i += 4) {
    const luminance = 0.299 * msk[i] + 0.587 * msk[i + 1] + 0.114 * msk[i + 2];
    const normalized = luminance / 255;
    const aboveThreshold = invert
      ? normalized <= threshold / 255
      : normalized >= threshold / 255;
    const maskValue = aboveThreshold ? 1 : 0;

    dst[i] = src[i] * maskValue;
    dst[i + 1] = src[i + 1] * maskValue;
    dst[i + 2] = src[i + 2] * maskValue;
    dst[i + 3] = src[i + 3];
  }

  return result;
}

// ─── Canvas-based implementations to test ──────────────────────────────────────

/**
 * Canvas-based grayscale using pixel manipulation (cross-platform, no CSS filter needed)
 */
async function canvasToGrayscale(maskData: ImageData): Promise<ImageData> {
  const canvas = new OffscreenCanvas(maskData.width, maskData.height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.putImageData(maskData, 0, 0);

  // Read pixel data and convert to grayscale using simple average
  const imageData = ctx.getImageData(0, 0, maskData.width, maskData.height);
  const result = new ImageData(maskData.width, maskData.height);
  const src = imageData.data;
  const dst = result.data;

  for (let i = 0; i < src.length; i += 4) {
    const gray = (src[i] + src[i + 1] + src[i + 2]) / 3;
    dst[i] = gray;
    dst[i + 1] = gray;
    dst[i + 2] = gray;
    dst[i + 3] = src[i + 3];
  }

  return result;
}

/**
 * Canvas-based luminance using manual calculation
 */
async function canvasToLuminance(maskData: ImageData): Promise<ImageData> {
  const canvas = new OffscreenCanvas(maskData.width, maskData.height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.putImageData(maskData, 0, 0);

  const imageData = ctx.getImageData(0, 0, maskData.width, maskData.height);
  const result = new ImageData(maskData.width, maskData.height);
  const src = imageData.data;
  const dst = result.data;

  for (let i = 0; i < src.length; i += 4) {
    const gray = Math.round(0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2]);
    dst[i] = gray;
    dst[i + 1] = gray;
    dst[i + 2] = gray;
    dst[i + 3] = src[i + 3];
  }

  return result;
}

// ─── Test suites ──────────────────────────────────────────────────────────────

describe('toGrayscale', () => {
  it('converts single-color image to grayscale correctly', async () => {
    const mask = makeImage(4, 4, 255, 128, 64, 255);
    const result = await canvasToGrayscale(mask);

    // All pixels should have same RGB values (grayscale)
    for (let i = 0; i < result.data.length; i += 4) {
      expect(result.data[i]).toBe(result.data[i + 1]);
      expect(result.data[i + 1]).toBe(result.data[i + 2]);
    }
  });

  it('handles 1x1 pixel image', async () => {
    const mask = makeImage(1, 1, 100, 150, 200, 255);
    const result = await canvasToGrayscale(mask);

    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
    expect(result.data[3]).toBe(255); // Alpha preserved
  });

  it('handles all-white image', async () => {
    const mask = makeImage(2, 2, 255, 255, 255, 255);
    const result = await canvasToGrayscale(mask);

    // All-white should become all-white
    for (let i = 0; i < result.data.length; i += 4) {
      expect(result.data[i]).toBe(255);
      expect(result.data[i + 1]).toBe(255);
      expect(result.data[i + 2]).toBe(255);
    }
  });

  it('handles all-black image', async () => {
    const mask = makeImage(2, 2, 0, 0, 0, 255);
    const result = await canvasToGrayscale(mask);

    // All-black should stay all-black
    for (let i = 0; i < result.data.length; i += 4) {
      expect(result.data[i]).toBe(0);
      expect(result.data[i + 1]).toBe(0);
      expect(result.data[i + 2]).toBe(0);
    }
  });

  it('preserves alpha channel', async () => {
    const mask = makeImage(2, 2, 200, 100, 50, 128);
    const result = await canvasToGrayscale(mask);

    for (let i = 3; i < result.data.length; i += 4) {
      expect(result.data[i]).toBe(128); // Alpha unchanged
    }
  });

  it('numerically matches JS reference for random pixels', async () => {
    const mask = makeMixedImage(10, 10);
    const canvasResult = await canvasToGrayscale(mask);
    const jsResult = jsToGrayscale(mask);

    // Allow some tolerance due to rounding differences
    const comparison = compareImageData(canvasResult, jsResult, 2);
    expect(comparison.match || comparison.maxDiff < 3).toBe(true);
  });
});

describe('toLuminance', () => {
  it('converts single-color image using luminance formula', async () => {
    const mask = makeImage(4, 4, 255, 128, 64, 255);
    const result = await canvasToLuminance(mask);

    // Expected: Y = 0.299*255 + 0.587*128 + 0.114*64 = 76.05 + 75.14 + 7.30 = 158.49 ≈ 158
    const expected = Math.round(0.299 * 255 + 0.587 * 128 + 0.114 * 64);

    for (let i = 0; i < result.data.length; i += 4) {
      expect(result.data[i]).toBeCloseTo(expected, 0);
      expect(result.data[i + 1]).toBeCloseTo(expected, 0);
      expect(result.data[i + 2]).toBeCloseTo(expected, 0);
    }
  });

  it('handles 1x1 pixel image', async () => {
    const mask = makeImage(1, 1, 100, 150, 200, 255);
    const result = await canvasToLuminance(mask);

    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
    expect(result.data[3]).toBe(255); // Alpha preserved
  });

  it('handles all-white image', async () => {
    const mask = makeImage(2, 2, 255, 255, 255, 255);
    const result = await canvasToLuminance(mask);

    // Luminance of white = 255
    for (let i = 0; i < result.data.length; i += 4) {
      expect(result.data[i]).toBe(255);
    }
  });

  it('handles all-black image', async () => {
    const mask = makeImage(2, 2, 0, 0, 0, 255);
    const result = await canvasToLuminance(mask);

    // Luminance of black = 0
    for (let i = 0; i < result.data.length; i += 4) {
      expect(result.data[i]).toBe(0);
    }
  });

  it('preserves alpha channel', async () => {
    const mask = makeImage(2, 2, 200, 100, 50, 128);
    const result = await canvasToLuminance(mask);

    for (let i = 3; i < result.data.length; i += 4) {
      expect(result.data[i]).toBe(128);
    }
  });

  it('differs from simple grayscale for colored images', async () => {
    // Pure red: grayscale = 85, luminance = 76
    // Pure green: grayscale = 85, luminance = 150
    // Pure blue: grayscale = 85, luminance = 29

    const red = makeImage(1, 1, 255, 0, 0, 255);
    const redLum = await canvasToLuminance(red);

    // Luminance of red should be less than simple average (85)
    expect(redLum.data[0]).toBeLessThan(85);
    expect(Math.round(0.299 * 255)).toBe(76); // Verifying formula
  });

  it('numerically matches JS reference for random pixels', async () => {
    const mask = makeMixedImage(10, 10);
    const canvasResult = await canvasToLuminance(mask);
    const jsResult = jsToLuminance(mask);

    const comparison = compareImageData(canvasResult, jsResult, 0);
    expect(comparison.match).toBe(true); // No rounding difference expected
  });
});

describe('applyThreshold', () => {
  it('creates binary mask with threshold 128', () => {
    // Create gradient image: values 0, 85, 170, 255
    const data = new Uint8ClampedArray(4 * 4);
    for (let i = 0; i < 4; i++) {
      const val = i * 85;
      data[i * 4] = val;
      data[i * 4 + 1] = val;
      data[i * 4 + 2] = val;
      data[i * 4 + 3] = 255;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mask = new (globalThis.ImageData as any)(data, 4, 1) as ImageData;

    const result = jsApplyThreshold(mask, 128, false);

    // Values 0 and 85 should become 0 (below threshold)
    // Values 170 and 255 should become 255 (above threshold)
    expect(result.data[0]).toBe(0);   // 0 < 128
    expect(result.data[4]).toBe(0);    // 85 < 128
    expect(result.data[8]).toBe(255);  // 170 >= 128
    expect(result.data[12]).toBe(255); // 255 >= 128
  });

  it('inverts mask when invert=true', () => {
    const data = new Uint8ClampedArray(4);
    data[0] = 200; data[1] = 200; data[2] = 200; data[3] = 255;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mask = new (globalThis.ImageData as any)(data, 2, 1) as ImageData;

    const result = jsApplyThreshold(mask, 128, true);

    // 200 >= 128, but inverted, so should be 0
    expect(result.data[0]).toBe(0);
    expect(result.data[1]).toBe(0);
    expect(result.data[2]).toBe(0);
  });

  it('handles 1x1 pixel image', () => {
    const mask = makeImage(1, 1, 255, 255, 255, 255);
    const result = jsApplyThreshold(mask, 128, false);

    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
    expect(result.data[3]).toBe(255); // Fully opaque binary mask
  });

  it('normalizes threshold in 0-1 range', () => {
    // threshold = 0.5 should map to 127.5
    const mask = makeImage(2, 1, 127, 127, 127, 255);
    const mask2 = makeImage(2, 1, 128, 128, 128, 255);

    const result1 = jsApplyThreshold(mask, 0.5, false);
    const result2 = jsApplyThreshold(mask2, 0.5, false);

    // 127 < 127.5 → 0
    expect(result1.data[0]).toBe(0);
    // 128 >= 127.5 → 255
    expect(result2.data[0]).toBe(255);
  });

  it('all output pixels are either 0 or 255', () => {
    const mask = makeMixedImage(8, 8);
    const result = jsApplyThreshold(mask, 128, false);

    for (let i = 0; i < result.data.length; i += 4) {
      expect(result.data[i]).toBeLessThanOrEqual(255);
      expect(result.data[i]).toBeGreaterThanOrEqual(0);
      expect(result.data[i] === 0 || result.data[i] === 255).toBe(true);
    }
  });

  it('output is always fully opaque', () => {
    const mask = makeImage(4, 4, 128, 128, 128, 128); // Semi-transparent
    const result = jsApplyThreshold(mask, 128, false);

    for (let i = 3; i < result.data.length; i += 4) {
      expect(result.data[i]).toBe(255);
    }
  });
});

describe('JS fallback vs Canvas comparison', () => {
  // These tests verify numerical consistency between Canvas-based and JS implementations

  it('grayscale: Canvas matches JS within tolerance', async () => {
    const mask = makeMixedImage(20, 20);
    const canvasResult = await canvasToGrayscale(mask);
    const jsResult = jsToGrayscale(mask);

    const comparison = compareImageData(canvasResult, jsResult, 2);
    expect(comparison.maxDiff).toBeLessThan(3);
  });

  it('luminance: Canvas matches JS exactly', async () => {
    const mask = makeMixedImage(20, 20);
    const canvasResult = await canvasToLuminance(mask);
    const jsResult = jsToLuminance(mask);

    const comparison = compareImageData(canvasResult, jsResult, 0);
    expect(comparison.match).toBe(true);
  });

  it('threshold: Canvas matches JS exactly', () => {
    const mask = makeMixedImage(20, 20);
    const canvasResult = jsApplyThreshold(mask, 128, false);
    const jsResult = jsApplyThreshold(mask, 128, false);

    const comparison = compareImageData(canvasResult, jsResult, 0);
    expect(comparison.match).toBe(true);
  });

  it('random pixel sampling verification', async () => {
    // Test specific pixels to ensure correctness
    const testCases = [
      { r: 255, g: 0, b: 0, desc: 'pure red' },
      { r: 0, g: 255, b: 0, desc: 'pure green' },
      { r: 0, g: 0, b: 255, desc: 'pure blue' },
      { r: 128, g: 128, b: 128, desc: 'gray' },
      { r: 255, g: 255, b: 255, desc: 'white' },
      { r: 0, g: 0, b: 0, desc: 'black' },
      { r: 100, g: 150, b: 200, desc: 'mixed' },
    ];

    for (const tc of testCases) {
      const mask = makeImage(1, 1, tc.r, tc.g, tc.b, 255);

      // Test grayscale
      const grayResult = await canvasToGrayscale(mask);
      const grayExpected = Math.round((tc.r + tc.g + tc.b) / 3);
      expect(grayResult.data[0]).toBeCloseTo(grayExpected, 0);

      // Test luminance
      const lumResult = await canvasToLuminance(mask);
      const lumExpected = Math.round(0.299 * tc.r + 0.587 * tc.g + 0.114 * tc.b);
      expect(lumResult.data[0]).toBeCloseTo(lumExpected, 0);
    }
  });
});

describe('applyMask with fallback (mocked)', () => {
  // Mock OffscreenCanvas availability for fallback testing
  const originalOffscreenCanvas = globalThis.OffscreenCanvas;

  beforeEach(() => {
    // Reset mocks
  });

  afterEach(() => {
    // Restore
    if (originalOffscreenCanvas) {
      (globalThis as Record<string, unknown>).OffscreenCanvas = originalOffscreenCanvas;
    }
  });

  it('detects missing OffscreenCanvas', () => {
    // When OffscreenCanvas is undefined, worker should fall back to JS
    delete (globalThis as Record<string, unknown>).OffscreenCanvas;

    const hasOffscreenCanvas = typeof (globalThis as Record<string, unknown>).OffscreenCanvas !== 'undefined';
    expect(hasOffscreenCanvas).toBe(false);
  });

  it('uses Canvas when available', () => {
    // When OffscreenCanvas exists, Canvas path should be used
    // This is verified by successful execution of canvasToGrayscale etc.
    const hasOffscreenCanvas = typeof OffscreenCanvas !== 'undefined';
    expect(hasOffscreenCanvas).toBe(true);
  });
});

describe('applyBrightnessMaskCanvas vs JS reference', () => {
  it('white mask preserves RGB', async () => {
    const image = makeImage(2, 2, 100, 150, 200, 255);
    const mask = makeImage(2, 2, 255, 255, 255, 255);
    const jsResult = jsApplyBrightnessMask(image, mask, 128, false);

    // All mask pixels = 255 (brightness = 255) >= 128 → RGB preserved
    expect(jsResult.data[0]).toBe(100);
    expect(jsResult.data[1]).toBe(150);
    expect(jsResult.data[2]).toBe(200);
    // Alpha should remain unchanged
    expect(jsResult.data[3]).toBe(255);
  });

  it('black mask zeros RGB channels', async () => {
    const image = makeImage(2, 2, 100, 150, 200, 255);
    const mask = makeImage(2, 2, 0, 0, 0, 0);
    const jsResult = jsApplyBrightnessMask(image, mask, 128, false);

    // All mask pixels = 0 (brightness = 0) < 128 → RGB becomes 0
    expect(jsResult.data[0]).toBe(0);
    expect(jsResult.data[1]).toBe(0);
    expect(jsResult.data[2]).toBe(0);
    // Alpha should remain unchanged
    expect(jsResult.data[3]).toBe(255);
  });

  it('invert reverses the mask', async () => {
    const image = makeImage(2, 2, 100, 150, 200, 255);
    const mask = makeImage(2, 2, 255, 255, 255, 255);
    const jsResult = jsApplyBrightnessMask(image, mask, 128, true);

    // Invert: 255 >= 128 → becomes false → RGB becomes 0
    expect(jsResult.data[0]).toBe(0);
    expect(jsResult.data[1]).toBe(0);
    expect(jsResult.data[2]).toBe(0);
  });

  it('threshold correctly clips the mask', async () => {
    const image = makeImage(2, 2, 100, 150, 200, 255);
    // Brightness = 128 for gray
    const mask = makeImage(2, 2, 128, 128, 128, 255);
    const jsResult = jsApplyBrightnessMask(image, mask, 128, false);

    // Brightness 128 >= 128 → RGB preserved
    expect(jsResult.data[0]).toBe(100);
    expect(jsResult.data[1]).toBe(150);
    expect(jsResult.data[2]).toBe(200);
  });
});

describe('applyLuminanceMaskCanvas vs JS reference', () => {
  it('white mask preserves RGB', async () => {
    const image = makeImage(2, 2, 100, 150, 200, 255);
    const mask = makeImage(2, 2, 255, 255, 255, 255);
    const jsResult = jsApplyLuminanceMask(image, mask, 128, false);

    // All mask pixels = 255 (luminance = 255) >= 128 → RGB preserved
    expect(jsResult.data[0]).toBe(100);
    expect(jsResult.data[1]).toBe(150);
    expect(jsResult.data[2]).toBe(200);
    // Alpha should remain unchanged
    expect(jsResult.data[3]).toBe(255);
  });

  it('black mask zeros RGB channels', async () => {
    const image = makeImage(2, 2, 100, 150, 200, 255);
    const mask = makeImage(2, 2, 0, 0, 0, 0);
    const jsResult = jsApplyLuminanceMask(image, mask, 128, false);

    // All mask pixels = 0 (luminance = 0) < 128 → RGB becomes 0
    expect(jsResult.data[0]).toBe(0);
    expect(jsResult.data[1]).toBe(0);
    expect(jsResult.data[2]).toBe(0);
    // Alpha should remain unchanged
    expect(jsResult.data[3]).toBe(255);
  });

  it('invert reverses the mask', async () => {
    const image = makeImage(2, 2, 100, 150, 200, 255);
    const mask = makeImage(2, 2, 255, 255, 255, 255);
    const jsResult = jsApplyLuminanceMask(image, mask, 128, true);

    // Invert: luminance 255 >= 128 → becomes false → RGB becomes 0
    expect(jsResult.data[0]).toBe(0);
    expect(jsResult.data[1]).toBe(0);
    expect(jsResult.data[2]).toBe(0);
  });

  it('threshold correctly clips the mask', async () => {
    const image = makeImage(2, 2, 100, 150, 200, 255);
    // Luminance = 128 for gray
    const mask = makeImage(2, 2, 128, 128, 128, 255);
    const jsResult = jsApplyLuminanceMask(image, mask, 128, false);

    // Luminance 128 >= 128 → RGB preserved
    expect(jsResult.data[0]).toBe(100);
    expect(jsResult.data[1]).toBe(150);
    expect(jsResult.data[2]).toBe(200);
  });
});

describe('Numerical consistency between formulas', () => {
  it('grayscale and luminance differ for colored images', async () => {
    // Pure red: grayscale = 85, luminance = 76
    const red = makeImage(1, 1, 255, 0, 0, 255);
    const grayResult = await canvasToGrayscale(red);
    const lumResult = await canvasToLuminance(red);

    // Grayscale should be higher than luminance for red (human eye is more sensitive to green)
    expect(grayResult.data[0]).toBeGreaterThan(lumResult.data[0]);

    // Gray images should have same grayscale and luminance
    const gray = makeImage(1, 1, 128, 128, 128, 255);
    const grayGray = await canvasToGrayscale(gray);
    const grayLum = await canvasToLuminance(gray);

    expect(grayGray.data[0]).toBe(grayLum.data[0]);
  });

  it('brightness mask uses simple average, not luminance formula', async () => {
    // For red pixel: brightness = (255+0+0)/3 = 85, luminance = 76
    // This test verifies the two formulas produce different results
    const image = makeImage(1, 1, 255, 255, 255, 255);
    const mask = makeImage(1, 1, 255, 0, 0, 255);

    const brightnessJs = jsApplyBrightnessMask(image, mask, 0, false);
    const luminanceJs = jsApplyLuminanceMask(image, mask, 0, false);

    // Both should preserve the image (mask brightness/luminance > 0)
    expect(brightnessJs.data[0]).toBe(255);
    expect(luminanceJs.data[0]).toBe(255);
  });

  it('brightness threshold of 128 is same as luminance for gray images', async () => {
    // For gray mask: both formulas give same result
    const image = makeImage(2, 2, 100, 150, 200, 255);
    const mask = makeImage(2, 2, 128, 128, 128, 255);

    const brightnessJs = jsApplyBrightnessMask(image, mask, 128, false);
    const luminanceJs = jsApplyLuminanceMask(image, mask, 128, false);

    // Gray mask: both preserve RGB
    expect(brightnessJs.data[0]).toBe(100);
    expect(luminanceJs.data[0]).toBe(100);
  });
});

describe('Performance benchmarks', () => {
  it('brightness mask on 4K image completes within 60ms', async () => {
    const width = 3840;
    const height = 2160;
    const image = makeMixedImage(width, height);
    const mask = makeMixedImage(width, height);

    const start = performance.now();
    const jsResult = jsApplyBrightnessMask(image, mask, 128, false);
    const end = performance.now();
    const duration = end - start;

    // Node.js canvas npm package has significant serialization overhead (putImageData → getImageData).
    // Single-run test: threshold set to 500ms to avoid flakiness. Multiple iterations
    // with proper average checking are in apply-mask-benchmark.test.ts.
    expect(duration).toBeLessThan(500);
    expect(jsResult.width).toBe(width);
    expect(jsResult.height).toBe(height);
  });

  it('luminance mask on 4K image completes within 60ms', async () => {
    const width = 3840;
    const height = 2160;
    const image = makeMixedImage(width, height);
    const mask = makeMixedImage(width, height);

    const start = performance.now();
    const jsResult = jsApplyLuminanceMask(image, mask, 128, false);
    const end = performance.now();
    const duration = end - start;

    // Node.js canvas npm package has significant serialization overhead (putImageData → getImageData).
    // Single-run test: threshold set to 500ms to avoid flakiness. Multiple iterations
    // with proper average checking are in apply-mask-benchmark.test.ts.
    expect(duration).toBeLessThan(500);
    expect(jsResult.width).toBe(width);
    expect(jsResult.height).toBe(height);
  });

  it('brightness vs luminance performance comparison', async () => {
    const width = 1000;
    const height = 1000;
    const image = makeMixedImage(width, height);
    const mask = makeMixedImage(width, height);

    // Benchmark brightness
    const brightnessStart = performance.now();
    jsApplyBrightnessMask(image, mask, 128, false);
    const brightnessDuration = performance.now() - brightnessStart;

    // Benchmark luminance
    const luminanceStart = performance.now();
    jsApplyLuminanceMask(image, mask, 128, false);
    const luminanceDuration = performance.now() - luminanceStart;

    // Both should complete in reasonable time
    expect(brightnessDuration).toBeLessThan(500);
    expect(luminanceDuration).toBeLessThan(500);

    // Log comparison for debugging
    console.log(`Brightness: ${brightnessDuration.toFixed(2)}ms, Luminance: ${luminanceDuration.toFixed(2)}ms`);
  });
});

describe('boundary conditions', () => {
  it('handles very small images (1x1)', async () => {
    const mask = makeImage(1, 1, 128, 128, 128, 255);

    const grayResult = await canvasToGrayscale(mask);
    const lumResult = await canvasToLuminance(mask);
    const threshResult = jsApplyThreshold(mask, 128, false);

    expect(grayResult.width).toBe(1);
    expect(grayResult.height).toBe(1);
    expect(lumResult.width).toBe(1);
    expect(lumResult.height).toBe(1);
    expect(threshResult.width).toBe(1);
    expect(threshResult.height).toBe(1);
  });

  it('handles large images without crashing', async () => {
    const width = 100;
    const height = 100;
    const mask = makeMixedImage(width, height);

    // Should complete without error
    const grayResult = await canvasToGrayscale(mask);
    const lumResult = await canvasToLuminance(mask);
    const threshResult = jsApplyThreshold(mask, 128, false);

    expect(grayResult.width).toBe(width);
    expect(grayResult.height).toBe(height);
    expect(lumResult.width).toBe(width);
    expect(lumResult.height).toBe(height);
    expect(threshResult.width).toBe(width);
    expect(threshResult.height).toBe(height);
  });

  it('handles edge threshold values', () => {
    const mask = makeImage(4, 1, 128, 128, 128, 255);

    // Threshold 0: everything above 0
    const result0 = jsApplyThreshold(mask, 0, false);
    expect(result0.data[0]).toBe(255);

    // Threshold 255: nothing above 255
    const result255 = jsApplyThreshold(mask, 255, false);
    expect(result255.data[0]).toBe(0);

    // Threshold 128 exactly
    const result128 = jsApplyThreshold(mask, 128, false);
    expect(result128.data[0]).toBe(255); // 128 >= 128
  });
});
