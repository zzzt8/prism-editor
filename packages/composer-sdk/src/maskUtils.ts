// Mask rendering utilities for Canvas-based compositing
// Provides mask operations for layer compositing

import type { MaskState } from './types';

/**
 * Get alpha multiplier from mask at given position
 * Returns value between 0 and 1
 */
export function getMaskAlpha(
  _x: number,
  _y: number,
  mask: MaskState,
  _canvasWidth: number,
  _canvasHeight: number
): number {
  switch (mask.type) {
    case 'brightness':
      // For brightness mask, we use a threshold-based approach
      // In a real implementation, this would read from mask image data
      return mask.threshold !== undefined ? mask.threshold / 255 : 1;

    case 'gradient': {
      // Linear gradient from start to end point
      if (!mask.startPoint || !mask.endPoint) return 1;

      const dx = mask.endPoint.x - mask.startPoint.x;
      const dy = mask.endPoint.y - mask.startPoint.y;
      const length = Math.sqrt(dx * dx + dy * dy);

      if (length === 0) return 1;

      // Project point onto gradient line
      const t = Math.max(0, Math.min(1,
        ((x - mask.startPoint.x) * dx + (y - mask.startPoint.y) * dy) / (length * length)
      ));

      return t;
    }

    case 'feather':
      // Feather creates a soft edge effect
      // In a real implementation, this would use distance from edge
      return mask.radius !== undefined ? 1 : 1;

    default:
      return 1;
  }
}

/**
 * Apply mask to an alpha value
 */
export function applyMaskToAlpha(
  currentAlpha: number,
  maskAlpha: number,
  mask: MaskState | undefined
): number {
  if (!mask) return currentAlpha;

  return currentAlpha * maskAlpha;
}

/**
 * Create a gradient mask pattern on canvas
 */
export function drawGradientMask(
  ctx: CanvasRenderingContext2D,
  mask: MaskState,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  if (mask.type !== 'gradient' || !mask.startPoint || !mask.endPoint) {
    return;
  }

  const gradient = ctx.createLinearGradient(
    mask.startPoint.x,
    mask.startPoint.y,
    mask.endPoint.x,
    mask.endPoint.y
  );

  gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);
}

/**
 * Apply feather effect (simplified - creates soft edges)
 */
export function applyFeatherEffect(
  ctx: CanvasRenderingContext2D,
  radius: number,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  // Feather is applied through globalAlpha manipulation
  // This is a simplified implementation
  const featherGradient = ctx.createRadialGradient(
    x + width / 2,
    y + height / 2,
    0,
    x + width / 2,
    y + height / 2,
    Math.max(width, height) / 2
  );

  featherGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  featherGradient.addColorStop(
    Math.max(0, 1 - radius / 100),
    'rgba(255, 255, 255, 1)'
  );
  featherGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = featherGradient;
  ctx.fillRect(x - radius, y - radius, width + radius * 2, height + radius * 2);
  ctx.globalCompositeOperation = 'source-over';
}
