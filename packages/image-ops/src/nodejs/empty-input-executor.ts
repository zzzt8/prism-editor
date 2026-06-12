/**
 * Node.js empty-input executor using sharp.
 * Generates a blank canvas with configurable dimensions and color.
 */

import type { NodeExecutor, EmptyInputExecutorOutput } from '@prism/shared-types';
import sharp from 'sharp';

interface RGBA { r: number; g: number; b: number; alpha: number; }

/** Parse hex color like #fff or #ffffff into RGBA */
function parseHex(input: string): RGBA | null {
  const hex = input.startsWith('#') ? input.slice(1) : input;
  const full = hex.length === 3
    ? hex.split('').map((c) => c + c).join('')
    : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255, alpha: 255 };
}

/** Parse rgb(r, g, b) into RGBA */
function parseRgb(input: string): RGBA | null {
  const m = input.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+\s*)?\)/);
  if (!m) return null;
  return { r: parseInt(m[1], 10), g: parseInt(m[2], 10), b: parseInt(m[3], 10), alpha: 255 };
}

/** Parse rgba(r, g, b, a) into RGBA */
function parseRgba(input: string): RGBA | null {
  const m = input.match(/rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/);
  if (!m) return null;
  return {
    r: parseInt(m[1], 10),
    g: parseInt(m[2], 10),
    b: parseInt(m[3], 10),
    alpha: Math.round(parseFloat(m[4]) * 255),
  };
}

/** Parse a CSS color string into RGBA */
function parseColor(input: string): RGBA {
  const trimmed = input.trim();

  const rgba = parseRgba(trimmed);
  if (rgba) return rgba;

  const rgb = parseRgb(trimmed);
  if (rgb) return rgb;

  const hex = parseHex(trimmed);
  if (hex) return hex;

  return { r: 255, g: 255, b: 255, alpha: 255 };
}

export const emptyInputExecutor: NodeExecutor = async (
  _inputs,
  params
) => {
  const width = (params['width'] as number | undefined) ?? 512;
  const height = (params['height'] as number | undefined) ?? 512;
  const colorInput = (params['backgroundColor'] as string | undefined) ?? '#ffffff';

  const color = parseColor(colorInput);

  const sharpInstance = sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: color.r, g: color.g, b: color.b, alpha: color.alpha / 255 },
    },
  });

  const buffer = await sharpInstance.raw().toBuffer({ resolveWithObject: true });
  const imageData = new ImageData(new Uint8ClampedArray(buffer.data), width, height);

  const previewBuffer = await sharpInstance.png().toBuffer();
  const previewUrl = `data:image/png;base64,${previewBuffer.toString('base64')}`;

  return {
    type: 'empty-input',
    image: {
      data: imageData,
      previewUrl,
      width,
      height,
      canvasWidth: width,
      canvasHeight: height,
      position: { x: 0, y: 0 },
    },
    previewUrl,
    width,
    height,
  } satisfies EmptyInputExecutorOutput;
};
