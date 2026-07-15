/**
 * Transform algorithm unit tests.
 * Tests for core/transform/transform.ts - pure image transformation functions.
 */

import { describe, it, expect } from 'vitest';
import {
  flipHorizontal,
  flipVertical,
  cropImage,
  resizeImageData,
  rotateImage,
  transformImage,
} from './transform';

function createImageData(width: number, height: number, pattern: 'horizontal' | 'vertical' | 'checkerboard' = 'horizontal'): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (pattern === 'horizontal') {
        // Gradient: R = x position
        data[idx] = Math.round((x / Math.max(1, width - 1)) * 255);
        data[idx + 1] = Math.round((y / Math.max(1, height - 1)) * 255);
        data[idx + 2] = 0;
        data[idx + 3] = 255;
      } else if (pattern === 'vertical') {
        // Gradient: G = y position
        data[idx] = 0;
        data[idx + 1] = Math.round((y / Math.max(1, height - 1)) * 255);
        data[idx + 2] = Math.round((x / Math.max(1, width - 1)) * 255);
        data[idx + 3] = 255;
      } else {
        // Checkerboard: alternating black and white
        const isWhite = (x + y) % 2 === 0;
        const val = isWhite ? 255 : 0;
        data[idx] = val;
        data[idx + 1] = val;
        data[idx + 2] = val;
        data[idx + 3] = 255;
      }
    }
  }
  return new ImageData(data, width, height);
}

function getPixel(imageData: ImageData, x: number, y: number): [number, number, number, number] {
  const idx = (y * imageData.width + x) * 4;
  return [imageData.data[idx], imageData.data[idx + 1], imageData.data[idx + 2], imageData.data[idx + 3]];
}

function getAllPixels(imageData: ImageData): number[] {
  return Array.from(imageData.data);
}

describe('flipHorizontal', () => {
  it('flips a 3x1 image horizontally', () => {
    const image = createImageData(3, 1, 'horizontal');
    const result = flipHorizontal(image);

    expect(result.width).toBe(3);
    expect(result.height).toBe(1);

    // First pixel should move to last position
    const origFirst = getPixel(image, 0, 0);
    const newLast = getPixel(result, 2, 0);
    expect(newLast[0]).toBe(origFirst[0]); // R channel preserved
  });

  it('does not modify original image', () => {
    const image = createImageData(2, 2, 'horizontal');
    const originalData = getAllPixels(image);
    flipHorizontal(image);
    const afterData = getAllPixels(image);

    expect(afterData).toEqual(originalData);
  });

  it('handles 1x1 image', () => {
    const image = createImageData(1, 1, 'horizontal');
    const result = flipHorizontal(image);

    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
    const [r] = getPixel(image, 0, 0);
    const [r2] = getPixel(result, 0, 0);
    expect(r2).toBe(r);
  });
});

describe('flipVertical', () => {
  it('flips a 1x3 image vertically', () => {
    const image = createImageData(1, 3, 'vertical');
    const result = flipVertical(image);

    expect(result.width).toBe(1);
    expect(result.height).toBe(3);

    // Top pixel should move to bottom
    const origTop = getPixel(image, 0, 0);
    const newBottom = getPixel(result, 0, 2);
    expect(newBottom[1]).toBe(origTop[1]); // G channel preserved
  });

  it('does not modify original image', () => {
    const image = createImageData(2, 2, 'vertical');
    const originalData = getAllPixels(image);
    flipVertical(image);
    const afterData = getAllPixels(image);

    expect(afterData).toEqual(originalData);
  });
});

describe('cropImage', () => {
  it('crops a region from the center', () => {
    const image = createImageData(4, 4, 'checkerboard');
    const result = cropImage(image, 1, 1, 2, 2);

    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
  });

  it('returns same image when crop equals full dimensions', () => {
    const image = createImageData(3, 3, 'horizontal');
    const result = cropImage(image, 0, 0, 3, 3);

    expect(result.width).toBe(3);
    expect(result.height).toBe(3);
  });

  it('handles crop at origin', () => {
    const image = createImageData(4, 4, 'horizontal');
    const result = cropImage(image, 0, 0, 2, 2);

    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
    // First pixel should match original
    const [r] = getPixel(image, 0, 0);
    const [r2] = getPixel(result, 0, 0);
    expect(r2).toBe(r);
  });

  it('throws error when crop region exceeds bounds', () => {
    const image = createImageData(3, 3, 'horizontal');
    expect(() => cropImage(image, 0, 0, 10, 10)).toThrow('Crop region exceeds image bounds');
  });

  it('throws error when crop x coordinate is negative', () => {
    const image = createImageData(3, 3, 'horizontal');
    expect(() => cropImage(image, -1, 0, 2, 2)).toThrow('Crop region exceeds image bounds');
  });
});

