/**
 * Design Token TypeScript Types
 *
 * @package @prism/shared-ui
 *
 * Type-safe access to design token values.
 * These mirror the CSS variables defined in tokens/*.css.
 *
 * @example
 * ```tsx
 * import { tokens, type ColorTokens } from '@prism/shared-ui';
 *
 * // Access a token value
 * const bg = tokens.color.bg.canvas;
 *
 * // Type-safe token objects
 * const successColor: string = tokens.color.status.success;
 * ```
 */

export interface ColorTokens {
  bg: {
    canvas:   string;
    surface:  string;
    elevated: string;
    hover:    string;
  };
  border: {
    subtle:  string;
    default: string;
    strong:  string;
  };
  text: {
    primary:   string;
    secondary: string;
    tertiary:  string;
    disabled:  string;
  };
  accent: {
    primary: string;
    hover:   string;
    muted:   string;
  };
  status: {
    success: string;
    warning: string;
    error:   string;
    info:    string;
  };
  port: {
    image:  string;
    mask:   string;
    number: string;
  };
}

export interface SpacingTokens {
  space: {
    1:  string; 2:  string; 3:  string; 4:  string;
    5:  string; 6:  string; 8:  string; 10: string; 12: string;
  };
  radius: {
    sm:   string;
    md:   string;
    lg:   string;
    xl:   string;
    full: string;
  };
  panel: {
    widthSm: string;
    widthMd: string;
    widthLg: string;
  };
  headerHeight: string;
  inputHeight:  string;
}

export interface TypographyTokens {
  font: {
    sans:  string;
    mono:  string;
  };
  size: {
    xs:   string;
    sm:   string;
    base: string;
    lg:   string;
    xl:   string;
    '2xl': string;
  };
  leading: {
    tight:  string;
    normal: string;
    loose:  string;
  };
  weight: {
    regular:  string;
    medium:   string;
    semibold: string;
    bold:     string;
  };
  tracking: {
    tightest: string;
    tight:    string;
    normal:   string;
    wide:     string;
    widest:   string;
  };
}

export interface DesignTokens {
  color:  ColorTokens;
  space:  SpacingTokens;
  type:   TypographyTokens;
}

/**
 * Runtime token values — mirrors the CSS variables.
 * Use these when you need programmatic access to token values
 * (e.g., for canvas drawing, dynamic styling).
 *
 * Note: CSS variables take precedence at runtime.
 * These TypeScript values are for type safety and documentation.
 */
export const tokens: DesignTokens = {
  color: {
    bg: {
      canvas:   '#0D0D0F',
      surface:  '#141416',
      elevated: '#1A1A1D',
      hover:    '#222225',
    },
    border: {
      subtle:  '#2A2A2D',
      default: '#3A3A3D',
      strong:  '#4A4A4D',
    },
    text: {
      primary:   '#FFFFFF',
      secondary: '#A0A0A5',
      tertiary:  '#606065',
      disabled:  '#404045',
    },
    accent: {
      primary: '#6366F1',
      hover:   '#818CF8',
      muted:   'rgba(99, 102, 241, 0.15)',
    },
    status: {
      success: '#22C55E',
      warning: '#F59E0B',
      error:   '#EF4444',
      info:    '#3B82F6',
    },
    port: {
      image:  '#8B5CF6',
      mask:   '#06B6D4',
      number: '#F59E0B',
    },
  },
  space: {
    space: {
      1:  '4px',  2:  '8px',  3:  '12px', 4:  '16px',
      5:  '20px', 6:  '24px', 8:  '32px', 10: '40px', 12: '48px',
    },
    radius: {
      sm:   '4px',
      md:   '6px',
      lg:   '8px',
      xl:   '12px',
      full: '9999px',
    },
    panel: {
      widthSm: '200px',
      widthMd: '240px',
      widthLg: '320px',
    },
    headerHeight: '48px',
    inputHeight:  '32px',
  },
  type: {
    font: {
      sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      mono: "'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
    },
    size: {
      xs:   '11px',
      sm:   '13px',
      base: '14px',
      lg:   '16px',
      xl:   '18px',
      '2xl': '24px',
    },
    leading: {
      tight:  '1.25',
      normal: '1.5',
      loose:  '1.75',
    },
    weight: {
      regular:  '400',
      medium:   '500',
      semibold: '600',
      bold:     '700',
    },
    tracking: {
      tightest: '-0.02em',
      tight:    '-0.01em',
      normal:   '0em',
      wide:     '0.05em',
      widest:   '0.1em',
    },
  },
};
