/**
 * TemplateList - Filtered list of templates using TemplateCard
 */

import React from 'react';
import type { TemplateSummary } from '@prism/shared-types';
import { TemplateCard } from '../TemplateManager/TemplateCard';
import { FileText } from 'lucide-react';

interface TemplateListProps {
  templates: TemplateSummary[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

export const TemplateList: React.FC<TemplateListProps> = ({
  templates,
  selectedId,
  onSelect,
}) => {
  if (templates.length === 0) {
    return (
      <div className="tc-list-empty">
        <FileText size={28} strokeWidth={1.5} />
        <p>没有匹配的模板</p>
        <span>尝试调整筛选条件或关键词</span>
      </div>
    );
  }

  return (
    <div className="tc-list">
      {templates.map((t) => (
        <TemplateCard
          key={t.id}
          template={t}
          selected={selectedId === t.id}
          onClick={() => onSelect(t.id)}
        />
      ))}
    </div>
  );
};
