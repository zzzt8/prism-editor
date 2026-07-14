/**
 * M0: Dual Runtime Executor Geometric Consistency Test
 *
 * Phase: M0
 * Change: m0-dual-runtime-reproduction
 *
 * Goals:
 * - Verify Browser transformExecutor and Node transformExecutor produce geometrically consistent outputs
 * - Use deterministic fixtures (no external files, no randomness)
 * - Quantify semantic differences without forcing unification
 *
 * Non-Goals (M1+):
 * - Formal DesignState / RenderRequest / RenderResult definitions
 * - JSON schema or runtime validation
 * - Modifying shared-types, workflow-core, or server
 * - Mall integration, multi-Flow, ZIP/PDF/CMYK export
 *
 * Consistency Strategy:
 * - Geometric consistency (not pixel-perfect equality)
 * - Output dimensions must match exactly
 * - Pixel content diff tolerance: ±2 RGB channels, 0.5% pixels
 * - Deterministic: same input always produces identical output
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type { ImageData } from '@prism/shared-types';
import { makeImageData } from './test-helpers';

// ─── Fixture Definition ──────────────────────────────────────────────────────

/**
 * Test base image: 20×20 solid color RGB(255, 100, 50)
 */
function createBaseImage(): ImageData {
  return makeImageData(20, 20, 255, 100, 50);
}

/**
 * Test user image: 8×8 solid color RGB(50, 150, 255)
 */
function createUserImage(): ImageData {
  return makeImageData(8, 8, 50, 150, 255);
}

// ─── Pixel Diff Utilities ───────────────────────────────────────────────────

const TOLERANCE = 2;       // RGB channel tolerance (0-255)
const SIZE_TOLERANCE = 0.5; // Allow 0.5% pixel diff

interface PixelDiffResult {
  identical: boolean;
  diffPercent: number;
  diffCount: number;
  totalPixels: number;
}

/**
 * Compute pixel-level difference between two ImageData arrays.
 * Compares RGB channels only, ignores alpha.
 */
function computePixelDiff(a: Uint8ClampedArray, b: Uint8ClampedArray): PixelDiffResult {
  if (a.length !== b.length) {
    return { identical: false, diffPercent: 100, diffCount: -1, totalPixels: -1 };
  }

  let diffCount = 0;
  const totalPixels = a.length / 4;

  for (let i = 0; i < a.length; i += 4) {
    const rDiff = Math.abs(a[i] - b[i]);
    const gDiff = Math.abs(a[i + 1] - b[i + 1]);
    const bDiff = Math.abs(a[i + 2] - b[i + 2]);

    if (rDiff > TOLERANCE || gDiff > TOLERANCE || bDiff > TOLERANCE) {
      diffCount++;
    }
  }

  return {
    identical: diffCount === 0,
    diffPercent: (diffCount / totalPixels) * 100,
    diffCount,
    totalPixels,
  };
}

// ─── Semantic Differences (Explicitly Recorded) ─────────────────────────────
//
// These differences are KNOWN and NOT bugs. M0 only quantifies, does not fix.
//
// | Dimension      | Browser (Canvas 2D)         | Node (sharp)                |
// |----------------|-----------------------------|-----------------------------|
// | Rotation anchor| Canvas center               | Top-left                    |
// | Translate      | Pixel displacement (ctx.translate) | Position offset only   |
// | Rotation range | Any angle                   | 90° increments only         |
//
// M0 test strategy:
// - Test rotate-90 for dimension consistency (90° supported by both)
// - Skip arbitrary rotation (Node limitation)
// - Skip translate pixel displacement comparison (semantic mismatch)

const UNSUPPORTED_CASES = [
  'Arbitrary rotation angles (Node executor only supports 90° increments)',
  'Translate pixel displacement comparison (Browser moves pixels, Node only records offset)',
  'Rotation anchor comparison (Browser uses canvas center, Node uses top-left)',
] as const;

// ─── Test Scenarios ─────────────────────────────────────────────────────────

type TransformParams = {
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  rotation: number; // 90° increments only for Node compatibility
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
};

