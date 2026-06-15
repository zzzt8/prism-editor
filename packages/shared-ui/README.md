# @prism/shared-ui

设计系统与共享 UI 组件包。基于 Lucide React 图标库 + CSS Modules + CSS 变量令牌，为 dev-tool 和 user-app 提供统一的视觉语言和基础组件。

## 功能

- **图标库**: 统一从 Lucide React re-export（按用途分类）+ `ICON_MAP` 索引
- **设计令牌**: 颜色 / 间距 / 字体等 CSS 变量，集中管理视觉风格
- **UI 组件**: Button / Input / Modal / Card / Badge / Spinner / Tooltip / Stack / Divider / Panel / ErrorBoundary
- **样式系统**: CSS Modules + 全局 CSS 变量
- **类型安全**: 每个组件导出对应 Props 类型，Variant / Size 等用 union type 约束

## 目录结构

```
packages/shared-ui/
├── src/
│   ├── components/             # UI 组件
│   │   ├── Badge/
│   │   ├── Button/
│   │   ├── Card/
│   │   ├── Divider/
│   │   ├── ErrorBoundary/
│   │   ├── Input/
│   │   ├── Modal/
│   │   ├── Panel/
│   │   ├── Spinner/
│   │   ├── Stack/
│   │   ├── Tooltip/
│   │   ├── components.test.tsx
│   │   └── index.ts
│   ├── icons/                  # 图标导出
│   │   └── index.ts            # ICON_MAP + LucideProps re-export
│   ├── styles/                 # 全局样式
│   │   ├── tokens.css          # 设计令牌（CSS 变量）
│   │   └── components.css      # 组件基础样式
│   ├── types/                  # 类型定义
│   │   └── tokens.ts           # ColorTokens / SpacingTokens / TypographyTokens
│   ├── test-setup.ts
│   ├── css-modules.d.ts
│   └── index.ts                # 公共入口
├── docs/
│   └── design-tokens.md        # 设计令牌文档
└── package.json
```

## 图标使用

```tsx
import { Image, Upload, Play, Settings } from '@prism/shared-ui';

// 在组件中使用（Lucide 组件，size 为 px）
<button>
  <Play size={16} />
  运行
</button>
```

### 尺寸规范

| Token | 值 | 使用场景 |
|-------|-----|----------|
| `sm` | 14px | 紧凑标签上下文 |
| `md` | 16px | 默认（icon+text 按钮） |
| `lg` | 18px | 独立 icon 按钮 |
| `xl` | 20px | 区块标题 |
| `2xl` | 24px | 空状态插图 |

> 备注：`Badge` 文本 / `Chip` 标签常使用 12px（xs），属边界用法。

### 可用图标分类

| 分类 | 图标 |
|------|------|
| 工作流 | Play, Pause, Square, RotateCcw, Trash2, Copy, Settings, SlidersHorizontal |
| 文件 | Image, FileImage, FileText, Upload, Download, Save, FolderOpen |
| UI/导航 | ChevronDown, ChevronRight, ChevronLeft, Plus, Minus, X, Check, Search |
| 状态 | AlertCircle, AlertTriangle, Info, Eye, EyeOff, Lock, Unlock, CheckCircle2, XCircle, Loader2 |
| 节点/画布 | Box, GitBranch, Layers, Grid3X3 |
| 杂项 | MoreHorizontal, MoreVertical, ExternalLink, RefreshCw, ZoomIn, ZoomOut, Maximize2, Minimize2 |

### 动画图标

加载 / 旋转图标应使用 `Loader2` 并加 `.icon-spin` CSS 类：

```tsx
<span className="icon-spin">
  <Loader2 size={16} />
</span>
```

### 颜色规范

所有图标使用 `currentColor`，**不要** hardcode 颜色，让 CSS `color` 决定。

### 按字符串索引图标

通过 `ICON_MAP` 可以按字符串名获取图标组件（动态场景）：

```tsx
import { ICON_MAP, type IconKey } from '@prism/shared-ui';

const Icon = ICON_MAP[iconName as IconKey];
return <Icon size={16} />;
```

## 设计令牌

```css
/* 颜色 */
.element { color: var(--color-primary); background: var(--color-surface); border: 1px solid var(--color-border); }

/* 间距 */
.element { padding: var(--spacing-sm); margin: var(--spacing-md); }

/* 字体 */
.element { font-family: var(--font-sans); font-size: var(--text-sm); }
```

类型化令牌（在 `src/types/tokens.ts`）：

```typescript
import { tokens, type ColorTokens, type SpacingTokens } from '@prism/shared-ui';
```

## UI 组件

### Button

```tsx
import { Button } from '@prism/shared-ui';

<Button variant="primary" size="md">提交</Button>
```

- `variant`: `'primary' | 'secondary' | 'ghost' | 'danger'`
- `size`: `'sm' | 'md' | 'lg'`

### Input

```tsx
import { Input } from '@prism/shared-ui';

<Input
  placeholder="请输入名称"
  value={name}
  onChange={(e) => setName(e.target.value)}
  size="md"
/>
```

### Modal

```tsx
import { Modal } from '@prism/shared-ui';

<Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="标题">
  内容
</Modal>
```

### Card

```tsx
import { Card } from '@prism/shared-ui';

<Card>
  <Card.Header>标题</Card.Header>
  <Card.Body>内容</Card.Body>
</Card>
```

### Stack / VStack / HStack

```tsx
import { VStack, HStack } from '@prism/shared-ui';

<VStack gap="md" align="start">
  <span>Row 1</span>
  <span>Row 2</span>
</VStack>
```

- `gap`: `'xs' | 'sm' | 'md' | 'lg' | 'xl'`
- `align` / `justify`: 9 种组合
- `wrap`: `'nowrap' | 'wrap'`

### Tooltip / Badge / Spinner / Divider / Panel / ErrorBoundary

按需 import 即可，Props 类型随组件 export。

## 安装

```tsx
// 导入 CSS（必需，触发 CSS 变量注入）
import '@prism/shared-ui/styles/tokens.css';
import '@prism/shared-ui/styles/components.css';
```

## 依赖

- `lucide-react` - 图标库

## peerDependencies

- `react` ^18.3.0

## 脚本

| 命令 | 描述 |
|------|------|
| `pnpm build` | 构建 TypeScript 和复制 CSS |
| `pnpm test` | 运行 Vitest 测试 |
| `pnpm test:coverage` | 运行测试并生成覆盖率报告 |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm clean` | 清理构建产物 |
