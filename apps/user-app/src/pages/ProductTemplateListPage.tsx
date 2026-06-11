// ProductTemplateListPage - template store page for user-app
//
// Features:
// - Search filter
// - Grid/List view toggle (grid placeholder, list active)
// - Pagination (Load More + numbered pages)
// - Click to enter detail/run page

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Search, ChevronDown, List, LayoutGrid, Layers, Box } from 'lucide-react';
import { productTemplateRepository, type ProductTemplateRepositoryMeta } from '../modules/repositories/productTemplateRepository';
import { navigateToTemplate } from '../router';

const PAGE_SIZE = 10;

// ─── Date formatter ─────────────────────────────────────────────────────────

function formatRelativeTime(isoDate: string): string {
  if (!isoDate) return '';
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Main page ──────────────────────────────────────────────────────────────

export const ProductTemplateListPage: React.FC = () => {
  const [templates, setTemplates] = useState<ProductTemplateRepositoryMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadTemplates = useCallback(async (pageNum: number, searchTerm: string) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await productTemplateRepository.list(pageNum, PAGE_SIZE, searchTerm || undefined);
      setTemplates(result.templates);
      setTotal(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates(page, debouncedSearch);
  }, [page, debouncedSearch, loadTemplates]);

  const handleOpen = (template: ProductTemplateRepositoryMeta) => {
    navigateToTemplate(template.id);
  };

  return (
    <div className="home-layout">
      {/* Header */}
      <header className="home-header">
        <div className="home-header-logo">
          <div className="home-logo-icon">
            <Box size={20} />
          </div>
          <div className="home-header-title-group">
            <span className="home-logo-text">Prism Editor</span>
            <span className="home-header-subtitle">模板商店</span>
          </div>
        </div>
      </header>

      <main className="home-main">
        {/* Toolbar */}
        <section className="home-toolbar">
          <div className="home-toolbar-left">
            <div className="home-search-wrapper">
              <Search size={14} className="home-search-icon" />
              <input
                type="text"
                className="home-search-input"
                placeholder="搜索模板..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="home-toolbar-right">
            {/* View toggle */}
            <div className="home-view-toggle">
              <button
                className={`home-view-btn ${viewMode === 'list' ? 'home-view-btn--active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List view"
              >
                <List size={16} />
              </button>
              <button
                className={`home-view-btn ${viewMode === 'grid' ? 'home-view-btn--active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid view"
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>
        </section>

        {/* Loading */}
        {isLoading && (
          <div className="ua-loading">
            <div className="ua-spinner" />
            <span>加载中…</span>
          </div>
        )}

        {/* Error banner */}
        {loadError && (
          <section className="home-error-banner">
            <span>{loadError}</span>
            <button onClick={() => loadTemplates(page, debouncedSearch)}>重试</button>
          </section>
        )}

        {/* Empty state */}
        {!isLoading && !loadError && templates.length === 0 && (
          <section className="home-empty">
            <Layers size={48} className="home-empty-icon" />
            <p className="home-empty-title">
              {debouncedSearch ? '未找到匹配的模板' : '暂无模板'}
            </p>
            <p className="home-empty-subtitle">
              {debouncedSearch
                ? '请调整搜索条件后重试。'
                : '暂无 ProductTemplate，请在 dev-tool 创建并发布'}
            </p>
          </section>
        )}

        {/* Template list */}
        {!isLoading && templates.length > 0 && (
          <>
            <section className="home-workflow-list">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="home-workflow-row"
                  onClick={() => handleOpen(template)}
                >
                  <div className="home-workflow-row-info">
                    <div className="home-workflow-icon">
                      <Layers size={18} />
                    </div>
                    <div className="home-workflow-details">
                      <span className="home-workflow-name">{template.name}</span>
                      {template.description && (
                        <span className="home-workflow-desc">{template.description}</span>
                      )}
                    </div>
                  </div>

                  <div className="home-workflow-row-actions">
                    <span className="home-workflow-time">
                      {formatRelativeTime(template.updatedAt)}
                    </span>
                    <span className="ua-io-badge ua-io-badge--in">{template.metadata.inputCount} 输入</span>
                    <span className="ua-io-badge ua-io-badge--out">{template.metadata.designParamCount} 参数</span>
                    <span className="home-workflow-version">v{template.version}</span>
                  </div>
                </div>
              ))}
            </section>

            {/* Pagination */}
            {total > PAGE_SIZE && (
              <footer className="home-pagination">
                <button
                  className="home-load-more-btn"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                >
                  Load More
                </button>
                <div className="home-pagination-info">
                  <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
                  <div className="home-pagination-pages">
                    <button
                      className={`home-page-btn ${page === 1 ? 'home-page-btn--disabled' : ''}`}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Prev
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        className={`home-page-btn ${p === page ? 'home-page-btn--active' : ''}`}
                        onClick={() => setPage(p)}
                      >
                        {String(p).padStart(2, '0')}
                      </button>
                    ))}
                    <button
                      className={`home-page-btn ${page === totalPages ? 'home-page-btn--disabled' : ''}`}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </footer>
            )}
          </>
        )}
      </main>
    </div>
  );
};