describe('resizeImageData', () => {
  it('resizes 4x4 to 2x2', () => {
    const image = createImageData(4, 4, 'horizontal');
    const result = resizeImageData(image, 2, 2);

    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
  });

  it('resizes 2x2 to 4x4', () => {
    const image = createImageData(2, 2, 'horizontal');
    const result = resizeImageData(image, 4, 4);

    expect(result.width).toBe(4);
    expect(result.height).toBe(4);
  });

  it('returns same size if dimensions match', () => {
    const image = createImageData(3, 3, 'horizontal');
    const result = resizeImageData(image, 3, 3);

    expect(result.width).toBe(3);
    expect(result.height).toBe(3);
  });

  it('handles 1x1 to 1x1', () => {
    const image = createImageData(1, 1, 'horizontal');
    const result = resizeImageData(image, 1, 1);

    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
  });
});

describe('rotateImage', () => {
  it('rotates 90 degrees clockwise', () => {
    const image = createImageData(2, 3, 'horizontal');
    const result = rotateImage(image, 90);

    expect(result.width).toBe(3);
    expect(result.height).toBe(2);
  });

  it('rotates 180 degrees', () => {
    const image = createImageData(3, 2, 'horizontal');
    const result = rotateImage(image, 180);

    expect(result.width).toBe(3);
    expect(result.height).toBe(2);
  });

  it('rotates 270 degrees (90 counter-clockwise)', () => {
    const image = createImageData(3, 2, 'vertical');
    const result = rotateImage(image, 270);

    expect(result.width).toBe(2);
    expect(result.height).toBe(3);
  });

  it('supports negative rotation (-90 degrees)', () => {
    const image = createImageData(2, 3, 'horizontal');
    const result = rotateImage(image, -90);

    // -90 degrees maps to 270 (counter-clockwise), so result is 3x2
    expect(result.width).toBe(3);
    expect(result.height).toBe(2);
  });

  it('throws error for 0 degrees (not a 90-degree increment)', () => {
    const image = createImageData(2, 2, 'checkerboard');
    expect(() => rotateImage(image, 0)).toThrow('Pure rotation only supports 90-degree increments');
  });

  it('throws error for 360 degrees (not a 90-degree increment)', () => {
    const image = createImageData(2, 2, 'horizontal');
    expect(() => rotateImage(image, 360)).toThrow('Pure rotation only supports 90-degree increments');
  });

  it('throws error for arbitrary angles', () => {
    const image = createImageData(2, 2, 'horizontal');
    expect(() => rotateImage(image, 45)).toThrow('Pure rotation only supports 90-degree increments');
  });
});

describe('transformImage', () => {
  it('applies identity transform', () => {
    const image = createImageData(3, 3, 'horizontal');
    const result = transformImage(image, {});

    expect(result.width).toBe(3);
    expect(result.height).toBe(3);
  });

  it('applies crop transform', () => {
    const image = createImageData(4, 4, 'horizontal');
    const result = transformImage(image, { cropX: 1, cropY: 1, cropWidth: 2, cropHeight: 2 });

    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
  });

  it('applies scale transform', () => {
    const image = createImageData(2, 2, 'horizontal');
    const result = transformImage(image, { scaleX: 2, scaleY: 2 });

    expect(result.width).toBe(4);
    expect(result.height).toBe(4);
  });

  it('applies rotation transform (90 degrees)', () => {
    const image = createImageData(2, 3, 'vertical');
    const result = transformImage(image, { rotation: 90 });

    expect(result.width).toBe(3);
    expect(result.height).toBe(2);
  });

  it('combines multiple transforms', () => {
    const image = createImageData(4, 4, 'checkerboard');
    const result = transformImage(image, {
      scaleX: 0.5,
      scaleY: 0.5,
      rotation: 180,
    });

    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
  });

  it('handles empty options', () => {
    const image = createImageData(3, 3, 'horizontal');
    const result = transformImage(image);

    expect(result.width).toBe(3);
    expect(result.height).toBe(3);
  });
});
