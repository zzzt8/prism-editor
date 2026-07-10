// BlendMode → canvas 2D GlobalCompositeOperation 映射
// Split from imageWorker.worker.ts (convertBlendMode method)

import type { BlendMode } from '@prism/shared-types';

export function convertBlendMode(mode: BlendMode): GlobalCompositeOperation {
  const modeMap: Record<BlendMode, GlobalCompositeOperation> = {
    'normal': 'source-over',
    'multiply': 'multiply',
    'screen': 'screen',
    'overlay': 'overlay',
    'darken': 'darken',
    'lighten': 'lighten',
    'color-dodge': 'color-dodge',
    'color-burn': 'color-burn',
    'hard-light': 'hard-light',
    'soft-light': 'soft-light',
    'difference': 'difference',
    'exclusion': 'exclusion',
  };
  return modeMap[mode] || 'source-over';
}
