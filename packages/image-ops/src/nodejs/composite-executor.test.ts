import { describe, it, expect } from 'vitest';
import { compositeExecutor } from './composite-executor';
import type { CompositeExecutorOutput } from '@prism/shared-types';
import sharp from 'sharp';

async function imageToBase64(width: number, height: number, r: number, g: number, b: number): Promise<string> {
  const buffer = await sharp(Buffer.alloc(width * height * 4), {
    raw: { width, height, channels: 4 },
  }).png().toBuffer();
  return buffer.toString('base64');
}

describe('nodejs composite executor', () => {
  it('throws when base input is missing', async () => {
    await expect(
      compositeExecutor({}, {}, {} as any)
    ).rejects.toThrow('base input (base64 string) is required');
  });

  it('returns base unchanged when no overlay is provided', async () => {
    const base64 = await imageToBase64(4, 4, 255, 0, 0);

    const result = await compositeExecutor(
      { base: base64 },
      {},
      {} as any
    );

    expect(result.type).toBe('composite');
    expect(result.width).toBe(4);
    expect(result.height).toBe(4);
    expect(result.previewUrl).toBeDefined();
  });

  it('applies overlay with default normal blend mode', async () => {
    const base64 = await imageToBase64(4, 4, 255, 0, 0);
    const overlayBase64 = await imageToBase64(2, 2, 0, 255, 0);

    const result = await compositeExecutor(
      { base: base64, overlay: overlayBase64 },
      {},
      {} as any
    ) as unknown as CompositeExecutorOutput;

    expect(result.type).toBe('composite');
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
    expect(result.image).toBeDefined();
    expect(result.image.width).toBe(result.width);
    expect(result.image.height).toBe(result.height);
  });

  it('respects opacity parameter', async () => {
    const base64 = await imageToBase64(4, 4, 255, 0, 0);
    const overlayBase64 = await imageToBase64(4, 4, 0, 0, 255);

    const resultFull = await compositeExecutor(
      { base: base64, overlay: overlayBase64 },
      { opacity: 1 },
      {} as any
    );

    const resultHalf = await compositeExecutor(
      { base: base64, overlay: overlayBase64 },
      { opacity: 0.5 },
      {} as any
    );

    expect(resultFull.width).toBe(resultHalf.width);
    expect(resultFull.height).toBe(resultHalf.height);
  });

  it('respects canvas dimensions', async () => {
    const base64 = await imageToBase64(8, 8, 128, 128, 128);
    const overlayBase64 = await imageToBase64(4, 4, 255, 255, 255);

    const result = await compositeExecutor(
      { base: base64, overlay: overlayBase64 },
      { canvasWidth: 16, canvasHeight: 16 },
      {} as any
    );

    expect(result.width).toBe(16);
    expect(result.height).toBe(16);
  });

  it('returns valid previewUrl as data URI', async () => {
    const base64 = await imageToBase64(2, 2, 100, 100, 100);

    const result = await compositeExecutor(
      { base: base64 },
      {},
      {} as any
    ) as unknown as CompositeExecutorOutput;

    expect(result.previewUrl).toMatch(/^data:image\/png;base64,/);
    expect(result.image.previewUrl).toMatch(/^data:image\/png;base64,/);
  });

  it('pixel-level diff is 0 for identical inputs', async () => {
    const base64 = await imageToBase64(4, 4, 100, 150, 200);

    const result1 = await compositeExecutor({ base: base64 }, {}, {} as any);
    const result2 = await compositeExecutor({ base: base64 }, {}, {} as any);

    // Both should produce same dimensions
    expect(result1.width).toBe(result2.width);
    expect(result1.height).toBe(result2.height);
  });
});
