// NodePanel — sidebar listing all available node types with collapsible categories

import React, { useState, useMemo } from 'react';
import { globalRegistry } from '@prism/core';
import type { NodeDefinition } from '@prism/shared-types';
import { useCanvasStore } from '../modules/editor/stores/useCanvasStore';
import { Download, RefreshCw, VenetianMask, Image, Upload, Search, X, Hexagon, CircleDot, ChevronDown } from 'lucide-react';
import './NodePanel.css';

const CATEGORY_LABELS: Record<string, string> = {
  input:     '输入',
  transform: '变换',
  mask:      '遮罩',
  composite: '合成',
  output:    '输出',
  custom:    '自定义',
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
  collapsed: boolean;
  onToggle: () => void;
}

function CategoryGroup({ category, definitions, collapsed, onToggle }: CategoryGroupProps) {
  if (definitions.length === 0) return null;

  return (
    <div className="node-category">
      <button
        className="node-category-header"
        onClick={onToggle}
        type="button"
      >
        <span className="node-category-icon">
          {getCategoryIcon(category)}
        </span>
        <span className="node-category-title">
          {CATEGORY_LABELS[category] ?? category}
        </span>
        <span className="node-category-count">{definitions.length}</span>
        <ChevronDown
          size={12}
          className={`node-category-chevron ${collapsed ? 'node-category-chevron--collapsed' : ''}`}
        />
      </button>

      <div className={`node-category-body ${collapsed ? 'node-category-body--collapsed' : ''}`}>
        <div className="node-category-items">
          {definitions.map((def) => (
            <NodeCard key={def.type} definition={def} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Simple inline toast — no external toast library needed
interface ToastProps {
  message: string;
  onDismiss: () => void;
}

function Toast({ message, onDismiss }: ToastProps) {
  return (
    <div className="node-toast">
      <span>{message}</span>
      <button className="node-toast-dismiss" onClick={onDismiss} type="button">
        <X size={12} />
      </button>
    </div>
  );
}

const APP_VERSION = '1.0.0';

export const NodePanel: React.FC = () => {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [nodeVersion, setNodeVersion] = useState(0); // 用于触发节点列表刷新

  const allDefinitions = useMemo(() => {
    try {
      globalRegistry.initialize();
      const targetPlatform = useCanvasStore.getState().workflowMeta.targetPlatform;
      if (targetPlatform) {
        return globalRegistry.listByPlatform(targetPlatform);
      }
      return globalRegistry.listNodes();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize node registry';
      console.warn('[NodePanel] globalRegistry.initialize() failed:', message);
      return [];
    }
  }, [nodeVersion]);

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

  const handleToggle = (cat: string) => {
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleAddCustomNode = () => {
    setShowImport(true);
  };

  const hasResults = filtered.length > 0;
  const hasQuery = query.trim().length > 0;

  const sortedCategories = Object.keys(byCategory).sort((a, b) => {
    const order = ['input', 'transform', 'mask', 'composite', 'output', 'custom'];
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

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

      {/* Results — scrollable area */}
      <div className="node-panel-scroll">
        {hasResults ? (
          sortedCategories.map((cat) => (
            <CategoryGroup
              key={cat}
              category={cat}
              definitions={byCategory[cat]}
              collapsed={!!collapsed[cat]}
              onToggle={() => handleToggle(cat)}
            />
          ))
        ) : (
          <div className="node-search-empty">
            <CircleDot size={14} className="node-search-empty-icon" aria-hidden="true" />
            <span className="node-search-empty-text">
              {hasQuery ? `未找到与"${query}"相关的节点` : '暂无可用节点'}
            </span>
          </div>
        )}
      </div>

      {/* Footer — always visible */}
      <div className="node-panel-footer">
        <div className="node-footer-links">
          <button className="node-footer-link" type="button">Settings</button>
          <span className="node-footer-sep" />
          <button className="node-footer-link" type="button">Support</button>
        </div>
        <div className="node-footer-version">V{APP_VERSION}</div>
      </div>

      {/* Toast */}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

      {toast && (
        <div
          className="node-toast-auto-dismiss"
          onAnimationEnd={() => setToast(null)}
        />
      )}

    </aside>
  );
};
