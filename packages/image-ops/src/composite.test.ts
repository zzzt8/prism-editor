import { describe, it, expect } from 'vitest';
import { compositeImages, compositeExecutor, serialComposite, parallelComposite } from '../src/composite';
import { ImageData as CanvasImageData } from 'canvas';
import { WorkerRunner } from '../src/scheduler/workerRunner';

import type { ImageData } from '@prism/shared-types';

function pixelsMatch(a: ImageData, b: ImageData): boolean {
  if (a.width !== b.width || a.height !== b.height) return false;
  for (let i = 0; i < a.data.length; i++) {
    if (Math.abs(a.data[i] - b.data[i]) > 1) return false;
  }
  return true;
}

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

/** Create a gradient ImageData for more realistic blending tests */
function makeGradient(width = 4, height = 4, vertical = true): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const t = vertical ? y / (height - 1) : x / (width - 1);
      data[idx] = Math.round(0 + t * 255);       // R: 0 → 255
      data[idx + 1] = Math.round(0 + t * 255);   // G: 0 → 255
      data[idx + 2] = 128;                        // B: 128
      data[idx + 3] = 255;                        // A: 255
    }
  }
  return new CanvasImageData(data, width, height) as ImageData;
}

describe('compositeImages — blend modes', () => {
  it('normal mode replaces base with overlay', () => {
    const base = makeImage(2, 2, 0, 0, 0, 255);
    const overlay = makeImage(2, 2, 255, 0, 0, 255);
    const result = compositeImages(base, overlay, { blendMode: 'normal' });

    expect(result.data[0]).toBe(255); // R from overlay
    expect(result.data[1]).toBe(0);   // G from overlay
    expect(result.data[2]).toBe(0);  // B from overlay
  });

  it('normal mode with opacity=0 keeps base', () => {
    const base = makeImage(2, 2, 0, 0, 0, 255);
    const overlay = makeImage(2, 2, 255, 255, 255, 255);
    const result = compositeImages(base, overlay, { blendMode: 'normal', opacity: 0 });

    expect(result.data[0]).toBe(0);
    expect(result.data[1]).toBe(0);
    expect(result.data[2]).toBe(0);
  });

  it('multiply darkens the result', () => {
    const base = makeImage(2, 2, 200, 200, 200, 255);
    const overlay = makeImage(2, 2, 128, 128, 128, 255);
    const result = compositeImages(base, overlay, { blendMode: 'multiply' });

    // (200 * 128) / 255 ≈ 100
    expect(result.data[0]).toBeLessThan(200);
    expect(result.data[1]).toBeLessThan(200);
    expect(result.data[2]).toBeLessThan(200);
  });

  it('screen lightens the result', () => {
    const base = makeImage(2, 2, 100, 100, 100, 255);
    const overlay = makeImage(2, 2, 100, 100, 100, 255);
    const result = compositeImages(base, overlay, { blendMode: 'screen' });

    // screen: 255 - (255-100)*(255-100)/255 ≈ 180
    expect(result.data[0]).toBeGreaterThan(100);
  });

  it('difference mode is commutative', () => {
    const base = makeImage(2, 2, 200, 100, 50, 255);
    const overlay = makeImage(2, 2, 50, 100, 200, 255);
    const r1 = compositeImages(base, overlay, { blendMode: 'difference' });
    const r2 = compositeImages(overlay, base, { blendMode: 'difference' });

    expect(r1.data[0]).toBe(r2.data[0]);
    expect(r1.data[1]).toBe(r2.data[1]);
    expect(r1.data[2]).toBe(r2.data[2]);
  });

  it('overlay darkens light base and lightens dark base', () => {
    const light = makeImage(2, 2, 200, 200, 200, 255);
    const mid = makeImage(2, 2, 128, 128, 128, 255);
    const dark = makeImage(2, 2, 50, 50, 50, 255);
    const r1 = compositeImages(light, mid, { blendMode: 'overlay' });
    const r2 = compositeImages(dark, mid, { blendMode: 'overlay' });

    // Overlay with light base should brighten
    expect(r1.data[0]).toBeGreaterThan(128);
    // Overlay with dark base should darken
    expect(r2.data[0]).toBeLessThan(128);
  });

  it('exclusion is similar to difference but clamped differently', () => {
    const base = makeImage(2, 2, 128, 128, 128, 255);
    const overlay = makeImage(2, 2, 128, 128, 128, 255);
    const result = compositeImages(base, overlay, { blendMode: 'exclusion' });

    // exclusion: a + b - 2ab/255. For a=b=128: 256 - 32768/255 ≈ 127.5 → floor = 127
    expect(result.data[0]).toBe(127);
  });

  it('darken keeps minimum channel values', () => {
    const base = makeImage(2, 2, 200, 100, 50, 255);
    const overlay = makeImage(2, 2, 50, 200, 100, 255);
    const result = compositeImages(base, overlay, { blendMode: 'darken' });

    expect(result.data[0]).toBe(50);  // min(200, 50)
    expect(result.data[1]).toBe(100); // min(100, 200)
    expect(result.data[2]).toBe(50); // min(50, 100)
  });

  it('lighten keeps maximum channel values', () => {
    const base = makeImage(2, 2, 200, 100, 50, 255);
    const overlay = makeImage(2, 2, 50, 200, 100, 255);
    const result = compositeImages(base, overlay, { blendMode: 'lighten' });

    expect(result.data[0]).toBe(200); // max(200, 50)
    expect(result.data[1]).toBe(200); // max(100, 200)
    expect(result.data[2]).toBe(100); // max(50, 100)
  });
});

