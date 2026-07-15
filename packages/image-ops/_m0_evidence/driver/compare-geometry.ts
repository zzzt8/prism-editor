/**
 * M0 Diff Result — Compare two ImageData objects with full geometry metrics.
 *
 * Implements all 9 M0 metrics:
 * - centerDeltaPx / centerDeltaNorm
 * - boundingBoxDelta
 * - alphaMaskIoU
 * - interiorRgbMae
 * - interiorChangedPercent
 * - edgeBandRgbMae
 * - edgeBandAlphaMae
 * - nonTransparentPixelCount
 * - outputDimensionsMatch
 *
 * Constraints:
 * - Pure computation, no I/O
 * - No dependencies on Sharp / canvas npm / DOM
 */

import type {
  M0BoundingBox,
  M0DiffResult,
  M0GeometryMetrics,
} from '../shared/types';

const EDGE_BAND_WIDTH_PX = 2;
const ALPHA_THRESHOLD = 128;

export function computeGeometryMetrics(img: ImageData): M0GeometryMetrics {
  let minX = img.width, maxX = -1, minY = img.height, maxY = -1;
  let sumX = 0, sumY = 0, alphaPixels = 0;

  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const idx = (y * img.width + x) * 4;
      if (img.data[idx + 3] > ALPHA_THRESHOLD) {
        alphaPixels++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        sumX += x;
        sumY += y;
      }
    }
  }

  if (alphaPixels === 0) {
    return {
      normalizedCenterX: 0,
      normalizedCenterY: 0,
      normalizedWidth: 0,
      normalizedHeight: 0,
      alphaBoundingBox: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
      alphaPixelCount: 0,
    };
  }

  const avgX = sumX / alphaPixels;
  const avgY = sumY / alphaPixels;

  return {
    normalizedCenterX: avgX / img.width,
    normalizedCenterY: avgY / img.height,
    normalizedWidth: (maxX - minX + 1) / img.width,
    normalizedHeight: (maxY - minY + 1) / img.height,
    alphaBoundingBox: { minX, maxX, minY, maxY },
    alphaPixelCount: alphaPixels,
  };
}

/**
 * Build an interior mask: alpha pixels that lie strictly inside the alpha bbox,
 * not on the edge band. Returns boolean[] indexed by (y * width + x).
 */
export function buildInteriorMask(
  img: ImageData,
  bbox: M0BoundingBox,
  edgeBandWidth: number = EDGE_BAND_WIDTH_PX,
): boolean[] {
  const mask = new Array(img.width * img.height).fill(false);
  const minX = bbox.minX + edgeBandWidth;
  const maxX = bbox.maxX - edgeBandWidth;
  const minY = bbox.minY + edgeBandWidth;
  const maxY = bbox.maxY - edgeBandWidth;

  if (minX >= maxX || minY >= maxY) return mask;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const idx = (y * img.width + x) * 4;
      if (img.data[idx + 3] > ALPHA_THRESHOLD) {
        mask[y * img.width + x] = true;
      }
    }
  }
  return mask;
}

/**
 * Build an edge-band mask: alpha pixels that fall within `edgeBandWidth` of the bbox edges.
 */
export function buildEdgeBandMask(
  img: ImageData,
  bbox: M0BoundingBox,
  edgeBandWidth: number = EDGE_BAND_WIDTH_PX,
): boolean[] {
  const mask = new Array(img.width * img.height).fill(false);
  const minX = bbox.minX;
  const maxX = bbox.maxX;
  const minY = bbox.minY;
  const maxY = bbox.maxY;
  if (maxX < minX || maxY < minY) return mask;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const inEdgeBand =
        x < minX + edgeBandWidth ||
        x > maxX - edgeBandWidth ||
        y < minY + edgeBandWidth ||
        y > maxY - edgeBandWidth;
      if (inEdgeBand) {
        const idx = (y * img.width + x) * 4;
        if (img.data[idx + 3] > ALPHA_THRESHOLD) {
          mask[y * img.width + x] = true;
        }
      }
    }
  }
  return mask;
}

/**
 * IoU of two alpha masks (boolean[]).
 */
