// TemplateCard - single template preview card
// Reusable component for displaying a template in list/detail contexts

import React from 'react';
import type { TemplateSummary } from '@prism/shared-types';
import { FileText } from 'lucide-react';

interface TemplateCardProps {
  template: TemplateSummary;
  selected?: boolean;
  onClick?: () => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({ template, selected, onClick }) => {
  return (
    <div
      className={`tm-card ${selected ? 'tm-card--selected' : ''}`}
      onClick={onClick}
    >
      <div className="tm-card-icon">
        <FileText size={20} strokeWidth={1.5} />
      </div>
      <div className="tm-card-body">
        <div className="tm-card-title">{template.name}</div>
        {template.metadata?.description && (
          <div className="tm-card-desc">{template.metadata.description}</div>
        )}
        <div className="tm-card-meta">
          <span>{template.nodeCount} 节点</span>
        </div>
      </div>
    </div>
  );
};
