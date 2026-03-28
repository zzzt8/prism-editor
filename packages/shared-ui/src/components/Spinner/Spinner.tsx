/**
 * Spinner Component
 *
 * @package @prism/shared-ui
 * @description Animated loading indicator using SVG and CSS animation.
 */

import React from 'react';
import styles from './Spinner.module.css';

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps {
  /** Size of the spinner */
  size?: SpinnerSize;
  /** Color of the spinner arc (defaults to currentColor) */
  color?: string;
  /** CSS class for the wrapper */
  className?: string;
  /** Accessible label for screen readers */
  label?: string;
}

/**
 * Renders an animated SVG circle spinner.
 * Use `.icon-spin` class from shared-ui for the animation.
 *
 * @example
 * ```tsx
 * <Spinner size="md" />
 * <Spinner size="sm" color="var(--status-success)" />
 * ```
 */
export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color,
  className = '',
  label = '加载中',
}) => {
  const sizeMap: Record<SpinnerSize, number> = {
    sm: 16,
    md: 24,
    lg: 32,
  };

  const pixelSize = sizeMap[size];
  const strokeWidth = size === 'sm' ? 2 : size === 'lg' ? 2.5 : 2;
  const r = (pixelSize - strokeWidth) / 2;
  const cx = pixelSize / 2;
  const cy = pixelSize / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <span
      className={`${styles.spinner} icon-spin ${className}`}
      role="status"
      aria-label={label}
    >
      <svg
        width={pixelSize}
        height={pixelSize}
        viewBox={`0 0 ${pixelSize} ${pixelSize}`}
        fill="none"
        aria-hidden="true"
      >
        {/* Background track */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={color ?? 'var(--border-default, #3A3A3D)'}
          strokeWidth={strokeWidth}
        />
        {/* Animated arc — .icon-spin { animation: rotate } drives the rotation */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={color ?? 'var(--accent-primary, #6366F1)'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference * 0.75} ${circumference}`}
          style={{ transformOrigin: 'center' }}
        />
      </svg>
    </span>
  );
};
