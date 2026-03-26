# UI Design System - 技术设计

## Context

Prism Editor 需要构建两套 UI：开发者端（dev-tool）和用户端（user-app）。

**核心挑战**：
- 两套 UI 风格不同，但需要共享底层语言
- 开发者端需要高信息密度和专业感
- 用户端需要简洁和低学习成本
- 需要统一的组件库避免重复开发

**参考案例**：
- ComfyUI：节点编辑器的工作区骨架
- Figma/Linear：克制、专业的工具感
- Notion：简洁、结果导向的表单布局

## Goals / Non-Goals

**Goals:**
- 建立 Design Token 系统，统一管理颜色、间距、字体等变量
- 构建 `packages/shared-ui` 共享组件库
- 定义开发者端三栏布局规范
- 定义用户端 Input → Run → Output 布局规范
- 统一两端的视觉语言（字体、图标、品牌色）

**Non-Goals:**
- 不实现完整的 Design System 文档站点
- 不实现复杂的动画系统
- 不实现主题切换功能（深色为主）

## Decisions

### 1. Design Token 架构

**决策**：使用 CSS 变量 + TypeScript 类型定义双层架构

**目录结构**：
```
packages/shared-ui/
├── tokens/
│   ├── colors.css        # CSS 变量
│   ├── spacing.css       # 间距变量
│   ├── typography.css     # 字体变量
│   └── index.css         # 导出所有变量
├── types/
│   └── tokens.ts         # TypeScript 类型定义
└── presets/
    └── index.ts          # 预设值常量
```

**颜色 Token**：
```css
/* 基础色板 */
:root {
  /* 背景层级 */
  --bg-canvas: #0D0D0F;      /* 画布背景 */
  --bg-surface: #141416;      /* 面板背景 */
  --bg-elevated: #1A1A1D;    /* 浮层背景 */
  --bg-hover: #222225;        /* 悬停背景 */

  /* 边框 */
  --border-subtle: #2A2A2D;  /* 细边框 */
  --border-default: #3A3A3D;  /* 默认边框 */
  --border-strong: #4A4A4D;   /* 强边框 */

  /* 文字 */
  --text-primary: #FFFFFF;
  --text-secondary: #A0A0A5;
  --text-tertiary: #606065;
  --text-disabled: #404045;

  /* 强调色 */
  --accent-primary: #6366F1;   /* 主强调色 - 靛蓝 */
  --accent-hover: #818CF8;
  --accent-muted: rgba(99, 102, 241, 0.15);

  /* 状态色 */
  --status-success: #22C55E;
  --status-warning: #F59E0B;
  --status-error: #EF4444;
  --status-info: #3B82F6;

  /* 节点端口颜色 */
  --port-image: #8B5CF6;       /* 紫色 - 图像 */
  --port-mask: #06B6D4;        /* 青色 - Mask */
  --port-number: #F59E0B;      /* 橙色 - 数值 */
}
```

**TypeScript 类型**：
```typescript
// packages/shared-types/src/tokens.ts
export interface ColorTokens {
  bg: {
    canvas: string;
    surface: string;
    elevated: string;
    hover: string;
  };
  border: {
    subtle: string;
    default: string;
    strong: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    disabled: string;
  };
  accent: {
    primary: string;
    hover: string;
    muted: string;
  };
  status: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };
}
```

**原因**：
- CSS 变量实现运行时主题切换
- TypeScript 类型提供开发时类型安全
- 双层架构确保一致性

### 2. 共享组件库设计

**决策**：`packages/shared-ui` 提供双端共用的基础组件

**组件列表**：
```typescript
// 基础组件
Button, IconButton, Input, Select, Slider, Switch, Checkbox, Radio

// 容器组件
Card, Panel, Modal, Drawer, Tooltip, Popover

// 反馈组件
Spinner, Progress, Badge, Alert, Toast

// 布局组件
Stack, HStack, VStack, Divider, ResizeHandle
```

**组件 Props 约定**：
```typescript
// 使用统一的变体系统
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  size: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
}

// 统一的边框/圆角
borderRadius: 'sm' | 'md' | 'lg' | 'full';
```

**组件示例 - Button**：
```tsx
// packages/shared-ui/src/components/Button.tsx
import styles from './Button.module.css';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  disabled,
  loading,
  onClick,
}) => {
  return (
    <button
      className={`${styles.button} ${styles[variant]} ${styles[size]}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
};
```

**原因**：
- 统一两端的视觉语言
- 减少重复开发
- 便于后期统一升级

### 3. 开发者端布局规范

**决策**：经典三栏布局 + 顶部操作栏

**布局结构**：
```
┌─────────────────────────────────────────────────────────────┐
│  Logo   Workflow Name    [Save] [Run] [Publish]    Settings │ <- 顶部栏 48px
├──────────┬─────────────────────────────────┬───────────────┤
│          │                                 │               │
│  节点库   │                                 │  属性面板      │
│  240px   │           画布                   │  320px        │
│          │         (flex)                  │               │
│ ──────── │                                 │ ─────────────│
│ 搜索      │                                 │ 节点名称      │
│ ──────── │                                 │ ─────────────│
│ 输入节点   │                                 │ 参数配置      │
│ 处理节点   │                                 │ ─────────────│
│ 输出节点   │                                 │ 预览         │
│          │                                 │               │
└──────────┴─────────────────────────────────┴───────────────┘
```

**视觉重点**：
- 画布背景退后：轻网格、低饱和
- 连线弱化：细线、低对比度
- 节点突出：卡片感、清晰边界

**节点卡片结构**：
```
┌─────────────────────────┐
│ ● Load Image        ⋮  │ <- 标题栏
├─────────────────────────┤
│ ○ src                  │ <- 输入端口
├─────────────────────────┤
│ [参数摘要]              │ <- 参数预览
├─────────────────────────┤
│ ○ output               │ <- 输出端口
└─────────────────────────┘
```

**原因**：
- 三栏是节点编辑器的成熟模式
- 信息密度适中，便于操作
- 符合 ComfyUI/Figma 的用户习惯

### 4. 开发者端视觉规范

**决策**：深色、低饱和、强层级、弱装饰

**配色策略**：
```css
/* 主色调：深灰黑，不要纯黑 */
--bg-canvas: #0D0D0F;

