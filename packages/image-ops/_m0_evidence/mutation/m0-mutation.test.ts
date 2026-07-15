/**
 * M0 Mutation Tests — All tests are BLOCKING.
 *
 * Each mutation is applied to ONE side of a comparison (browser or node output
 * copy), and the diff metric must detect it.
 *
 * Constraint: if a mutation is applied to BOTH sides identically, the
 * comparison passes; we must apply mutations to exactly one side.
 *
 * This test suite runs without Chromium — it tests the comparator's sensitivity
 * to fabricated mutation inputs that simulate real errors.
 *
 * Test invocation:
 *   pnpm --filter @prism/image-ops exec vitest run _m0_evidence/mutation/m0-mutation.test.ts
 *
 * IMPORTANT: All tests MUST pass. Any failure blocks M0 PASS.
 */

import { describe, it, expect } from 'vitest';

import {
  MUTATIONS,
  type MutationApplier,
} from './mutators';
import {
  compareGeometry,
  computeGeometryMetrics,
} from '../driver/compare-geometry';
import { buildLShapedBase, buildUserImage } from '../shared';

interface MutationTestSpec {
  id: string;
  mutationName: keyof typeof MUTATIONS;
  applyTo: 'browser' | 'node';
  mustDetect: (baseline: ReturnType<typeof compareGeometry>, mutated: ReturnType<typeof compareGeometry>) => boolean;
  description: string;
}

const TEST_SPECS: ReadonlyArray<MutationTestSpec> = [
  {
    id: 'M01-translateXPlus3',
    mutationName: 'translateXPlus3',
    applyTo: 'browser',
    description: 'Browser output translated +3px in X must be detected',
    mustDetect: (_base, mutated) => mutated.boundingBoxDelta >= 2 || mutated.centerDeltaPx >= 2,
  },
  {
    id: 'M02-translateXMinus3',
    mutationName: 'translateXMinus3',
    applyTo: 'browser',
    description: 'Browser output translated -3px in X must be detected',
    mustDetect: (_base, mutated) => mutated.boundingBoxDelta >= 2 || mutated.centerDeltaPx >= 2,
  },
  {
    id: 'M03-scaleUp2Pct',
    mutationName: 'scaleUp2Pct',
    applyTo: 'browser',
    description: 'Browser output scaled 1.02x must be detected',
    mustDetect: (_base, mutated) =>
      mutated.boundingBoxDelta >= 2 || mutated.alphaMaskIoU < 0.95,
  },
  {
    id: 'M04-scaleDown2Pct',
    mutationName: 'scaleDown2Pct',
    applyTo: 'browser',
    description: 'Browser output scaled 0.98x must be detected',
    mustDetect: (_base, mutated) =>
      mutated.boundingBoxDelta >= 2 || mutated.alphaMaskIoU < 0.95,
  },
  {
    id: 'M05-reverseRotation90',
    mutationName: 'reverseRotation90',
    applyTo: 'browser',
    description: 'Browser output with swapped dimensions (rotation reversal) must be detected',
    mustDetect: (_base, mutated) => !mutated.outputDimensionsMatch || mutated.width > mutated.height,
  },
  {
    id: 'M06-anchorShift5',
    mutationName: 'anchorShift5',
    applyTo: 'browser',
    description: 'Browser output with anchor shift 5px must be detected',
    mustDetect: (_base, mutated) => mutated.centerDeltaPx >= 3 || mutated.boundingBoxDelta >= 3,
  },
  {
    id: 'M07-swapScaleAxes',
    mutationName: 'swapScaleAxes',
    applyTo: 'browser',
    description: 'Browser output with scale axes swapped must be detected',
    mustDetect: (_base, mutated) => !mutated.outputDimensionsMatch,
  },
  {
    id: 'M08-swapRgbChannels',
    mutationName: 'swapRgbChannels',
    applyTo: 'browser',
    description: 'Browser output with RGB channel swap must be detected',
    mustDetect: (_base, mutated) => mutated.interiorRgbMae >= 30,
  },
  {
    id: 'M09-recolor5PctInterior',
    mutationName: 'recolor5PctInterior',
    applyTo: 'browser',
    description: '5% interior recolor must be detected',
    mustDetect: (_base, mutated) => mutated.interiorChangedPercent >= 3,
  },
  {
    id: 'M10-allTransparent',
    mutationName: 'allTransparent',
    applyTo: 'browser',
    description: 'All-transparent browser output must immediately fail',
    mustDetect: (_base, mutated) => mutated.nonTransparentPixelCount === 0,
  },
  {
    id: 'M11-wrongDimensions',
    mutationName: 'wrongDimensions',
    applyTo: 'browser',
    description: 'Wrong dimensions must be detected',
    mustDetect: (_base, mutated) => !mutated.outputDimensionsMatch,
  },
  {
    id: 'M12-zeroAlpha',
    mutationName: 'zeroAlpha',
    applyTo: 'browser',
    description: 'Zero alpha must be detected as low IoU',
    mustDetect: (_base, mutated) => mutated.alphaMaskIoU < 0.5,
  },
];

describe('M0 Mutation Tests (all blocking)', () => {
  const baseImage = buildLShapedBase();
  const userImage = buildUserImage();

  // For mutation tests we fabricate a "node output" by cloning the base image
  // (since the goal is to test the comparator's sensitivity). In real runs the
  // m0-driver provides real browser/node images.
  const nodeOutput = mutateColor(baseImage, 0); // identity preservation

  for (const spec of TEST_SPECS) {
    it(`${spec.id} — ${spec.description}`, () => {
      const mutator = MUTATIONS[spec.mutationName] as MutationApplier;
      const mutatedImage = mutator(spec.applyTo === 'browser' ? baseImage : nodeOutput);
      const baselineA = spec.applyTo === 'browser' ? baseImage : nodeOutput;
      const baselineB = spec.applyTo === 'browser' ? nodeOutput : baseImage;

      const baseline = compareGeometry(baselineA, baselineB);
      const mutated = compareGeometry(spec.applyTo === 'browser' ? mutatedImage : baselineA, spec.applyTo === 'node' ? mutatedImage : baselineB);

      const detected = spec.mustDetect(baseline, mutated);
      expect(detected).toBe(true);
    });
  }
});

/**
 * Apply a small multiplicative tint (used to create a non-identical clone).
 * 0 = identity.
 */
function mutateColor(img: ImageData, tint: number): ImageData {
  const out = new Uint8ClampedArray(img.data);
  for (let i = 0; i < out.length; i += 4) {
    out[i] = Math.min(255, out[i] + tint);
    out[i + 1] = Math.min(255, out[i + 1] + tint);
    out[i + 2] = Math.min(255, out[i + 2] + tint);
  }
  return new ImageData(out, img.width, img.height);
}
