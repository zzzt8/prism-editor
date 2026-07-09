// LayerPanel unit tests
// Tests drag-and-drop layer reordering via store actions

import { describe, it, expect, beforeEach } from 'vitest';
import { createComposerStore } from './ComposerState';

describe('LayerPanel drag-and-drop', () => {
  let store: ReturnType<typeof createComposerStore>;

  const mockLayers = [
    { id: 'layer-1', name: 'Layer 1', imageUrl: 'https://example.com/1.png', x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, blendMode: 'normal' as const },
    { id: 'layer-2', name: 'Layer 2', imageUrl: 'https://example.com/2.png', x: 10, y: 10, scale: 1, rotation: 0, opacity: 1, blendMode: 'normal' as const },
    { id: 'layer-3', name: 'Layer 3', imageUrl: 'https://example.com/3.png', x: 20, y: 20, scale: 1, rotation: 0, opacity: 1, blendMode: 'normal' as const },
  ];

  beforeEach(() => {
    store = createComposerStore();
    store.getState().setLayers([...mockLayers]);
  });

  describe('setLayers reordering', () => {
    it('should reorder layers when setLayers is called with new order', () => {
      // Simulate drag-drop: move layer-1 to layer-3's position
      // Note: After removing dragged item, targetIndex may shift
      const layers = store.getState().layers;
      const draggedIndex = layers.findIndex(l => l.id === 'layer-1');
      const targetIndex = layers.findIndex(l => l.id === 'layer-3');

      const newLayers = [...layers];
      const [removed] = newLayers.splice(draggedIndex, 1);
      
      // After removal, if targetIndex > draggedIndex, targetIndex shifts by -1
      const adjustedTargetIndex = targetIndex > draggedIndex ? targetIndex - 1 : targetIndex;
      newLayers.splice(adjustedTargetIndex, 0, removed);

      store.getState().setLayers(newLayers);

      const updatedLayers = store.getState().layers;
      // layer-1 moved to position 1 (between layer-2 and layer-3)
      expect(updatedLayers[0].id).toBe('layer-2');
      expect(updatedLayers[1].id).toBe('layer-1');
      expect(updatedLayers[2].id).toBe('layer-3');
    });

    it('should handle moving layer to same position', () => {
      const layers = store.getState().layers;
      store.getState().setLayers([...layers]);

      // Order should remain the same
      expect(store.getState().layers[0].id).toBe('layer-1');
      expect(store.getState().layers[1].id).toBe('layer-2');
      expect(store.getState().layers[2].id).toBe('layer-3');
    });

    it('should handle moving last layer to first position', () => {
      const layers = store.getState().layers;
      const draggedIndex = layers.findIndex(l => l.id === 'layer-3');
      const targetIndex = 0;

      const newLayers = [...layers];
      const [removed] = newLayers.splice(draggedIndex, 1);
      newLayers.splice(targetIndex, 0, removed);

      store.getState().setLayers(newLayers);

      const updatedLayers = store.getState().layers;
      expect(updatedLayers[0].id).toBe('layer-3');
      expect(updatedLayers[1].id).toBe('layer-1');
      expect(updatedLayers[2].id).toBe('layer-2');
    });
  });
});
