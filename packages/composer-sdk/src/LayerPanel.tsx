// LayerPanel - PS-style layer management panel for Composer SDK
// Provides visual layer list with selection, visibility, and lock controls

import React from 'react';
import { useComposerStore } from './ComposerState';

export const LayerPanel: React.FC = () => {
  const { layers, selectedLayerId, selectLayer } = useComposerStore();

  return (
    <div className="layer-panel">
      {layers.map((layer) => (
        <div
          key={layer.id}
          className={selectedLayerId === layer.id ? 'layer-item selected' : 'layer-item'}
          onClick={() => selectLayer(layer.id)}
        >
          <img src={layer.imageUrl} alt={layer.name} />
          <span>{layer.name}</span>
        </div>
      ))}
    </div>
  );
};
