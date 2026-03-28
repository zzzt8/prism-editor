/**
 * DevToolLayout — Main layout shell for the developer tool.
 *
 * @package @prism/dev-tool
 *
 * Three-column layout:
 *   [Left Panel 240px] [Canvas flex] [Right Panel 320px]
 * Plus top header bar (48px).
 *
 * ## Layout Spec (from ui-design-system design.md)
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │  Logo   Workflow Name    [Save] [Run] [Publish]    Settings │  ← 48px
 * ├──────────┬─────────────────────────────────┬───────────────┤
 * │  240px  │           flex                 │     320px     │
 * │ LeftPanel│         Canvas                 │  RightPanel   │
 * └──────────┴─────────────────────────────────┴───────────────┘
 * ```
 *
 * Note: The `header` slot renders WorkflowHeader directly.
 * WorkflowHeader itself contains `<header class="dev-tool-header">`
 * so no additional wrapping element is needed here.
 *
 * ## Usage
 *
 * ```tsx
 * import { DevToolLayout } from './layouts/DevToolLayout';
 *
 * <DevToolLayout
 *   header={<WorkflowHeader />}
 *   left={<NodePanel />}
 *   right={<ParamPanel />}
 * >
 *   <WorkflowCanvas />
 * </DevToolLayout>
 * ```
 */

import React from 'react';

interface DevToolLayoutProps {
  /** Header bar content (WorkflowHeader renders its own <header>) */
  header: React.ReactNode;
  /** Left sidebar (node panel) */
  left: React.ReactNode;
  /** Right sidebar (param panel) */
  right: React.ReactNode;
  /** Main canvas area — children */
  children: React.ReactNode;
  leftVisible?: boolean;
  rightVisible?: boolean;
}

export const DevToolLayout: React.FC<DevToolLayoutProps> = ({
  header,
  left,
  right,
  children,
  leftVisible = true,
  rightVisible = true,
}) => {
  return (
    <div className="dev-tool-layout">
      {/* Header — WorkflowHeader renders <header class="dev-tool-header"> */}
      {header}

      {/* Body — three-column layout */}
      <div className="dev-tool-body">
        {/* Left panel — node library */}
        <aside
          className={`dev-tool-left-panel ${!leftVisible ? 'dev-tool-left-panel--hidden' : ''}`}
        >
          {left}
        </aside>

        {/* Center — canvas */}
        <main className="dev-tool-canvas-area">
          {children}
        </main>

        {/* Right panel — param editor */}
        <aside
          className={`dev-tool-right-panel ${!rightVisible ? 'dev-tool-right-panel--hidden' : ''}`}
        >
          {right}
        </aside>
      </div>
    </div>
  );
};
