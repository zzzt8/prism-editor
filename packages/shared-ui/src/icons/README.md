/**
 * Icon Usage Guide
 *
 * ## Size Conventions
 *
 * | Size | Value | Use Case |
 * |------|-------|----------|
 * | xs   | 12px  | Badge text, chip labels |
 * | sm   | 14px  | Tight label contexts |
 * | md   | 16px  | Default — icon+text buttons |
 * | lg   | 18px  | Standalone icon buttons |
 * | xl   | 20px  | Section headers |
 * | 2xl  | 24px  | Empty-state illustrations |
 *
 * ## Color Conventions
 *
 * Icons use `currentColor` — they inherit color from their CSS parent.
 * Control icon color via:
 * - CSS `color` property on the parent element
 * - Utility classes (e.g., `.text-muted`, `.text-accent`)
 *
 * ## Animated Icons
 *
 * Spinner/loading icons should be wrapped with the `.icon-spin` CSS class:
 *
 * ```tsx
 * <span className="icon-spin"><Loader2 size={16} /></span>
 * ```
 *
 * ## Category-Based Icons
 *
 * | Category | Recommended Icons |
 * |----------|------------------|
 * | Input    | `Image`, `Upload`, `FileImage` |
 * | Transform| `RotateCcw`, `Maximize2`, `Crop` |
 * | Mask     | `Box`, `Layers` |
 * | Composite| `Layers`, `Grid3X3` |
 * | Output   | `Download`, `Save` |
 *
 * ## Accessibility
 *
 * When using icons without visible text:
 * ```tsx
 * <button aria-label="删除">
 *   <Trash2 size={16} aria-hidden="true" />
 * </button>
 * ```
 */
