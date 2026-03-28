/**
 * @prism/shared-ui — Main Entry Point
 *
 * Re-exports all public APIs from the shared UI package.
 *
 * ## Usage
 *
 * ```tsx
 * // Import tokens CSS (registers CSS variables on :root)
 * import '@prism/shared-ui/styles/tokens.css';
 *
 * // Import component base styles
 * import '@prism/shared-ui/styles/components.css';
 *
 * // Use icons
 * import { Image, Upload, Play } from '@prism/shared-ui';
 *
 * // Use token types
 * import { tokens, type ColorTokens } from '@prism/shared-ui';
 * ```
 */

// ── Icons ──────────────────────────────────────────────────────────────────

export {
  // Workflow
  Play, Pause, Square, RotateCcw, Trash2, Copy, Settings, SlidersHorizontal,
  // File
  Image, FileImage, FileText, Upload, Download, Save, FolderOpen,
  // UI / Navigation
  ChevronDown, ChevronRight, ChevronLeft, Plus, Minus, X, Check,
  AlertCircle, AlertTriangle, Info, Search, Eye, EyeOff, Lock, Unlock,
  // Status
  CheckCircle2, XCircle, Loader2,
  // Nodes / Canvas
  Box, GitBranch, Layers, Grid3X3,
  // Misc
  MoreHorizontal, MoreVertical, ExternalLink, RefreshCw, ZoomIn, ZoomOut,
  Maximize2, Minimize2,
} from './icons';

export { ICON_MAP, type IconKey } from './icons';

// ── Design Tokens ──────────────────────────────────────────────────────────

export { tokens, type ColorTokens, type SpacingTokens, type TypographyTokens, type DesignTokens } from './types/tokens';

// ── Components ───────────────────────────────────────────────────────────────

export * from './components';
