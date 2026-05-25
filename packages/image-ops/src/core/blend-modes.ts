/**
 * Pure blend mode functions for image compositing.
 *
 * ## Blend Mode Formulas
 *
 * All blend mode formulas operate on STRAIGHT ALPHA pixels.
 * The blend result is the "overlay color" (cr, cg, cb) which is then
 * composited over the base using Porter-Duff Source-Over.
 */

import type { BlendMode } from '@prism/shared-types';

/**
 * Clamps a value to the valid 0-255 range for a pixel channel.
 */
export function clamp(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

/**
 * Blends the color channels of overlay onto base using the specified blend mode.
 * Does NOT perform compositing - only the blend formula.
 *
 * @param base - Base pixel [r, g, b, a] in straight alpha
 * @param overlay - Overlay pixel [r, g, b, a] in straight alpha
 * @param mode - Blend mode to apply
 * @returns Blended color channels [cr, cg, cb, oa] in straight alpha (no compositing)
 *
 * ## Supported Blend Modes
 * - normal: Overlay color is fully visible
 * - multiply: Darkens by multiplying colors
 * - screen: Lightens by inverting, multiplying, and inverting again
 * - overlay: Combines multiply and screen based on base brightness
 * - darken: Keeps the darker of base and overlay
 * - lighten: Keeps the lighter of base and overlay
 * - color-dodge: Brightens base by dividing by inverted overlay
 * - color-burn: Darkens base by inverting, dividing, and inverting
 * - hard-light: Overlay effect based on overlay brightness
 * - soft-light: Gentle overlay effect (Pegtop's formula)
 * - difference: Absolute difference between colors
 * - exclusion: Like difference but lower contrast
 */
export function blendPixel(
  base: [number, number, number, number],
  overlay: [number, number, number, number],
  mode: BlendMode
): [number, number, number, number] {
  const [br, bg, bb] = base;
  const [or, og, ob, oa] = overlay;

  if (oa === 0) return [0, 0, 0, 0];

  let cr: number, cg: number, cb: number;

  switch (mode) {
    case 'normal':
      cr = or; cg = og; cb = ob;
      break;

    case 'multiply':
      cr = Math.round((br * or) / 255);
      cg = Math.round((bg * og) / 255);
      cb = Math.round((bb * ob) / 255);
      break;

    case 'screen':
      cr = 255 - Math.round(((255 - br) * (255 - or)) / 255);
      cg = 255 - Math.round(((255 - bg) * (255 - og)) / 255);
      cb = 255 - Math.round(((255 - bb) * (255 - ob)) / 255);
      break;

    case 'overlay': {
      cr = br < 128
        ? Math.round((2 * br * or) / 255)
        : 255 - Math.round((2 * (255 - br) * (255 - or)) / 255);
      cg = bg < 128
        ? Math.round((2 * bg * og) / 255)
        : 255 - Math.round((2 * (255 - bg) * (255 - og)) / 255);
      cb = bb < 128
        ? Math.round((2 * bb * ob) / 255)
        : 255 - Math.round((2 * (255 - bb) * (255 - ob)) / 255);
      break;
    }

    case 'darken':
      cr = Math.min(br, or); cg = Math.min(bg, og); cb = Math.min(bb, ob);
      break;

    case 'lighten':
      cr = Math.max(br, or); cg = Math.max(bg, og); cb = Math.max(bb, ob);
      break;

    case 'color-dodge':
      cr = or === 255 ? 255 : clamp(255 - Math.round(((255 - br) * 255) / (or + 1)));
      cg = og === 255 ? 255 : clamp(255 - Math.round(((255 - bg) * 255) / (og + 1)));
      cb = ob === 255 ? 255 : clamp(255 - Math.round(((255 - bb) * 255) / (ob + 1)));
      break;

    case 'color-burn':
      cr = or === 0 ? 0 : clamp(255 - Math.round(((255 - br) * 255) / (256 - or)));
      cg = og === 0 ? 0 : clamp(255 - Math.round(((255 - bg) * 255) / (256 - og)));
      cb = ob === 0 ? 0 : clamp(255 - Math.round(((255 - bb) * 255) / (256 - ob)));
      break;

    case 'hard-light':
      cr = or < 128
        ? Math.round((2 * br * or) / 255)
        : 255 - Math.round((2 * (255 - br) * (255 - or)) / 255);
      cg = og < 128
        ? Math.round((2 * bg * og) / 255)
        : 255 - Math.round((2 * (255 - bg) * (255 - og)) / 255);
      cb = ob < 128
        ? Math.round((2 * bb * ob) / 255)
        : 255 - Math.round((2 * (255 - bb) * (255 - ob)) / 255);
      break;

    case 'soft-light': {
      const f = (b: number, s: number): number => {
        if (s < 128) return b - Math.round((255 - 2 * s) * b * (255 - b) / 256);
        const d = b < 64
          ? Math.round(((16 * b / 255 - 12) * b / 255 + 4)) * b
          : Math.round(Math.sqrt(b / 255) * 255);
        return clamp(b + Math.round((2 * s - 255) * (d - b) / 256));
      };
      cr = f(br, or); cg = f(bg, og); cb = f(bb, ob);
      break;
    }

    case 'difference':
      cr = Math.abs(br - or); cg = Math.abs(bg - og); cb = Math.abs(bb - ob);
      break;

    case 'exclusion':
      cr = clamp(Math.floor(br + or - (2 * br * or) / 255));
      cg = clamp(Math.floor(bg + og - (2 * bg * og) / 255));
      cb = clamp(Math.floor(bb + ob - (2 * bb * ob) / 255));
      break;

    default:
      cr = or; cg = og; cb = ob;
  }

  return [cr, cg, cb, oa];
}
