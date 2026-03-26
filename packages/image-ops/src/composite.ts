// Image compositing with blend modes

// ImageData is a browser built-in
type ImageData = globalThis.ImageData;
import type { BlendMode } from '@prism/shared-types';
import { resizeImageData } from './transform';

function clamp(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function blendPixel(
  base: [number, number, number, number],
  overlay: [number, number, number, number],
  mode: BlendMode,
  opacity: number
): [number, number, number, number] {
  const [br, bg, bb, ba] = base;
  const [or, og, ob, oa] = overlay;
  const oaEff = oa * opacity;

  if (oaEff === 0) return [br, bg, bb, ba];

  const invBaseAlpha = 1 - ba / 255;
  const invOverlayAlpha = 1 - oaEff / 255;

  let cr: number, cg: number, cb: number;

  switch (mode) {
    case 'normal':
      cr = or;
      cg = og;
      cb = ob;
      break;

    case 'multiply': {
      cr = (br * or) / 255;
      cg = (bg * og) / 255;
      cb = (bb * ob) / 255;
      break;
    }

    case 'screen': {
      cr = 255 - ((255 - br) * (255 - or)) / 255;
      cg = 255 - ((255 - bg) * (255 - og)) / 255;
      cb = 255 - ((255 - bb) * (255 - ob)) / 255;
      break;
    }

    case 'overlay': {
      cr = br < 128 ? (2 * br * or) / 255 : 255 - (2 * (255 - br) * (255 - or)) / 255;
      cg = bg < 128 ? (2 * bg * og) / 255 : 255 - (2 * (255 - bg) * (255 - og)) / 255;
      cb = bb < 128 ? (2 * bb * ob) / 255 : 255 - (2 * (255 - bb) * (255 - ob)) / 255;
      break;
    }

    case 'darken': {
      cr = Math.min(br, or);
      cg = Math.min(bg, og);
      cb = Math.min(bb, ob);
      break;
    }

    case 'lighten': {
      cr = Math.max(br, or);
      cg = Math.max(bg, og);
      cb = Math.max(bb, ob);
      break;
    }

    case 'color-dodge': {
      cr = or === 255 ? 255 : clamp(255 - ((255 - br) * 255) / (or + 1));
      cg = og === 255 ? 255 : clamp(255 - ((255 - bg) * 255) / (og + 1));
      cb = ob === 255 ? 255 : clamp(255 - ((255 - bb) * 255) / (ob + 1));
      break;
    }

    case 'color-burn': {
      cr = or === 0 ? 0 : clamp(255 - ((255 - br) * 255) / (256 - or));
      cg = og === 0 ? 0 : clamp(255 - ((255 - bg) * 255) / (256 - og));
      cb = ob === 0 ? 0 : clamp(255 - ((255 - bb) * 255) / (256 - ob));
      break;
    }

    case 'hard-light': {
      cr = or < 128 ? (2 * br * or) / 255 : 255 - (2 * (255 - br) * (255 - or)) / 255;
      cg = og < 128 ? (2 * bg * og) / 255 : 255 - (2 * (255 - bg) * (255 - og)) / 255;
      cb = ob < 128 ? (2 * bb * ob) / 255 : 255 - (2 * (255 - bb) * (255 - ob)) / 255;
      break;
    }

    case 'soft-light': {
      // Pegtop Soft-Light: http://www.pegtop.net/delphi/articles/softlight.htm
      const f = (b: number, s: number): number => {
        if (s < 128) {
          return b - (255 - 2 * s) * b * (255 - b) / 256;
        }
        const d = b < 64
          ? ((16 * b / 255 - 12) * b / 255 + 4) * b
          : Math.sqrt(b / 255) * 255;
        return b + (2 * s - 255) * (d - b) / 256;
      };
      cr = clamp(f(br, or));
      cg = clamp(f(bg, og));
      cb = clamp(f(bb, ob));
      break;
    }

    case 'difference': {
      cr = Math.abs(br - or);
      cg = Math.abs(bg - og);
      cb = Math.abs(bb - ob);
      break;
    }

    case 'exclusion': {
      cr = br + or - (2 * br * or) / 255;
      cg = bg + og - (2 * bg * og) / 255;
      cb = bb + ob - (2 * bb * ob) / 255;
      break;
    }

    default:
      cr = or;
      cg = og;
      cb = ob;
  }

  const outR = clamp(br * invBaseAlpha + cr * oaEff / 255);
  const outG = clamp(bg * invBaseAlpha + cg * oaEff / 255);
  const outB = clamp(bb * invBaseAlpha + cb * oaEff / 255);
  const outA = clamp(ba + oaEff * (1 - ba / 255));

  return [outR, outG, outB, outA];
}

export function compositeImages(
  baseData: ImageData,
  overlayData: ImageData,
  options: { blendMode?: BlendMode; opacity?: number } = {}
): ImageData {
  const { blendMode = 'normal', opacity = 1 } = options;

  if (baseData.width !== overlayData.width || baseData.height !== overlayData.height) {
    const resizedOverlay = resizeImageData(overlayData, baseData.width, baseData.height);
    return compositeImagesImpl(baseData, resizedOverlay, blendMode, opacity);
  }

  return compositeImagesImpl(baseData, overlayData, blendMode, opacity);
}

function compositeImagesImpl(
  baseData: ImageData,
  overlayData: ImageData,
  blendMode: BlendMode,
  opacity: number
): ImageData {
  const result = new ImageData(
    new Uint8ClampedArray(baseData.data),
    baseData.width,
    baseData.height
  );

  for (let i = 0; i < result.data.length; i += 4) {
    const base: [number, number, number, number] = [
      baseData.data[i],
      baseData.data[i + 1],
      baseData.data[i + 2],
      baseData.data[i + 3],
    ];
    const overlay: [number, number, number, number] = [
      overlayData.data[i],
      overlayData.data[i + 1],
      overlayData.data[i + 2],
      overlayData.data[i + 3],
    ];

    const [r, g, b, a] = blendPixel(base, overlay, blendMode, opacity);
    result.data[i] = r;
    result.data[i + 1] = g;
    result.data[i + 2] = b;
    result.data[i + 3] = a;
  }

  return result;
}
