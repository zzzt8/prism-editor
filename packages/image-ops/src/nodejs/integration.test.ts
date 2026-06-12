/**
 * Node.js executor smoke tests - verifies executors can be imported and called directly.
 */

import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import type { ImageData } from '@prism/shared-types';
import { emptyInputExecutor } from './empty-input-executor';
import { loadImageExecutor } from './load-image-executor';
import { transformExecutor } from './transform-executor';

async function createTestImage(width: number, height: number, r: number, g: number, b: number): Promise<string> {
  const buffer = await sharp({
    create: { width, height, channels: 4, background: { r, g, b, alpha: 1 } },
  }).png().toBuffer();
  return buffer.toString('base64');
}

// Mock execution context
const mockCtx = {} as any;

describe('Node.js Executor Smoke Tests', () => {
  describe('emptyInputExecutor', () => {
    it('generates a blank canvas with specified dimensions and color', async () => {
      const result = await emptyInputExecutor({}, { width: 200, height: 100, backgroundColor: '#ff0000' }, mockCtx);

      expect(result.type).toBe('empty-input');
      expect(result.width).toBe(200);
      expect(result.height).toBe(100);
      expect((result.image as any).width).toBe(200);
      expect((result.image as any).height).toBe(100);
      expect(result.previewUrl).toContain('data:image/png;base64,');
    });

    it('handles default parameters', async () => {
      const result = await emptyInputExecutor({}, {}, mockCtx);

      expect(result.type).toBe('empty-input');
      expect(result.width).toBe(512);
      expect(result.height).toBe(512);
    });

    it('parses rgb color format', async () => {
      const result = await emptyInputExecutor({}, { width: 10, height: 10, backgroundColor: 'rgb(0, 128, 255)' }, mockCtx);

      expect(result.type).toBe('empty-input');
      expect(result.width).toBe(10);
      expect(result.height).toBe(10);
    });
  });

  describe('loadImageExecutor', () => {
    it('loads an image from base64 buffer', async () => {
      const base64 = await createTestImage(100, 50, 255, 0, 0);

      const result = await loadImageExecutor({}, { buffer: base64 }, mockCtx);

      expect(result.type).toBe('load-image');
      expect(result.width).toBe(100);
      expect(result.height).toBe(50);
      expect((result.image as any).width).toBe(100);
      expect((result.image as any).height).toBe(50);
      expect(result.previewUrl).toContain('data:image/png;base64,');
    });

    it('loads an image from data URL', async () => {
      const base64 = await createTestImage(80, 60, 0, 255, 0);
      const dataUrl = `data:image/png;base64,${base64}`;

      const result = await loadImageExecutor({}, { dataUrl }, mockCtx);

      expect(result.type).toBe('load-image');
      expect(result.width).toBe(80);
      expect(result.height).toBe(60);
    });

    it('throws when no source is provided', async () => {
      await expect(loadImageExecutor({}, {}, mockCtx)).rejects.toThrow();
    });
  });

  describe('transformExecutor', () => {
    it('scales an image', async () => {
      const base64 = await createTestImage(100, 100, 255, 0, 0);

      const loadResult = await loadImageExecutor({}, { buffer: base64 }, mockCtx);
      const imageData = (loadResult.image as any).data as ImageData;

      const result = await transformExecutor(
        { image: imageData },
        { scaleX: 2, scaleY: 2 },
        mockCtx
      );

      expect(result.type).toBe('transform');
      expect(result.width).toBe(200);
      expect(result.height).toBe(200);
    });

    it('rotates an image', async () => {
      const base64 = await createTestImage(100, 50, 0, 0, 255);

      const loadResult = await loadImageExecutor({}, { buffer: base64 }, mockCtx);
      const imageData = (loadResult.image as any).data as ImageData;

      const result = await transformExecutor(
        { image: imageData },
        { rotation: 90 },
        mockCtx
      );

      expect(result.type).toBe('transform');
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
    });

    it('handles identity transform (no changes)', async () => {
      const base64 = await createTestImage(50, 50, 128, 128, 128);

      const loadResult = await loadImageExecutor({}, { buffer: base64 }, mockCtx);
      const imageData = (loadResult.image as any).data as ImageData;

      const result = await transformExecutor(
        { image: imageData },
        {},
        mockCtx
      );

      expect(result.type).toBe('transform');
      expect(result.width).toBe(50);
      expect(result.height).toBe(50);
    });

    it('throws when no image input is provided', async () => {
      await expect(transformExecutor({}, {}, mockCtx)).rejects.toThrow();
    });
  });
});
