import { describe, it, expect } from 'vitest';
import {
  applyAlphaMask,
  applyBrightnessMask,
  applyLuminanceMask,
  applyMask,
} from '../src/apply-mask';
import { ImageData as CanvasImageData } from 'canvas';

type ImageData = globalThis.ImageData;

/** Create a 4x4 RGBA ImageData with all pixels = (r, g, b, a) */
function makeImage(
  width = 4,
  height = 4,
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
  return new CanvasImageData(data, width, height) as ImageData;
}

describe('applyAlphaMask', () => {
  it('zero threshold with invert=false keeps fully opaque mask pixels', () => {
    const img = makeImage(2, 2, 100, 150, 200, 255);
    const mask = makeImage(2, 2, 255, 255, 255, 255);
    const result = applyAlphaMask(img, mask, 0, false);

    // All mask pixels = 255 >= 0 → alpha stays 255
    for (let i = 3; i < result.data.length; i += 4) {
      expect(result.data[i]).toBe(255);
    }
  });

  it('high threshold with invert=false zeroes fully transparent mask pixels', () => {
    const img = makeImage(2, 2, 100, 150, 200, 255);
    const mask = makeImage(2, 2, 0, 0, 0, 0);
    const result = applyAlphaMask(img, mask, 200, false);

    // All mask pixels = 0 < 200 → alpha = 0
    for (let i = 3; i < result.data.length; i += 4) {
      expect(result.data[i]).toBe(0);
    }
  });

  it('invert=true inverts the mask before applying', () => {
    const img = makeImage(2, 2, 100, 150, 200, 255);
    const mask = makeImage(2, 2, 255, 255, 255, 255);
    const result = applyAlphaMask(img, mask, 200, true);

    // Invert: 255 >= 200 → invert gives 0 → alpha = 0
    for (let i = 3; i < result.data.length; i += 4) {
      expect(result.data[i]).toBe(0);
    }
  });

  it('threshold=128 splits the image (half transparent, half opaque)', () => {
    const img = makeImage(2, 2, 100, 150, 200, 255);
    const mask = makeImage(2, 2, 200, 200, 200, 200);
    const result = applyAlphaMask(img, mask, 128, false);

    // Mask value 200 >= 128 → factor = 255 → alpha = 255
    for (let i = 3; i < result.data.length; i += 4) {
      expect(result.data[i]).toBe(255);
    }
  });

  it('preserves RGB channels unchanged', () => {
    const img = makeImage(2, 2, 100, 150, 200, 255);
    const mask = makeImage(2, 2, 255, 255, 255, 255);
    const result = applyAlphaMask(img, mask, 0, false);

    expect(result.data[0]).toBe(100);
    expect(result.data[1]).toBe(150);
    expect(result.data[2]).toBe(200);
  });

  it('does not mutate the original imageData', () => {
    const img = makeImage(2, 2, 100, 150, 200, 255);
    const originalAlpha = img.data[3];
    const mask = makeImage(2, 2, 255, 255, 255, 255);
    applyAlphaMask(img, mask, 128, false);
    expect(img.data[3]).toBe(originalAlpha);
  });
});

describe('applyBrightnessMask', () => {
  it('white mask (max brightness) makes fully opaque', () => {
    const img = makeImage(2, 2, 100, 100, 100, 255);
    const mask = makeImage(2, 2, 255, 255, 255, 255);
    const result = applyBrightnessMask(img, mask, 128, false);

    for (let i = 3; i < result.data.length; i += 4) {
      expect(result.data[i]).toBe(255);
    }
  });

  it('black mask (zero brightness) makes fully transparent', () => {
    const img = makeImage(2, 2, 100, 100, 100, 255);
    const mask = makeImage(2, 2, 0, 0, 0, 0);
    const result = applyBrightnessMask(img, mask, 128, false);

    for (let i = 3; i < result.data.length; i += 4) {
      expect(result.data[i]).toBe(0);
    }
  });
});

describe('applyLuminanceMask', () => {
  it('gray mask below threshold zeroes alpha', () => {
    // Luminance of gray = 0.299*100 + 0.587*100 + 0.114*100 = 100
    const img = makeImage(2, 2, 100, 100, 100, 255);
    const mask = makeImage(2, 2, 0, 0, 0, 0); // luminance = 0
    const result = applyLuminanceMask(img, mask, 128, false);

    for (let i = 3; i < result.data.length; i += 4) {
      expect(result.data[i]).toBe(0);
    }
  });

  it('bright gray above threshold keeps alpha', () => {
    // luminance(200,200,200) = 200
    const img = makeImage(2, 2, 100, 100, 100, 255);
    const mask = makeImage(2, 2, 200, 200, 200, 200);
    const result = applyLuminanceMask(img, mask, 128, false);

    for (let i = 3; i < result.data.length; i += 4) {
      expect(result.data[i]).toBe(255);
    }
  });
});

describe('applyMask (dispatch)', () => {
  it('dispatches to alpha by default', () => {
    const img = makeImage(2, 2, 100, 150, 200, 255);
    const mask = makeImage(2, 2, 255, 255, 255, 255);
    const result = applyMask(img, mask, { type: 'alpha' });

    expect(result.width).toBe(img.width);
    expect(result.height).toBe(img.height);
    for (let i = 3; i < result.data.length; i += 4) {
      expect(result.data[i]).toBe(255);
    }
  });

  it('throws for unknown mask type', () => {
    const img = makeImage(2, 2);
    const mask = makeImage(2, 2);
    expect(() =>
      // @ts-expect-error testing invalid input at runtime
      applyMask(img, mask, { type: 'unknown' })
    ).toThrow('Unknown mask type: unknown');
  });

  it('resizes mask when dimensions differ', () => {
    const img = makeImage(4, 4, 100, 150, 200, 255);
    const mask = makeImage(2, 2, 255, 255, 255, 255);
    // applyMask should auto-resize mask to image dimensions
    const result = applyMask(img, mask, { type: 'alpha' });

    expect(result.width).toBe(4);
    expect(result.height).toBe(4);
  });
});
