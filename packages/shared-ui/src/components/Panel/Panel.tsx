/**
 * Panel Component
 *
 * @package @prism/shared-ui
 * @description Reusable sidebar/panel container for dev-tool and user-app layouts.
 */

import React from 'react';
import styles from './Panel.module.css';

export type PanelSize = 'sm' | 'md' | 'lg';

export interface PanelProps {
  /** Panel title */
  title?: React.ReactNode;
  /** Header action slot */
  action?: React.ReactNode;
  /** Panel body content */
  children?: React.ReactNode;
  /** Footer slot */
  footer?: React.ReactNode;
  /** Panel width preset */
  size?: PanelSize;
  /** Custom width (overrides size) */
  width?: string;
  /** Whether to show a resize handle (future) */
  resizable?: boolean;
  /** CSS class */
  className?: string;
}

/**
 * A collapsible sidebar/panel container.
 *
 * @example
 * ```tsx
 * <Panel title="节点参数" action={<Button size="sm">帮助</Button>}>
 *   <ParamForm />
 * </Panel>
 * ```
 */
export const Panel: React.FC<PanelProps> = ({
  title,
  action,
  children,
  footer,
  size = 'md',
  width,
  className = '',
}) => {
  const panelStyle: React.CSSProperties = width ? { width } : {};

  const panelClass = [
    styles.panel,
    styles[size],
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={panelClass} style={panelStyle}>
      {(title || action) && (
        <div className={styles.header}>
          {title && <div className={styles.title}>{title}</div>}
          {action && <div className={styles.action}>{action}</div>}
        </div>
      )}

      {children && (
        <div className={styles.body}>
          {children}
        </div>
      )}

      {footer && (
        <div className={styles.footer}>
          {footer}
        </div>
      )}
    </div>
  );
};
