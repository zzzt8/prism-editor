// NodeSearchModal — command-palette style node search triggered by double-click

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRegistry, listAll } from '@prism/node-definitions';
import type { NodeDefinition } from '@prism/shared-types';
import { useCanvasStore } from '../../store/canvasStore';
import { useReactFlow } from '@xyflow/react';

const registry = createRegistry();

const CATEGORY_LABELS: Record<string, string> = {
  input:     '输入',
  transform: '变换',
  mask:      '遮罩',
  composite: '合成',
  output:    '输出',
};

interface SearchResult {
  definition: NodeDefinition;
  category: string;
}

export const NodeSearchModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const addNode = useCanvasStore((s) => s.addNode);
  const reactFlowInstance = useReactFlow();

  const allDefinitions = useMemo(() => listAll(registry), []);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    return allDefinitions
      .filter(
        (def) =>
          !q ||
          def.label.toLowerCase().includes(q) ||
          def.type.toLowerCase().includes(q) ||
          def.description?.toLowerCase().includes(q)
      )
      .map((def) => ({ definition: def, category: def.category }));
  }, [query, allDefinitions]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSelect = useCallback(
    (def: NodeDefinition) => {
      // Add node at center of current viewport
      const center = reactFlowInstance.getViewport();
      const position = reactFlowInstance.screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
      addNode(def.type, { x: position.x - 80, y: position.y - 20 });
      onClose();
    },
    [addNode, onClose, reactFlowInstance]
  );

  return (
    <div className="node-search-modal-overlay" onClick={onClose}>
      <div className="node-search-modal" onClick={(e) => e.stopPropagation()}>
        {/* Search input */}
        <div className="node-search-modal-input-row">
          <span className="node-search-modal-icon" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <input
            ref={inputRef}
            className="node-search-modal-input"
            type="text"
            placeholder="搜索或添加节点..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <kbd className="node-search-modal-esc">ESC</kbd>
        </div>

        {/* Results */}
        <div className="node-search-modal-results">
          {results.length === 0 ? (
            <div className="node-search-modal-empty">
              未找到与 &quot;{query}&quot; 相关的节点
            </div>
          ) : (
            results.map(({ definition }) => (
              <button
                key={definition.type}
                className="node-search-modal-item"
                onClick={() => handleSelect(definition)}
                title={definition.description}
              >
                <span
                  className="node-search-modal-dot"
                  style={{
                    backgroundColor: CATEGORY_LABELS[definition.category]
                      ? `hsl(${(Object.keys(CATEGORY_LABELS).indexOf(definition.category) * 60 + 160) % 360}, 70%, 55%)`
                      : '#6b7280',
                  }}
                />
                <span className="node-search-modal-label">{definition.label}</span>
                <span className="node-search-modal-category">
                  {CATEGORY_LABELS[definition.category] ?? definition.category}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="node-search-modal-footer">
          <span>点击结果添加节点到画布</span>
          <span>双击画布打开搜索</span>
        </div>
      </div>
    </div>
  );
};
