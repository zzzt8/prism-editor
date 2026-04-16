# empty-input-alpha-transparency - Tasks

## Pre-conditions

- [x] `empty-input.ts` 已存在且可运行
- [x] `parseColor()` 函数已实现

## Implementation Tasks

### Task 1: 扩展颜色解析函数

<!-- opsx-meta
id: T1
layer: engine
verify: unit-tests
dependencies:
  - type: task
    refs: []
  - type: change
    refs: []
    status_required: completed
-->

- [x] T1.1: 实现 `parseRgba()` 函数
  - 解析 `rgba(r, g, b, a)` 格式
  - alpha 范围 0-1，映射到 0-255
  - 文件: `packages/image-ops/src/empty-input.ts`

- [x] T1.2: 修改 `parseColor()` 返回值包含 alpha
  - 返回类型: `{ r: number; g: number; b: number; alpha: number }`
  - 兼容现有 hex/rgb 调用方
  - 文件: `packages/image-ops/src/empty-input.ts`

### Task 2: 修改 emptyInputExecutor

<!-- opsx-meta
id: T2
layer: engine
verify: unit-tests
dependencies:
  - type: task
    refs: [T1]
  - type: change
    refs: []
    status_required: completed
-->

- [x] T2.1: 使用 parseColor 解析的 alpha 值
  - 替换硬编码 `data[i + 3] = 255`
  - 支持透明背景生成
  - 文件: `packages/image-ops/src/empty-input.ts`

### Task 3: 添加单元测试

<!-- opsx-meta
id: T3
layer: engine
verify: unit-tests
dependencies:
  - type: task
    refs: [T2]
  - type: change
    refs: []
    status_required: completed
-->

- [x] T3.1: 测试 rgba 格式解析
  - `rgba(255, 0, 0, 0)` → alpha=0
  - `rgba(255, 0, 0, 1)` → alpha=255
  - `rgba(255, 0, 0, 0.5)` → alpha≈128
  - `rgba(255, 0, 0, 0.75)` → alpha≈191

- [x] T3.2: 测试透明图像生成
  - `rgba(100, 150, 200, 0)` → 全透明图像

- [x] T3.3: 测试完全不透明图像
  - `rgba(100, 150, 200, 1)` → alpha=255

- [x] T3.4: 测试兼容性
  - 现有 `#ffffff` 格式继续工作
  - 现有 `rgb(255, 255, 255)` 格式继续工作

- [x] T3.5: 测试错误格式回退
  - 无效 rgba 格式回退到完全不透明

### Task 4: 新增 EmptyInputBody 组件

<!-- opsx-meta
id: T4
layer: editor
verify: smoke-test
dependencies:
  - type: task
    refs: []
  - type: change
    refs: []
    status_required: completed
-->

- [x] T4.1: 实现 `EmptyInputBody` 组件
  - Width / Height 数字输入框
  - BackgroundColor 文本输入 + 预览色块
  - 对齐 TransformBody / ApplyMaskBody 风格
  - 文件: `apps/dev-tool/src/components/nodes/PrismNodeControls.tsx`

### Task 5: 注册 empty-input 渲染分支

<!-- opsx-meta
id: T5
layer: editor
verify: smoke-test
dependencies:
  - type: task
    refs: [T4]
  - type: change
    refs: []
    status_required: completed
-->

- [x] T5.1: 在 `hasBodyContent` 判断中添加 `empty-input`
  - 文件: `apps/dev-tool/src/components/nodes/PrismNode.tsx`

- [x] T5.2: 在 `nodeType` 渲染分支中添加 `empty-input`
  - 文件: `apps/dev-tool/src/components/nodes/PrismNode.tsx`

- [x] T5.3: 导入 `EmptyInputBody`
  - 文件: `apps/dev-tool/src/components/nodes/PrismNode.tsx`

### Task 6: Smoke Test

<!-- opsx-meta
id: T6
layer: editor
verify: smoke-test
dependencies:
  - type: task
    refs: [T5]
  - type: change
    refs: []
    status_required: completed
-->

- [x] T6.1: 在编辑器中添加 Empty Input 节点
  - 验证节点内显示 width / height / backgroundColor 控件
  - 验证控件可交互修改参数
  - **manual smoke test** ✅

- [x] T6.2: 修改 backgroundColor 为 rgba 格式
  - 验证预览色块隐藏（rgba 不是纯色）
  - 验证执行后生成正确透明度的图像
  - **manual smoke test** ✅

- [x] T6.3: 验证与右侧属性栏同步
  - 节点内修改 → 属性栏同步
  - 属性栏修改 → 节点内同步
  - **manual smoke test** ✅

## Verification

```bash
# engine 层验证
pnpm test --filter=@prism/image-ops

# editor 层验证
pnpm typecheck --filter=@prism/dev-tool

# smoke test（手动）
# 1. 启动 dev-tool: pnpm --filter=@prism/dev-tool dev
# 2. 添加 Empty Input 节点
# 3. 验证内联控件显示和交互
```

## 实现说明

### 文件变更

- `packages/image-ops/src/empty-input.ts`
  - 新增 `parseRgba()` 函数
  - 修改 `parseColor()` 返回值
  - 修改 `emptyInputExecutor` alpha 处理

- `packages/image-ops/src/empty-input.test.ts` (新增)
  - 17 个测试用例，全部通过

- `apps/dev-tool/src/components/nodes/PrismNodeControls.tsx`
  - 新增 `EmptyInputBody` 组件

- `apps/dev-tool/src/components/nodes/PrismNode.tsx`
  - `hasBodyContent` 添加 `empty-input`
  - 渲染分支添加 `EmptyInputBody`
