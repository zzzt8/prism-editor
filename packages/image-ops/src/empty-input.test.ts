import { describe, it, expect } from 'vitest';
import { parseColor } from '../src/empty-input';
import { ImageData as CanvasImageData } from 'canvas';

import type { ImageData } from '@prism/shared-types';

/** Create a test ImageData with specified RGBA */
function makeImage(
  width = 2,
  height = 2,
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

describe('parseColor', () => {
  describe('T3.1: rgba format parsing', () => {
    it('rgba(255, 0, 0, 0) -> alpha=0', () => {
      const result = parseColor('rgba(255, 0, 0, 0)');
      expect(result.r).toBe(255);
      expect(result.g).toBe(0);
      expect(result.b).toBe(0);
      expect(result.alpha).toBe(0);
    });

    it('rgba(255, 0, 0, 1) -> alpha=255', () => {
      const result = parseColor('rgba(255, 0, 0, 1)');
      expect(result.r).toBe(255);
      expect(result.g).toBe(0);
      expect(result.b).toBe(0);
      expect(result.alpha).toBe(255);
    });

    it('rgba(255, 0, 0, 0.5) -> alpha≈128', () => {
      const result = parseColor('rgba(255, 0, 0, 0.5)');
      expect(result.r).toBe(255);
      expect(result.g).toBe(0);
      expect(result.b).toBe(0);
      expect(result.alpha).toBe(128);
    });

    it('rgba(255, 0, 0, 0.75) -> alpha≈191', () => {
      const result = parseColor('rgba(255, 0, 0, 0.75)');
      expect(result.r).toBe(255);
      expect(result.g).toBe(0);
      expect(result.b).toBe(0);
      expect(result.alpha).toBe(191);
    });

    it('rgba with spaces handles correctly', () => {
      const result = parseColor('rgba( 100 , 150 , 200 , 0.5 )');
      expect(result.r).toBe(100);
      expect(result.g).toBe(150);
      expect(result.b).toBe(200);
      expect(result.alpha).toBe(128);
    });
  });

  describe('T3.4: compatibility with existing formats', () => {
    it('#ffffff -> alpha=255 (fully opaque)', () => {
      const result = parseColor('#ffffff');
      expect(result.r).toBe(255);
      expect(result.g).toBe(255);
      expect(result.b).toBe(255);
      expect(result.alpha).toBe(255);
    });

    it('#fff -> alpha=255 (shorthand)', () => {
      const result = parseColor('#fff');
      expect(result.r).toBe(255);
      expect(result.g).toBe(255);
      expect(result.b).toBe(255);
      expect(result.alpha).toBe(255);
    });

    it('#000000 -> alpha=255', () => {
      const result = parseColor('#000000');
      expect(result.r).toBe(0);
      expect(result.g).toBe(0);
      expect(result.b).toBe(0);
      expect(result.alpha).toBe(255);
    });

    it('rgb(255, 255, 255) -> alpha=255', () => {
      const result = parseColor('rgb(255, 255, 255)');
      expect(result.r).toBe(255);
      expect(result.g).toBe(255);
      expect(result.b).toBe(255);
      expect(result.alpha).toBe(255);
    });

    it('rgb(0, 0, 0) -> alpha=255', () => {
      const result = parseColor('rgb(0, 0, 0)');
      expect(result.r).toBe(0);
      expect(result.g).toBe(0);
      expect(result.b).toBe(0);
      expect(result.alpha).toBe(255);
    });
  });

  describe('T3.5: error format fallback', () => {
    it('invalid rgba falls back to #ffffff', () => {
      const result = parseColor('not-a-color');
      expect(result.r).toBe(255);
      expect(result.g).toBe(255);
      expect(result.b).toBe(255);
      expect(result.alpha).toBe(255);
    });

    it('empty string falls back to #ffffff', () => {
      const result = parseColor('');
      expect(result.r).toBe(255);
      expect(result.g).toBe(255);
      expect(result.b).toBe(255);
      expect(result.alpha).toBe(255);
    });
  });
});

describe('emptyInputExecutor image generation', () => {
  const mockCtx = { workflowId: 'test', nodeId: 'test', inputs: {}, params: {}, imageRefs: new Map(), results: new Map(), progress: null as any };

  describe('T3.2: transparent image generation', () => {
    it('rgba(100, 150, 200, 0) generates fully transparent image', async () => {
      const { emptyInputExecutor } = await import('../src/empty-input');
      const result = await emptyInputExecutor(
        {},
        { width: 2, height: 2, backgroundColor: 'rgba(100, 150, 200, 0)' },
        mockCtx
      ) as { image: { data: ImageData } };

      const img = result.image.data;
      expect(img.data[0]).toBe(100);
      expect(img.data[1]).toBe(150);
      expect(img.data[2]).toBe(200);
      expect(img.data[3]).toBe(0);
      // All pixels should be transparent
      for (let i = 3; i < img.data.length; i += 4) {
        expect(img.data[i]).toBe(0);
      }
    });
  });

  describe('T3.3: fully opaque image', () => {
    it('rgba(100, 150, 200, 1) generates alpha=255', async () => {
      const { emptyInputExecutor } = await import('../src/empty-input');
      const result = await emptyInputExecutor(
        {},
        { width: 2, height: 2, backgroundColor: 'rgba(100, 150, 200, 1)' },
        mockCtx
      ) as { image: { data: ImageData } };

      const img = result.image.data;
      expect(img.data[3]).toBe(255);
      for (let i = 3; i < img.data.length; i += 4) {
        expect(img.data[i]).toBe(255);
      }
    });
  });

  describe('T3.4: compatibility with existing formats', () => {
    it('#ffffff generates fully opaque white image', async () => {
      const { emptyInputExecutor } = await import('../src/empty-input');
      const result = await emptyInputExecutor(
        {},
        { width: 2, height: 2, backgroundColor: '#ffffff' },
        mockCtx
      ) as { image: { data: ImageData } };

      const img = result.image.data;
      expect(img.data[0]).toBe(255);
      expect(img.data[1]).toBe(255);
      expect(img.data[2]).toBe(255);
      expect(img.data[3]).toBe(255);
    });

    it('rgb(255, 0, 0) generates fully opaque red image', async () => {
      const { emptyInputExecutor } = await import('../src/empty-input');
      const result = await emptyInputExecutor(
        {},
        { width: 2, height: 2, backgroundColor: 'rgb(255, 0, 0)' },
        mockCtx
      ) as { image: { data: ImageData } };

      const img = result.image.data;
      expect(img.data[0]).toBe(255);
      expect(img.data[1]).toBe(0);
      expect(img.data[2]).toBe(0);
      expect(img.data[3]).toBe(255);
    });

    it('default background is #ffffff (fully opaque)', async () => {
      const { emptyInputExecutor } = await import('../src/empty-input');
      const result = await emptyInputExecutor(
        {},
        { width: 2, height: 2 },
        mockCtx
      ) as { image: { data: ImageData } };

      const img = result.image.data;
      expect(img.data[3]).toBe(255);
    });
  });
});
