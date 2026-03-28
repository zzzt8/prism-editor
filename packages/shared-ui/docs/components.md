# 共享组件使用文档

> **包**: `@prism/shared-ui`  
> **版本**: 1.0.0  
> **最后更新**: 2026-03-28

Prism Editor 的共享组件库，提供两套应用共用的基础 UI 组件。

## 安装

组件库已作为 workspace 依赖安装，无需额外配置。只需在应用入口导入 CSS 和组件：

```tsx
import '@prism/shared-ui/styles/tokens.css';
import '@prism/shared-ui/styles/components.css';
import { Button, Input, Card, Badge, Spinner, Modal, Tooltip } from '@prism/shared-ui';
```

## 组件总览

| 组件 | 说明 | 使用场景 |
|------|------|----------|
| `Button` | 多变体按钮 | 操作按钮 |
| `Input` | 文本输入框 | 表单输入 |
| `Card` | 卡片容器 | 分组展示 |
| `Modal` | 模态对话框 | 弹窗确认 |
| `Spinner` | 加载指示器 | 加载状态 |
| `Badge` | 状态标签 | 状态/分类标识 |
| `Tooltip` | 悬浮提示 | 快捷说明 |
| `Panel` | 面板容器 | 区域容器 |
| `VStack` / `HStack` | 弹性布局 | 垂直/水平排列 |
| `Divider` | 分隔线 | 内容分隔 |

## Button

多用途按钮，支持多种变体、尺寸、加载态和图标。

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'danger'` | `'secondary'` | 视觉变体 |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 尺寸 |
| `loading` | `boolean` | `false` | 加载态 |
| `disabled` | `boolean` | `false` | 禁用态 |
| `icon` | `ReactNode` | — | 左侧图标 |
| `trailingIcon` | `ReactNode` | — | 右侧图标 |
| `fullWidth` | `boolean` | `false` | 全宽 |
| `children` | `ReactNode` | — | 按钮文字 |

### 变体说明

- **`primary`** — 主强调色背景，用于主要操作
- **`secondary`** — 深色背景+边框，默认变体
- **`ghost`** — 无边框，悬停显示背景，用于次要操作
- **`danger`** — 红色背景，用于危险操作

### 使用示例

```tsx
import { Button } from '@prism/shared-ui';
import { Save, Settings } from '@prism/shared-ui';

// 主要操作
<Button variant="primary" onClick={handleSave}>保存</Button>

// 带图标
<Button variant="secondary" icon={<Settings size={16} />}>设置</Button>

// 加载态
<Button variant="primary" loading>保存中...</Button>

// 禁用
<Button variant="secondary" disabled>不可点击</Button>

// 全宽
<Button variant="primary" fullWidth>确认提交</Button>
```

## Input

带标签、辅助文本和错误提示的文本输入框。

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `label` | `string` | — | 输入框标签 |
| `placeholder` | `string` | — | 占位符 |
| `helperText` | `string` | — | 辅助说明文字 |
| `error` | `string` | — | 错误信息（会高亮输入框） |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 尺寸 |
| `disabled` | `boolean` | `false` | 禁用态 |
| `startAdornment` | `ReactNode` | — | 前缀图标/元素 |
| `endAdornment` | `ReactNode` | — | 后缀图标/元素 |
| `fullWidth` | `boolean` | `false` | 全宽 |

### 使用示例

```tsx
import { Input } from '@prism/shared-ui';

// 基础用法
<Input label="用户名" placeholder="请输入用户名" />

// 带辅助说明
<Input label="邮箱" type="email" helperText="用于接收通知邮件" />

// 错误状态
<Input label="邮箱" value="invalid" error="请输入有效的邮箱地址" />

// 带图标
<Input
  label="搜索"
  placeholder="搜索节点..."
  startAdornment={<SearchIcon />}
  endAdornment={<ClearIcon />}
/>
```

## Card

卡片容器组件，支持标题、副标题、悬停态和点击交互。

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `title` | `ReactNode` | — | 卡片标题 |
| `subtitle` | `ReactNode` | — | 副标题 |
| `children` | `ReactNode` | — | 卡片内容 |
| `hoverable` | `boolean` | `false` | 悬停态 |
| `clickable` | `boolean` | `false` | 可点击（光标变化） |
| `padding` | `'none' \| 'sm' \| 'md' \| 'lg'` | `'md'` | 内边距 |
| `action` | `ReactNode` | — | 标题栏右侧操作 |

### 使用示例

```tsx
import { Card } from '@prism/shared-ui';

// 基础卡片
<Card title="工作流信息" subtitle="最近修改: 2小时前">
  <p>卡片内容</p>
</Card>

// 可悬停卡片
<Card hoverable onClick={handleClick}>
  <p>悬停时显示高亮</p>
</Card>

// 带操作按钮
<Card
  title="设置"
  action={<Button size="sm">编辑</Button>}
>
  <p>卡片内容</p>
