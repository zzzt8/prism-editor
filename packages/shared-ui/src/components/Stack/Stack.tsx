/**
 * Stack Components — VStack, HStack, and Stack
 *
 * @package @prism/shared-ui
 *
 * Provides a clean way to compose flexbox layouts without writing custom CSS.
 *
 * @example
 * ```tsx
 * // Vertical stack with gap
 * <VStack gap="md" align="stretch">
 *   <Card />
 *   <Card />
 * </VStack>
 *
 * // Horizontal stack with gap
 * <HStack gap="sm" justify="space-between">
 *   <Button />
 *   <Button />
 * </HStack>
 * ```
 */

import React from 'react';

export type StackJustify =
  | 'flex-start' | 'flex-end' | 'center'
  | 'space-between' | 'space-around' | 'space-evenly';
export type StackAlign = 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
export type StackWrap = 'nowrap' | 'wrap' | 'wrap-reverse';
export type StackSize = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** Maps named gap sizes to CSS spacing variables */
const gapMap: Record<StackSize, string | undefined> = {
  none: '0',
  xs:   'var(--space-1, 4px)',
  sm:   'var(--space-2, 8px)',
  md:   'var(--space-3, 12px)',
  lg:   'var(--space-4, 16px)',
  xl:   'var(--space-6, 24px)',
};

export interface StackProps {
  /** Flex direction */
  direction?: 'horizontal' | 'vertical';
  /** Gap between children */
  gap?: StackSize;
  /** How children are distributed along the main axis */
  justify?: StackJustify;
  /** How children are aligned on the cross axis */
  align?: StackAlign;
  /** Whether children wrap */
  wrap?: StackWrap;
  /** Full width */
  fullWidth?: boolean;
  /** Full height */
  fullHeight?: boolean;
  /** Additional CSS class */
  className?: string;
  /** Children */
  children?: React.ReactNode;
  /** HTML element type */
  as?: keyof JSX.IntrinsicElements;
}

const directionMap: Record<string, React.CSSProperties['flexDirection']> = {
  horizontal: 'row',
  vertical:   'column',
};

const wrapMap: Record<StackWrap, React.CSSProperties['flexWrap']> = {
  nowrap:      'nowrap',
  wrap:       'wrap',
  'wrap-reverse': 'wrap-reverse',
};

/** Base stack implementation */
export const Stack: React.FC<StackProps> = ({
  direction = 'vertical',
  gap = 'md',
  justify = 'flex-start',
  align = 'stretch',
  wrap = 'nowrap',
  fullWidth = false,
  fullHeight = false,
  className = '',
  children,
  as: Tag = 'div',
}) => {
  const style: React.CSSProperties = {
    display: 'flex',
    flexDirection: directionMap[direction],
    gap: gapMap[gap],
    justifyContent: justify,
    alignItems: align,
    flexWrap: wrapMap[wrap],
    width:  fullWidth ? '100%' : undefined,
    height: fullHeight ? '100%' : undefined,
  };

  return (
    <Tag style={style} className={className}>
      {children}
    </Tag>
  );
};

/** Horizontal Stack — children laid out in a row */
export const HStack: React.FC<Omit<StackProps, 'direction'>> = (props) => (
  <Stack {...props} direction="horizontal" />
);

/** Vertical Stack — children laid out in a column */
export const VStack: React.FC<Omit<StackProps, 'direction'>> = (props) => (
  <Stack {...props} direction="vertical" />
);