const TEST_SCENARIOS: Array<{ name: string; params: TransformParams }> = [
  {
    name: 'identity transform',
    params: { translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, rotation: 0, cropX: 0, cropY: 0, cropWidth: 0, cropHeight: 0 },
  },
  {
    name: 'scale-2x transform',
    params: { translateX: 0, translateY: 0, scaleX: 2, scaleY: 2, rotation: 0, cropX: 0, cropY: 0, cropWidth: 0, cropHeight: 0 },
  },
  {
    name: 'rotate-90 transform',
    params: { translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, rotation: 90, cropX: 0, cropY: 0, cropWidth: 0, cropHeight: 0 },
  },
  {
    name: 'scale+rotate transform',
    params: { translateX: 0, translateY: 0, scaleX: 0.5, scaleY: 0.5, rotation: 180, cropX: 0, cropY: 0, cropWidth: 0, cropHeight: 0 },
  },
  {
    name: 'translate+scale transform',
    params: { translateX: 10, translateY: 10, scaleX: 1.5, scaleY: 1.5, rotation: 0, cropX: 0, cropY: 0, cropWidth: 0, cropHeight: 0 },
  },
];

// ─── Fixture (shared across tests) ─────────────────────────────────────────

let baseImage: ImageData;
let userImage: ImageData;

beforeAll(() => {
  baseImage = createBaseImage();
  userImage = createUserImage();
});

// ─── M0 Dual Runtime Consistency Tests ─────────────────────────────────────

describe('M0 Dual Runtime Consistency', () => {
  describe('Fixture Verification', () => {
    it('base image has correct dimensions', () => {
      expect(baseImage.width).toBe(20);
      expect(baseImage.height).toBe(20);
    });

    it('user image has correct dimensions', () => {
      expect(userImage.width).toBe(8);
      expect(userImage.height).toBe(8);
    });

    it('base image has correct color', () => {
      expect(baseImage.data[0]).toBe(255); // R
      expect(baseImage.data[1]).toBe(100); // G
      expect(baseImage.data[2]).toBe(50);  // B
    });

    it('user image has correct color', () => {
      expect(userImage.data[0]).toBe(50);  // R
      expect(userImage.data[1]).toBe(150); // G
      expect(userImage.data[2]).toBe(255); // B
    });
  });

  describe('Determinism', () => {
    it('base image fixture is deterministic', () => {
      const image2 = createBaseImage();
      const diff = computePixelDiff(baseImage.data, image2.data);
      expect(diff.identical).toBe(true);
    });

    it('user image fixture is deterministic', () => {
      const image2 = createUserImage();
      const diff = computePixelDiff(userImage.data, image2.data);
      expect(diff.identical).toBe(true);
    });
  });

  // ─── T2+: Browser Executor Tests (requires @vitest/browser + playwright) ────
  // These tests will be unblocked once T2 is complete

  describe('Browser Executor (T2)', () => {
    // TODO(T2): Import and call browser transformExecutor
    // import { transformExecutor as browserTransformExecutor } from './browser/TransformExecutor';

    it.skip('browser transformExecutor can be imported', () => {
      // Will be implemented in T2
    });
  });

  // ─── T3: Geometric Consistency Tests ───────────────────────────────────────
  // These tests verify both executors produce geometrically consistent results

  describe('Geometric Consistency (T3)', () => {
    for (const scenario of TEST_SCENARIOS) {
      it.skip(`${scenario.name}: Browser and Node produce consistent dimensions`, async () => {
        // Will be implemented in T3:
        // 1. Call browserTransformExecutor with baseImage and scenario.params
        // 2. Call nodeTransformExecutor with baseImage and scenario.params
        // 3. Assert: browserResult.width === nodeResult.width
        // 4. Assert: browserResult.height === nodeResult.height
      });
    }

    it.skip('pixel diff is below tolerance for identity transform', async () => {
      // Will be implemented in T3
    });
  });

  // ─── T4: Semantic Difference Recording ────────────────────────────────────

  describe('Semantic Differences (T4)', () => {
    it.skip('translate pixel displacement: Browser vs Node semantic mismatch', async () => {
      // KNOWN ISSUE: Browser moves pixels via ctx.translate,
      // Node only records position offset without pixel manipulation.
      // This test documents the mismatch, not a bug.
      console.log('Unsupported case:', UNSUPPORTED_CASES[1]);
    });

    it.skip('arbitrary rotation angle: Node only supports 90° increments', async () => {
      // KNOWN ISSUE: sharp.rotate only supports 90° increments.
      // Testing arbitrary angles would fail on Node side.
      console.log('Unsupported case:', UNSUPPORTED_CASES[0]);
    });

    it.skip('rotation anchor: Canvas center vs top-left', async () => {
      // KNOWN ISSUE: Browser rotates around canvas center,
      // Node rotates around top-left corner.
      // This affects geometric positioning after rotation.
      console.log('Unsupported case:', UNSUPPORTED_CASES[2]);
    });
  });
});

// ─── Test Utilities Export ───────────────────────────────────────────────────

export { createBaseImage, createUserImage, computePixelDiff, UNSUPPORTED_CASES };
