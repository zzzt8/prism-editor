// PrismNodeHeader - Title bar, status dot, category color
// Part of the PrismNode split (openspec/changes/codebase-cleanup/design.md §Decision 6)

import React, { type FC, useState, useCallback } from 'react';

export const CATEGORY_COLORS: Record<string, string> = {
  input:     '#22c55e',
  transform:  '#8b5cf6',
  mask:      '#f59e0b',
  composite: '#8b5cf6',
  output:    '#ef4444',
};

export const STATUS_DOT_CLASS: Record<string, string> = {
  idle:    'dcn-status-dot--idle',
  running: 'dcn-status-dot--running',
  done:    'dcn-status-dot--done',
  error:   'dcn-status-dot--error',
};

interface PrismNodeHeaderProps {
  label: string;
  execStatus: 'idle' | 'running' | 'done' | 'error';
  categoryColor: string;
  definition?: { category?: string };
}

export const PrismNodeHeader: FC<PrismNodeHeaderProps> = ({
  label,
  execStatus,
  categoryColor,
  definition,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(label);

  const handleTitleClick = useCallback(() => {
    setTitleValue(label);
    setIsEditingTitle(true);
  }, [label]);

  const handleTitleBlur = useCallback(() => {
    setIsEditingTitle(false);
  }, []);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        (e.target as HTMLInputElement).blur();
      }
    },
    []
  );

  return (
    <div className={`dcn-header dcn-header--cat-${definition?.category ?? 'default'}`}>
      <span className={`dcn-status-dot ${STATUS_DOT_CLASS[execStatus]}`} />

      {isEditingTitle ? (
        <input
          className="dcn-title"
          style={{
            background: 'rgba(0,0,0,0.2)',
            border: 'none',
            outline: 'none',
            color: 'rgba(255,255,255,0.95)',
            padding: '0 2px',
            width: '100%',
          }}
          value={titleValue}
          onChange={(e) => setTitleValue(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={handleTitleKeyDown}
          autoFocus
        />
      ) : (
        <span
          className="dcn-title"
          onDoubleClick={handleTitleClick}
          title="双击修改别名"
        >
          {label}
        </span>
      )}

      <div className="dcn-header-actions">
        <button
          className="dcn-header-btn"
          title="节点菜单"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          ≡
        </button>
      </div>
    </div>
  );
};
