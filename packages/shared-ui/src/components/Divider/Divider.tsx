/**
 * Divider Component
 *
 * @package @prism/shared-ui
 * @description Horizontal or vertical divider line.
 */

import React from 'react';
import styles from './Divider.module.css';

export type DividerVariant = 'solid' | 'dashed' | 'dotted';
export type DividerSpacing = 'none' | 'sm' | 'md' | 'lg';

const spacingMap: Record<DividerSpacing, React.CSSProperties['padding']> = {
  none: '0',
  sm:   'var(--space-2, 8px)',
  md:   'var(--space-3, 12px)',
  lg:   'var(--space-6, 24px)',
};

export interface DividerProps {
  /** Divider orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Line style */
  variant?: DividerVariant;
  /** Vertical spacing around the divider */
  spacing?: DividerSpacing;
  /** Custom color (defaults to --border-subtle) */
  color?: string;
  /** Thickness in px */
  thickness?: number;
  className?: string;
}

/**
 * A thin line that separates content sections.
 *
 * @example
 * ```tsx
 * <Divider />
 * <Divider variant="dashed" spacing="md" />
 * <Divider orientation="vertical" />
 * ```
 */
export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  variant = 'solid',
  spacing = 'md',
  color,
  thickness = 1,
  className = '',
}) => {
  const isVertical = orientation === 'vertical';

  const containerStyle: React.CSSProperties = isVertical
    ? { paddingLeft: spacingMap[spacing], paddingRight: spacingMap[spacing] }
    : { paddingTop: spacingMap[spacing], paddingBottom: spacingMap[spacing] };

  const lineStyle: React.CSSProperties = {
    flexShrink: 0,
    backgroundColor: color ?? 'var(--border-subtle, #2A2A2D)',
    border: 'none',
    ...(isVertical
      ? { width: `${thickness}px`, alignSelf: 'stretch' }
      : { height: `${thickness}px`, alignSelf: 'stretch', width: '100%' }
    ),
    borderRadius: '9999px',
  };

  if (variant === 'dashed') {
    lineStyle.backgroundImage = `linear-gradient(${isVertical ? 'to bottom' : 'to right'}, ${
      color ?? 'var(--border-subtle, #2A2A2D)'
    } 0%, ${
      color ?? 'var(--border-subtle, #2A2A2D)'
    } 50%, transparent 50%, transparent 100%)`;
    lineStyle.backgroundSize = `${isVertical ? `${thickness}px 6px` : `6px ${thickness}px`}`;
    lineStyle.backgroundRepeat = 'repeat';
    lineStyle.backgroundPosition = '0 0';
    lineStyle.backgroundColor = 'transparent';
  }

  if (variant === 'dotted') {
    lineStyle.backgroundImage = `radial-gradient(circle, ${
      color ?? 'var(--border-subtle, #2A2A2D)'
    } 1px, transparent 1px)`;
    lineStyle.backgroundSize = `${isVertical ? `${thickness}px 4px` : `4px ${thickness}px`}`;
    lineStyle.backgroundRepeat = 'repeat';
    lineStyle.backgroundPosition = '0 0';
    lineStyle.backgroundColor = 'transparent';
  }

  return (
    <div
      style={containerStyle}
      className={`${styles.divider} ${className}`}
      role="separator"
      aria-orientation={orientation}
    >
      <hr style={lineStyle} />
    </div>
  );
};
