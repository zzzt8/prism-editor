/**
 * Badge Component
 *
 * @package @prism/shared-ui
 * @description Status label/tag with semantic color variants.
 */

import React from 'react';
import styles from './Badge.module.css';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'accent';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  /** Visual variant — drives color */
  variant?: BadgeVariant;
  /** Badge size */
  size?: BadgeSize;
  /** Badge label text */
  children: React.ReactNode;
  /** Adds a filled background vs outline style */
  filled?: boolean;
  className?: string;
}

/**
 * Compact status badge for labeling nodes, inputs, and status.
 *
 * @example
 * ```tsx
 * <Badge variant="success">已发布</Badge>
 * <Badge variant="warning" size="sm">草稿</Badge>
 * <Badge variant="accent">NEW</Badge>
 * ```
 */
export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  children,
  filled = false,
  className = '',
}) => {
  const classNames = [
    styles.badge,
    styles[variant],
    styles[size],
    filled ? styles.filled : styles.outline,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classNames}>
      {children}
    </span>
  );
};
