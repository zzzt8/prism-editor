# @prism/shared-ui

设计系统和共享 UI 组件包。

## 功能

- **图标库**: 基于 Lucide React 的统一图标集
- **设计令牌**: 颜色、间距、字体等设计变量
- **UI 组件**: Button、Input、Modal、Card 等基础组件
- **样式系统**: CSS Modules + CSS 变量

## 目录结构

```
packages/shared-ui/
├── src/
│   ├── components/           # UI 组件
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
│   │   └── Tooltip/
│   ├── icons/               # 图标导出
│   │   └── index.ts
│   ├── styles/              # 全局样式
│   │   ├── tokens.css      # 设计令牌
│   │   └── components.css  # 组件基础样式
│   └── types/               # 类型定义
│       └── tokens.ts
├── docs/
│   └── design-tokens.md     # 设计令牌文档
└── package.json
```

## 图标使用

```tsx
import { Image, Upload, Play, Settings } from '@prism/shared-ui';

// 在组件中使用
<button>
  <Play size={16} />
  运行
</button>
```

### 可用图标分类

| 分类 | 图标 |
|------|------|
| 工作流 | Play, Pause, Square, RotateCcw, Trash2, Copy, Settings, SlidersHorizontal |
| 文件 | Image, FileImage, FileText, Upload, Download, Save, FolderOpen |
| UI/导航 | ChevronDown, ChevronRight, ChevronLeft, Plus, Minus, X, Check, Search |
| 状态 | AlertCircle, AlertTriangle, Info, Eye, EyeOff, Lock, Unlock, CheckCircle2, XCircle, Loader2 |
| 节点/画布 | Box, GitBranch, Layers, Grid3X3 |
| 杂项 | MoreHorizontal, MoreVertical, ExternalLink, RefreshCw, ZoomIn, ZoomOut, Maximize2, Minimize2 |

### 图标尺寸规范

| 尺寸 | 值 | 使用场景 |
|------|-----|----------|
| xs | 12px | Badge 文本, Chip 标签 |
| sm | 14px | 紧凑标签上下文 |
| md | 16px | 默认 - 图标+文字按钮 |
| lg | 18px | 独立图标按钮 |
| xl | 20px | 区块标题 |
| 2xl | 24px | 空状态插图 |

### 动画图标

加载/旋转图标应添加 `.icon-spin` CSS 类：

```tsx
<span className="icon-spin">
  <Loader2 size={16} />
</span>
```

## 设计令牌

### 颜色令牌

```css
/* 使用方式 */
.element {
  color: var(--color-primary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}
```

### 间距令牌

```css
.element {
  padding: var(--spacing-sm);
  margin: var(--spacing-md);
}
```

### 字体令牌

```css
.element {
  font-family: var(--font-sans);
  font-size: var(--text-sm);
}
```

## UI 组件

### Button

```tsx
import { Button } from '@prism/shared-ui';

<Button variant="primary" size="md">
  提交
</Button>
```

### Input

```tsx
import { Input } from '@prism/shared-ui';

<Input 
  placeholder="请输入名称"
  value={name}
  onChange={(e) => setName(e.target.value)}
/>
```

### Modal

```tsx
import { Modal } from '@prism/shared-ui';

<Modal 
  isOpen={isOpen} 
  onClose={() => setIsOpen(false)}
  title="标题"
>
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

## 安装

```tsx
// 导入 CSS（必需）
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
| `pnpm test` | 运行测试 |
| `pnpm test:coverage` | 运行测试并生成覆盖率报告 |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm clean` | 清理构建产物 |
