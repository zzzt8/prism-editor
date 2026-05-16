/**
 * VersionHistory - Modal component for viewing and managing workflow version history
 */

import React, { useState, useEffect } from 'react';
import { X, History, ChevronLeft } from 'lucide-react';
import { VersionList } from './VersionList';
import { VersionDiff } from './VersionDiff';
import { RollbackConfirm } from './RollbackConfirm';
import './VersionHistory.css';

interface VersionSummary {
  id: string;
  version: string;
  createdBy: string | null;
  createdAt: string;
}

interface VersionContent {
  id: string;
  version: string;
  content: string;
  createdBy: string | null;
  createdAt: string;
}

interface VersionDiffResult {
  from: { id: string; version: string; createdAt: string };
  to: { id: string; version: string; createdAt: string };
  nodes: {
    added: unknown[];
    removed: unknown[];
    modified: unknown[];
  };
  connections: {
    added: unknown[];
    removed: unknown[];
    modified: unknown[];
  };
}

interface VersionHistoryProps {
  workflowId: string;
  currentVersion: string;
  onClose: () => void;
  onRollbackComplete?: () => void;
  getVersions: (_page?: number, _limit?: number) => Promise<{
    data: VersionSummary[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>;
  getVersionContent: (_versionId: string) => Promise<VersionContent>;
  diffVersions: (_fromId: string, _toId: string) => Promise<VersionDiffResult>;
  rollbackWorkflow: (_versionId: string, _newVersion?: string) => Promise<void>;
}

type ViewMode = 'list' | 'diff' | 'confirm';

export function VersionHistory({
  workflowId,
  currentVersion,
  onClose,
  onRollbackComplete,
  getVersions,
  getVersionContent,
  diffVersions,
  rollbackWorkflow,
}: VersionHistoryProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Diff state
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [diffResult, setDiffResult] = useState<VersionDiffResult | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);

  // Rollback state
  const [rollbackVersion, setRollbackVersion] = useState<VersionSummary | null>(null);
  const [rollbackLoading, setRollbackLoading] = useState(false);

  useEffect(() => {
    loadVersions(1);
  }, [workflowId]);

  const loadVersions = async (page: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getVersions(page, 20);
      setVersions(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load versions');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    loadVersions(newPage);
  };

  const handleVersionSelect = (versionId: string) => {
    const newSelection = selectedVersions.includes(versionId)
      ? selectedVersions.filter((id) => id !== versionId)
      : selectedVersions.length < 2
        ? [...selectedVersions, versionId]
        : [selectedVersions[1], versionId];

    setSelectedVersions(newSelection);
  };

  const handleCompare = async () => {
    if (selectedVersions.length !== 2) return;

    setDiffLoading(true);
    try {
      const [older, newer] = selectedVersions.sort((a, b) => {
        const versionA = versions.find((v) => v.id === a);
        const versionB = versions.find((v) => v.id === b);
        return new Date(versionA!.createdAt).getTime() - new Date(versionB!.createdAt).getTime();
      });

      const result = await diffVersions(older, newer);
      setDiffResult(result);
      setViewMode('diff');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compare versions');
    } finally {
      setDiffLoading(false);
    }
  };

  const handleRollback = (version: VersionSummary) => {
    setRollbackVersion(version);
    setViewMode('confirm');
  };

  const confirmRollback = async () => {
    if (!rollbackVersion) return;

    setRollbackLoading(true);
    try {
      await rollbackWorkflow(rollbackVersion.id);
      onRollbackComplete?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rollback');
    } finally {
      setRollbackLoading(false);
    }
  };

  const handleBack = () => {
    setViewMode('list');
    setDiffResult(null);
    setRollbackVersion(null);
  };

  return (
    <div className="version-history-overlay">
      <div className="version-history-modal">
        <div className="version-history-header">
          <div className="version-history-title">
            <History size={20} />
            <h2>版本历史</h2>
          </div>
          <button className="version-history-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="version-history-content">
          {error && (
            <div className="version-history-error">
              <span>{error}</span>
              <button onClick={() => setError(null)}>×</button>
            </div>
          )}

          {viewMode === 'list' && (
            <VersionList
              versions={versions}
              currentVersion={currentVersion}
              selectedVersions={selectedVersions}
              loading={loading}
              pagination={pagination}
              onSelect={handleVersionSelect}
              onCompare={handleCompare}
              onRollback={handleRollback}
              onPageChange={handlePageChange}
              canCompare={selectedVersions.length === 2}
              diffLoading={diffLoading}
            />
          )}

          {viewMode === 'diff' && diffResult && (
            <VersionDiff
              diff={diffResult}
              onBack={handleBack}
            />
          )}

          {viewMode === 'confirm' && rollbackVersion && (
            <RollbackConfirm
              version={rollbackVersion}
              onConfirm={confirmRollback}
              onCancel={handleBack}
              loading={rollbackLoading}
            />
          )}
        </div>

        {viewMode !== 'list' && (
          <button className="version-history-back-btn" onClick={handleBack}>
            <ChevronLeft size={16} />
            返回列表
          </button>
        )}
      </div>
    </div>
  );
}
