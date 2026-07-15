// ComposerCanvas mask rendering tests
// Tests activeMask integration in the compositing pipeline

import { describe, it, expect, beforeEach } from 'vitest';
import { createComposerStore } from './ComposerState';

describe('ComposerCanvas mask integration', () => {
  let store: ReturnType<typeof createComposerStore>;

  beforeEach(() => {
    store = createComposerStore();
    store.getState().addLayer({
      id: 'layer-1',
      name: 'Test Layer',
      imageUrl: 'https://example.com/test.png',
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
      blendMode: 'normal' as const,
      visible: true,
      locked: false,
    });
  });

  describe('activeMask state', () => {
    it('should default to null', () => {
      expect(store.getState().activeMask).toBeNull();
    });

    it('should update when setActiveMask is called', () => {
      const mask = { type: 'brightness' as const, threshold: 128 };
      store.getState().setActiveMask(mask);
      expect(store.getState().activeMask).toEqual(mask);
    });

    it('should update when applyMask is called', () => {
      const mask = {
        type: 'gradient' as const,
        startPoint: { x: 0, y: 0 },
        endPoint: { x: 100, y: 100 },
      };
      store.getState().applyMask(mask);
      expect(store.getState().activeMask).toEqual(mask);
    });

    it('should clear mask when setActiveMask is called with null', () => {
      store.getState().setActiveMask({ type: 'brightness' as const, threshold: 128 });
      store.getState().setActiveMask(null);
      expect(store.getState().activeMask).toBeNull();
    });
  });

  describe('mask re-rendering', () => {
    it('should track activeMask changes in render dependency', () => {
      // Setting activeMask should not break the existing layer state
      store.getState().setActiveMask({ type: 'brightness' as const, threshold: 100 });
      expect(store.getState().layers).toHaveLength(1);
      expect(store.getState().activeMask).toEqual({ type: 'brightness', threshold: 100 });
    });

    it('should support feather mask type', () => {
      const mask = { type: 'feather' as const, radius: 50 };
      store.getState().setActiveMask(mask);
      expect(store.getState().activeMask).toEqual(mask);
    });
  });
});
