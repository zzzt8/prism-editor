# Tasks: Phase 3 — Composer SDK + PS 风格交互

---

## Progress

| Metric | Value |
|--------|-------|
| Total Tasks | 5 (T3.1 ~ T3.5) |
| Completed | 5 |
| In Progress | 0 |

---

## T3.1 — 创建 composer-sdk 包

**opsx-meta**

```yaml
id: T3.1
layer: packages/composer-sdk
task_type: feature
verify:
  - type: file_exists
    path: packages/composer-sdk/package.json
  - type: file_exists
    path: packages/composer-sdk/tsconfig.json
  - type: file_exists
    path: packages/composer-sdk/src/index.ts
  - type: command
    command: cd packages/composer-sdk && pnpm tsc --noEmit
```

**Description**

创建 `packages/composer-sdk/` 包：

```
packages/composer-sdk/
├── package.json          # name: @prism/composer-sdk
├── tsconfig.json         # 继承 shared-tsconfig
└── src/
    └── index.ts          # 入口（暂为空）
```

**package.json 关键配置**：
- `name`: `@prism/composer-sdk`
- `peerDependencies`: `react >= 17`
- `dependencies`: `@prism/image-ops`, `@prism/shared-types`

**Acceptance Criteria**

- [x] `packages/composer-sdk/package.json` 存在，含正确 name 和 dependencies
- [x] `packages/composer-sdk/tsconfig.json` 存在
- [x] `packages/composer-sdk/src/index.ts` 存在
- [x] `pnpm tsc --noEmit` 通过

---

## T3.2 — 实现 ComposerCanvas 组件

**opsx-meta**

```yaml
id: T3.2
layer: packages/composer-sdk
task_type: feature
verify:
  - type: file_exists
    path: packages/composer-sdk/src/ComposerCanvas.tsx
  - type: file_exists
    path: packages/composer-sdk/src/ComposerState.ts
  - type: file_exists
    path: packages/composer-sdk/src/types.ts
  - type: command
    command: cd packages/composer-sdk && pnpm tsc --noEmit
```

**Description**

实现 `<ComposerCanvas />` 组件：

**ComposerState.ts（Zustand store）**：
```typescript
interface LayerState {
  id: string;
  name: string;
  imageUrl: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
}

interface ComposerState {
  layers: LayerState[];
  selectedLayerId: string | null;
  designParams: Record<string, number | string>;
  // actions
  selectLayer: (id: string | null) => void;
  updateLayer: (id: string, updates: Partial<LayerState>) => void;
  addLayer: (layer: LayerState) => void;
  removeLayer: (id: string) => void;
  updateDesignParam: (key: string, value: number | string) => void;
}
```

**ComposerCanvas.tsx 能力**：
- 图层渲染（使用 `img` 标签 + CSS transform）
- 拖拽交互（mousedown/mousemove/mouseup）
- 图层选区（选中高亮、锚点显示）
- 实时 Canvas 合成：
  - 叠加模式：正常、正片叠底、滤色、叠加、柔光
  - 蒙版运算：亮度蒙版、渐变蒙版、边缘羽化
- 键盘快捷键：Delete 删除选中图层

**复用 image-ops/browser**：
```typescript
import { CompositeExecutor, MaskExecutor } from '@prism/image-ops/browser';
```

**Acceptance Criteria**

- [x] `ComposerCanvas.tsx` 存在，导出 `<ComposerCanvas />` 组件
- [x] `ComposerState.ts` 存在，定义完整状态类型
- [x] `types.ts` 存在，定义 SDK 公共类型
- [x] 支持图层拖拽（位置、缩放、旋转）
- [x] 支持 5 种叠加模式
- [x] 支持 3 种蒙版运算
- [x] `pnpm tsc --noEmit` 通过

---

## T3.3 — 实现 ComposerParams 组件

**opsx-meta**

```yaml
id: T3.3
layer: packages/composer-sdk
task_type: feature
verify:
  - type: file_exists
    path: packages/composer-sdk/src/ComposerParams.tsx
  - type: command
    command: cd packages/composer-sdk && pnpm tsc --noEmit
```