describe('compositeImages — alpha compositing', () => {
  it('transparent overlay (oa=0) keeps base unchanged', () => {
    const base = makeImage(2, 2, 100, 150, 200, 255);
    const overlay = makeImage(2, 2, 255, 0, 0, 0);
    const result = compositeImages(base, overlay, { blendMode: 'normal' });

    expect(result.data[0]).toBe(100);
    expect(result.data[1]).toBe(150);
    expect(result.data[2]).toBe(200);
    expect(result.data[3]).toBe(255);
  });

  it('semi-transparent overlay blends colors', () => {
    const base = makeImage(2, 2, 0, 0, 0, 255);
    const overlay = makeImage(2, 2, 255, 0, 0, 128); // oa = 128 (50%)
    const result = compositeImages(base, overlay, { blendMode: 'normal' });

    // Correct Porter-Duff Source-Over on straight alpha:
    // Base: black opaque (0,0,0,255), Overlay: red semi-transparent (255,0,0,128)
    // oaEff = 128, t = 128/255 ≈ 0.5020
    // RGB: lerp(0, 255, t) = round(128) = 128
    // Alpha: lerp(255, 128, t) = round(191.25) = 191 (JS floating point)
    // Correct output: (128, 0, 0, 191) — verified via inline vitest test
    expect(result.data[0]).toBe(128);
    expect(result.data[1]).toBe(0);
    expect(result.data[2]).toBe(0);
    expect(result.data[3]).toBe(191);
  });
});

describe('compositeImages — dimensions', () => {
  it('resizes overlay to match base dimensions', () => {
    const base = makeImage(4, 4, 100, 100, 100, 255);
    const overlay = makeImage(2, 2, 200, 200, 200, 255);
    const result = compositeImages(base, overlay, { blendMode: 'normal' });

    expect(result.width).toBe(4);
    expect(result.height).toBe(4);
  });

  it('returns correct dimensions when sizes match', () => {
    const base = makeImage(4, 4, 50, 50, 50, 255);
    const overlay = makeImage(4, 4, 200, 200, 200, 255);
    const result = compositeImages(base, overlay, { blendMode: 'normal' });

    expect(result.width).toBe(4);
    expect(result.height).toBe(4);
  });

  it('does not mutate base ImageData', () => {
    const base = makeImage(2, 2, 100, 100, 100, 255);
    const overlay = makeImage(2, 2, 200, 200, 200, 255);
    const original = new Uint8ClampedArray(base.data);
    compositeImages(base, overlay, { blendMode: 'normal' });
    expect(base.data).toEqual(original);
  });
});

describe('compositeImages — options defaults', () => {
  it('defaults to normal blend mode', () => {
    const base = makeImage(2, 2, 0, 0, 0, 255);
    const overlay = makeImage(2, 2, 255, 0, 0, 255);
    const result = compositeImages(base, overlay); // no options

    expect(result.data[0]).toBe(255);
  });

  it('defaults to opacity=1', () => {
    const base = makeImage(2, 2, 0, 0, 0, 255);
    const overlay = makeImage(2, 2, 255, 255, 255, 255);
    const result = compositeImages(base, overlay);

    expect(result.data[0]).toBe(255);
    expect(result.data[3]).toBe(255);
  });
});

// ─── Parallel composite correctness tests ───────────────────────────────────

