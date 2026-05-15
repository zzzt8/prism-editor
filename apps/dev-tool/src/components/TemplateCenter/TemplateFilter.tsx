/**
 * TemplateFilter - Category and tag filtering for template list
 */

import React from 'react';
import { LayoutGrid, Tag } from 'lucide-react';

interface TemplateFilterProps {
  categories: string[];
  tags: string[];
  selectedCategory: string | null;
  selectedTags: string[];
  onCategoryChange: (_category: string | null) => void;
  onTagToggle: (_tag: string) => void;
}

export const TemplateFilter: React.FC<TemplateFilterProps> = ({
  categories,
  tags,
  selectedCategory,
  selectedTags,
  onCategoryChange,
  onTagToggle,
}) => {
  return (
    <div className="tc-filter">
      <div className="tc-filter-section">
        <div className="tc-filter-label">
          <LayoutGrid size={11} />
          分类
        </div>
        <div className="tc-filter-pills">
          <button
            className={`tc-pill ${selectedCategory === null ? 'tc-pill--active' : ''}`}
            onClick={() => onCategoryChange(null)}
          >
            全部
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`tc-pill ${selectedCategory === cat ? 'tc-pill--active' : ''}`}
              onClick={() => onCategoryChange(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {tags.length > 0 && (
        <div className="tc-filter-section">
          <div className="tc-filter-label">
            <Tag size={11} />
            标签
          </div>
          <div className="tc-filter-pills">
            {tags.map((tag) => (
              <button
                key={tag}
                className={`tc-pill ${selectedTags.includes(tag) ? 'tc-pill--active' : ''}`}
                onClick={() => onTagToggle(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
