import { describe, it, expect } from 'vitest';
import { imageDataToBlob, imageDataToDataUrl, exportImage } from '../src/export-image';
import { ImageData as CanvasImageData } from 'canvas';

type ImageData = globalThis.ImageData;

/** Create a 2x2 RGBA solid-color ImageData */
function makeImage(r = 255, g = 0, b = 0): ImageData {
  const data = new Uint8ClampedArray(2 * 2 * 4);
  for (let i = 0; i < 2 * 2; i++) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  return new CanvasImageData(data, 2, 2) as ImageData;
}

/** Create a 2x2 RGBA with transparent pixels for JPEG compositing tests */
function makeTransparentImage(): ImageData {
  const data = new Uint8ClampedArray(2 * 2 * 4);
  data[0] = 255; data[1] = 0; data[2] = 0; data[3] = 128;
  data[4] = 0; data[5] = 255; data[6] = 0; data[7] = 128;
  data[8] = 0; data[9] = 0; data[10] = 255; data[11] = 128;
  data[12] = 255; data[13] = 255; data[14] = 0; data[15] = 128;
  return new CanvasImageData(data, 2, 2) as ImageData;
}

describe('imageDataToBlob', () => {
  it('exports as PNG by default', async () => {
    const img = makeImage(255, 0, 0);
    const blob = await imageDataToBlob(img, {});
    expect(blob.type).toBe('image/png');
  });

  it('exports as JPEG when specified', async () => {
    const img = makeImage(255, 0, 0);
    const blob = await imageDataToBlob(img, { format: 'jpeg' });
    expect(blob.type).toBe('image/jpeg');
  });

  it('exports as WebP when specified', async () => {
    const img = makeImage(255, 0, 0);
    const blob = await imageDataToBlob(img, { format: 'webp' });
    expect(blob.type).toBe('image/webp');
  });

  it('accepts quality parameter', async () => {
    const img = makeImage(255, 0, 0);
    const blob = await imageDataToBlob(img, { format: 'jpeg', quality: 0.5 });
    expect(blob.type).toBe('image/jpeg');
    // Quality parameter is accepted and produces a non-zero blob
    expect(blob.size).toBeGreaterThan(0);
  });

  it('resizes when width/height provided', async () => {
    const img = makeImage(255, 0, 0);
    const blob = await imageDataToBlob(img, { width: 4, height: 4 });
    expect(blob.type).toBe('image/png');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('JPEG format handles transparent image without throwing', async () => {
    const transparent = makeTransparentImage();
    const blob = await imageDataToBlob(transparent, { format: 'jpeg' });
    expect(blob.type).toBe('image/jpeg');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('uses provided width when height is 0', async () => {
    const img = makeImage(0, 255, 0);
    const blob = await imageDataToBlob(img, { width: 4, height: 0 });
    expect(blob.type).toBe('image/png');
  });

  it('uses provided height when width is 0', async () => {
    const img = makeImage(0, 0, 255);
    const blob = await imageDataToBlob(img, { width: 0, height: 4 });
    expect(blob.type).toBe('image/png');
  });
});

describe('imageDataToDataUrl', () => {
  it('returns a string starting with data: URL', () => {
    const img = makeImage(0, 255, 0);
    const url = imageDataToDataUrl(img, {});
    expect(url.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('returns a JPEG data URL when format is jpeg', () => {
    const img = makeImage(0, 0, 255);
    const url = imageDataToDataUrl(img, { format: 'jpeg' });
    expect(url.startsWith('data:image/jpeg;base64,')).toBe(true);
  });
});

describe('exportImage', () => {
  it('returns blob, dataUrl, width, height, mimeType', async () => {
    const img = makeImage(255, 255, 0);
    const result = await exportImage(img, {});
    expect(result.blob.type).toBe('image/png');
    expect(result.dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
    expect(result.mimeType).toBe('image/png');
  });

  it('applies resize before exporting', async () => {
    const img = makeImage(255, 0, 0);
    const result = await exportImage(img, { width: 4, height: 4 });
    expect(result.width).toBe(4);
    expect(result.height).toBe(4);
  });

  it('returns correct mimeType for each format', async () => {
    const img = makeImage(0, 255, 255);
    const jpeg = await exportImage(img, { format: 'jpeg' });
    expect(jpeg.mimeType).toBe('image/jpeg');
    const webp = await exportImage(img, { format: 'webp' });
    expect(webp.mimeType).toBe('image/webp');
    const png = await exportImage(img, { format: 'png' });
    expect(png.mimeType).toBe('image/png');
  });

  it('JPEG export has correct mimeType and blob type', async () => {
    const img = makeImage(255, 0, 255);
    const result = await exportImage(img, { format: 'jpeg' });
    expect(result.mimeType).toBe('image/jpeg');
    expect(result.blob.type).toBe('image/jpeg');
  });
});
