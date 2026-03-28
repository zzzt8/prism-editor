/**
 * Button Component
 *
 * @package @prism/shared-ui
 * @description Multi-variant button with size, loading, and icon support.
 */

import React from 'react';
import { Loader2 } from 'lucide-react';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Shows a spinning loader and disables interaction */
  loading?: boolean;
  /** Leading icon element */
  icon?: React.ReactNode;
  /** Trailing icon element */
  trailingIcon?: React.ReactNode;
  /** Makes the button full-width */
  fullWidth?: boolean;
  /** Button label (used as children) */
  children?: React.ReactNode;
}

/**
 * Unified button component using design token CSS variables.
 *
 * @example
 * ```tsx
 * // Primary
 * <Button variant="primary" onClick={handleSave}>保存</Button>
 *
 * // Ghost with icon
 * <Button variant="ghost" icon={<Settings size={16} />}>设置</Button>
 *
 * // Loading state
 * <Button variant="primary" loading>保存</Button>
 * ```
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  trailingIcon,
  fullWidth = false,
  children,
  disabled,
  className = '',
  ...rest
}) => {
  const isDisabled = disabled || loading;

  const classNames = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : '',
    loading ? styles.loading : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={classNames}
      disabled={isDisabled}
      aria-busy={loading}
      {...rest}
    >
      {loading && (
        <span className={`${styles.spinner} icon-spin`} aria-hidden="true">
          <Loader2 size={size === 'sm' ? 12 : size === 'lg' ? 18 : 14} />
        </span>
      )}

      {!loading && icon && (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      )}

      {children && <span className={styles.label}>{children}</span>}

      {!loading && trailingIcon && (
        <span className={styles.trailingIcon} aria-hidden="true">
          {trailingIcon}
        </span>
      )}
    </button>
  );
};
