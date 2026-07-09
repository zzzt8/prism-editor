// LayerPanel - PS-style layer management panel for Composer SDK
// Provides visual layer list with selection, visibility, and lock controls

import React, { useCallback } from 'react';
import { useComposerStore } from './ComposerState';

export const LayerPanel: React.FC = () => {
  const { layers, selectedLayerId, selectLayer, setLayers, toggleVisibility, setLocked } =
    useComposerStore();

  const handleDragStart = useCallback((e: React.DragEvent, layerId: string) => {
    e.dataTransfer.setData('text/plain', layerId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      const draggedId = e.dataTransfer.getData('text/plain');
      if (draggedId === targetId) return;

      const draggedIndex = layers.findIndex((l) => l.id === draggedId);
      const targetIndex = layers.findIndex((l) => l.id === targetId);
      if (draggedIndex === -1 || targetIndex === -1) return;

      const newLayers = [...layers];
      const [removed] = newLayers.splice(draggedIndex, 1);

      // After removal, if targetIndex > draggedIndex, it shifts by -1
      const adjustedTargetIndex = targetIndex > draggedIndex ? targetIndex - 1 : targetIndex;
      newLayers.splice(adjustedTargetIndex, 0, removed);
      setLayers(newLayers);
    },
    [layers, setLayers]
  );

  const handleToggleVisibility = useCallback(
    (e: React.MouseEvent, layerId: string) => {
      e.stopPropagation();
      toggleVisibility(layerId);
    },
    [toggleVisibility]
  );

  const handleToggleLock = useCallback(
    (e: React.MouseEvent, layerId: string) => {
      e.stopPropagation();
      const layer = layers.find((l) => l.id === layerId);
      if (layer) {
        setLocked(layerId, !layer.locked);
      }
    },
    [layers, setLocked]
  );

  return (
    <div className="layer-panel">
      {layers.map((layer) => (
        <div
          key={layer.id}
          className={`layer-item ${selectedLayerId === layer.id ? 'selected' : ''} ${
            layer.locked ? 'locked' : ''
          }`}
          draggable={!layer.locked}
          onClick={() => selectLayer(layer.id)}
          onDragStart={(e) => handleDragStart(e, layer.id)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, layer.id)}
        >
          <button
            className={`visibility-btn ${layer.visible ? 'visible' : 'hidden'}`}
            onClick={(e) => handleToggleVisibility(e, layer.id)}
            title={layer.visible ? 'Hide layer' : 'Show layer'}
          >
            {layer.visible ? '👁' : '🚫'}
          </button>
          <button
            className={`lock-btn ${layer.locked ? 'locked' : ''}`}
            onClick={(e) => handleToggleLock(e, layer.id)}
            title={layer.locked ? 'Unlock layer' : 'Lock layer'}
          >
            {layer.locked ? '🔒' : '🔓'}
          </button>
          <img src={layer.imageUrl} alt={layer.name} />
          <span className={layer.visible ? '' : 'hidden-text'}>{layer.name}</span>
        </div>
      ))}
    </div>
  );
};
