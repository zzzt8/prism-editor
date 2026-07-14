/**
 * M0 Mutation Helpers — Generate mutated copies of ImageData.
 *
 * Each mutator takes an ImageData and returns a NEW ImageData with the
 * mutation applied. The mutators cover all 12 M0 mutation cases:
 * - Translation, scaling, rotation direction, anchor shift, scaleX/Y swap
 * - RGB channel swap, interior recolor, all-transparent, dimensions, alpha=0
 *
 * Crucial design constraint: a mutation is applied to ONE side of the
 * comparison only. If both sides are mutated identically, the diff passes.
 */

import type { ImageData } from '@prism/shared-types';

export type MutationApplier = (image: ImageData) => ImageData;

export function cloneImageData(src: ImageData): ImageData {
  const copy = new Uint8ClampedArray(src.data);
  return new ImageData(copy, src.width, src.height);
}

export const MUTATIONS: Record<string, MutationApplier> = {
  /** M01: Translate +3px in X — shift all pixels right by 3 */
  translateXPlus3: (img) => translatePixels(img, 3, 0),

  /** M02: Translate -3px in X */
  translateXMinus3: (img) => translatePixels(img, -3, 0),

  /** M03: Scale 1.02x — output is 2% larger than input */
  scaleUp2Pct: (img) => scaleImage(img, 1.02),

  /** M04: Scale 0.98x */
  scaleDown2Pct: (img) => scaleImage(img, 0.98),

  /** M05: Reverse rotation direction — doesn't apply to ImageData directly;
   *        use as a parameter marker for end-to-end verification.
   *        The actual mutation here swaps W and H, which would mirror a 90° rotation reversal. */
  reverseRotation90: (img) => swapDimensions(img),

  /** M06: Anchor shift — shift bbox by 5px */
  anchorShift5: (img) => translatePixels(img, 5, 5),

  /** M07: scaleX/scaleY swap — swap width and height */
  swapScaleAxes: (img) => swapDimensions(img),

  /** M08: RGB channel swap (R↔B) */
  swapRgbChannels: (img) => swapChannels(img, 0, 2),

  /** M09: Recolor 5% interior pixels (blue → red) */
  recolor5PctInterior: (img) => recolorInterior(img, 0.05, [220, 30, 30]),

  /** M10: All-transparent output */
  allTransparent: (img) => {
    const c = cloneImageData(img);
    c.data.fill(0);
    return c;
  },

  /** M11: Dimensions wrong — grow image by +1px width */
  wrongDimensions: (img) => {
    const out = new Uint8ClampedArray(img.width * (img.height + 1) * 4);
    out.fill(255);
    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < img.width; x++) {
        const src = (y * img.width + x) * 4;
        const dst = (y * (img.width) + x) * 4;
        out[dst] = img.data[src];
        out[dst + 1] = img.data[src + 1];
        out[dst + 2] = img.data[src + 2];
        out[dst + 3] = img.data[src + 3];
      }
    }
    return new ImageData(out, img.width, img.height + 1);
  },

  /** M12: alpha=0 for all pixels */
  zeroAlpha: (img) => {
    const c = cloneImageData(img);
    for (let i = 3; i < c.data.length; i += 4) c.data[i] = 0;
    return c;
  },
};

function translatePixels(img: ImageData, dx: number, dy: number): ImageData {
  const out = new Uint8ClampedArray(img.data.length);
  // Fill transparent so alpha distribution changes after translation.
  for (let i = 3; i < out.length; i += 4) out[i] = 0;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const src = (y * img.width + x) * 4;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= img.width || ny < 0 || ny >= img.height) {
        continue;
      }
      const dst = (ny * img.width + nx) * 4;
      out[dst] = img.data[src];
      out[dst + 1] = img.data[src + 1];
      out[dst + 2] = img.data[src + 2];
      out[dst + 3] = img.data[src + 3];
    }
  }
  return new ImageData(out, img.width, img.height);
}

function scaleImage(img: ImageData, factor: number): ImageData {
  const newW = Math.round(img.width * factor);
  const newH = Math.round(img.height * factor);
  const out = new Uint8ClampedArray(newW * newH * 4);
  out.fill(255);
  for (let y = 0; y < newH; y++) {
    for (let x = 0; x < newW; x++) {
      const sx = Math.floor(x / factor);
      const sy = Math.floor(y / factor);
      const sIdx = (sy * img.width + sx) * 4;
      const dIdx = (y * newW + x) * 4;
      out[dIdx] = img.data[sIdx];
      out[dIdx + 1] = img.data[sIdx + 1];
      out[dIdx + 2] = img.data[sIdx + 2];
      out[dIdx + 3] = img.data[sIdx + 3];
    }
  }
  return new ImageData(out, newW, newH);
}

function swapDimensions(img: ImageData): ImageData {
  const out = new Uint8ClampedArray(img.width * img.height * 4);
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const src = (y * img.width + x) * 4;
      const dst = (x * img.height + y) * 4;
      out[dst] = img.data[src];
      out[dst + 1] = img.data[src + 1];
      out[dst + 2] = img.data[src + 2];
      out[dst + 3] = img.data[src + 3];
    }
  }
  return new ImageData(out, img.height, img.width);
}

function swapChannels(img: ImageData, c1: 0 | 1 | 2, c2: 0 | 1 | 2): ImageData {
  const c = cloneImageData(img);
  for (let i = 0; i < c.data.length; i += 4) {
    const t = c.data[i + c1];
    c.data[i + c1] = c.data[i + c2];
    c.data[i + c2] = t;
  }
  return c;
}

function recolorInterior(img: ImageData, ratio: number, rgb: [number, number, number]): ImageData {
  const c = cloneImageData(img);
  const totalPixels = img.width * img.height;
  const targetCount = Math.floor(totalPixels * ratio);
  let recolored = 0;
  for (let y = 0; y < img.height && recolored < targetCount; y++) {
    for (let x = 0; x < img.width && recolored < targetCount; x++) {
      // Recolor interior pixels only — skip edge band of 2px.
      if (x < 2 || x >= img.width - 2 || y < 2 || y >= img.height - 2) continue;
      const idx = (y * img.width + x) * 4;
      c.data[idx] = rgb[0];
      c.data[idx + 1] = rgb[1];
      c.data[idx + 2] = rgb[2];
      recolored++;
    }
  }
  return c;
}
