/**
 * RunSection — Run button and error display for the user workflow run page.
 *
 * @package @prism/user-app
 *
 * Renders the primary "执行工作流" action button with loading state,
 * plus inline validation errors from the last run attempt.
 *
 * ## States
 *
 * | RunState.status | Button appearance                    |
 * |-----------------|--------------------------------------|
 * | idle            | Green "执行工作流" button              |
 * | running         | Red "执行中…" with spinner (disabled) |
 * | done / error    | Green "执行工作流" (re-run allowed)   |
 */

import React from 'react';
import type { RunState } from '../../modules/runner/runStore';

export interface RunSectionProps {
  runState: RunState;
  onRun: () => void;
  onCancel: () => void;
}

export const RunSection: React.FC<RunSectionProps> = ({ runState, onRun, onCancel }) => {
  const isRunning = runState.status === 'running';
  const isCancelling = runState.status === 'cancelling';

  return (
    <>
      {/* Error message from last run attempt */}
      {runState.status === 'error' && (
        <div className="ua-run-error">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {runState.error}
        </div>
      )}

      {/* Run / Cancel button */}
      <button
        className={`ua-run-btn ua-run-btn--${isRunning || isCancelling ? 'running' : 'ready'}`}
        onClick={isRunning ? onCancel : onRun}
        disabled={isCancelling}
      >
        {isCancelling ? (
          <>
            <span className="ua-spinner ua-spinner--white" />
            正在取消…
          </>
        ) : isRunning ? (
          <>
            <span className="ua-spinner ua-spinner--white" />
            取消执行
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            执行工作流
          </>
        )}
      </button>
    </>
  );
};
