/**
 * VersionDiff - Component for displaying version comparison results
 */

import React from 'react';
import { Plus, Minus, Edit } from 'lucide-react';

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

interface VersionDiffProps {
  diff: VersionDiffResult;
  onBack: () => void;
}

export function VersionDiff({ diff, _onBack }: VersionDiffProps) {
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

  const hasChanges =
    diff.nodes.added.length > 0 ||
    diff.nodes.removed.length > 0 ||
    diff.nodes.modified.length > 0 ||
    diff.connections.added.length > 0 ||
    diff.connections.removed.length > 0 ||
    diff.connections.modified.length > 0;

  return (
    <div className="version-diff">
      <div className="diff-header">
        <div className="diff-versions">
          <div className="diff-version from">
            <span className="diff-version-label">从</span>
            <span className="diff-version-number">v{diff.from.version}</span>
            <span className="diff-version-date">{formatDate(diff.from.createdAt)}</span>
          </div>
          <span className="diff-arrow">→</span>
          <div className="diff-version to">
            <span className="diff-version-label">到</span>
            <span className="diff-version-number">v{diff.to.version}</span>
            <span className="diff-version-date">{formatDate(diff.to.createdAt)}</span>
          </div>
        </div>
      </div>

      <div className="diff-content">
        {!hasChanges ? (
          <div className="diff-no-changes">
            <p>两个版本之间没有变化</p>
          </div>
        ) : (
          <>
            {/* Nodes Section */}
            <div className="diff-section">
              <h3 className="diff-section-title">节点变化</h3>

              {diff.nodes.added.length > 0 && (
                <div className="diff-group diff-added">
                  <h4 className="diff-group-title">
                    <Plus size={14} />
                    新增 ({diff.nodes.added.length})
                  </h4>
                  <ul className="diff-list">
                    {diff.nodes.added.map((node, i) => (
                      <li key={i} className="diff-item added">
                        {(node as { name?: string; type?: string }).name || (node as { name?: string; type?: string }).type || `Node ${i + 1}`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {diff.nodes.removed.length > 0 && (
                <div className="diff-group diff-removed">
                  <h4 className="diff-group-title">
                    <Minus size={14} />
                    删除 ({diff.nodes.removed.length})
                  </h4>
                  <ul className="diff-list">
                    {diff.nodes.removed.map((node, i) => (
                      <li key={i} className="diff-item removed">
                        {(node as { name?: string; type?: string }).name || (node as { name?: string; type?: string }).type || `Node ${i + 1}`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {diff.nodes.modified.length > 0 && (
                <div className="diff-group diff-modified">
                  <h4 className="diff-group-title">
                    <Edit size={14} />
                    修改 ({diff.nodes.modified.length})
                  </h4>
                  <ul className="diff-list">
                    {diff.nodes.modified.map((node, i) => (
                      <li key={i} className="diff-item modified">
                        {(node as { name?: string; type?: string }).name || (node as { name?: string; type?: string }).type || `Node ${i + 1}`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Connections Section */}
            <div className="diff-section">
              <h3 className="diff-section-title">连接变化</h3>

              {diff.connections.added.length > 0 && (
                <div className="diff-group diff-added">
                  <h4 className="diff-group-title">
                    <Plus size={14} />
                    新增 ({diff.connections.added.length})
                  </h4>
                  <ul className="diff-list">
                    {diff.connections.added.map((conn, i) => (
                      <li key={i} className="diff-item added">
                        Connection {i + 1}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {diff.connections.removed.length > 0 && (
                <div className="diff-group diff-removed">
                  <h4 className="diff-group-title">
                    <Minus size={14} />
                    删除 ({diff.connections.removed.length})
                  </h4>
                  <ul className="diff-list">
                    {diff.connections.removed.map((conn, i) => (
                      <li key={i} className="diff-item removed">
                        Connection {i + 1}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {diff.connections.modified.length > 0 && (
                <div className="diff-group diff-modified">
                  <h4 className="diff-group-title">
                    <Edit size={14} />
                    修改 ({diff.connections.modified.length})
                  </h4>
                  <ul className="diff-list">
                    {diff.connections.modified.map((conn, i) => (
                      <li key={i} className="diff-item modified">
                        Connection {i + 1}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
