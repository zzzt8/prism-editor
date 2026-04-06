import { describe, it, expect, beforeEach } from 'vitest';
import { ImageData as CanvasImageData } from 'canvas';
import {
  eagerPreviewStrategy,
  lazyPreviewStrategy,
  generatePreviewUrl,
  createPreviewStrategy,
  type PreviewRef,
} from '../src/preview-strategy';

type ImageData = globalThis.ImageData;

/** Create a test ImageData with specified dimensions and pixel color */
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

describe('PreviewStrategy — TC-1: LazyPreviewStrategy generates data URL', () => {
  it('returns a PreviewRef with url starting with "data:"', async () => {
    const imageData = makeImage(4, 4);
    const result = await lazyPreviewStrategy.generatePreview(imageData, 4, 4);

    expect(result).toBeDefined();
    expect(typeof result.url).toBe('string');
    expect(result.url.startsWith('data:')).toBe(true);
  });

  it('returns a PreviewRef with png mime type', async () => {
    const imageData = makeImage(4, 4);
    const result = await lazyPreviewStrategy.generatePreview(imageData, 4, 4);

    expect(result.url).toMatch(/^data:image\/png;/);
  });

  it('cleanup is undefined (data URLs are self-contained)', async () => {
    const imageData = makeImage(4, 4);
    const result = await lazyPreviewStrategy.generatePreview(imageData, 4, 4);

    expect(result.cleanup).toBeUndefined();
  });

  it('handles different dimensions correctly', async () => {
    const imageData = makeImage(16, 16);
    const result = await lazyPreviewStrategy.generatePreview(imageData, 16, 16);

    expect(result.url.startsWith('data:image/png;')).toBe(true);
  });
});

describe('PreviewStrategy — TC-2: EagerPreviewStrategy generates blob URL', () => {
  it('returns a PreviewRef with url', async () => {
    const imageData = makeImage(4, 4);
    const result = await eagerPreviewStrategy.generatePreview(imageData, 4, 4);

    expect(result).toBeDefined();
    expect(typeof result.url).toBe('string');
    expect(result.url.length).toBeGreaterThan(0);
  });

  it('cleanup is a function', async () => {
    const imageData = makeImage(4, 4);
    const result = await eagerPreviewStrategy.generatePreview(imageData, 4, 4);

    expect(typeof result.cleanup).toBe('function');
  });

  it('cleanup can be called without throwing', async () => {
    const imageData = makeImage(4, 4);
    const result = await eagerPreviewStrategy.generatePreview(imageData, 4, 4);

    expect(() => result.cleanup?.()).not.toThrow();
  });

  it('handles different dimensions correctly', async () => {
    const imageData = makeImage(16, 16);
    const result = await eagerPreviewStrategy.generatePreview(imageData, 16, 16);

    expect(result.url.length).toBeGreaterThan(0);
    expect(typeof result.cleanup).toBe('function');
  });
});

describe('PreviewStrategy — TC-3: LazyPreview vs EagerPreview comparison', () => {
  it('both strategies return valid URLs', async () => {
    const imageData = makeImage(4, 4);

    const lazyResult = await lazyPreviewStrategy.generatePreview(imageData, 4, 4);
    const eagerResult = await eagerPreviewStrategy.generatePreview(imageData, 4, 4);

    expect(lazyResult.url.length).toBeGreaterThan(0);
    expect(eagerResult.url.length).toBeGreaterThan(0);
  });

  it('lazy URL starts with "data:", eager URL is a blob URL', async () => {
    const imageData = makeImage(4, 4);

    const lazyResult = await lazyPreviewStrategy.generatePreview(imageData, 4, 4);
    const eagerResult = await eagerPreviewStrategy.generatePreview(imageData, 4, 4);

    expect(lazyResult.url.startsWith('data:')).toBe(true);
    // In test environment, createObjectURL returns 'blob:test-shim'
    expect(eagerResult.url.startsWith('blob:')).toBe(true);
  });

  it('lazy strategy has no cleanup, eager strategy has cleanup', async () => {
    const imageData = makeImage(4, 4);

    const lazyResult = await lazyPreviewStrategy.generatePreview(imageData, 4, 4);
    const eagerResult = await eagerPreviewStrategy.generatePreview(imageData, 4, 4);

    expect(lazyResult.cleanup).toBeUndefined();
    expect(typeof eagerResult.cleanup).toBe('function');
  });

  it('generatePreviewUrl defaults to lazy mode', async () => {
    const imageData = makeImage(4, 4);
    const result = await generatePreviewUrl(imageData, 4, 4);

    expect(result.url.startsWith('data:')).toBe(true);
  });

  it('generatePreviewUrl with eager mode returns blob URL', async () => {
    const imageData = makeImage(4, 4);
    const result = await generatePreviewUrl(imageData, 4, 4, 'eager');

    expect(result.url.startsWith('blob:')).toBe(true);
    expect(typeof result.cleanup).toBe('function');
  });

  it('createPreviewStrategy returns correct strategy instance', () => {
    const lazyStrategy = createPreviewStrategy('lazy');
    const eagerStrategy = createPreviewStrategy('eager');

    expect(lazyStrategy).toBe(lazyPreviewStrategy);
    expect(eagerStrategy).toBe(eagerPreviewStrategy);
  });
});
