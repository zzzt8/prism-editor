/**
 * RollbackConfirm - Confirmation dialog for rolling back to a specific version
 */

import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface VersionSummary {
  id: string;
  version: string;
  createdBy: string | null;
  createdAt: string;
}

interface RollbackConfirmProps {
  version: VersionSummary;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

export function RollbackConfirm({
  version,
  onConfirm,
  onCancel,
  loading,
}: RollbackConfirmProps) {
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

  return (
    <div className="rollback-confirm">
      <div className="rollback-warning">
        <AlertTriangle size={48} />
        <h3>确认回滚</h3>
        <p>此操作将覆盖当前工作流，无法撤销！</p>
      </div>

      <div className="rollback-details">
        <div className="rollback-version-info">
          <span className="rollback-label">将回滚到版本:</span>
          <span className="rollback-version">v{version.version}</span>
        </div>
        <div className="rollback-date-info">
          <span className="rollback-label">创建时间:</span>
          <span className="rollback-date">{formatDate(version.createdAt)}</span>
        </div>
      </div>

      <div className="rollback-actions">
        <button
          className="rollback-cancel-btn"
          onClick={onCancel}
          disabled={loading}
        >
          取消
        </button>
        <button
          className="rollback-confirm-btn"
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="loading-spinner small" />
              回滚中...
            </>
          ) : (
            <>
              <RotateCcw size={16} />
              确认回滚
            </>
          )}
        </button>
      </div>
    </div>
  );
}
