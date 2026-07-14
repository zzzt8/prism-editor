/**
 * M0 Node Workflow — Run a scenario in Node.js + Sharp.
 *
 * This is the equivalent of the Browser workflow, but executed with the
 * Node.js production executor chain (Sharp-backed transform + composite).
 *
 * The output is a final composite ImageData + a PNG buffer for cross-process
 * transfer.
 */

import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

import { transformExecutor } from '../../src/nodejs/transform-executor';
import { compositeExecutor } from '../../src/nodejs/composite-executor';
import { exportExecutor } from '../../src/nodejs/export-executor';
import { unwrapImageData } from '@prism/shared-types';
import type { M0Scenario } from '../shared';

export async function runNodeWorkflowSharp(
  scenario: M0Scenario,
  lShapedBase: ImageData,
  userImage: ImageData,
): Promise<{ imageData: ImageData; pngBytes: Buffer }> {
  // Encode fixtures as base64 PNG strings (Node.executor base input is base64).
  const baseBuf = Buffer.from(lShapedBase.data.buffer, lShapedBase.data.byteOffset, lShapedBase.data.byteLength);
  const basePng = await sharp(baseBuf, {
    raw: { width: lShapedBase.width, height: lShapedBase.height, channels: 4 },
  }).png().toBuffer();
  const base64 = basePng.toString('base64');

  // 1. Run transform executor on user image. The Node executor consumes an
  // ImageData input directly via imageDataToSharp; pass it through verbatim.
  const transformResult = await transformExecutor(
    { image: userImage },
    scenario.transformParams as unknown as Record<string, unknown>,
    {},
  );
  const transformedData = unwrapImageData((transformResult as any).image);
  if (!transformedData) throw new Error('Node transform result has no image data');

  // Encode transformed overlay as PNG.
  const ovBuf = Buffer.from(transformedData.data.buffer, transformedData.data.byteOffset, transformedData.data.byteLength);
  const ovPng = await sharp(ovBuf, {
    raw: { width: transformedData.width, height: transformedData.height, channels: 4 },
  }).png().toBuffer();

  // 2. Run composite executor with base + overlay.
  const compositeResult = await compositeExecutor(
    { base: base64, overlay: ovPng.toString('base64') },
    scenario.compositeParams as unknown as Record<string, unknown>,
    {},
  );
  const compositeData = unwrapImageData((compositeResult as any).image);
  if (!compositeData) throw new Error('Node composite result missing image data');

  // 3. Run export executor to produce PNG bytes (full chain, not shortcut).
  const exportResult = await exportExecutor(
    { image: compositeData },
    {},
    {},
  );

  const pngBytes = extractPngFromExport(exportResult);

  // Recompose into an ImageData for comparison.
  const finalImgBuf = await sharp(pngBytes).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const imgData = makeImageDataNode(
    Uint8ClampedArray.from(finalImgBuf.data),
    finalImgBuf.info.width,
    finalImgBuf.info.height,
  );

  return { imageData: imgData, pngBytes };
}

function makeImageDataNode(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): ImageData {
  const Ctor = (globalThis as { ImageData?: new (d: Uint8ClampedArray, w: number, h: number) => ImageData }).ImageData;
  if (typeof Ctor === 'function') {
    return new Ctor(data, width, height);
  }
  return { data, width, height, colorSpace: 'srgb' } as unknown as ImageData;
}

function extractPngFromExport(exportResult: unknown): Buffer {
  const anyR = exportResult as Record<string, unknown>;
  const dataUrl = (anyR.dataUrl ?? anyR.previewUrl) as string | undefined;
  if (!dataUrl) throw new Error('Node export has no dataUrl');
  const base64 = dataUrl.split(',')[1] ?? dataUrl;
  return Buffer.from(base64, 'base64');
}
