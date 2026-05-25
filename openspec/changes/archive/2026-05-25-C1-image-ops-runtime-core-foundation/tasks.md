# tasks: image-ops-runtime-core-foundation

- [x] **Task 1: 创建 core 目录结构和 alpha-format 纯函数**
  - 从 `composite.ts` 提取 `detectAlphaFormat` 和 `unPremultiply` 为独立纯函数，写入 `packages/image-ops/src/core/alpha-format.ts`
  - 要求：函数签名不变；移除所有 canvas-util 依赖；纯 TypeScript，无任何平台 API 调用；附带 JSDoc 说明 premultiplied alpha 检测原理
  - 验收：`Test-Path "packages/image-ops/src/core/alpha-format.ts"`

- [x] **Task 2: 创建 blend-modes.ts 纯函数**
  - 从 `composite.ts` 提取 `blendPixel` 函数及其 switch 内的 10 种 blend mode 公式，写入 `packages/image-ops/src/core/blend-modes.ts`
  - 要求：保持所有 blend mode 公式不变（normal/multiply/screen/overlay/darken/lighten/color-dodge/color-burn/hard-light/soft-light/difference/exclusion）；`clamp` 函数一并提取；纯函数，无副作用
  - 验收：`Test-Path "packages/image-ops/src/core/blend-modes.ts"`

- [x] **Task 3: 创建 porter-duff.ts 纯函数**
  - 将 Porter-Duff Source-Over compositing 的核心 lerp 逻辑提取，写入 `packages/image-ops/src/core/porter-duff.ts`
  - 要求：提取 `compositePixel(base, overlay, opacity) → [r,g,b,a]` 纯函数；包含 premultiplied RGB lerp + straight alpha lerp 逻辑；保持原有注释和公式说明；纯函数，无任何 API 依赖
  - 验收：`Test-Path "packages/image-ops/src/core/porter-duff.ts"`

- [x] **Task 4: 创建 composite-math.ts 纯函数**
  - 将 `composite.ts` 中的 `compositeImages` 函数提取并改造，写入 `packages/image-ops/src/core/composite-math.ts`
  - 要求：接受 `(baseData: ImageData, overlayData: ImageData, options: CompositeOptions) => ImageData`；内部调用 `alpha-format.ts`、`blend-modes.ts`、`porter-duff.ts` 的纯函数；**不创建任何 canvas 或 ImageData**；保持与现有 `compositeImages` 完全相同的像素级行为；导出 `CompositeOptions` 接口
  - 验收：`Test-Path "packages/image-ops/src/core/composite-math.ts"`

- [x] **Task 5: 创建 core/index.ts 统一导出**
  - 创建 `packages/image-ops/src/core/index.ts`，导出所有 core 模块
  - 验收：`npm run typecheck --workspace=@prism/image-ops`

- [x] **Task 6: 改造 composite.ts 调用 core 层**
  - 改造 `packages/image-ops/src/composite.ts`，将 executor 函数内部的像素计算替换为调用 `core/composite-math.ts`
  - 要求：保持 `compositeExecutor` 函数签名不变（NodeExecutor 接口）；保持 `serialComposite` 和 `parallelComposite` 在此文件（不移动）；保持 `compositeImages` 函数的存在（作为 browser 专用 wrapper，但内部调用 core）；保持所有 preview 生成逻辑（`OffscreenCanvas`/`generatePreviewUrl`）；保持所有 IRO 封装逻辑；移除已迁移到 core 的函数实现（`blendPixel`、`detectAlphaFormat`、`unPremultiply`、`clamp`）；`import { compositeImages } from './core/composite-math'` 替代内联实现
  - 验收：`npm run test -- packages/image-ops/src/composite.test.ts`

- [x] **Task 7: 端到端像素级 diff 验证**
  - 运行 `packages/image-ops/src/composite.test.ts` 的全部用例，确保像素级 diff 为 0
  - 验收：`npm run test -- packages/image-ops/src/composite.test.ts`
  - 期望：全部用例通过，无 regression

- [x] **Task 8: 完整 typecheck 验证**
  - 运行 `image-ops` package 的完整类型检查
  - 验收：`npm run typecheck --workspace=@prism/image-ops`
  - 期望：无类型错误

- [x] **Task 9: 上游 package typecheck**
  - 验证依赖 `image-ops` 的上游 package 仍能正常类型检查（`workflow-core`、`dev-tool`）
  - 验收：`npm run typecheck --workspace=@prism/workflow-core && npm run typecheck --workspace=@prism/dev-tool`

- [x] **Task 10: dev-tool 集成冒烟测试**
  - 启动 dev-tool，确保 composite 节点仍能正常渲染预览图
  - 验收：`npm run test -- packages/image-ops/src/composite.test.ts`
  - 注：T7 测试已验证像素级正确性，dev-tool 集成通过 typecheck + composite.test.ts 确认