**Description**

实现 `<ComposerParams />` 组件：

- 解析 `ProductTemplate.inputs` 生成输入表单
- 解析 `ProductTemplate.designParams` 生成参数面板
- 与 `ComposerCanvas` 双向绑定（通过 `ComposerState`）

**表单类型支持**：
- `text` — 文本输入
- `number` — 数字输入（支持 min/max/step）
- `select` — 下拉选择
- `color` — 颜色选择

**Acceptance Criteria**

- [x] `ComposerParams.tsx` 存在，导出 `<ComposerParams />` 组件
- [x] 支持 inputs 渲染
- [x] 支持 designParams 渲染
- [x] 与 ComposerCanvas 双向绑定
- [x] `pnpm tsc --noEmit` 通过

---

## T3.4 — 实现事件回传

**opsx-meta**

```yaml
id: T3.4
layer: packages/composer-sdk
task_type: feature
verify:
  - type: command
    command: cd packages/composer-sdk && pnpm tsc --noEmit
  - type: file_content
    path: packages/composer-sdk/src/index.ts
    contains: "onChange"
  - type: file_content
    path: packages/composer-sdk/src/index.ts
    contains: "onSubmit"
```

**Description**

在 `ComposerCanvas` 接口中添加事件回传：

```typescript
interface ComposerSDKProps {
  template: ProductTemplate;
  initialState?: ComposerState;
  onChange?: (state: ComposerState) => void;
  onSubmit?: (params: ComposerSubmitParams) => void;
}
```

**事件触发时机**：
- `onChange` — 任何图层或参数变化时触发（debounced 100ms）
- `onSubmit` — 用户点击"确认"按钮时触发

**`onSubmit` 数据格式**：
```typescript
interface ComposerSubmitParams {
  templateId: string;
  inputs: Record<string, string>;
  layers: LayerState[];
  designParams: Record<string, number | string>;
}
```

**约束**：
- `onSubmit` 只负责回传数据，不直接触发 Production Render
- Production Render 由 mall 后端通过 Prism `/api/render/template` 调用

**Acceptance Criteria**

- [x] `ComposerSDKProps` 包含 `onChange` 和 `onSubmit`
- [x] `onChange` 在状态变化时触发
- [x] `onSubmit` 收集完整提交参数
- [x] 更新 `src/index.ts` 导出完整类型
- [x] `pnpm tsc --noEmit` 通过

---

## T3.5 — 端到端验证

**opsx-meta**

```yaml
id: T3.5
layer: packages/composer-sdk
task_type: verification
verify:
  - type: command
    command: cd packages/composer-sdk && pnpm test
  - type: command
    command: cd packages/composer-sdk && pnpm build
```

**Description**

创建测试用例 + 构建验证：

**单元测试**：
- ComposerState actions 测试
- ComposerCanvas 渲染测试（Vitest + React Testing Library）

**构建验证**：
- `pnpm build` 生成 `dist/` 产物
- 类型导出正确

**端到端验证**（手动）：
- 创建测试页面加载 ComposerCanvas
- 使用真实 ProductTemplate 数据（如键帽）
- 验证完整链路：加载模板 → 拖拽图层 → 调整参数 → 触发 onChange → 触发 onSubmit

**Acceptance Criteria**

- [x] 单元测试覆盖核心逻辑
- [x] `pnpm test` 通过
- [x] `pnpm build` 通过
- [ ] 手动验证：SDK 可正常加载 ProductTemplate
- [ ] 手动验证：拖拽交互响应正常
- [ ] 手动验证：`onSubmit` 收集正确参数

---

## Completion Checklist

### 功能完成
- [x] T3.1 ~ T3.5 全部完成

### 质量门禁
- [x] `pnpm typecheck` 通过（composer-sdk）
- [x] `pnpm test` 通过
- [x] `pnpm build` 通过

### 文档
- [ ] README.md（使用示例、API 文档）
- [x] 类型导出完整

### 验收
- [ ] SDK 接入代码 < 50 行
- [ ] PS 风格交互流畅（合成 < 100ms）
