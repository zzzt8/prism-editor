/**
 * MarketplaceList - Browse and search node packages from the server API
 *
 * Features:
 * - Fetch node packages from GET /api/nodes
 * - Search by name/description
 * - Filter by category
 * - Pagination
 * - Install to local (triggers import flow)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, RefreshCw, ChevronLeft, ChevronRight, Package, Loader } from 'lucide-react';
import type { NodePackageManifest } from '@prism/shared-types';
import { registerNodePackage } from '../../utils/nodePackageImport';

interface NodePackageItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  latestVersion: string;
  latestManifest: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

interface MarketplaceListProps {
  onInstallPackage: (_manifest: NodePackageManifest) => void;
  onClose?: () => void;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'image-processing', label: 'Image Processing' },
  { value: 'transform', label: 'Transform' },
  { value: 'mask', label: 'Mask' },
  { value: 'composite', label: 'Composite' },
  { value: 'custom', label: 'Custom' },
  { value: 'input', label: 'Input' },
  { value: 'output', label: 'Output' },
];

export const MarketplaceList: React.FC<MarketplaceListProps> = ({ onInstallPackage: _onInstallPackage, onClose }) => {
  const [packages, setPackages] = useState<NodePackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Selected package for detail view
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const limit = 12;

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (searchQuery) params.set('search', searchQuery);
      if (category) params.set('category', category);

      const response = await fetch(`${API_BASE}/nodes?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch packages: ${response.status}`);
      }

      const data = await response.json();
      setPackages(data.data || []);
      setTotal(data.pagination?.total ?? 0);
      setTotalPages(data.pagination?.totalPages ?? 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load marketplace');
      // Fallback: show empty state with retry option
      setPackages([]);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, category]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPackages();
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setPage(1);
  };

  const handleInstall = async (pkg: NodePackageItem) => {
    try {
      // Fetch the full manifest by downloading
      const response = await fetch(`${API_BASE}/nodes/${pkg.id}/download`);
      if (!response.ok) {
        throw new Error('Failed to download package manifest');
      }
      const manifest = await response.json() as NodePackageManifest;
      // Register in global registry + localStorage
      await registerNodePackage(manifest);
      _onInstallPackage(manifest);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to install package');
    }
  };

  const selectedPackage = selectedId ? packages.find((p) => p.id === selectedId) : null;

  return (
    <div className="marketplace-list">
      {/* Header */}
      <div className="marketplace-header">
        <div className="marketplace-title">
          <Package size={16} />
          <span>Node Marketplace</span>
        </div>
        {onClose && (
          <button className="marketplace-close" onClick={onClose}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Search & Filter */}
      <div className="marketplace-controls">
        <form className="marketplace-search" onSubmit={handleSearch}>
          <Search size={14} className="marketplace-search-icon" />
          <input
            type="search"
            placeholder="Search packages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="marketplace-search-input"
          />
          {searchQuery && (
            <button type="button" className="marketplace-search-clear" onClick={handleClearSearch}>
              <X size={12} />
            </button>
          )}
        </form>

        <select
          className="marketplace-category-select"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <button
          className="marketplace-refresh-btn"
          onClick={() => fetchPackages()}
          disabled={loading}
          title="Refresh"
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {/* Results count */}
      {!loading && !error && (
        <div className="marketplace-results-count">
          {total} package{total !== 1 ? 's' : ''} found
        </div>
      )}

      {/* Content */}
      <div className="marketplace-content">
        {loading && (
          <div className="marketplace-loading">
            <Loader size={20} className="spin" />
            <span>Loading packages...</span>
          </div>
        )}

        {error && (
          <div className="marketplace-error">
            <span>{error}</span>
            <button onClick={() => fetchPackages()}>Retry</button>
          </div>
        )}

        {!loading && !error && packages.length === 0 && (
          <div className="marketplace-empty">
            <Package size={24} />
            <span>No packages found</span>
            {searchQuery && <span>Try a different search term</span>}
          </div>
        )}

        {!loading && !error && packages.length > 0 && (
          <div className="marketplace-grid">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`marketplace-card ${selectedId === pkg.id ? 'marketplace-card-selected' : ''}`}
                onClick={() => setSelectedId(pkg.id === selectedId ? null : pkg.id)}
              >
                <div className="marketplace-card-header">
                  <span className="marketplace-card-name">{pkg.name}</span>
                  <span className="marketplace-card-version">v{pkg.latestVersion}</span>
                </div>
                {pkg.description && (
                  <p className="marketplace-card-description">{pkg.description}</p>
                )}
                <div className="marketplace-card-meta">
                  <span className="marketplace-card-category">{pkg.category}</span>
                  <span className="marketplace-card-date">
                    {new Date(pkg.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected package detail */}
      {selectedPackage && (
        <div className="marketplace-detail">
          <div className="marketplace-detail-header">
            <h3>{selectedPackage.name}</h3>
            <button className="marketplace-detail-close" onClick={() => setSelectedId(null)}>
              <X size={14} />
            </button>
          </div>
          <div className="marketplace-detail-body">
            <p className="marketplace-detail-description">
              {selectedPackage.description || 'No description provided.'}
            </p>
            <div className="marketplace-detail-meta">
              <span>Version: {selectedPackage.latestVersion}</span>
              <span>Category: {selectedPackage.category}</span>
              <span>Published: {new Date(selectedPackage.createdAt).toLocaleDateString()}</span>
            </div>
            <button
              className="marketplace-install-btn"
              onClick={() => handleInstall(selectedPackage)}
            >
              Install Package
            </button>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="marketplace-pagination">
          <button
            className="marketplace-page-btn"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft size={14} />
          </button>
          <span className="marketplace-page-info">
            Page {page} of {totalPages}
          </span>
          <button
            className="marketplace-page-btn"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};