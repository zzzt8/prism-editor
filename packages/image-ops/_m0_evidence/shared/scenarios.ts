/**
 * M0 Scenarios — 5 fixed scenario parameter combinations.
 *
 * These scenarios are explicitly defined to cover scale / rotate / translate
 * independently. Per the M0 design rule, only multiples of 90 degrees are used
 * for rotation to match the Node executor's restriction.
 */

import type { M0Scenario } from './types';

export const M0_SCENARIOS: ReadonlyArray<M0Scenario> = [
  {
    id: 'identity',
    name: 'identity transform (no change)',
    transformParams: {
      translateX: 0,
      translateY: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      cropX: 0,
      cropY: 0,
      cropWidth: 0,
      cropHeight: 0,
    },
    compositeParams: {
      blendMode: 'normal',
      opacity: 1,
      canvasWidth: 256,
      canvasHeight: 192,
      overlayX: 96,
      overlayY: 64,
    },
  },
  {
    id: 'scale-2x',
    name: 'scale-2x transform',
    transformParams: {
      translateX: 0,
      translateY: 0,
      scaleX: 2,
      scaleY: 2,
      rotation: 0,
      cropX: 0,
      cropY: 0,
      cropWidth: 0,
      cropHeight: 0,
    },
    compositeParams: {
      blendMode: 'normal',
      opacity: 1,
      canvasWidth: 256,
      canvasHeight: 192,
      overlayX: 96,
      overlayY: 64,
    },
  },
  {
    id: 'rotate-90',
    name: 'rotate-90 transform',
    transformParams: {
      translateX: 0,
      translateY: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 90,
      cropX: 0,
      cropY: 0,
      cropWidth: 0,
      cropHeight: 0,
    },
    compositeParams: {
      blendMode: 'normal',
      opacity: 1,
      canvasWidth: 256,
      canvasHeight: 192,
      overlayX: 96,
      overlayY: 64,
    },
  },
  {
    id: 'scale-rotate',
    name: 'scale + rotate (180) transform',
    transformParams: {
      translateX: 0,
      translateY: 0,
      scaleX: 0.5,
      scaleY: 0.5,
      rotation: 180,
      cropX: 0,
      cropY: 0,
      cropWidth: 0,
      cropHeight: 0,
    },
    compositeParams: {
      blendMode: 'normal',
      opacity: 1,
      canvasWidth: 256,
      canvasHeight: 192,
      overlayX: 96,
      overlayY: 64,
    },
  },
  {
    id: 'translate-scale',
    name: 'translate + scale transform',
    transformParams: {
      translateX: 8,
      translateY: 8,
      scaleX: 1.5,
      scaleY: 1.5,
      rotation: 0,
      cropX: 0,
      cropY: 0,
      cropWidth: 0,
      cropHeight: 0,
    },
    compositeParams: {
      blendMode: 'normal',
      opacity: 1,
      canvasWidth: 256,
      canvasHeight: 192,
      overlayX: 96,
      overlayY: 64,
    },
  },
];

export function getScenarioById(id: string): M0Scenario {
  const found = M0_SCENARIOS.find((s) => s.id === id);
  if (!found) {
    throw new Error(`Unknown scenario id: ${id}`);
  }
  return found;
}
