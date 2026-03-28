/**
 * UserLayout — Main layout shell for the user-facing workflow app.
 *
 * @package @prism/user-app
 *
 * Single-column layout with a top header bar and a fixed-width inputs sidebar
 * flanking the main content area (run/results):
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    [Logo]  Workflow Name                    │
 * ├──────────────────┬──────────────────────────────────────────┤
 * │                  │                                          │
 * │  Inputs Panel    │         Main Content Area                  │
 * │  (360px fixed)   │         (flex: 1)                        │
 * │                  │                                          │
 * │  - WorkflowTitle │         - Results                        │
 * │  - InputSection  │         - OutputSection                  │
 * │  - ParamsSection │                                          │
 * │  - RunSection    │                                          │
 * │                  │                                          │
 * └──────────────────┴──────────────────────────────────────────┘
 * ```
 *
 * ## Usage
 *
 * ```tsx
 * import { UserLayout } from './layouts/UserLayout';
 *
 * <UserLayout
 *   header={<WorkflowHeader title="..." description="..." />}
 *   sidebar={<InputSection ... />}
 * >
 *   <OutputSection ... />
 * </UserLayout>
 * ```
 */

import React from 'react';

interface UserLayoutProps {
  /** Top header — contains logo, title, description, back button */
  header: React.ReactNode;
  /** Left sidebar — input params, exposed params, run button */
  sidebar: React.ReactNode;
  /** Main content area — progress, results, outputs */
  children: React.ReactNode;
}

export const UserLayout: React.FC<UserLayoutProps> = ({
  header,
  sidebar,
  children,
}) => {
  return (
    <div className="ua-page ua-run-page">
      {/* Top header bar */}
      <div className="ua-run-header">
        {header}
      </div>

      {/* Two-column body: sidebar (inputs) + main content (results) */}
      <div className="ua-run-body">
        <aside className="ua-run-inputs">
          {sidebar}
        </aside>

        <main className="ua-run-results">
          {children}
        </main>
      </div>
    </div>
  );
};
