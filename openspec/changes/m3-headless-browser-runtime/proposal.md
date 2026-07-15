# Proposal: M3 — Headless Browser Runtime

> **change_class**: high
> **reason**: M3 创建新 monorepo package `@prism/browser-runtime`，定义 AssetResolver/OutputSink 边界，添加 image-ops 浏览器子入口，建立 Chromium test host，引入 package boundary gates。触及 packages/* 边界、新包创建、跨包依赖方向。

---

## Why

### 背景

当前 Prism Dev Tool 和 Composer SDK 各有独立预览实现：
- **Dev Tool**：通过 `executionService` → `WorkflowExecutor` → `browserExecutors` 执行，使用 Zustand store 管理状态
- **Composer SDK**：直接操作 DOM canvas，无 WorkflowExecutor 调用

M2 已建立确定性 Flow 选择（`flowKey`）和显式输出（`explicitOutputs`）协议，但 Dev Tool 和 Composer 尚未统一使用同一执行引擎。

### 问题陈述

Browser 执行能力散布在 Dev Tool app 和 Composer SDK 中，没有独立的无 UI runtime 包可供复用。Dev Tool 强耦合 Zustand，Composer SDK 没有调用 WorkflowExecutor。

### 动机

1. **Prism 目标架构要求**：Browser Runtime 必须独立于 UI，可被 Dev Tool 和 Composer 共享（M3）
2. **M4 迁移前提**：必须先有可注入的 runtime 包，M4 才能让 Dev Tool/Composer 切换（M4）
3. **协议一致性**：Browser 和 Node 生产端必须共享 M2 协议，避免两套执行路径
4. **M0 验证基础**：M0 已验证 Browser executor 链在真实 Chromium 可执行，M3 需将其封装为可测试包

---

## What Changes

### 核心变更

1. **创建 `@prism/browser-runtime` 包**
   - 组合 `workflow-core` + `browser executors`
   - 提供单一执行入口 `execute()`
   - 消费 M2 `RenderRequest`，返回 M2 `RenderResult`

2. **添加 `@prism/image-ops/browser` 子入口**
   - 仅导出 browser executors（不导出 Sharp/nodejs）
   - 为 browser-runtime 提供干净的 import 路径

3. **定义 `AssetResolver` 接口（输入边界）**
   - `resolve(assetRef): Promise<ImageData>`
   - 仅负责输入素材：AssetRef → 浏览器内存中的临时素材
   - **不**承担 preview、UI、持久化

4. **定义 `OutputSink` 接口（输出边界）**
   - `publish(executorOutput): ImageRef`
   - 最小接口：executor output → ImageRef
   - 输入解析和输出发布不混在一个接口中

5. **建立 Chromium test host**
   - 独立于 `_m0_evidence` 私有目录
   - 固定 TemplateVersion/DesignState/RenderRequest
   - 验证 10 项 Chromium 独立运行条件

6. **添加 package boundary gates**
   - 自动门禁：禁止 react、zustand、sharp、nodejs/*、Node built-ins
   - 基于实际 import graph，不只字符串搜索

### 新增内容

- `packages/browser-runtime/` — 新包
- `packages/image-ops/src/browser-entry.ts` — 浏览器子入口
- `packages/browser-runtime/src/__tests__/chromium/` — Chromium 测试宿主
- `packages/browser-runtime/src/__tests__/boundary-gates.test.ts` — package boundary 测试

### 修改内容

- `packages/image-ops/package.json` — 添加 `browser` 导出条件
- `packages/image-ops/src/executors.ts` — 确保 browser executors 可独立导入
- `pnpm-workspace.yaml` — 注册新包

### 删除内容

- 无

---

## Capabilities

### New Capabilities

- `browser-runtime-package`: 创建 `@prism/browser-runtime` 包
- `image-ops-browser-entry`: `@prism/image-ops/browser` 干净导入路径
- `asset-resolver-interface`: AssetResolver 输入边界接口
- `output-sink-interface`: OutputSink 输出边界接口
- `chromium-test-host`: 独立 Chromium 测试宿主
- `package-boundary-gates`: 自动门禁检查

### Modified Capabilities

- `@prism/image-ops` 增加 `browser` 导出条件

---

## Impact

| 包/应用 | 影响 |
|---------|------|
| `packages/browser-runtime` | **新增** — M3 主要交付物 |
| `packages/image-ops` | 添加 browser 子入口，不破坏现有导出 |
| `packages/workflow-core` | 被 browser-runtime 依赖，无修改 |
| `packages/shared-types` | 被 browser-runtime 依赖，无修改 |
| `packages/node-definitions` | **调查结论**：browser-runtime **不需要**直接依赖；定义在 `image-ops` 内部复用 |
| `apps/dev-tool` | **无影响** — M3 不修改，M4 才迁移 |
| `packages/composer-sdk` | **无影响** — M3 不修改，M4 才迁移 |
| `server` | **无影响** |

---

## Out of Scope

- ~~修改 `apps/dev-tool/**`~~
- ~~修改 `packages/composer-sdk/**`~~
- ~~添加 DevToolAssetResolver 或 ComposerAssetResolver~~
- ~~添加 Dev Tool OutputSink 或 Composer OutputSink~~
- ~~把 Dev Tool 切换到新 Runtime~~
- ~~把 Composer 切换到新 Runtime~~
- ~~删除旧预览链路~~
- ~~修改 Mall、Server、Prisma、Production Runtime~~
- ~~修改 M2 协议~~
- ~~添加 Worker 架构~~
- ~~实现缓存系统~~
- ~~npm 外部发布~~
- ~~完全重写 `load-image.ts`~~ — 最小改动（见 design.md §D7）

---

## Dependencies

| 依赖 | 原因 |
|------|------|
| `m2-a-deterministic-flow-and-output-protocol` | 协议层依赖 |
| `m2-b-workflow-core-explicit-flow-resolution` | Engine 层依赖 |
| `m2-c-server-deterministic-render-entry` | RenderResult 类型依赖 |

---

## Success Criteria

| 标准 | 验证方式 |
|------|----------|
| `@prism/browser-runtime` 包可独立构建 | `pnpm build --filter @prism/browser-runtime` |
| `execute()` 消费 RenderRequest 返回 RenderResult | Chromium 测试通过 |
| AssetResolver 接口可注入实现 | Test host 注入 mock resolver |
| OutputSink 接口可注入实现 | Test host 注入 mock sink |
| `@prism/image-ops/browser` 不包含 Sharp | Bundle analysis 测试通过 |
| package boundary gates 全部通过 | `pnpm test --filter @prism/browser-runtime` |
| 真实 Chromium 中独立运行 | Chromium test host 10 项验证通过 |
| Dev Tool 和 Composer 继续按原方式工作 | 现有测试套件全部通过 |

---

## Risks

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| `@prism/core` 依赖 `image-ops`（含 Sharp）导致 bundle 污染 | 中 | 高 | browser-runtime 不依赖 `@prism/core` |
| `load-image.ts` 直接使用 `window`/`document` | 中 | 中 | M3 只增加 resolver-backed adapter，不重写旧路径 |
| Playwright Chromium 路径在不同环境不一致 | 低 | 低 | 复用 M0 `resolveChromiumExecutable()` 工具 |
| browser-runtime bundle 意外包含 Node built-ins | 低 | 高 | 添加自动 bundle 分析门禁 |
| TypeScript 路径别名导致 circular dependency | 低 | 高 | 验证 `tsc --noEmit` 通过 |

---

## Quality Standards Compliance

本需求遵循 [项目全局质量与交付规范](../specs/QUALITY_STANDARDS.md)。

### 执行完整性检查

| 检查维度 | 是否涉及 | 验证方式 |
|---------|---------|---------|
| 拓扑排序正确性 | 否 | 不涉及 |
| 节点级错误隔离 | 是 | executor 输出验证 |
| Cancellation 完整性 | 是 | AbortSignal 传递验证 |
| Canvas 状态一致性 | 否 | 不涉及 |
| Node Registry 不变量 | 是 | Executor 注册验证 |
| API 契约稳定性 | 是 | M2 协议兼容性测试 |
| Node Package 安全 | 是 | Package boundary gates |
| 交互完整性 | 否 | 无 UI |

### 验收要求

- [x] 本需求已覆盖所有涉及的质量检查维度
- [x] 新增 executor 路径已包含 try/catch 包裹
- [x] 涉及取消/状态机的逻辑已测试
