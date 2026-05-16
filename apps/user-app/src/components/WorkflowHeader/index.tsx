/**
 * WorkflowHeader — Top bar for the user workflow run page.
 *
 * @package @prism/user-app
 *
 * Contains: back button, dev-tool-style logo, title, version badge, and description.
 * Style aligned with dev-tool's wf-header.
 */

import React from 'react';

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
      {/* Back button */}
      <button className="ua-back-btn" onClick={onBack}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        返回
      </button>

      {/* Logo — dev-tool style */}
      <div className="wf-logo-group" style={{ flexShrink: 0 }}>
        <div className="wf-logo-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" />
            <circle cx="12" cy="12" r="3" fill="white" stroke="none" />
          </svg>
        </div>
        <span className="wf-logo-text">Prism Editor</span>
      </div>

      {/* Separator */}
      <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 15, flexShrink: 0 }}>/</span>

      {/* Title group */}
      <div className="ua-run-title-group">
        <h1 className="ua-run-title">{title}</h1>
        {version && (
          <span className="ua-run-version">v{version}</span>
        )}
      </div>

      {description && (
        <p className="ua-run-desc">{description}</p>
      )}
    </>
  );
};
