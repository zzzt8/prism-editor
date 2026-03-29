// NodePanel — sidebar listing all available node types with search

import React, { useState, useMemo } from 'react';
import { createRegistry, listAll } from '@prism/node-definitions';
import type { NodeDefinition } from '@prism/shared-types';
import { Download, RefreshCw, VenetianMask, Image, Upload, Search, X, Hexagon, CircleDot } from 'lucide-react';

const registry = createRegistry();

const CATEGORY_LABELS: Record<string, string> = {
  input:     '输入',
  transform: '变换',
  mask:      '遮罩',
  composite: '合成',
  output:    '输出',
};

function getCategoryIcon(category: string) {
  switch (category) {
    case 'input':     return <Download size={14} />;
    case 'transform': return <RefreshCw size={14} />;
    case 'mask':      return <VenetianMask size={14} />;
    case 'composite': return <Image size={14} />;
    case 'output':    return <Upload size={14} />;
    default:          return <Hexagon size={14} />;
  }
}

interface NodeCardProps {
  definition: NodeDefinition;
}

function NodeCard({ definition }: NodeCardProps) {
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
      <span className="node-card-icon" aria-hidden="true">
        {getCategoryIcon(definition.category)}
      </span>
      <span className="node-card-label">{definition.label}</span>
    </div>
  );
}

interface CategoryGroupProps {
  category: string;
  definitions: NodeDefinition[];
}

function CategoryGroup({ category, definitions }: CategoryGroupProps) {
  if (definitions.length === 0) return null;

  return (
    <div className="node-category">
      <h3 className="node-category-title">
        {CATEGORY_LABELS[category] ?? category}
        <span className="node-category-count">{definitions.length}</span>
      </h3>
      <div className="node-category-items">
        {definitions.map((def) => (
          <NodeCard key={def.type} definition={def} />
        ))}
      </div>
    </div>
  );
}

export const NodePanel: React.FC = () => {
  const [query, setQuery] = useState('');

  const allDefinitions = useMemo(() => listAll(registry), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allDefinitions;
    return allDefinitions.filter(
      (def) =>
        def.label.toLowerCase().includes(q) ||
        def.type.toLowerCase().includes(q) ||
        def.description?.toLowerCase().includes(q) ||
        (CATEGORY_LABELS[def.category] ?? def.category).toLowerCase().includes(q)
    );
  }, [query, allDefinitions]);

  const byCategory = useMemo(
    () =>
      filtered.reduce<Record<string, NodeDefinition[]>>((acc, def) => {
        const cat = def.category;
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(def);
        return acc;
      }, {}),
    [filtered]
  );

  const hasResults = filtered.length > 0;
  const hasQuery = query.trim().length > 0;

  return (
    <aside className="node-panel">
      {/* Search */}
      <div className="node-search">
        <Search size={14} className="node-search-icon" aria-hidden="true" />
        <input
          className="node-search-input"
          type="search"
          placeholder="搜索节点..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="搜索节点"
        />
        {query && (
          <button
            className="node-search-clear"
            onClick={() => setQuery('')}
            aria-label="清除搜索"
            type="button"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Results */}
      {hasResults ? (
        Object.entries(byCategory).map(([category, defs]) => (
          <CategoryGroup key={category} category={category} definitions={defs} />
        ))
        ) : (
          <div className="node-search-empty">
            <CircleDot size={14} className="node-search-empty-icon" aria-hidden="true" />
            <span className="node-search-empty-text">
            {hasQuery ? `未找到与"${query}"相关的节点` : '暂无可用节点'}
          </span>
        </div>
      )}
    </aside>
  );
};
