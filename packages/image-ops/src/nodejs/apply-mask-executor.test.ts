import { describe, it, expect } from 'vitest';
import { applyMaskExecutor } from './apply-mask-executor';
import type { ApplyMaskExecutorOutput } from '@prism/shared-types';
import sharp from 'sharp';

async function createTestImageData(width: number, height: number): Promise<ImageData> {
  const buffer = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    buffer[i * 4] = 128;     // R
    buffer[i * 4 + 1] = 64;  // G
    buffer[i * 4 + 2] = 32;  // B
    buffer[i * 4 + 3] = 255; // A (fully opaque)
  }
  const sharpInstance = sharp(buffer, { raw: { width, height, channels: 4 } });
  return new ImageData(new Uint8ClampedArray(await sharpInstance.raw().toBuffer()), width, height);
}

async function createMaskData(width: number, height: number, fillValue: number = 255): Promise<ImageData> {
  const buffer = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    buffer[i * 4] = fillValue;     // R (mask uses grayscale)
    buffer[i * 4 + 1] = fillValue; // G
    buffer[i * 4 + 2] = fillValue; // B
    buffer[i * 4 + 3] = 255;       // A
  }
  const sharpInstance = sharp(buffer, { raw: { width, height, channels: 4 } });
  return new ImageData(new Uint8ClampedArray(await sharpInstance.raw().toBuffer()), width, height);
}

describe('nodejs apply-mask executor', () => {
  it('throws when image input is missing', async () => {
    const mask = await createMaskData(4, 4);
    await expect(
      applyMaskExecutor({ mask }, {}, {} as any)
    ).rejects.toThrow('image input (ImageData) is required');
  });

  it('throws when mask input is missing', async () => {
    const image = await createTestImageData(4, 4);
    await expect(
      applyMaskExecutor({ image }, {}, {} as any)
    ).rejects.toThrow('mask input (ImageData) is required');
  });

  it('applies alpha mask with default threshold', async () => {
    const image = await createTestImageData(4, 4);
    const mask = await createMaskData(4, 4, 255); // Full white mask

    const result = await applyMaskExecutor(
      { image, mask },
      {},
      {} as any
    ) as unknown as ApplyMaskExecutorOutput;

    expect(result.type).toBe('apply-mask');
    expect(result.width).toBe(4);
    expect(result.height).toBe(4);
    expect(result.image).toBeDefined();
    expect(result.previewUrl).toBeDefined();
  });

  it('applies alpha mask with threshold', async () => {
    const image = await createTestImageData(4, 4);
    const mask = await createMaskData(4, 4, 128); // Gray mask

    const result = await applyMaskExecutor(
      { image, mask },
      { threshold: 100 },
      {} as any
    ) as unknown as ApplyMaskExecutorOutput;

    expect(result.type).toBe('apply-mask');
    expect(result.width).toBe(4);
    expect(result.height).toBe(4);
  });

  it('applies brightness mask', async () => {
    const image = await createTestImageData(4, 4);
    const mask = await createMaskData(4, 4, 200);

    const result = await applyMaskExecutor(
      { image, mask },
      { maskType: 'brightness' },
      {} as any
    ) as unknown as ApplyMaskExecutorOutput;

    expect(result.type).toBe('apply-mask');
    expect(result.width).toBe(4);
    expect(result.height).toBe(4);
  });

  it('applies luminance mask', async () => {
    const image = await createTestImageData(4, 4);
    const mask = await createMaskData(4, 4, 180);

    const result = await applyMaskExecutor(
      { image, mask },
      { maskType: 'luminance' },
      {} as any
    ) as unknown as ApplyMaskExecutorOutput;

    expect(result.type).toBe('apply-mask');
    expect(result.width).toBe(4);
    expect(result.height).toBe(4);
  });

  it('inverts mask when invert is true', async () => {
    const image = await createTestImageData(4, 4);
    const mask = await createMaskData(4, 4, 255);

    const result = await applyMaskExecutor(
      { image, mask },
      { invert: true },
      {} as any
    ) as unknown as ApplyMaskExecutorOutput;

    expect(result.type).toBe('apply-mask');
    expect(result.width).toBe(4);
    expect(result.height).toBe(4);
  });

  it('handles different mask dimensions (resize via core/mask)', async () => {
    const image = await createTestImageData(8, 8);
    const mask = await createMaskData(4, 4, 200);

    const result = await applyMaskExecutor(
      { image, mask },
      {},
      {} as any
    ) as unknown as ApplyMaskExecutorOutput;

    expect(result.type).toBe('apply-mask');
    expect(result.width).toBe(8);
    expect(result.height).toBe(8);
  });

  it('returns valid previewUrl as data URI', async () => {
    const image = await createTestImageData(4, 4);
    const mask = await createMaskData(4, 4, 255);

    const result = await applyMaskExecutor(
      { image, mask },
      {},
      {} as any
    ) as unknown as ApplyMaskExecutorOutput;

    expect(result.previewUrl).toMatch(/^data:image\/png;base64,/);
    expect(result.image.previewUrl).toMatch(/^data:image\/png;base64,/);
  });

  it('pixel-level consistency for same inputs', async () => {
    const image = await createTestImageData(4, 4);
    const mask = await createMaskData(4, 4, 150);

    const result1 = await applyMaskExecutor({ image, mask }, { threshold: 128 }, {} as any);
    const result2 = await applyMaskExecutor({ image, mask }, { threshold: 128 }, {} as any);

    expect(result1.width).toBe(result2.width);
    expect(result1.height).toBe(result2.height);
  });
});
