/**
 * M0 Fixture Builder — Pure JS, no platform dependencies.
 *
 * Builds two fixture types:
 * - LShapedBase: 256x192 with WHITE/BLUE/RED/GREEN regions in an L-shape.
 * - UserImage: 64x40 BLUE with RED top-left and GREEN bottom-right markers.
 *
 * Allowed: ImageData, Uint8ClampedArray, primitives.
 * Forbidden: Sharp, fs/path, canvas npm, Node Buffer, DOM, executor implementations.
 */

import type { M0FixtureSpec, M0FixtureRegion } from './types';

const RGB = {
  WHITE: [255, 255, 255],
  BLACK: [0, 0, 0],
  BLUE: [0, 80, 200],
  RED: [220, 30, 30],
  GREEN: [30, 180, 60],
} as const;

const CANVAS_W = 256;
const CANVAS_H = 192;
const USER_W = 64;
const USER_H = 40;

const L_SHAPED_BASE_SPEC: M0FixtureSpec = {
  id: 'l-shaped-base',
  width: CANVAS_W,
  height: CANVAS_H,
  regions: [
    // Blue vertical bar (left side, full height)
    { x: 0, y: 0, w: 96, h: CANVAS_H, ...rgbToObj(RGB.BLUE) },
    // Blue horizontal bar (top, right portion)
    { x: 96, y: 0, w: CANVAS_W - 96, h: 64, ...rgbToObj(RGB.BLUE) },
    // Red corner marker at L-junction
    { x: 48, y: 48, w: 48, h: 48, ...rgbToObj(RGB.RED) },
    // Green bottom strip
    { x: 96, y: 96, w: 64, h: 32, ...rgbToObj(RGB.GREEN) },
  ],
};

const USER_IMAGE_SPEC: M0FixtureSpec = {
  id: 'user-image',
  width: USER_W,
  height: USER_H,
  regions: [
    // RED top-left marker (8x8)
    { x: 2, y: 2, w: 8, h: 8, ...rgbToObj(RGB.RED) },
    // GREEN bottom-right marker (8x8)
    { x: USER_W - 10, y: USER_H - 10, w: 8, h: 8, ...rgbToObj(RGB.GREEN) },
  ],
};

function rgbToObj(rgb: readonly [number, number, number]): { r: number; g: number; b: number } {
  return { r: rgb[0], g: rgb[1], b: rgb[2] };
}

/**
 * Construct an ImageData in a way that works in both browser and Node.
 *
 * - In the browser, `globalThis.ImageData` is the native ImageData constructor.
 * - In Node 22, `globalThis.ImageData` is undefined; we fall back to a thin
 *   shim that exposes the fields the downstream executor chain reads.
 *   The Browser executor on the other side of the playwright boundary will
 *   happily accept this duck-typed value because its `unwrapImageData` only
 *   reads `data`, `width`, and `height`.
 */
function makeImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): ImageData {
  const Ctor = (globalThis as { ImageData?: new (d: Uint8ClampedArray, w: number, h: number) => ImageData }).ImageData;
  if (typeof Ctor === 'function') {
    return new Ctor(data, width, height);
  }
  return {
    data,
    width,
    height,
    colorSpace: 'srgb',
  } as unknown as ImageData;
}

export function getLShapedBaseSpec(): M0FixtureSpec {
  return L_SHAPED_BASE_SPEC;
}

export function getUserImageSpec(): M0FixtureSpec {
  return USER_IMAGE_SPEC;
}

export function getBaseBackgroundRgb(): readonly [number, number, number] {
  return RGB.WHITE;
}

export function getUserBaseRgb(): readonly [number, number, number] {
  return RGB.BLUE;
}

export function getFixtureConstants() {
  return { CANVAS_W, CANVAS_H, USER_W, USER_H } as const;
}

/**
 * Build an ImageData from a fixture spec.
 * Default background is WHITE; explicit regions are filled over the background.
 *
 * Pure JS, no platform dependencies. Used by both browser and node.
 */
export function buildFixtureImageData(
  spec: M0FixtureSpec,
  background: readonly [number, number, number] = RGB.WHITE,
): ImageData {
  const data = new Uint8ClampedArray(spec.width * spec.height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = background[0];
    data[i + 1] = background[1];
    data[i + 2] = background[2];
    data[i + 3] = 255;
  }

  for (const region of spec.regions) {
    fillRegion(data, spec.width, spec.height, region);
  }

  return makeImageData(data, spec.width, spec.height);
}

function fillRegion(
  data: Uint8ClampedArray,
  canvasW: number,
  canvasH: number,
  region: M0FixtureRegion,
): void {
  const x2 = Math.min(canvasW, region.x + region.w);
  const y2 = Math.min(canvasH, region.y + region.h);
  for (let y = region.y; y < y2; y++) {
    for (let x = region.x; x < x2; x++) {
      const idx = (y * canvasW + x) * 4;
      data[idx] = region.r;
      data[idx + 1] = region.g;
      data[idx + 2] = region.b;
      data[idx + 3] = 255;
    }
  }
}

export function buildLShapedBase(): ImageData {
  return buildFixtureImageData(L_SHAPED_BASE_SPEC);
}

export function buildUserImage(): ImageData {
  return buildFixtureImageData(USER_IMAGE_SPEC, RGB.BLUE);
}
