/**
 * VersionList - Component for displaying a list of workflow versions
 */

import React from 'react';
import { RotateCcw, GitCompare, ChevronLeft, ChevronRight } from 'lucide-react';

interface VersionSummary {
  id: string;
  version: string;
  createdBy: string | null;
  createdAt: string;
}

interface VersionListProps {
  versions: VersionSummary[];
  currentVersion: string;
  selectedVersions: string[];
  loading: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onSelect: (_versionId: string) => void;
  onCompare: () => void;
  onRollback: (_version: VersionSummary) => void;
  onPageChange: (_page: number) => void;
  canCompare: boolean;
  diffLoading: boolean;
}

export function VersionList({
  versions,
  currentVersion,
  selectedVersions,
  loading,
  pagination,
  onSelect,
  onCompare,
  onRollback,
  onPageChange,
  canCompare,
  diffLoading,
}: VersionListProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && versions.length === 0) {
    return (
      <div className="version-list-loading">
        <div className="loading-spinner" />
        <span>加载中...</span>
      </div>
    );
  }

  return (
    <div className="version-list">
      <div className="version-list-actions">
        <button
          className="version-compare-btn"
          onClick={onCompare}
          disabled={!canCompare || diffLoading}
        >
          <GitCompare size={16} />
          {diffLoading ? '对比中...' : '对比选中版本'}
        </button>
        <span className="version-selection-hint">
          已选择 {selectedVersions.length}/2 个版本
        </span>
      </div>

      <div className="version-list-container">
        {versions.length === 0 ? (
          <div className="version-list-empty">
            <p>暂无版本记录</p>
            <span>保存工作流时会自动创建版本</span>
          </div>
        ) : (
          <ul className="version-list-items">
            {versions.map((version) => (
              <li
                key={version.id}
                className={`version-item ${
                  selectedVersions.includes(version.id) ? 'selected' : ''
                } ${version.version === currentVersion ? 'current' : ''}`}
              >
                <label className="version-checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedVersions.includes(version.id)}
                    onChange={() => onSelect(version.id)}
                    disabled={
                      !selectedVersions.includes(version.id) && selectedVersions.length >= 2
                    }
                  />
                  <div className="version-info">
                    <div className="version-header">
                      <span className="version-number">v{version.version}</span>
                      {version.version === currentVersion && (
                        <span className="version-current-badge">当前</span>
                      )}
                    </div>
                    <div className="version-meta">
                      <span className="version-date">{formatDate(version.createdAt)}</span>
                      {version.createdBy && (
                        <span className="version-author">{version.createdBy}</span>
                      )}
                    </div>
                  </div>
                </label>

                                {/* Hide rollback button for current version only */}
                {version.version !== currentVersion && (
                  <button
                    className="version-rollback-btn"
                    onClick={() => onRollback(version)}
                    title="回滚到此版本"
                  >
                    <RotateCcw size={16} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="version-pagination">
          <button
            className="pagination-btn"
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="pagination-info">
            第 {pagination.page} / {pagination.totalPages} 页，共 {pagination.total} 条
          </span>
          <button
            className="pagination-btn"
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
