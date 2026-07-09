# Proposal

> 把项目里 6-12 个大文件按 tile 拆分，每个 tile 走 Facade / Wrapper 外壳保留法。子 change 分别为 A:UI 边缘、B:服务层、C:核心 store/worker。

---

## Metadata

| 字段 | 值 |
|------|-----|
| change_class | high |
| reason | 跨 `apps/dev-tool`、`packages/composer-sdk`、`packages/image-ops`，触及 `useCanvasStore.ts`、`imageWorker.worker.ts`、`workerPool.ts` 等核心 store / engine 文件。即便单个 tile 是边缘功能，整体仍属于跨包跨层结构整理，按高风险处理。 |

---

## Why

### 背景

经过两轮只读分析（项目热力图 + 大文件分块地图），项目已经出现显著的可维护性热点：

- `apps/dev-tool/src/modules/editor/stores/useCanvasStore.ts` 约 1361 行
- `apps/dev-tool/src/styles/global.css` 约 2909 行
- `apps/dev-tool/src/components/Inspector/Inspector.module.css` 约 1322 行
- `apps/dev-tool/src/styles/nodes/dense-control-node.css` 约 977 行
- `apps/dev-tool/src/components/nodes/PrismNodeControls.tsx` 约 709 行
- `apps/dev-tool/src/components/header/WorkflowHeader.tsx` 约 677 行
- `apps/dev-tool/src/components/WorkflowsView.tsx` 约 537 行
- `apps/dev-tool/src/storage/IndexedDBStorageAdapter.ts` 约 423 行
- `packages/composer-sdk/src/ComposerCanvas.tsx` 约 546 行
- `packages/image-ops/src/worker/imageWorker.worker.ts` 约 1042 行
- `packages/image-ops/src/scheduler/workerPool.ts` 约 621 行
- `packages/image-ops/src/load-image.ts` 约 451 行

后续任何调整（即使是边缘 UI 调整）都意味着改动动辄上千行文件，AI 上下文消耗高、回归风险大。

### 问题陈述

单个大文件同时承担多类职责：UI 渲染、状态管理、副作用编排、像素/Worker 调度混在一起，AI 与人类都难以“一次只动一个 tile”。

### 动机

- 项目正处于“已完成多个 phase、继续 Phase 3 Composer SDK 完善”的阶段，Phase 3 期间会反复修改 `ComposerCanvas.tsx`、`useCanvasStore.ts` 与 `imageWorker.worker.ts`。
- 现在不把外壳做薄，后续每一次 Composer SDK / 实时预览的改动都会先撞上文件体积墙。
- 团队已经建立 OpenSpec + ECC bridge 流程，可以在受控条件下做小步拆分。
- 上一轮只读分析已经把每个大文件切成 tile 地图，拆分目标清晰，不属于“未明需求边界的探索”。

---

## What Changes

### 核心变更

1. 引入 change-splitting：把这次大文件拆分拆为 3 个子 change（A/B/C），按风险分层串行执行。
2. 每个 tile 的拆分统一使用 Facade / Wrapper 外壳保留法：旧文件继续 re-export 旧符号，新文件承接实现，调用方无感。
3. 建立 `docs/refactor-map.md` 作为“拆分缓存”：每完成一个 tile 追加块摘要，避免后续 AI 重新读完整文件。
4. 拆完一个 tile，必须在子 change 的 `tasks.md` 中给出可自动验证的验收命令（typecheck、lint、相关包测试、相关 dev-tool 烟测等）。

### 新增内容

- `docs/refactor-map.md`：项目级拆分地图
- `apps/dev-tool/src/components/workflows/DeleteConfirm.tsx`（子 change A）
- `apps/dev-tool/src/components/nodes/PrismNodeControls/dragImageState.ts`（子 change A）
- `apps/dev-tool/src/components/header/WorkflowHeaderStyles.css` 或独立 module（子 change A）
- `apps/dev-tool/src/components/Inspector/InfoPanel.module.css`（子 change A）
- `apps/dev-tool/src/styles/nodes/dense-control-node-export-text.css`（子 change A，按需）
- `packages/composer-sdk/src/utils/imageToImageData.ts`（子 change C）
- `packages/image-ops/src/scheduler/workerPoolSizing.ts`（子 change C）
- `packages/image-ops/src/load-image/inferMimeType.ts`（子 change B）
- `apps/dev-tool/src/storage/indexedDbConstants.ts`（子 change B）

（以上文件路径为预期产物；具体路径在子 change `design.md` 中细化。）

### 修改内容

