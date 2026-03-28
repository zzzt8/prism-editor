/**
 * Icon System - Lucide React Icon Exports
 *
 * @package @prism/shared-ui
 *
 * ## Size Conventions
 * | Size | Value | Use Case |
 * |------|-------|----------|
 * | sm   | 14px  | Tight label contexts |
 * | md   | 16px  | Default — icon+text buttons |
 * | lg   | 18px  | Standalone icon buttons |
 * | xl   | 20px  | Section headers |
 * | 2xl  | 24px  | Empty-state illustrations |
 *
 * Icons use `currentColor` — do NOT hardcode colors.
 * Wrap animated icons with `.icon-spin` CSS class.
 *
 * @example
 * ```tsx
 * import { Image, Upload, Play } from '@prism/shared-ui';
 *
 * // Icon + text button
 * <button><Image size={16} /> 图片</button>
 *
 * // Animated loading icon
 * <span className="icon-spin"><Loader2 size={16} /></span>
 * ```
 */

import {
  type LucideProps,
  Image,
  FileImage,
  FileText,
  Upload,
  Download,
  Save,
  FolderOpen,
  Play,
  Pause,
  Square,
  RotateCcw,
  Trash2,
  Copy,
  Settings,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Plus,
  Minus,
  X,
  Check,
  AlertCircle,
  AlertTriangle,
  Info,
  Search,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  Loader2,
  Box,
  GitBranch,
  Layers,
  Grid3X3,
  MoreHorizontal,
  MoreVertical,
  ExternalLink,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
} from 'lucide-react';

export type { LucideProps };
export {
  Image, FileImage, FileText, Upload, Download, Save, FolderOpen,
  Play, Pause, Square, RotateCcw, Trash2, Copy, Settings, SlidersHorizontal,
  ChevronDown, ChevronRight, ChevronLeft, Plus, Minus, X, Check,
  AlertCircle, AlertTriangle, Info, Search, Eye, EyeOff, Lock, Unlock,
  CheckCircle2, XCircle, Loader2,
  Box, GitBranch, Layers, Grid3X3,
  MoreHorizontal, MoreVertical, ExternalLink, RefreshCw,
  ZoomIn, ZoomOut, Maximize2, Minimize2,
};

/**
 * Icon component map — enables dynamic icon lookup by string key.
 * Usage: `const Icon = ICON_MAP[iconName]`
 */
export const ICON_MAP = {
  // Workflow
  play: { icon: Play, label: '运行' },
  pause: { icon: Pause, label: '暂停' },
  stop: { icon: Square, label: '停止' },
  reset: { icon: RotateCcw, label: '重置' },
  delete: { icon: Trash2, label: '删除' },
  copy: { icon: Copy, label: '复制' },
  settings: { icon: Settings, label: '设置' },
  params: { icon: SlidersHorizontal, label: '参数' },

  // File
  image: { icon: Image, label: '图片' },
  upload: { icon: Upload, label: '上传' },
  download: { icon: Download, label: '下载' },
  save: { icon: Save, label: '保存' },
  open: { icon: FolderOpen, label: '打开' },

  // Status
  check: { icon: CheckCircle2, label: '成功' },
  error: { icon: XCircle, label: '错误' },
  warning: { icon: AlertTriangle, label: '警告' },
  info: { icon: Info, label: '提示' },
  loading: { icon: Loader2, label: '加载中' },

  // Navigation
  search: { icon: Search, label: '搜索' },
  close: { icon: X, label: '关闭' },
  expand: { icon: Maximize2, label: '展开' },
  collapse: { icon: Minimize2, label: '收起' },
} as const;

/**
 * Union type of all available icon keys in the icon map.
 */
export type IconKey = keyof typeof ICON_MAP;