export function alphaMaskIoU(maskA: boolean[], maskB: boolean[]): number {
  if (maskA.length !== maskB.length) {
    throw new Error(`Mask length mismatch: ${maskA.length} vs ${maskB.length}`);
  }
  let intersection = 0, union = 0;
  for (let i = 0; i < maskA.length; i++) {
    const a = maskA[i], b = maskB[i];
    if (a || b) union++;
    if (a && b) intersection++;
  }
  return union === 0 ? 1 : intersection / union;
}

/**
 * Compute all 9 metrics comparing ImageData A (browser) against ImageData B (node).
 *
 * @param changedRgbTolerance Threshold beyond which a pixel counts as "changed" (default 2).
 */
export function compareGeometry(
  a: ImageData,
  b: ImageData,
  changedRgbTolerance: number = 2,
): M0DiffResult {
  const ma = computeGeometryMetrics(a);
  const mb = computeGeometryMetrics(b);

  // -- centerDeltaPx / Norm
  const centerDx = Math.abs(ma.normalizedCenterX - mb.normalizedCenterX) * Math.max(a.width, b.width);
  const centerDy = Math.abs(ma.normalizedCenterY - mb.normalizedCenterY) * Math.max(a.height, b.height);
  const centerDeltaPx = Math.sqrt(centerDx * centerDx + centerDy * centerDy);
  const centerDeltaNorm = Math.sqrt(
    Math.pow(ma.normalizedCenterX - mb.normalizedCenterX, 2) +
    Math.pow(ma.normalizedCenterY - mb.normalizedCenterY, 2),
  );

  // -- boundingBoxDelta (max of 4 edge deltas)
  const boundingBoxDelta = Math.max(
    Math.abs(ma.alphaBoundingBox.minX - mb.alphaBoundingBox.minX),
    Math.abs(ma.alphaBoundingBox.maxX - mb.alphaBoundingBox.maxX),
    Math.abs(ma.alphaBoundingBox.minY - mb.alphaBoundingBox.minY),
    Math.abs(ma.alphaBoundingBox.maxY - mb.alphaBoundingBox.maxY),
  );

  // -- alphaMaskIoU
  // Use the union of both bboxes as the comparison region.
  const unionBbox: M0BoundingBox = {
    minX: Math.min(ma.alphaBoundingBox.minX, mb.alphaBoundingBox.minX),
    maxX: Math.max(ma.alphaBoundingBox.maxX, mb.alphaBoundingBox.maxX),
    minY: Math.min(ma.alphaBoundingBox.minY, mb.alphaBoundingBox.minY),
    maxY: Math.max(ma.alphaBoundingBox.maxY, mb.alphaBoundingBox.maxY),
  };
  // We compute IoU directly on both images by reusing the same bbox region.
  const iou = computeIoUFromImages(a, b, unionBbox);
  const alphaMaskIoUValue = iou;

  // -- interior MAE / changed-percent
  const minW = Math.min(a.width, b.width);
  const minH = Math.min(a.height, b.height);
  const interiorIntersectionBbox = computeInteriorBboxFromImages(a, b);

  let interiorRgbSum = 0;
  let interiorPixelCount = 0;
  let interiorChanged = 0;
  if (interiorIntersectionBbox) {
    const ib = interiorIntersectionBbox;
    for (let y = ib.minY; y <= ib.maxY; y++) {
      for (let x = ib.minX; x <= ib.maxX; x++) {
        const ia = (y * a.width + x) * 4;
        const ibIdx = (y * b.width + x) * 4;
        if (a.data[ia + 3] > ALPHA_THRESHOLD && b.data[ibIdx + 3] > ALPHA_THRESHOLD) {
          interiorPixelCount++;
          const dr = Math.abs(a.data[ia] - b.data[ibIdx]);
          const dg = Math.abs(a.data[ia + 1] - b.data[ibIdx + 1]);
          const db = Math.abs(a.data[ia + 2] - b.data[ibIdx + 2]);
          interiorRgbSum += (dr + dg + db) / 3;
          if (Math.max(dr, dg, db) > changedRgbTolerance) interiorChanged++;
        }
      }
    }
  }
  const interiorRgbMae = interiorPixelCount === 0 ? 0 : interiorRgbSum / interiorPixelCount;
  const interiorChangedPercent =
    interiorPixelCount === 0 ? 0 : (interiorChanged / interiorPixelCount) * 100;

  // -- edge-band MAE
  let edgeRgbSum = 0, edgeAlphaSum = 0, edgePixelCount = 0;
  if (interiorIntersectionBbox) {
    const ib = interiorIntersectionBbox;
    const edgeMinX = Math.max(unionBbox.minX, ib.minX - EDGE_BAND_WIDTH_PX);
    const edgeMaxX = Math.min(unionBbox.maxX, ib.maxX + EDGE_BAND_WIDTH_PX);
    const edgeMinY = Math.max(unionBbox.minY, ib.minY - EDGE_BAND_WIDTH_PX);
    const edgeMaxY = Math.min(unionBbox.maxY, ib.maxY + EDGE_BAND_WIDTH_PX);
    for (let y = edgeMinY; y <= edgeMaxY; y++) {
      for (let x = edgeMinX; x <= edgeMaxX; x++) {
        const ia = (y * a.width + x) * 4;
        const ibIdx = (y * b.width + x) * 4;
        if (a.data[ia + 3] > ALPHA_THRESHOLD && b.data[ibIdx + 3] > ALPHA_THRESHOLD) {
          edgePixelCount++;
          edgeRgbSum +=
            (Math.abs(a.data[ia] - b.data[ibIdx]) +
              Math.abs(a.data[ia + 1] - b.data[ibIdx + 1]) +
              Math.abs(a.data[ia + 2] - b.data[ibIdx + 2])) /
            3;
          edgeAlphaSum += Math.abs(a.data[ia + 3] - b.data[ibIdx + 3]);
        }
      }
    }
  }
  const edgeBandRgbMae = edgePixelCount === 0 ? 0 : edgeRgbSum / edgePixelCount;
  const edgeBandAlphaMae = edgePixelCount === 0 ? 0 : edgeAlphaSum / edgePixelCount;

  // -- nonTransparentPixelCount
  const nonTransparentPixelCount = ma.alphaPixelCount;

  return {
    centerDeltaPx,
    centerDeltaNorm,
    boundingBoxDelta,
    alphaMaskIoU: alphaMaskIoUValue,
    interiorRgbMae,
    interiorChangedPercent,
    edgeBandRgbMae,
    edgeBandAlphaMae,
    nonTransparentPixelCount,
    outputDimensionsMatch:
      a.width === b.width && a.height === b.height,
    width: a.width,
    height: a.height,
  };
}