- `apps/dev-tool/src/components/WorkflowsView.tsx`（子 change A）
- `apps/dev-tool/src/components/nodes/PrismNodeControls.tsx`（子 change A）
- `apps/dev-tool/src/components/header/WorkflowHeader.tsx`（子 change A）
- `apps/dev-tool/src/components/Inspector/Inspector.module.css`（子 change A）
- `apps/dev-tool/src/styles/nodes/dense-control-node.css`（子 change A）
- `apps/dev-tool/src/storage/IndexedDBStorageAdapter.ts`（子 change B）
- `packages/composer-sdk/src/ComposerCanvas.tsx`（子 change C）
- `packages/image-ops/src/scheduler/workerPool.ts`（子 change C）
- `packages/image-ops/src/load-image.ts`（子 change B）
- `docs/refactor-map.md`（每个 tile 完成后追加块摘要）

### 删除内容

- 不删除任何业务行为。
- 不删除任何测试。
- 不删除任何归档后的 OpenSpec 文档或 PRD 文档。
- 子 change 完成且下一轮不再被 Facade 引用时，可在 verify 阶段讨论是否删除对应外壳 re-export，但**不在 propose 阶段承诺删除**。

---

## Capabilities

- **能力 1**：每个大文件能以一个或多个“边缘 tile”为单位被独立移动，旧文件作为 Facade 继续可用。
- **能力 2**：后续 AI 改 Composer SDK、editor store、worker 相关代码时，可只读目标 tile 与 `docs/refactor-map.md`，无需重读完整源文件。
- **能力 3**：拆分过程可回滚：若某个 tile 在 apply / verify 阶段被证明引入了回归，只需让对应子 change 重新 archive 或回滚。
- **能力 4**：所有拆分均通过 `pnpm typecheck`、`pnpm lint`、相关包 `pnpm test` 验证。

---

## Impact

| 包/应用 | 影响 |
|---------|------|
| `apps/dev-tool` | 多个 UI 组件、CSS 文件、storage adapter 改动；编辑器核心 store 仅作 Facade 保留 |
| `packages/composer-sdk` | `ComposerCanvas.tsx` 边缘 helper 抽出 |
| `packages/image-ops` | `workerPool.ts` 边缘 sizing helper 抽出；`load-image.ts` 边缘 mime helper 抽出 |
| `packages/shared-types` | 暂不动 |
| `server` | 暂不动 |
| `docs/` | 新增 `refactor-map.md` |

层映射（按仓库 layer 约定）：

- `editor`：子 change A 主战场
- `engine`：子 change C 主战场（worker / canvas）
- `editor` + 部分 `engine`：子 change B（storage、load-image）
- `meta`：本 change + `docs/refactor-map.md` 自身

---

## Out of Scope

- ~~全局重构 store 或 worker 核心逻辑~~
- ~~替换 storage adapter 底层实现（如从 IndexedDB 切到 SQLite / Dexie）~~
- ~~修改 node schema / Prisma schema~~
- ~~修改对外 SDK 公开 API 类型（`ComposerSDKProps` 等）~~
- ~~删除 OpenSpec 历史 archive 或 PRD 文档~~
- ~~拆 `useCanvasStore.ts` 的核心 action（execution、graph CRUD、connection validation、live subscription 安装）~~
- ~~拆 `imageWorker.worker.ts` 的 mask/transform/export 核心算法~~
- ~~拆 `workerPool.ts` 的 queue / execute / replace 核心逻辑~~
- ~~拆 `global.css` 的 layout / reset / 主题变量基础块~~

---

## Dependencies

| 依赖 | 原因 |
|------|------|
| `phase3-composer-sdk-completion` | 在子 change C 抽出 `imageToImageData` 时可能与 Phase 3 的 SDK 行为相关；若 Phase 3 仍在进行，应串行等待或暂停 C 的 ComposerCanvas 部分 |
| `phase1-3-architecture-fix`（已 archive） | 历史相关，本次不再依赖 |
| 仓库 ECC / OpenSpec 流程 | 本 change 严格走 OpenSpec apply/verify 阶段，每子 change 走一次 |

> 本 change 自身不强依赖未完成的 future change；与 `phase3-composer-sdk-completion` 的冲突风险在子 change C 的 tasks 中标注为 risk。

---

## Success Criteria

| 标准 | 验证方式 |
|------|----------|
| 3 个子 change 均完成并 archive | `openspec list` 不再出现 A/B/C；`openspec/changes/archive/` 中有对应目录 |
| 每个子 change 拆出至少 1 个独立文件并被旧文件 import | `git diff --stat` 中出现新增文件 |
| 每个子 change 通过 typecheck | `pnpm typecheck` 退出码 0 |
| 每个子 change 通过 lint | `pnpm lint` 退出码 0 |
| 每个子 change 涉及包通过相关测试 | `pnpm test --filter=<pkg>` 退出码 0 |
| `docs/refactor-map.md` 至少包含 3 个 tile 块摘要 | 文本搜索 `## YYYY-MM-DD` 命中 ≥ 3 |
| 旧大文件行数有可见下降，且无破坏性行为变更 | `wc -l` 前后对比 + 关键 store selector 仍能正确读取 |
| Composer SDK / editor 行为不退化（关键 UI 路径） | dev-tool 启动后画布、Inspector、WorkflowsView、Header 视觉一致 |

