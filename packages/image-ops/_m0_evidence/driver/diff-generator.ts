/**
 * M0 Diff Generator — Generate diff.png visualization.
 *
 * The diff.png is a per-pixel heatmap:
 * - Opaque areas in BOTH images: green tint, brightness = 1 - match
 * - Opaque areas in ONE image only: red (missing) / blue (extra)
 * - Transparent in both: white
 *
 * Pure computation, no I/O. Caller is responsible for writing the buffer.
 */

import sharp from 'sharp';

export function generateDiffImageBuffer(
  browser: ImageData,
  node: ImageData,
): { data: Buffer; info: sharp.OutputInfo } {
  const width = Math.max(browser.width, node.width);
  const height = Math.max(browser.height, node.height);
  const out = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const outIdx = (y * width + x) * 4;
      const bIdx = (y * browser.width + x) * 4;
      const nIdx = (y * node.width + x) * 4;

      const bA = y < browser.height && x < browser.width ? browser.data[bIdx + 3] : 0;
      const nA = y < node.height && x < node.width ? node.data[nIdx + 3] : 0;

      if (bA < 128 && nA < 128) {
        // transparent in both → white
        out[outIdx] = 255;
        out[outIdx + 1] = 255;
        out[outIdx + 2] = 255;
        out[outIdx + 3] = 255;
        continue;
      }

      if (bA >= 128 && nA < 128) {
        // browser has pixel, node doesn't → red
        out[outIdx] = 255;
        out[outIdx + 1] = 60;
        out[outIdx + 2] = 60;
        out[outIdx + 3] = 255;
        continue;
      }
      if (bA < 128 && nA >= 128) {
        // node has pixel, browser doesn't → blue
        out[outIdx] = 60;
        out[outIdx + 1] = 60;
        out[outIdx + 2] = 255;
        out[outIdx + 3] = 255;
        continue;
      }

      // both have pixel → green tint, brightness ∝ (255 - avg-channel-diff) / 255
      const dr = Math.abs(browser.data[bIdx] - node.data[nIdx]);
      const dg = Math.abs(browser.data[bIdx + 1] - node.data[nIdx + 1]);
      const db = Math.abs(browser.data[bIdx + 2] - node.data[nIdx + 2]);
      const avgDiff = (dr + dg + db) / 3;
      const intensity = Math.max(0, 255 - avgDiff);
      out[outIdx] = Math.round(intensity * 0.6);     // less red = greener diff
      out[outIdx + 1] = intensity;
      out[outIdx + 2] = Math.round(intensity * 0.6);
      out[outIdx + 3] = 255;
    }
  }

  // Convert to PNG via Sharp (raw RGBA → PNG).
  // We must convert RGBA to node Buffer manually because Sharp's raw input wants Buffer.
  const buf = Buffer.from(out.buffer, out.byteOffset, out.byteLength);
  return sharp(buf, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer({ resolveWithObject: true }) as unknown as Promise<{ data: Buffer; info: sharp.OutputInfo }>;
}

/**
 * Synchronous wrapper used in tests; uses async sharp internally.
 */
export async function generateDiffImage(
  browser: ImageData,
  node: ImageData,
): Promise<Buffer> {
  const buf = Buffer.from(
    buildRawRgba(browser, node).buffer,
    buildRawRgba(browser, node).byteOffset,
    buildRawRgba(browser, node).byteLength,
  );
  const result = await sharp(buf, {
    raw: { width: Math.max(browser.width, node.width), height: Math.max(browser.height, node.height), channels: 4 },
  }).png().toBuffer({ resolveWithObject: true });
  return result.data;
}

function buildRawRgba(browser: ImageData, node: ImageData): Uint8ClampedArray {
  const width = Math.max(browser.width, node.width);
  const height = Math.max(browser.height, node.height);
  const out = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const outIdx = (y * width + x) * 4;
      const bIdx = (y * browser.width + x) * 4;
      const nIdx = (y * node.width + x) * 4;

      const bA = y < browser.height && x < browser.width ? browser.data[bIdx + 3] : 0;
      const nA = y < node.height && x < node.width ? node.data[nIdx + 3] : 0;

      if (bA < 128 && nA < 128) {
        out[outIdx] = 255; out[outIdx + 1] = 255; out[outIdx + 2] = 255; out[outIdx + 3] = 255;
        continue;
      }
      if (bA >= 128 && nA < 128) {
        out[outIdx] = 255; out[outIdx + 1] = 60; out[outIdx + 2] = 60; out[outIdx + 3] = 255;
        continue;
      }
      if (bA < 128 && nA >= 128) {
        out[outIdx] = 60; out[outIdx + 1] = 60; out[outIdx + 2] = 255; out[outIdx + 3] = 255;
        continue;
      }

      const dr = Math.abs(browser.data[bIdx] - node.data[nIdx]);
      const dg = Math.abs(browser.data[bIdx + 1] - node.data[nIdx + 1]);
      const db = Math.abs(browser.data[bIdx + 2] - node.data[nIdx + 2]);
      const avgDiff = (dr + dg + db) / 3;
      const intensity = Math.max(0, 255 - avgDiff);
      out[outIdx] = Math.round(intensity * 0.6);
      out[outIdx + 1] = intensity;
      out[outIdx + 2] = Math.round(intensity * 0.6);
      out[outIdx + 3] = 255;
    }
  }
  return out;
}

/**
 * Encode an ImageData as PNG Buffer via Sharp.
 */
export async function imageDataToPngBuffer(img: ImageData): Promise<Buffer> {
  const buf = Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength);
  const result = await sharp(buf, {
    raw: { width: img.width, height: img.height, channels: 4 },
  }).png().toBuffer({ resolveWithObject: true });
  return result.data;
}