/* 面板层级 */
--bg-surface: #141416;    /* 比画布亮一层 */
--bg-elevated: #1A1A1D;   /* 弹窗/下拉 */

/* 强调色：单一主色 */
--accent-primary: #6366F1;  /* 靛蓝，不艳丽 */

/* 边框：低对比细边 */
--border-subtle: #2A2A2D;
```

**禁止**：
- 大面积渐变
- 玻璃拟态（毛玻璃）
- 过强发光效果
- 太多颜色分类
- 过度装饰图标

**允许**：
- 微妙的阴影
- 柔和的悬停态
- 状态色区分

### 5. 用户端布局规范

**决策**：线性布局，Input → Run → Output

**布局结构**：
```
┌─────────────────────────────────────────────────────────────┐
│                    [Logo]  Workflow Name                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📋 图片合成                                          │   │
│  │  将您的 Logo 与背景图合成，制作统一的营销素材            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌───────────────────────┐  ┌───────────────────────┐     │
│  │ 📷 背景图 (必填)        │  │ 🎨 Logo (必填)          │     │
│  │                       │  │                       │     │
│  │   [上传]              │  │   [上传]              │     │
│  └───────────────────────┘  └───────────────────────┘     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ⚙️ 参数                                              │   │
│  │                                                       │   │
│  │  缩放比例    ──────●──────  100%                    │   │
│  │  位置        ──────●──────  居中                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                    [ ▶ 运行 ]                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📤 输出                                              │   │
│  │                                                       │   │
│  │              [ 预览大图 ]                             │   │
│  │                                                       │   │
│  │    [下载 PNG]  [下载 JPEG]  [下载全部]               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**核心原则**：
- 不暴露节点感、连线感
- 不展示工程工具的复杂性
- 用户感觉在"使用功能"，而非"操作工作流"

### 6. 用户端视觉规范

**决策**：简洁、清晰、少选择、低压迫感

**配色策略**：
```css
/* 比开发者端更轻一点，可浅可深 */
--bg-page: #0F0F12;           /* 或浅色 #F8F9FA */

/* 卡片感更强 */
--card-bg: #1A1A1D;
--card-border: #2A2A2D;
--card-radius: 12px;

/* 局部品牌强调 */
--accent-primary: #6366F1;
```

**布局特点**：
- 卡片感明显
- 视觉重心在输入卡片和结果卡片
- 参数区克制，只暴露必要项
- 大按钮、大预览

### 7. 图标系统

**决策**：统一使用 Lucide Icons

**原因**：
- 开源免费
- 风格简洁中性
- 支持 React
- 24px 基准尺寸

**使用约定**：
```tsx
import { Image, Upload, Download, Settings, Play } from 'lucide-react';

// 图标与文字组合
<Button>
  <Play size={16} />
  运行
</Button>

// 纯图标按钮
<IconButton variant="ghost" size="md">
  <Settings size={18} />
</IconButton>
```

### 8. 字体系统

**决策**：使用系统字体栈 + 等宽字体

**字体栈**：
```css
/* 界面文字 */
--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* 代码/数值 */
--font-mono: 'SF Mono', 'Fira Code', Consolas, monospace;

/* 字号 */
--text-xs: 11px;
--text-sm: 13px;
--text-base: 14px;
--text-lg: 16px;
--text-xl: 18px;
--text-2xl: 24px;

/* 行高 */
--leading-tight: 1.25;
--leading-normal: 1.5;
```

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 两套风格难以统一 | 开发者端和用户端割裂感 | 严格遵循共享 token，仅变体不同 |
| 组件库过度设计 | 开发成本高 | MVP 阶段只实现必要的组件 |
| 深浅主题切换复杂 | 增加维护成本 | MVP 只做深色，后续按需扩展 |

## Migration Plan

1. **阶段一**：建立 Design Token 和类型定义
2. **阶段二**：实现共享组件库基础组件
3. **阶段三**：实现开发者端布局框架
4. **阶段四**：实现用户端布局框架
5. **阶段五**：集成 React Flow 样式
6. **阶段六**：整体视觉调优

## Open Questions

1. **暗色/亮色切换**：是否需要亮色主题支持？
2. **字体选择**：是否使用自定义字体（如 Inter）？
3. **动画规范**：是否需要统一的过渡动画？
4. **响应式设计**：用户端是否需要移动端适配？
