/**
 * TemplateCenter - Main entry for browsing, searching, and selecting templates
 * Supports category filtering, tag filtering, and keyword search.
 */

import React, { useState, useEffect, useMemo } from 'react';
import type { TemplateSummary } from '@prism/shared-types';
import { TemplateRepository } from '../../modules/repositories/templateRepository';
import { TemplateSearch } from './TemplateSearch';
import { TemplateFilter } from './TemplateFilter';
import { TemplateList } from './TemplateList';
import { X } from 'lucide-react';
import './TemplateCenter.css';

const repo = new TemplateRepository();

export interface TemplateCenterProps {
  onClose: () => void;
  onSelect: (id: string) => void;
}

type Tab = 'all' | 'byCategory';

export const TemplateCenter: React.FC<TemplateCenterProps> = ({ onClose, onSelect }) => {
  const [allTemplates, setAllTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('all');

  useEffect(() => {
    repo.list()
      .then(setAllTemplates)
      .catch(() => setError('加载模板失败'))
      .finally(() => setLoading(false));
  }, []);

  // Extract unique categories and tags
  const categories = useMemo(() => {
    const cats = allTemplates
      .map((t) => t.metadata?.category)
      .filter((c): c is string => Boolean(c));
    return [...new Set(cats)];
  }, [allTemplates]);

  const allTags = useMemo(() => {
    const tags = allTemplates.flatMap((t) => t.metadata?.tags ?? []);
    return [...new Set(tags)];
  }, [allTemplates]);

  // Filter templates based on current filters
  const filteredTemplates = useMemo(() => {
    return allTemplates.filter((t) => {
      // Search query
      if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Category filter
      if (activeTab === 'byCategory') {
        if (!t.metadata?.category) return false;
        if (selectedCategory && t.metadata.category !== selectedCategory) return false;
      }
      // Tag filter
      if (selectedTags.length > 0) {
        const templateTags = t.metadata?.tags ?? [];
        if (!selectedTags.every((tag) => templateTags.includes(tag))) {
          return false;
        }
      }
      return true;
    });
  }, [allTemplates, searchQuery, activeTab, selectedCategory, selectedTags]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleCategoryChange = (category: string | null) => {
    setSelectedCategory(category);
    if (category) setActiveTab('byCategory');
  };

  const handleSelect = (id: string) => {
    onSelect(id);
  };

  return (
    <div className="tc-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="tc-modal">
        <div className="tc-header">
          <h2 className="tc-title">模板中心</h2>
          <div className="tc-tabs">
            <button
              className={`tc-tab ${activeTab === 'all' ? 'tc-tab--active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              全部模板
            </button>
            <button
              className={`tc-tab ${activeTab === 'byCategory' ? 'tc-tab--active' : ''}`}
              onClick={() => setActiveTab('byCategory')}
            >
              按分类
            </button>
          </div>
          <button className="tc-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="tc-toolbar">
          <TemplateSearch value={searchQuery} onChange={setSearchQuery} />
          {categories.length > 0 && (
            <TemplateFilter
              categories={categories}
              tags={allTags}
              selectedCategory={selectedCategory}
              selectedTags={selectedTags}
              onCategoryChange={handleCategoryChange}
              onTagToggle={handleTagToggle}
            />
          )}
        </div>

        <div className="tc-body">
          {loading ? (
            <div className="tc-loading">
              <div className="tc-spinner" />
              <span>加载中…</span>
            </div>
          ) : error ? (
            <div className="tc-error">{error}</div>
          ) : (
            <>
              <div className="tc-count">
                共 {filteredTemplates.length} 个模板
              </div>
              <TemplateList
                templates={filteredTemplates}
                onSelect={handleSelect}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
