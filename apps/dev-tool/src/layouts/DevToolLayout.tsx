/**
 * DevToolLayout — Main layout shell for the developer tool.
 *
 * @package @prism/dev-tool
 *
 * Three-column layout:
 *   [Left Panel 240px] [Canvas flex] [Right Panel 320px]
 * Plus top header bar (48px).
 *
 * Panel visibility is controlled via appStore (Zustand).
 */

import React from 'react';
import { useAppStore } from '../store/appStore';

interface DevToolLayoutProps {
  /** Header bar content (WorkflowHeader renders its own <header>) */
  header: React.ReactNode;
  /** Left sidebar (node panel) */
  left: React.ReactNode;
  /** Right sidebar (param panel) */
  right: React.ReactNode;
  /** Main canvas area — children */
  children: React.ReactNode;
  /** Dialog overlays (e.g. PublishDialog) */
  dialogs?: React.ReactNode;
}

export const DevToolLayout: React.FC<DevToolLayoutProps> = ({
  header,
  left,
  right,
  children,
  dialogs,
}) => {
  const leftPanelOpen = useAppStore((s) => s.leftPanelOpen);
  const rightPanelOpen = useAppStore((s) => s.rightPanelOpen);

  return (
    <>
      <div className="dev-tool-layout">
        {/* Header — WorkflowHeader renders <header class="wf-header"> */}
        {header}

        {/* Body — three-column layout */}
        <div className="dev-tool-body">
          {/* Left panel — node library */}
          <aside
            className={`dev-tool-left-panel ${!leftPanelOpen ? 'dev-tool-left-panel--hidden' : ''}`}
          >
            {left}
          </aside>

          {/* Center — canvas */}
          <main className="dev-tool-canvas-area">
            {children}
          </main>

          {/* Right panel — param editor */}
          <aside
            className={`dev-tool-right-panel ${!rightPanelOpen ? 'dev-tool-right-panel--hidden' : ''}`}
          >
            {right}
          </aside>
        </div>
      </div>
      {/* Dialogs rendered outside the layout to avoid stacking context issues */}
      {dialogs}
    </>
  );
};
