# Design Token 使用指南

> **包**: `@prism/shared-ui`  
> **版本**: 1.0.0  
> **最后更新**: 2026-03-28

Design Token 是 Prism Editor UI 的底层变量层，通过 CSS 变量提供颜色、间距、字体等设计决策的集中管理。

## 快速开始

### 安装

`@prism/shared-ui` 已作为 workspace 依赖安装，无需额外安装。

### 导入 Token

在你的应用入口文件（如 `main.tsx`）顶部导入：

```tsx
import '@prism/shared-ui/styles/tokens.css';
import '@prism/shared-ui/styles/components.css';
```

这会将所有设计变量注册到 `:root`，所有子样式自动继承。

## 颜色 Token

### 背景层级

| Token             | 值       | 用途                     |
|-------------------|----------|--------------------------|
| `--bg-canvas`     | #0D0D0F  | 画布/页面背景             |
| `--bg-surface`    | #141416  | 面板/侧边栏背景           |
| `--bg-elevated`   | #1A1A1D  | 浮层/下拉/弹窗背景        |
| `--bg-hover`      | #222225  | 悬停态背景                |

### 边框层级

| Token               | 值       | 用途                     |
|---------------------|----------|--------------------------|
| `--border-subtle`   | #2A2A2D  | 弱边框/分隔线            |
| `--border-default`  | #3A3A3D  | 默认组件边框             |
| `--border-strong`   | #4A4A4D  | 强调边框                 |

### 文字颜色

| Token              | 值       | 用途                     |
|--------------------|----------|--------------------------|
| `--text-primary`   | #FFFFFF  | 主要文字                 |
| `--text-secondary` | #A0A0A5  | 次要文字/标签            |
| `--text-tertiary`  | #606065  | 占位符/提示文字          |
| `--text-disabled`  | #404045  | 禁用态文字               |

### 强调色

| Token             | 值                      | 用途                     |
|-------------------|-------------------------|--------------------------|
| `--accent-primary` | #6366F1                | 主强调色（靛蓝）          |
| `--accent-hover`  | #818CF8                 | 悬停态                   |
| `--accent-muted`  | rgba(99,102,241,0.15)   | 背景/badge 柔和变体      |

### 状态色

| Token             | 值       | 用途                     |
|-------------------|----------|--------------------------|
| `--status-success` | #22C55E | 成功状态                 |
| `--status-warning` | #F59E0B | 警告状态                 |
| `--status-error`   | #EF4444 | 错误状态                 |
| `--status-info`    | #3B82F6 | 信息状态                 |

### 端口颜色（节点编辑器专用）

| Token         | 值       | 用途           |
|---------------|----------|----------------|
| `--port-image`  | #8B5CF6 | 图像端口类型   |
| `--port-mask`   | #06B6D4 | Mask 端口类型  |
| `--port-number`  | #F59E0B | 数值端口类型   |

## 字体 Token

### 字体族

| Token       | 值                                                          |
|-------------|-------------------------------------------------------------|
| `--font-sans` | -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif |
| `--font-mono` | 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace |

### 字号

| Token        | 值    | 用途                 |
|--------------|-------|----------------------|
| `--text-xs`   | 11px  | Badge/说明文字       |
| `--text-sm`   | 13px  | 次要 UI 文字         |
| `--text-base` | 14px  | 默认正文文字         |
| `--text-lg`   | 16px  | 子标题/大标签        |
| `--text-xl`   | 18px  | 页面区块标题         |
| `--text-2xl`  | 24px  | 页面标题             |

### 行高

| Token             | 值    | 用途       |
|-------------------|-------|------------|
| `--leading-tight`  | 1.25  | 标题       |
| `--leading-normal` | 1.5   | 正文       |
| `--leading-loose`  | 1.75  | 长段落     |

### 字重

| Token              | 值   | 用途           |
|--------------------|------|----------------|
| `--weight-regular`   | 400  | 默认正文       |
| `--weight-medium`    | 500  | 标签           |
| `--weight-semibold`   | 600  | 副标题/按钮   |
| `--weight-bold`       | 700  | 标题/强调      |

### 字间距

| Token              | 值      | 用途           |
|--------------------|---------|----------------|
| `--tracking-tightest` | -0.02em | 大标题       |
| `--tracking-tight`    | -0.01em | 中标题       |
| `--tracking-normal`   | 0em     | 正文         |
| `--tracking-wide`     | 0.05em  | 全大写标签   |
| `--tracking-widest`   | 0.1em   | Overline      |

## 间距 Token

详见 `packages/shared-ui/src/tokens/spacing.css`。

基础间距单位为 4px（0.25rem）：

| Token       | 值      |
|-------------|---------|
| `--space-1`  | 4px     |
| `--space-2`  | 8px     |
| `--space-3`  | 12px    |
| `--space-4`  | 16px    |
| `--space-6`  | 24px    |
| `--space-8`  | 32px    |

## 使用示例

### 在 CSS Module 中使用

```css
/* Button.module.css */
.button {
  background: var(--accent-primary);
  color: var(--text-primary);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  padding: var(--space-2) var(--space-4);
}

.button:hover {
  background: var(--accent-hover);
}
```

### 在 JSX 中使用

```tsx
<div style={{
  color: 'var(--text-secondary)',
  fontSize: 'var(--text-sm)',
  padding: 'var(--space-3)',
}}>
  提示文字
</div>
```

### 在组件中组合样式

```tsx
export const Panel = ({ children }) => (
  <div style={{
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-4)',
  }}>
    {children}
  </div>
);
```

## 设计原则

1. **优先使用 Token**：避免硬编码颜色/字号，始终引用 CSS 变量
2. **语义化命名**：使用 `text-secondary` 而非 `gray-500`
3. **层级一致性**：背景层级只在必要时区分层级
4. **深色优先**：当前仅支持深色主题

## 注意事项

- 不要在代码中硬编码颜色值（如 `#6366F1`），应使用 CSS 变量
- 组件样式建议使用 CSS Module，避免样式冲突
- 间距统一使用 `--space-*` 变量，不要用 px 值

## 相关文件

- `packages/shared-ui/src/tokens/colors.css` — 颜色变量
- `packages/shared-ui/src/tokens/spacing.css` — 间距变量
- `packages/shared-ui/src/tokens/typography.css` — 字体变量
- `packages/shared-ui/src/tokens/index.css` — 导出入口
- `packages/shared-ui/src/types/tokens.ts` — TypeScript 类型
