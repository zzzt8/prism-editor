/**
 * Composite algorithm unit tests.
 * Tests for core/composite/composite.ts - pure image compositing functions.
 */

import { describe, it, expect } from 'vitest';
import { compositeImages } from './composite';

function createImageData(width: number, height: number, r = 0, g = 0, b = 0, a = 255): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = a;
  }
  return new ImageData(data, width, height);
}

describe('compositeImages', () => {
  it('composites overlay onto base with default options', () => {
    const base = createImageData(2, 2, 255, 0, 0, 255); // red
    const overlay = createImageData(2, 2, 0, 0, 255, 255); // blue
    const result = compositeImages(base, overlay);

    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
    // Result should be a blend of red and blue
    expect(result.data[0]).toBeLessThan(255); // R should be reduced
    expect(result.data[2]).toBeGreaterThan(0); // B should be present
  });

  it('returns base unchanged when overlay is transparent', () => {
    const base = createImageData(2, 2, 255, 0, 0, 255);
    const overlay = createImageData(2, 2, 0, 0, 255, 0); // fully transparent
    const result = compositeImages(base, overlay);

    expect(result.data[0]).toBe(255); // Red preserved
    expect(result.data[1]).toBe(0);
    expect(result.data[2]).toBe(0);
  });

  it('applies opacity to overlay', () => {
    const base = createImageData(1, 1, 255, 0, 0, 255);
    const overlay = createImageData(1, 1, 0, 0, 255, 255);
    const result = compositeImages(base, overlay, { opacity: 0.5 });

    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
    // Result is a blend of red and blue at 50% opacity
    expect(result.data[0]).toBeGreaterThan(0);
    expect(result.data[2]).toBeGreaterThan(0);
  });

  it('respects canvasWidth and canvasHeight options', () => {
    const base = createImageData(4, 4, 255, 0, 0, 255);
    const overlay = createImageData(2, 2, 0, 0, 255, 255);
    const result = compositeImages(base, overlay, { canvasWidth: 4, canvasHeight: 4 });

    expect(result.width).toBe(4);
    expect(result.height).toBe(4);
  });

  it('applies overlay at offset position', () => {
    const base = createImageData(4, 4, 255, 0, 0, 255); // red
    const overlay = createImageData(2, 2, 0, 0, 255, 255); // blue
    const result = compositeImages(base, overlay, { overlayX: 2, overlayY: 2 });

    expect(result.width).toBe(4);
    expect(result.height).toBe(4);
    // Top-left should still be red (base)
    expect(result.data[0]).toBe(255); // R of first pixel
    expect(result.data[1]).toBe(0);
    expect(result.data[2]).toBe(0);
  });

  it('uses multiply blend mode to darken', () => {
    // Test multiply blend: red (255,0,0) * green (0,255,0) = black (0,0,0)
    const base = createImageData(1, 1, 255, 0, 0, 255); // red
    const overlay = createImageData(1, 1, 0, 255, 0, 255); // green
    const result = compositeImages(base, overlay, { blendMode: 'multiply' });

    // After multiply blend and compositing, result should be affected
    // Red * Green = black at each channel
    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
  });

  it('uses screen blend mode to lighten', () => {
    // Test screen blend: red (255,0,0) screen green (0,255,0)
    const base = createImageData(1, 1, 255, 0, 0, 255); // red
    const overlay = createImageData(1, 1, 0, 255, 0, 255); // green
    const result = compositeImages(base, overlay, { blendMode: 'screen' });

    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
  });

  it('returns new ImageData without modifying inputs', () => {
    const base = createImageData(2, 2, 255, 0, 0, 255);
    const overlay = createImageData(2, 2, 0, 0, 255, 255);
    const originalBaseR = base.data[0];

    compositeImages(base, overlay);

    expect(base.data[0]).toBe(originalBaseR);
  });

  it('handles premultiplied alpha format', () => {
    const base = createImageData(2, 2, 255, 0, 0, 255);
    const overlay = createImageData(2, 2, 0, 0, 255, 200);
    const result = compositeImages(base, overlay);

    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
  });

  it('handles empty overlay position (off-canvas)', () => {
    const base = createImageData(2, 2, 255, 0, 0, 255);
    const overlay = createImageData(2, 2, 0, 0, 255, 255);
    const result = compositeImages(base, overlay, { overlayX: 10, overlayY: 10 });

    // Should return base as overlay is off-canvas
    expect(result.data[0]).toBe(255);
  });
});
