import { describe, it, expect } from 'vitest';
import { transformExecutor } from './transform-executor';
import type { TransformExecutorOutput } from '@prism/shared-types';
import sharp from 'sharp';

async function createTestImageData(width: number, height: number): Promise<import('@prism/shared-types').ImageData> {
  const buffer = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    buffer[i * 4] = 128;     // R
    buffer[i * 4 + 1] = 64;  // G
    buffer[i * 4 + 2] = 32;  // B
    buffer[i * 4 + 3] = 255; // A
  }
  const sharpInstance = sharp(buffer, { raw: { width, height, channels: 4 } });
  return new ImageData(new Uint8ClampedArray(await sharpInstance.raw().toBuffer()), width, height);
}

describe('nodejs transform executor', () => {
  it('throws when image input is missing', async () => {
    await expect(
      transformExecutor({}, {}, {} as any)
    ).rejects.toThrow('image input (ImageData) is required');
  });

  it('applies identity transform (no changes)', async () => {
    const imageData = await createTestImageData(4, 4);

    const result = await transformExecutor(
      { image: imageData },
      {},
      {} as any
    ) as unknown as TransformExecutorOutput;

    expect(result.type).toBe('transform');
    expect(result.width).toBe(4);
    expect(result.height).toBe(4);
    expect(result.image).toBeDefined();
    expect(result.previewUrl).toBeDefined();
  });

  it('applies scale transform', async () => {
    const imageData = await createTestImageData(4, 4);

    const result = await transformExecutor(
      { image: imageData },
      { scaleX: 2, scaleY: 2 },
      {} as any
    ) as unknown as TransformExecutorOutput;

    expect(result.type).toBe('transform');
    expect(result.width).toBe(8);  // 4 * 2
    expect(result.height).toBe(8); // 4 * 2
  });

  it('applies crop transform', async () => {
    const imageData = await createTestImageData(8, 8);

    const result = await transformExecutor(
      { image: imageData },
      { cropX: 2, cropY: 2, cropWidth: 4, cropHeight: 4 },
      {} as any
    ) as unknown as TransformExecutorOutput;

    expect(result.type).toBe('transform');
    expect(result.width).toBe(4);
    expect(result.height).toBe(4);
  });

  it('applies rotation transform', async () => {
    const imageData = await createTestImageData(4, 4);

    const result = await transformExecutor(
      { image: imageData },
      { rotation: 90 },
      {} as any
    ) as unknown as TransformExecutorOutput;

    expect(result.type).toBe('transform');
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });

  it('applies combined transform (scale + crop + rotate)', async () => {
    const imageData = await createTestImageData(8, 8);

    const result = await transformExecutor(
      { image: imageData },
      {
        scaleX: 0.5,
        scaleY: 0.5,
        cropX: 0,
        cropY: 0,
        cropWidth: 4,
        cropHeight: 4,
        rotation: 180,
      },
      {} as any
    ) as unknown as TransformExecutorOutput;

    expect(result.type).toBe('transform');
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });

  it('returns valid previewUrl as data URI', async () => {
    const imageData = await createTestImageData(4, 4);

    const result = await transformExecutor(
      { image: imageData },
      {},
      {} as any
    ) as unknown as TransformExecutorOutput;

    expect(result.previewUrl).toMatch(/^data:image\/png;base64,/);
    expect(result.image.previewUrl).toMatch(/^data:image\/png;base64,/);
  });

  it('handles negative translation values', async () => {
    const imageData = await createTestImageData(4, 4);

    const result = await transformExecutor(
      { image: imageData },
      { translateX: -10, translateY: -10 },
      {} as any
    ) as unknown as TransformExecutorOutput;

    expect(result.type).toBe('transform');
    expect(result.width).toBe(4);
    expect(result.height).toBe(4);
  });
});
