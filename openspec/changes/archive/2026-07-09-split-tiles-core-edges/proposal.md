# Proposal

> 核心 store / composer / worker 边缘 tile 拆分。父 change: `codebase-large-file-split-tiles`。

---

## Metadata

| 字段 | 值 |
|------|-----|
| change_class | high |
| reason | 触及 `packages/image-ops/src/scheduler/workerPool.ts` 和 `packages/composer-sdk/src/ComposerCanvas.tsx`，虽拆的是边缘纯函数（sizing helper、imageToImageData），但这两个文件本身属于 engine 与 SDK 关键路径，按高风险处理以确保 review 严格。 |

---

## Why

### 背景

父 change 识别 2 个核心边缘 tile：
- `workerPool.ts` 16-44：sizing helper（计算 worker 数量、并发度）
- `ComposerCanvas.tsx` 23-31：`imageToImageData` 纯函数

### 问题

- `workerPool.ts` 同时承载 queue / execute / replace 核心算法 + sizing 纯函数，AI 改 sizing 时要 load 整个 621 行文件。
- `ComposerCanvas.tsx` 同时承载 React 组件 + 工具函数，AI 改组件时容易擦边打到 helper。

### 动机

- 把 sizing helper 抽到独立模块后，未来调整 worker 并发策略仅需改一个 ~30 行小文件。
- 把 `imageToImageData` 抽到 utils，未来加新的 image data helper 时不影响 SDK 主体。

---

## What Changes

### 核心变更

1. 把 `workerPool.ts` 16-44 的 sizing helper 抽到 `packages/image-ops/src/scheduler/workerPoolSizing.ts`，旧文件改为 `import`。
2. 把 `ComposerCanvas.tsx` 23-31 的 `imageToImageData` 抽到 `packages/composer-sdk/src/utils/imageToImageData.ts`，旧文件改为 `import`。

### 新增内容

- `packages/image-ops/src/scheduler/workerPoolSizing.ts`
- `packages/composer-sdk/src/utils/imageToImageData.ts`

### 修改内容

- `packages/image-ops/src/scheduler/workerPool.ts`：删除 16-44 sizing helper 本体，改为 import。
- `packages/composer-sdk/src/ComposerCanvas.tsx`：删除 23-31 `imageToImageData` 本体，改为 import。
- `docs/refactor-map.md`：追加 2 个 tile 块摘要。

### 不修改

- `apps/dev-tool/src/modules/editor/stores/useCanvasStore.ts`（父 change 已显式禁止）
- `packages/image-ops/src/worker/imageWorker.worker.ts` 的 mask / transform / export 核心算法
- `packages/image-ops/src/scheduler/workerPool.ts` 的 queue / execute / replace 核心逻辑

---

## Capabilities

- **能力 1**：sizing helper 与 workerPool 主体解耦；imageToImageData 与 ComposerCanvas 主体解耦。
- **能力 2**：未来 worker pool 调度策略、image data helper 扩展仅需改单一小文件。
- **能力 3**：所有拆分通过 typecheck / lint / 相关包测试验证。
- **能力 4**：`useCanvasStore.ts` 与 `imageWorker.worker.ts` 在本子 change 内不被修改（verify 阶段通过 `git diff` 验证）。

---

## Impact

| 包/应用 | 影响 |
|---------|------|
| `packages/image-ops` | `workerPool.ts` 体积下降；新增 `scheduler/workerPoolSizing.ts` |
| `packages/composer-sdk` | `ComposerCanvas.tsx` 体积下降；新增 `utils/imageToImageData.ts` |
| `apps/dev-tool` | 暂不动 |
| `docs/` | `refactor-map.md` 新增 2 条 tile 块摘要 |

层映射（按仓库 layer 约定）：
- `engine`：worker pool 改动主战场
- `composer-sdk`（视作 editor 边界）：ComposerCanvas 改动主战场
- `meta`：`docs/refactor-map.md` 维护

---

## Out of Scope

