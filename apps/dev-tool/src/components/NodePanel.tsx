// Node panel - sidebar listing all available node types

import React from 'react';
import { createRegistry, listAll } from '@prism/node-definitions';
import type { NodeDefinition } from '@prism/shared-types';

const registry = createRegistry();

interface NodePanelProps {
  onDragStart?: (event: React.DragEvent, nodeType: string) => void;
}

const categoryLabels: Record<string, string> = {
  input: '输入',
  transform: '变换',
  mask: '遮罩',
  composite: '合成',
  output: '输出',
};

function NodeCard({ definition }: { definition: NodeDefinition }) {
  return (
    <div
      className="node-card"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/prism-node-type', definition.type);
        e.dataTransfer.effectAllowed = 'move';
      }}
      title={definition.description}
    >
      <span className="node-card-icon">
        {getCategoryIcon(definition.category)}
      </span>
      <span className="node-card-label">{definition.label}</span>
    </div>
  );
}

function getCategoryIcon(category: string): string {
  switch (category) {
    case 'input': return '📥';
    case 'transform': return '🔄';
    case 'mask': return '🎭';
    case 'composite': return '🖼';
    case 'output': return '📤';
    default: return '⬡';
  }
}

export const NodePanel: React.FC<NodePanelProps> = ({ onDragStart }) => {
  const definitions = listAll(registry);

  const byCategory = definitions.reduce<Record<string, NodeDefinition[]>>(
    (acc, def) => {
      const cat = def.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(def);
      return acc;
    },
    {}
  );

  return (
    <aside className="node-panel">
      <h2 className="node-panel-title">节点</h2>
      {Object.entries(byCategory).map(([category, defs]) => (
        <div key={category} className="node-category">
          <h3 className="node-category-title">
            {categoryLabels[category] ?? category}
          </h3>
          <div className="node-category-items">
            {defs.map((def) => (
              <NodeCard key={def.type} definition={def} />
            ))}
          </div>
        </div>
      ))}
    </aside>
  );
};
