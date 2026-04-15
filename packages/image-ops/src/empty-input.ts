// Empty Image executor — generates a blank canvas with configurable dimensions and color

import type { NodeExecutor, EmptyInputExecutorOutput } from '@prism/shared-types';
import { generatePreviewUrl } from './preview-strategy';

type ImageData = globalThis.ImageData;

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
export function parseColor(input: string): RGBA {
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
  const width = (params['width'] as number) ?? 512;
  const height = (params['height'] as number) ?? 512;
  const colorInput = (params['backgroundColor'] as string) ?? '#ffffff';

  const color = parseColor(colorInput);
  const imageData = new ImageData(width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    data[i]     = color.r;
    data[i + 1] = color.g;
    data[i + 2] = color.b;
    data[i + 3] = color.alpha;
  }

  const previewRef = await generatePreviewUrl(imageData, width, height);

  return {
    type: 'empty-input',
    image: {
      data: imageData,
      previewUrl: previewRef.url,
      width,
      height,
      sourceFileName: undefined,
    },
    previewUrl: previewRef.url,
    width,
    height,
  } satisfies EmptyInputExecutorOutput;
};