- ~~拆 `useCanvasStore.ts` 任何一行（核心 action、execution、graph CRUD、connection validation、live subscription 安装）~~
- ~~拆 `imageWorker.worker.ts` 的 mask / transform / export 核心算法~~
- ~~拆 `workerPool.ts` 的 queue / execute / replace 核心逻辑~~
- ~~修改对外 SDK 公开 API 类型（`ComposerSDKProps` 等）~~
- ~~修改 node schema / Prisma schema~~
- ~~与 `phase3-composer-sdk-completion` 抢同一 ComposerCanvas tile~~

---

## Dependencies

| 依赖 | 原因 |
|------|------|
| `codebase-large-file-split-tiles`（父 change） | 父 change 已批准本子 change C 的拆分范围 |
| `split-tiles-ui-edges`（子 change A） | 无强依赖；串行调度 |
| `split-tiles-service-layer`（子 change B） | 无强依赖；串行调度 |
| `phase3-composer-sdk-completion` | 若仍在 apply 中，本子 change 的 ComposerCanvas 部分需串行；当前 phase3 已 archive（`git log` 显示 `51c4485` 之后不再有 phase3 commit），可并行 composer-sdk 文件改动，但本子 change 内仍串行提交以降低风险 |

> 本子 change 自身不依赖未完成的 future change。

---

## Success Criteria

| 标准 | 验证方式 |
|------|----------|
| 2 个新文件存在 | `ls <path>` 命中 |
| 旧文件 import 路径不变 | `git diff` 仅显示 import 行 + 函数引用 |
| `pnpm typecheck --filter=@prism/image-ops --filter=@prism/composer-sdk` 退出码 0 | shell 验证 |
| `pnpm test --filter=@prism/image-ops --filter=@prism/composer-sdk` 退出码 0 | shell 验证 |
| `useCanvasStore.ts` 在本子 change 内不被修改 | `git diff --stat` 不含该文件 |
| `imageWorker.worker.ts` 在本子 change 内不被修改 | `git diff --stat` 不含该文件 |
| `docs/refactor-map.md` 新增 2 个 tile 块摘要 | 文本搜索 `## YYYY-MM-DD - Tile:` |

---

## Risks

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| `workerPool.ts` queue / execute / replace 被误改 | 中 | 高 | 本子 change 严格只动 16-44 段；verify 阶段 `git diff` 验证 |
| `ComposerCanvas.tsx` 组件逻辑被误改 | 中 | 高 | 本子 change 严格只动 23-31 段；verify 阶段 `git diff` 验证 |
| 与 `phase3-composer-sdk-completion` archive 后状态冲突 | 低 | 中 | 本子 change 内串行；ComposerCanvas 部分仅动 `imageToImageData` helper；不触碰 phase3 改过的 layer / mask / undo-redo 等 |
| `imageToImageData` 被 ComposerCanvas 之外多处引用 | 低 | 低 | grep `imageToImageData` 验证仅 1 处 import |

---

## Quality Standards Compliance

本 change 遵循 [项目全局质量与交付规范](../../specs/QUALITY_STANDARDS.md)。

### 执行完整性检查

| 检查维度 | 是否涉及 | 验证方式 |
|---------|---------|---------|
| 拓扑排序正确性 | 否 | executor 未改动 |
| 节点级错误隔离 | 否 | executor 未改动 |
| Cancellation 完整性 | 否 | cancel 链路未改动 |
| Canvas 状态一致性 | 否 | useCanvasStore 未改动 |
| Node Registry 不变量 | 否 | node registry 未改动 |
| API 契约稳定性 | 是 | SDK 公开 API 不变；既有测试 |
| Node Package 安全 | 否 | node package 未改动 |
| 交互完整性 | 否 | UI 行为未改 |

### 验收要求

- [ ] `useCanvasStore.ts` / `imageWorker.worker.ts` 在本子 change 内不被修改
- [ ] `workerPool.ts` 仅动 16-44 段；queue / execute / replace 不动
- [ ] `ComposerCanvas.tsx` 仅动 23-31 段；组件逻辑不动
- [ ] 不删除任何测试
- [ ] `docs/refactor-map.md` 至少 2 个 tile 块摘要
- [ ] `tasks.md` 显式列出 typecheck / lint / test 验证命令