</Card>
```

## Modal

模态对话框组件。

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `open` | `boolean` | — | 是否显示 |
| `onClose` | `() => void` | — | 关闭回调 |
| `title` | `string` | — | 对话框标题 |
| `children` | `ReactNode` | — | 内容 |
| `footer` | `ReactNode` | — | 底部操作区 |
| `closeOnOverlay` | `boolean` | `true` | 点击遮罩关闭 |
| `closeOnEscape` | `boolean` | `true` | ESC 键关闭 |

### 使用示例

```tsx
import { Modal, Button } from '@prism/shared-ui';

<Modal
  open={isOpen}
  onClose={() => setIsOpen(false)}
  title="确认操作"
  footer={
    <>
      <Button variant="ghost" onClick={() => setIsOpen(false)}>取消</Button>
      <Button variant="primary" onClick={handleConfirm}>确认</Button>
    </>
  }
>
  <p>确定要执行此操作吗？</p>
</Modal>
```

## Spinner

旋转加载指示器。

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 尺寸 |
| `color` | `string` | `var(--accent-primary)` | 颜色 |
| `label` | `string` | `'加载中'` | 无障碍标签 |

### 使用示例

```tsx
import { Spinner } from '@prism/shared-ui';

// 默认
<Spinner />

// 小尺寸
<Spinner size="sm" />

// 自定义颜色
<Spinner size="md" color="var(--status-success)" />
```

## Badge

状态标签/徽章组件。

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `variant` | `'default' \| 'success' \| 'warning' \| 'error' \| 'info' \| 'accent'` | `'default'` | 颜色变体 |
| `size` | `'sm' \| 'md'` | `'md'` | 尺寸 |
| `filled` | `boolean` | `false` | 填充样式 |
| `children` | `ReactNode` | — | 标签文字 |

### 变体说明

- **`default`** — 灰色，用于通用标签
- **`success`** — 绿色，用于成功/发布状态
- **`warning`** — 橙色，用于草稿/警告
- **`error`** — 红色，用于错误/危险
- **`info`** — 蓝色，用于信息
- **`accent`** — 靛蓝色，用于强调

### 使用示例

```tsx
import { Badge } from '@prism/shared-ui';

<Badge variant="success">已发布</Badge>
<Badge variant="warning" size="sm">草稿</Badge>
<Badge variant="accent" filled>NEW</Badge>
```

## Tooltip

悬浮提示组件。

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `content` | `ReactNode` | — | 提示内容 |
| `children` | `ReactElement` | — | 触发元素 |
| `position` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'top'` | 弹出方向 |
| `delay` | `number` | `300` | 显示延迟（ms） |

### 使用示例

```tsx
import { Tooltip } from '@prism/shared-ui';

<Tooltip content="保存当前工作流" position="bottom">
  <Button icon={<Save />} />
</Tooltip>
```

## Panel

面板容器组件，用于构建页面区域。

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `title` | `string` | — | 面板标题 |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 内边距尺寸 |
| `children` | `ReactNode` | — | 内容 |

### 使用示例

```tsx
import { Panel } from '@prism/shared-ui';

<Panel title="节点属性">
  <p>属性配置内容</p>
</Panel>
```

## VStack / HStack

垂直/水平弹性布局组件（基于 Stack）。

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `gap` | `StackSize` | `'md'` | 间距 |
| `align` | `StackAlign` | `'stretch'` | 交叉轴对齐 |
| `justify` | `StackJustify` | `'start'` | 主轴对齐 |
| `wrap` | `boolean` | `false` | 换行 |
| `children` | `ReactNode` | — | 内容 |

### 使用示例

```tsx
import { VStack, HStack } from '@prism/shared-ui';

// 垂直排列
<VStack gap="sm">
  <Button>按钮1</Button>
  <Button>按钮2</Button>
</VStack>

// 水平排列
<HStack gap="md" justify="space-between">
  <span>左侧</span>
  <span>右侧</span>
</HStack>
```

## Divider

分隔线组件。

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `variant` | `'solid' \| 'dashed' \| 'dotted'` | `'solid'` | 线条样式 |
| `spacing` | `DividerSpacing` | `'md'` | 上下间距 |

### 使用示例

```tsx
import { Divider } from '@prism/shared-ui';

<Divider />

<Divider variant="dashed" />
```

## 图标使用

图标统一从 `@prism/shared-ui` 导入，基于 Lucide React：

```tsx
import { Image, Upload, Download, Play, Settings } from '@prism/shared-ui';

// 图标+文字按钮
<Button variant="primary" icon={<Play size={16} />}>运行</Button>

// 纯图标按钮
<IconButton variant="ghost">
  <Settings size={18} />
</IconButton>
```

可用图标列表详见 `packages/shared-ui/src/icons/index.ts`。

## 设计原则

1. **优先使用共享组件**：避免在业务代码中重复实现 Button/Input 等基础组件
2. **保持变体一致**：按钮统一使用 primary/secondary/ghost/danger 四种变体
3. **状态完整**：为所有交互组件实现 loading/disabled/error 等状态
4. **无障碍支持**：所有组件提供 ARIA 属性和键盘导航支持

## 相关文件

- `packages/shared-ui/src/components/` — 组件源码
- `packages/shared-ui/src/components/index.ts` — 导出入口
- `packages/shared-ui/src/icons/index.ts` — 图标导出
- `packages/shared-ui/src/styles/` — 样式文件
