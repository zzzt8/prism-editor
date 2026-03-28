/**
 * Card Component
 *
 * @package @prism/shared-ui
 * @description Container card with header, body, and optional hover state.
 */

import React from 'react';
import styles from './Card.module.css';

export interface CardProps {
  /** Card title */
  title?: React.ReactNode;
  /** Subtitle below title */
  subtitle?: React.ReactNode;
  /** Card body content */
  children?: React.ReactNode;
  /** Adds hover shadow/background transition */
  hoverable?: boolean;
  /** Additional CSS class */
  className?: string;
  /** Click handler — adds pointer cursor */
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  /** Padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Header action slot (right side) */
  action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  hoverable = false,
  className = '',
  onClick,
  padding = 'md',
  action,
}) => {
  const cardClass = [
    styles.card,
    hoverable ? styles.hoverable : '',
    onClick ? styles.clickable : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClass} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      {(title || subtitle || action) && (
        <div className={styles.header}>
          <div className={styles.headerText}>
            {title && <div className={styles.title}>{title}</div>}
            {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
          </div>
          {action && <div className={styles.action}>{action}</div>}
        </div>
      )}

      {children && (
        <div className={`${styles.body} ${styles[`pad-${padding}`]}`}>
          {children}
        </div>
      )}
    </div>
  );
};
