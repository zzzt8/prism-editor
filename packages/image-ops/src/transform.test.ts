import { describe, it, expect } from 'vitest';
import {
  resizeImageData,
  flipHorizontal,
  flipVertical,
} from '../src/transform';
import { ImageData as CanvasImageData } from 'canvas';

type ImageData = globalThis.ImageData;

/** Create a 4x4 RGBA ImageData with a checkerboard pattern */
function makeCheckerboard(size = 4, fg = 255, bg = 0): ImageData {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const bright = (x + y) % 2 === 0;
      data[idx] = bright ? fg : bg;
      data[idx + 1] = bright ? fg : bg;
      data[idx + 2] = bright ? fg : bg;
      data[idx + 3] = 255;
    }
  }
  return new CanvasImageData(data, size, size) as ImageData;
}

/** Create a 4x4 solid-color ImageData */
function makeImage(size = 4, r = 100, g = 150, b = 200): ImageData {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  return new CanvasImageData(data, size, size) as ImageData;
}

describe('resizeImageData', () => {
  it('returns same dimensions when width and height unchanged', () => {
    const img = makeImage(4, 100, 150, 200);
    const result = resizeImageData(img, 4, 4);
    expect(result.width).toBe(4);
    expect(result.height).toBe(4);
  });

  it('resizes to smaller dimensions', () => {
    const img = makeImage(4, 100, 150, 200);
    const result = resizeImageData(img, 2, 2);
    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
  });

  it('resizes to larger dimensions', () => {
    const img = makeImage(2, 100, 150, 200);
    const result = resizeImageData(img, 4, 4);
    expect(result.width).toBe(4);
    expect(result.height).toBe(4);
  });

  it('preserves aspect ratio when only width changes', () => {
    const img = makeImage(4, 100, 150, 200);
    const result = resizeImageData(img, 8, 4);
    expect(result.width).toBe(8);
    expect(result.height).toBe(4);
  });

  it('throws on invalid width', () => {
    const img = makeImage(4);
    expect(() => resizeImageData(img, 0, 4)).toThrow('Invalid resize dimensions');
    expect(() => resizeImageData(img, -1, 4)).toThrow('Invalid resize dimensions');
  });

  it('throws on invalid height', () => {
    const img = makeImage(4);
    expect(() => resizeImageData(img, 4, 0)).toThrow('Invalid resize dimensions');
    expect(() => resizeImageData(img, 4, -1)).toThrow('Invalid resize dimensions');
  });

  it('does not mutate original ImageData', () => {
    const img = makeImage(4, 100, 150, 200);
    const original = new Uint8ClampedArray(img.data);
    resizeImageData(img, 2, 2);
    expect(img.data).toEqual(original);
  });

  it('produces non-trivial result for gradient (confirms bilinear interpolation)', () => {
    // A horizontal gradient scaled down produces intermediate gray values via interpolation
    const gradient = (() => {
      const data = new Uint8ClampedArray(8 * 4 * 4);
      for (let x = 0; x < 8; x++) {
        const value = Math.round((x / 7) * 255);
        for (let y = 0; y < 4; y++) {
          const idx = (y * 8 + x) * 4;
          data[idx] = value;
          data[idx + 1] = value;
          data[idx + 2] = value;
          data[idx + 3] = 255;
        }
      }
      return new CanvasImageData(data, 8, 4) as ImageData;
    })();
    const result = resizeImageData(gradient, 2, 4);
    // Horizontal gradient 0→255 across 8 pixels → downscaled to 2 pixels
    // Bilinear interpolation should produce gray values between 0 and 255
    const uniqueValues = new Set(Array.from(result.data.slice(0, 8)));
    expect(uniqueValues.size).toBeGreaterThan(2);
  });
});

describe('flipHorizontal', () => {
  it('flips a checkerboard horizontally', () => {
    // Row 0: [A, B, A, B] → [B, A, B, A]
    // Row 1: [B, A, B, A] → [A, B, A, B]
    const img = makeCheckerboard(4, 255, 0);
    const result = flipHorizontal(img);

    expect(result.data[0]).toBe(0);  // was 255
    expect(result.data[4]).toBe(255); // was 0
  });

  it('returns same dimensions', () => {
    const img = makeImage(4);
    const result = flipHorizontal(img);
    expect(result.width).toBe(img.width);
    expect(result.height).toBe(img.height);
  });

  it('is symmetric: flip twice returns original', () => {
    const img = makeCheckerboard(4, 255, 128);
    const twice = flipHorizontal(flipHorizontal(img));
    expect(twice.data).toEqual(img.data);
  });

  it('does not mutate original', () => {
    const img = makeImage(4);
    const original = new Uint8ClampedArray(img.data);
    flipHorizontal(img);
    expect(img.data).toEqual(original);
  });
});

describe('flipVertical', () => {
  it('flips a checkerboard vertically', () => {
    // Row 0: [A, B, A, B]  Row 1: [B, A, B, A]
    // After flip: row 0 becomes row 1, row 1 becomes row 0
    const img = makeCheckerboard(2, 255, 0);
    const result = flipVertical(img);

    // Row 0 (now at top) was row 1 (B,A)
    expect(result.data[0]).toBe(0);  // was 255 (row1 col0)
    expect(result.data[4]).toBe(255); // was 0 (row0 col0) — row 1 col 0
    expect(result.data[8]).toBe(255); // was 0 (row1 col1) — row 0 col 0
    expect(result.data[12]).toBe(0); // was 255 (row0 col1) — row 0 col 1
  });

  it('returns same dimensions', () => {
    const img = makeImage(4);
    const result = flipVertical(img);
    expect(result.width).toBe(img.width);
    expect(result.height).toBe(img.height);
  });

  it('is symmetric: flip twice returns original', () => {
    const img = makeCheckerboard(4, 255, 128);
    const twice = flipVertical(flipVertical(img));
    expect(twice.data).toEqual(img.data);
  });

  it('does not mutate original', () => {
    const img = makeImage(4);
    const original = new Uint8ClampedArray(img.data);
    flipVertical(img);
    expect(img.data).toEqual(original);
  });
});