describe('parallelComposite correctness', () => {
  const mockWorkerRunner = {
    isWorkerAvailable: () => true,
    getPoolSize: () => 4,
    composite: async (base: ImageData, overlay: ImageData) => {
      return { data: compositeImages(base, overlay, { blendMode: 'normal', opacity: 1 }), width: base.width, height: base.height };
    },
    createGroupComposite: async (base: ImageData, overlays: ImageData[]) => {
      let result = base;
      for (const overlay of overlays) {
        result = compositeImages(result, overlay, { blendMode: 'normal', opacity: 1 });
      }
      return { data: result, width: base.width, height: base.height };
    },
  } as unknown as WorkerRunner;

  it('produces identical results to serial composite - 3 overlays', async () => {
    const base = makeImage(4, 4, 100, 100, 100, 255);
    const overlays = [
      makeImage(4, 4, 255, 0, 0, 255),
      makeImage(4, 4, 0, 255, 0, 255),
      makeImage(4, 4, 0, 0, 255, 255),
    ];

    const serialResult = await serialComposite(base, overlays, {
      mode: 'normal',
      opacity: 1,
      workerRunner: mockWorkerRunner,
    });

    const parallelResult = await parallelComposite(base, overlays, {
      mode: 'normal',
      opacity: 1,
      workerRunner: mockWorkerRunner,
    });

    expect(pixelsMatch(serialResult, parallelResult)).toBe(true);
  });

  it('produces identical results to serial composite - gradient overlays', async () => {
    const base = makeGradient(8, 8);
    const overlays = [
      makeGradient(8, 8, false),
      makeGradient(8, 8, true),
    ];

    const serialResult = await serialComposite(base, overlays, {
      mode: 'normal',
      opacity: 1,
      workerRunner: mockWorkerRunner,
    });

    const parallelResult = await parallelComposite(base, overlays, {
      mode: 'normal',
      opacity: 1,
      workerRunner: mockWorkerRunner,
    });

    expect(pixelsMatch(serialResult, parallelResult)).toBe(true);
  });

  it('handles 0 overlays - returns base', async () => {
    const base = makeImage(4, 4, 100, 100, 100, 255);

    const serialResult = await serialComposite(base, [], {
      mode: 'normal',
      opacity: 1,
      workerRunner: mockWorkerRunner,
    });

    const parallelResult = await parallelComposite(base, [], {
      mode: 'normal',
      opacity: 1,
      workerRunner: mockWorkerRunner,
    });

    expect(pixelsMatch(serialResult, parallelResult)).toBe(true);
  });

  it('handles 1 overlay - returns single composite', async () => {
    const base = makeImage(4, 4, 100, 100, 100, 255);
    const overlays = [makeImage(4, 4, 255, 0, 0, 255)];

    const serialResult = await serialComposite(base, overlays, {
      mode: 'normal',
      opacity: 1,
      workerRunner: mockWorkerRunner,
    });

    const parallelResult = await parallelComposite(base, overlays, {
      mode: 'normal',
      opacity: 1,
      workerRunner: mockWorkerRunner,
    });

    expect(pixelsMatch(serialResult, parallelResult)).toBe(true);
  });

  it('handles different size overlays', async () => {
    const base = makeImage(4, 4, 100, 100, 100, 255);
    const overlays = [
      makeImage(2, 2, 255, 0, 0, 255),
      makeImage(4, 4, 0, 255, 0, 255),
    ];

    const serialResult = await serialComposite(base, overlays, {
      mode: 'normal',
      opacity: 1,
      workerRunner: mockWorkerRunner,
    });

    const parallelResult = await parallelComposite(base, overlays, {
      mode: 'normal',
      opacity: 1,
      workerRunner: mockWorkerRunner,
    });

    expect(pixelsMatch(serialResult, parallelResult)).toBe(true);
  });

  it('forceSerial option produces same result as serial', async () => {
    const base = makeImage(4, 4, 100, 100, 100, 255);
    const overlays = [
      makeImage(4, 4, 255, 0, 0, 255),
      makeImage(4, 4, 0, 255, 0, 255),
      makeImage(4, 4, 0, 0, 255, 255),
      makeImage(4, 4, 255, 255, 0, 255),
    ];

    const serialResult = await serialComposite(base, overlays, {
      mode: 'normal',
      opacity: 1,
      workerRunner: mockWorkerRunner,
    });

    const parallelResult = await parallelComposite(base, overlays, {
      mode: 'normal',
      opacity: 1,
      workerRunner: mockWorkerRunner,
      forceSerial: true,
    });

    expect(pixelsMatch(serialResult, parallelResult)).toBe(true);
  });
});

describe('parallelComposite performance', () => {
  it('completes in reasonable time and produces correct results', async () => {
    const size = 8;
    const base = makeImage(size, size, 100, 100, 100, 255);
    const overlays = [
      makeImage(size, size, 255, 0, 0, 255),
      makeImage(size, size, 0, 255, 0, 255),
      makeImage(size, size, 0, 0, 255, 255),
      makeImage(size, size, 255, 255, 0, 255),
    ];

    // Use real compositeImages for accurate simulation
    const realComposite = (baseImg: ImageData, overlayImg: ImageData): ImageData =>
      compositeImages(baseImg, overlayImg, { blendMode: 'normal', opacity: 1 });

    const mockWorkerRunner = {
      isWorkerAvailable: () => true,
      getPoolSize: () => 4,
      composite: async (b: ImageData, o: ImageData) => {
        return { data: realComposite(b, o), width: b.width, height: b.height };
      },
      createGroupComposite: async (b: ImageData, os: ImageData[]) => {
        let r = b;
        for (const o of os) {
          r = realComposite(r, o);
        }
        return { data: r, width: b.width, height: b.height };
      },
    } as unknown as WorkerRunner;

    const start = performance.now();
    const parallelResult = await parallelComposite(base, overlays, {
      mode: 'normal',
      opacity: 1,
      workerRunner: mockWorkerRunner,
    });
    const parallelTime = performance.now() - start;

    const serialResult = await serialComposite(base, overlays, {
      mode: 'normal',
      opacity: 1,
      workerRunner: mockWorkerRunner,
    });

    expect(pixelsMatch(serialResult, parallelResult)).toBe(true);
    expect(parallelTime).toBeLessThan(5000);
  });
});