function computeIoUFromImages(a: ImageData, b: ImageData, bbox: M0BoundingBox): number {
  const minW = Math.min(a.width, b.width);
  const minH = Math.min(a.height, b.height);
  const x2 = Math.min(bbox.maxX, minW - 1);
  const y2 = Math.min(bbox.maxY, minH - 1);
  let intersection = 0, union = 0;
  for (let y = bbox.minY; y <= y2; y++) {
    for (let x = bbox.minX; x <= x2; x++) {
      const ia = (y * a.width + x) * 4;
      const ibIdx = (y * b.width + x) * 4;
      const aA = a.data[ia + 3] > ALPHA_THRESHOLD;
      const bA = b.data[ibIdx + 3] > ALPHA_THRESHOLD;
      if (aA || bA) union++;
      if (aA && bA) intersection++;
    }
  }
  return union === 0 ? 1 : intersection / union;
}

function computeInteriorBboxFromImages(
  a: ImageData,
  b: ImageData,
): M0BoundingBox | null {
  const ma = computeGeometryMetrics(a);
  const mb = computeGeometryMetrics(b);
  const minX = Math.max(ma.alphaBoundingBox.minX, mb.alphaBoundingBox.minX) + EDGE_BAND_WIDTH_PX;
  const maxX = Math.min(ma.alphaBoundingBox.maxX, mb.alphaBoundingBox.maxX) - EDGE_BAND_WIDTH_PX;
  const minY = Math.max(ma.alphaBoundingBox.minY, mb.alphaBoundingBox.minY) + EDGE_BAND_WIDTH_PX;
  const maxY = Math.min(ma.alphaBoundingBox.maxY, mb.alphaBoundingBox.maxY) - EDGE_BAND_WIDTH_PX;
  if (minX >= maxX || minY >= maxY) return null;
  return { minX, maxX, minY, maxY };
}
