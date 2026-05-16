/**
 * WorkflowHeader — Top bar for the user workflow run page.
 *
 * @package @prism/user-app
 *
 * Contains: back button, dev-tool-style logo, title, version badge, and description.
 * Style aligned with dev-tool's wf-header.
 */

import React from 'react';
import { Box } from 'lucide-react';

interface WorkflowHeaderProps {
  title: string;
  version?: string;
  description?: string;
  onBack: () => void;
}

export const WorkflowHeader: React.FC<WorkflowHeaderProps> = ({
  title,
  version,
  description,
  onBack,
}) => {
  return (
    <>
      {/* ── Left Zone ─────────────────────────── */}
      <div className="wf-header-left">
        {/* Back button */}
        <button className="ua-back-btn" onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          返回
        </button>

        {/* Logo — dev-tool style */}
        <div className="wf-logo-group">
          <div className="wf-logo-icon">
            <Box size={16} />
          </div>
          <span className="wf-logo-text">Prism Editor</span>
        </div>

        {/* Separator */}
        <span className="wf-sep">/</span>

        {/* Title */}
        <span className="wf-workflow-name">{title}</span>

        {/* Version badge */}
        {version && (
          <span className="ua-run-version">v{version}</span>
        )}
      </div>

      {/* ── Right Zone ────────────────────────── */}
      {description && (
        <div className="wf-header-right">
          <span className="ua-run-desc">{description}</span>
        </div>
      )}
    </>
  );
};
