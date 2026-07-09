# Design: Phase 3 — Composer SDK

---

## Goals

1. 提供 `<ComposerCanvas />` 组件，支持 PS 风格拖拽交互和实时 Canvas 合成
2. 提供 `<ComposerParams />` 组件，渲染 ProductTemplate 参数表单
3. 复用 Phase 1 已实现的 `image-ops/browser` executor，保持像素级一致
4. SDK 接入代码 < 50 行

---

## Non-Goals

1. 不实现撤销/重做（PRD §10）
2. 不实现 Web Component / iframe 分发（React package 优先）
3. 不直接触发 Production Render（由 mall 后端调用）

---

## Decisions

### D1: SDK 分发形态 — React package

| 选项 | 选择 | 理由 |
|------|------|------|
| React package（npm） | **✅** | 简单、类型安全、直接 import |
| Web Component | ❌ | 属性传递复杂、样式隔离难 |
| iframe | ❌ | 通信成本高、样式隔离难 |

### D2: 状态管理 — 组件内部 Zustand

| 选项 | 选择 | 理由 |
|------|------|------|
| 组件内部 useState | ❌ | 图层状态复杂，需要多个独立状态同步 |
| 外部 Zustand store | ❌ | 增加接入复杂度 |
| 内部 Zustand | **✅** | 封装独立状态，对外只暴露 props + callbacks |

### D3: 性能优化 — requestAnimationFrame + debounce

| 优化点 | 实现方式 |
|--------|----------|
| 拖拽响应 | CSS transform 实时跟随（< 16ms） |
| 合成触发 | `requestAnimationFrame` + 50ms debounce |
| 大量图层 | `OffscreenCanvas`（兼容性允许时降级） |

### D4: 蒙版运算在 Canvas 上的实现

复用 `image-ops/browser/MaskExecutor`，通过以下流程：
1. 获取蒙版 `ImageData`
2. 计算蒙版 alpha
3. 应用到目标图层

---

## Architecture

### SDK 入口

```typescript
// packages/composer-sdk/src/index.ts
export { ComposerCanvas } from './ComposerCanvas';
export { ComposerParams } from './ComposerParams';
export type { ComposerSDKProps, ComposerState, ComposerSubmitParams } from './types';
```

### ComposerCanvas 接口

```typescript
interface ComposerSDKProps {
  // ProductTemplate 配置（从 Prism API 加载）
  template: ProductTemplate;

  // 初始状态（可选）
  initialState?: ComposerState;

  // 回调
  onChange?: (state: ComposerState) => void;
  onSubmit?: (params: ComposerSubmitParams) => void;
}

interface ComposerState {
  // 图层列表（位置、缩放、旋转）
  layers: LayerState[];

  // 当前选中图层
  selectedLayerId: string | null;

  // designParams 值
  designParams: Record<string, number | string>;
}

interface ComposerSubmitParams {
  templateId: string;
  inputs: Record<string, string>;  // 用户填写的 inputs
  layers: LayerState[];             // 最终图层状态
  designParams: Record<string, number | string>;
}
```

### 目录结构

```
packages/composer-sdk/
├── src/
│   ├── ComposerCanvas.tsx       # 主组件：图层拖拽 + Canvas 合成
│   ├── ComposerParams.tsx       # 参数面板
│   ├── ComposerState.ts         # Zustand store
│   ├── types.ts                 # SDK 类型
│   ├── utils/
│   │   ├── canvas合成.ts        # 复用 image-ops/browser
│   │   └── transform.ts        # CSS transform 工具
│   └── index.ts                # 入口
├── package.json
└── tsconfig.json
```

---

## Implementation Plan

### T3.1: 创建 composer-sdk 包

1. 初始化 `packages/composer-sdk/` 目录
2. 配置 `package.json`（name: `@prism/composer-sdk`，peerDependencies: `react >= 17`）
3. 配置 `tsconfig.json`

### T3.2: 实现 ComposerCanvas

1. 创建 Zustand store（`ComposerState.ts`）
2. 实现图层拖拽（mousedown/mousemove/mouseup）
3. 集成 `image-ops/browser/CompositeExecutor`
4. 实现叠加模式渲染
5. 实现蒙版运算渲染

### T3.3: 实现 ComposerParams

1. 解析 ProductTemplate.inputs / designParams
2. 生成动态表单
3. 与 ComposerCanvas 双向绑定

### T3.4: 实现事件回传

1. `onChange` — 参数变化时触发
2. `onSubmit` — 收集最终状态，回传给 mall 后端

### T3.5: 端到端验证

1. 创建测试页面
2. 使用真实 ProductTemplate 数据（如键帽）
3. 验证完整链路

---

## Review Checklist

- [ ] SDK 导出明确，无不必要的内部 API 暴露
- [ ] `<ComposerCanvas />` 支持键盘快捷键（Delete 删除选中图层）
- [ ] 叠加模式正确实现（5 种模式）
- [ ] 蒙版运算正确实现（亮度蒙版、渐变蒙版、边缘羽化）
- [ ] 性能达标（合成 < 100ms）
- [ ] 类型安全（无 `any`）
- [ ] 测试覆盖（单元测试 + E2E）
