/**
 * Porter-Duff Source-Over compositing operations.
 *
 * ## Porter-Duff Source-Over
 *
 * The Source-Over operation composites an overlay onto a base using:
 *
 *   RGB: lerp(baseRGB, cr, oaEff/255)   — premultiplied lerp
 *   Alpha: lerp(baseA, oaEff, oaEff/255) — straight alpha lerp
 *
 * where oaEff = round(oa * opacity)
 *
 * ## Premultiplied vs Straight Alpha
 *
 * The premultiplied RGB lerp is:
 *   outRGB = round(baseRGB * (1-t) + cr * t), t = oaEff/255
 *
 * The straight alpha lerp is:
 *   outA = round(baseA * (1-t) + oaEff * t)
 *
 * Note: Using premultiplied alpha lerp for alpha would cause saturation.
 * For example, lerp(255, 128, 128/255) = 255, but straight alpha gives
 * round(255*127/255 + 128*128/255) = 191, which is correct.
 */

import { clamp } from './blend-modes';

/**
 * Composites a blended pixel over a base pixel using Porter-Duff Source-Over.
 *
 * @param base - Base pixel [r, g, b, a] in straight alpha
 * @param blendedOverlay - Pre-blended overlay [cr, cg, cb, oa] in straight alpha
 * @param opacity - Global opacity multiplier (0-1) applied to overlay alpha
 * @returns Composited pixel [r, g, b, a] in straight alpha
 */
export function compositePixel(
  base: [number, number, number, number],
  blendedOverlay: [number, number, number, number],
  opacity: number
): [number, number, number, number] {
  const [br, bg, bb, ba] = base;
  const [cr, cg, cb, oa] = blendedOverlay;

  const oaEff = Math.round(oa * opacity);
  if (oaEff === 0) return [br, bg, bb, ba];

  const t = oaEff / 255;
  const invT = 1 - t;

  const outR = clamp(Math.round(br * invT + cr * t));
  const outG = clamp(Math.round(bg * invT + cg * t));
  const outB = clamp(Math.round(bb * invT + cb * t));

  const outA = clamp(Math.round(ba * invT + oaEff * t));

  return [outR, outG, outB, outA];
}
