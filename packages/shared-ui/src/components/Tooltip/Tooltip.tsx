/**
 * Tooltip Component
 *
 * @package @prism/shared-ui
 * @description Hover-triggered floating tooltip with positioning.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import styles from './Tooltip.module.css';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  /** The element that triggers the tooltip */
  children: React.ReactNode;
  /** Tooltip text content */
  content: React.ReactNode;
  /** Placement of the tooltip relative to the trigger */
  position?: TooltipPosition;
  /** Delay in ms before showing (default 400) */
  delay?: number;
  className?: string;
}

/**
 * Wraps any React element with a hover-triggered tooltip.
 *
 * @example
 * ```tsx
 * <Tooltip content="保存工作流">
 *   <button><Save size={16} /> 保存</button>
 * </Tooltip>
 * ```
 */
export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  position = 'top',
  delay = 400,
  className = '',
}) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const computePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const GAP = 6;

    let top = 0, left = 0;
    switch (position) {
      case 'top':
        top = rect.top + window.scrollY - GAP;
        left = rect.left + window.scrollX + rect.width / 2;
        break;
      case 'bottom':
        top = rect.bottom + window.scrollY + GAP;
        left = rect.left + window.scrollX + rect.width / 2;
        break;
      case 'left':
        top = rect.top + window.scrollY + rect.height / 2;
        left = rect.left + window.scrollX - GAP;
        break;
      case 'right':
        top = rect.top + window.scrollY + rect.height / 2;
        left = rect.right + window.scrollX + GAP;
        break;
    }

    setCoords({ top, left });
  }, [position]);

  const handleMouseEnter = () => {
    showTimer.current = setTimeout(() => {
      computePosition();
      setVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (showTimer.current) clearTimeout(showTimer.current);
    setVisible(false);
  };

  // Recompute on scroll/resize
  useEffect(() => {
    if (!visible) return;
    const handleUpdate = () => { computePosition(); };
    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);
    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [visible, computePosition]);

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={styles.trigger}
      >
        {children}
      </span>

      {visible && (
        <span
          className={`${styles.tooltip} ${styles[position]} ${className}`}
          style={{ top: coords.top, left: coords.left }}
          role="tooltip"
        >
          {content}
        </span>
      )}
    </>
  );
};
