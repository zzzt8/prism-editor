// @prism/composer-sdk
// Prism Composer SDK - PS-style interactive canvas for mall frontend integration
// Provides ComposerCanvas and ComposerParams components for real-time preview

export type {
  ComposerSDKProps,
  ComposerState,
  ComposerSubmitParams,
  LayerState,
  BlendMode,
  MaskState,
  MaskType,
} from './types';

export { ComposerCanvas } from './ComposerCanvas';
export { ComposerParams } from './ComposerParams';
export { LayerPanel } from './LayerPanel';
export { useKeyboardShortcuts } from './useKeyboardShortcuts';
export {
  useComposerStore,
  createComposerStore,
  useLayers,
  useSelectedLayer,
  useDesignParams,
  useInputs,
} from './ComposerState';
export type { ComposerStore, ComposerStoreState, ComposerStoreActions } from './ComposerState';
export { getMaskAlpha, applyMaskToAlpha, drawGradientMask, applyFeatherEffect } from './maskUtils';