---

## Risks

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| `useCanvasStore.ts` 是 dev-tool 关键路径，UI 大量依赖其 action 签名 | 高 | 高 | 子 change C 不拆 store 核心 action，仅拆模块级 helper；旧 selector 保持不变 |
| Worker 核心改动易引入跨平台一致性问题 | 中 | 高 | 子 change C 不动 worker / queue / replace / execute；只抽 sizing helper |
| 子 change A / B / C 并行执行会互相踩到 `docs/refactor-map.md` 同一文件 | 中 | 中 | 子 change 串行执行；本 change 的 tasks 中明确 A → B → C 顺序 |
| 拆分时与 `phase3-composer-sdk-completion` 冲突 | 中 | 中 | 子 change C 中 ComposerCanvas 部分与 Phase 3 并行时串行；不抢同一 tile |
| `IndexedDBStorageAdapter` 是大量 dev-tool 工作流路径依赖 | 中 | 中 | 旧 adapter 保持 public method 不变；新文件只承接 constants/types |

---

## Quality Standards Compliance

本 change 遵循 [项目全局质量与交付规范](../specs/QUALITY_STANDARDS.md)。

### 执行完整性检查

| 检查维度 | 是否涉及 | 验证方式 |
|---------|---------|---------|
| 拓扑排序正确性 | 否 | 拓扑排序未改动 |
| 节点级错误隔离 | 否 | executor 未改动 |
| Cancellation 完整性 | 否 | cancel 链路未改动 |
| Canvas 状态一致性 | 是 | 通过 dev-tool 手工验收 + store 既有 `useCanvasStore.live.test.ts` 仍通过 |
| Node Registry 不变量 | 否 | node registry 未改动 |
| API 契约稳定性 | 是 | 旧 store / adapter 公开方法不变；通过已有 typecheck 与既有测试 |
| Node Package 安全 | 否 | node package 未改动 |
| 交互完整性 | 是 | UI 行为不变；通过 dev-tool 手工验收 |

### 验收要求

- [ ] 每个子 change 拆完的旧文件保持公开 API 不变（仅作 Facade re-export）
- [ ] 每个子 change 涉及文件未引入新行为依赖
- [ ] 每个子 change 不删除任何测试
- [ ] `docs/refactor-map.md` 至少 3 个 tile 块摘要
- [ ] 每个子 change 在 `tasks.md` 中显式列出 typecheck / lint / test 验证命令

---

## 子 change 拆分（change-splitting）

> 满足 SKILL 条件：预期 3 个以上子 change；存在显式依赖 A → B → C。

### 子 change A：UI 边缘 tile 拆分（change_class: low → medium）

- 主要 layer：`editor` / `ui-skin`
- 依赖：无
- 一句话描述：把 `WorkflowsView.DeleteConfirm`、`PrismNodeControls.dragImageState`、`WorkflowHeader` 内联样式、`Inspector.InfoPanel` 样式、`dense-control-node.css` 的 Export text preview 段等边缘 UI/CSS tile 抽到独立文件，旧文件作为 Facade 继续 re-export。

### 子 change B：服务层 / 适配器 tile 拆分（change_class: medium）

- 主要 layer：`editor` + 部分 `engine`（`image-ops/load-image`）
- 依赖：A（无强依赖；A、B 可并行，但都串行调度避免 `refactor-map.md` 冲突）
- 一句话描述：把 `IndexedDBStorageAdapter` 的 DB constants/types、`load-image.ts` 的 `inferMimeType` 抽到独立模块；保持 adapter / executor 公开方法不变。

### 子 change C：核心 store / composer / worker 边缘 tile 拆分（change_class: high）

- 主要 layer：`editor`（`useCanvasStore` 不动核心）+ `engine`（`workerPool` sizing helper）+ `composer-sdk`（`ComposerCanvas` imageToImageData）
- 依赖：A、B 完成后执行；若 Phase 3 仍在进行，ComposerCanvas 部分需串行
- 一句话描述：把 `workerPool` 的 sizing helper 抽到 `workerPoolSizing.ts`，把 `ComposerCanvas` 的 `imageToImageData` 抽到 utils；不拆 store / queue / execute / mask / transform 核心。

### 调度顺序

A → B → C 串行。

理由：

- A 与 B 的修改集基本不重叠（A 偏 UI/CSS，B 偏 storage + load-image 边缘），可视为同一时间窗口串行以避免 `refactor-map.md` 写入冲突。
- C 触及核心文件，必须在 A、B 经验沉淀后再做。

---

## 提交策略

每个子 change 在自己的 OpenSpec change 中走完整 propose → apply → verify → archive 流程。父 change `codebase-large-file-split-tiles` 在所有子 change archive 后再 archive。
