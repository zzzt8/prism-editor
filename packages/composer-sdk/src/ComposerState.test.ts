// ComposerState unit tests

import { describe, it, expect, beforeEach } from 'vitest';
import { createComposerStore } from './ComposerState';

describe('ComposerState', () => {
  let store: ReturnType<typeof createComposerStore>;

  beforeEach(() => {
    store = createComposerStore();
  });

  describe('initial state', () => {
    it('should have empty layers', () => {
      expect(store.getState().layers).toEqual([]);
    });

    it('should have no selected layer', () => {
      expect(store.getState().selectedLayerId).toBeNull();
    });

    it('should have empty designParams', () => {
      expect(store.getState().designParams).toEqual({});
    });

    it('should have empty inputs', () => {
      expect(store.getState().inputs).toEqual({});
    });
  });

  describe('selectLayer', () => {
    it('should select a layer by id', () => {
      store.getState().selectLayer('layer-1');
      expect(store.getState().selectedLayerId).toBe('layer-1');
    });

    it('should deselect layer when passing null', () => {
      store.getState().selectLayer('layer-1');
      store.getState().selectLayer(null);
      expect(store.getState().selectedLayerId).toBeNull();
    });
  });

  describe('addLayer', () => {
    it('should add a layer to layers array', () => {
      const layer = {
        id: 'layer-1',
        name: 'Test Layer',
        imageUrl: 'https://example.com/image.png',
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
        opacity: 1,
        blendMode: 'normal' as const,
      };

      store.getState().addLayer(layer);
      expect(store.getState().layers).toHaveLength(1);
      expect(store.getState().layers[0]).toEqual(layer);
    });
  });

  describe('removeLayer', () => {
    it('should remove a layer by id', () => {
      const layer = {
        id: 'layer-1',
        name: 'Test Layer',
        imageUrl: 'https://example.com/image.png',
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
        opacity: 1,
        blendMode: 'normal' as const,
      };

      store.getState().addLayer(layer);
      store.getState().removeLayer('layer-1');
      expect(store.getState().layers).toHaveLength(0);
    });

    it('should deselect if removed layer was selected', () => {
      const layer = {
        id: 'layer-1',
        name: 'Test Layer',
        imageUrl: 'https://example.com/image.png',
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
        opacity: 1,
        blendMode: 'normal' as const,
      };

      store.getState().addLayer(layer);
      store.getState().selectLayer('layer-1');
      store.getState().removeLayer('layer-1');
      expect(store.getState().selectedLayerId).toBeNull();
    });
  });

  describe('updateLayer', () => {
    it('should update layer properties', () => {
      const layer = {
        id: 'layer-1',
        name: 'Test Layer',
        imageUrl: 'https://example.com/image.png',
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
        opacity: 1,
        blendMode: 'normal' as const,
      };

      store.getState().addLayer(layer);
      store.getState().updateLayer('layer-1', { x: 100, y: 200 });

      const updatedLayer = store.getState().layers[0];
      expect(updatedLayer.x).toBe(100);
      expect(updatedLayer.y).toBe(200);
      expect(updatedLayer.name).toBe('Test Layer'); // unchanged
    });
  });

  describe('updateDesignParam', () => {
    it('should update design param value', () => {
      store.getState().updateDesignParam('scale', 1.5);
      expect(store.getState().designParams.scale).toBe(1.5);
    });

    it('should add new design param if not exists', () => {
      store.getState().updateDesignParam('newParam', 'value');
      expect(store.getState().designParams.newParam).toBe('value');
    });
  });

  describe('updateInput', () => {
    it('should update input value', () => {
      store.getState().updateInput('foregroundUrl', 'https://example.com/fg.png');
      expect(store.getState().inputs.foregroundUrl).toBe('https://example.com/fg.png');
    });
  });

  describe('setLayers', () => {
    it('should replace all layers', () => {
      const layers = [
        {
          id: 'layer-1',
          name: 'Layer 1',
          imageUrl: 'https://example.com/1.png',
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
          opacity: 1,
          blendMode: 'normal' as const,
        },
        {
          id: 'layer-2',
          name: 'Layer 2',
          imageUrl: 'https://example.com/2.png',
          x: 100,
          y: 100,
          scale: 0.5,
          rotation: 45,
          opacity: 0.8,
          blendMode: 'multiply' as const,
        },
      ];

      store.getState().setLayers(layers);
      expect(store.getState().layers).toHaveLength(2);
    });
  });

  describe('reset', () => {
    it('should reset state to initial values', () => {
      store.getState().addLayer({
        id: 'layer-1',
        name: 'Test',
        imageUrl: 'https://example.com/test.png',
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
        opacity: 1,
        blendMode: 'normal' as const,
      });
      store.getState().selectLayer('layer-1');
      store.getState().updateDesignParam('test', 123);

      store.getState().reset();

      expect(store.getState().layers).toEqual([]);
      expect(store.getState().selectedLayerId).toBeNull();
      expect(store.getState().designParams).toEqual({});
    });
  });
});
