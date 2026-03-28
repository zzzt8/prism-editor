/**
 * WorkflowHeader — Top bar for the user workflow run page.
 *
 * @package @prism/user-app
 *
 * Contains: back button, workflow logo, title, version badge, and description.
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
      <button className="ua-back-btn" onClick={onBack}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        返回
      </button>

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
