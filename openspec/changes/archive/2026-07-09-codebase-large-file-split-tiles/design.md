# Design

> 把项目里 6-12 个大文件按 tile 拆分，每个 tile 走 Facade / Wrapper 外壳保留法。子 change 分别为 A:UI 边缘、B:服务层、C:核心 store/worker。

---

## Goals

1. 把每个大文件先做“外壳保留法”抽离，旧文件作为 Facade / Wrapper，新文件承接实现。
2. 通过 change-splitting 把本次拆分拆为 A / B / C 三个子 change，按风险分层串行。
3. 建立 `docs/refactor-map.md` 作为“拆分缓存”，每个 tile 完成后追加块摘要。
4. 每个子 change 在 `tasks.md` 给出可自动验证的验收命令（typecheck、lint、相关包测试）。
5. 任何拆分都不删除既有行为、测试和文档。

## Non-Goals

- ~~重写或重构 `useCanvasStore.ts` 的核心 action~~
- ~~重写 `imageWorker.worker.ts` 的 mask/transform/export 算法~~
- ~~重写 `workerPool.ts` 的 queue / execute / replace 逻辑~~
- ~~拆 `global.css` 的 layout / reset / 主题变量基础块~~
- ~~修改对外 SDK 公开 API 类型（`ComposerSDKProps`、`ComposerSDKProps` 等）~~
- ~~改 Prisma schema、node schema、对外 schema 格式~~
- ~~删除任何 OpenSpec archive 或 PRD 文档~~
- ~~删除任何测试~~

---

## Decisions

### D1：使用 Facade / Wrapper 外壳保留法

**决策**：每个 tile 抽出后，旧文件继续 re-export 旧符号，新文件承接实现。调用方暂不修改 import 路径。

**理由**：
- 拆完一个 tile 不破坏现有 import，可独立 typecheck。
- 拆错的 tile 可以通过子 change verify 阶段发现并回滚，不影响其他 tile。
- 符合用户在前轮明确提出的“旧总控外壳逐步变薄”的方法学。

### D2：通过 change-splitting 拆为 A / B / C 三个子 change

**决策**：按风险和 layer 把本 change 拆为 3 个子 change，串行执行。

**理由**：
- A、B、C 之间有强方法学连续性（外壳保留法、refactor-map 维护），但分属不同 layer / 不同文件。
- 三个子 change 都满足 “预期 3+ 个子 change” 拆分条件。
- 串行避免 `docs/refactor-map.md` 的写入冲突。

### D3：建立 `docs/refactor-map.md` 作为拆分缓存

**决策**：在仓根 `docs/refactor-map.md` 中维护每个 tile 的块摘要，结构包括原文件、新文件、新文件职责、对外暴露、仍依赖它的位置、下次修改先看哪些文件。

**理由**：
- 用户在前轮明确要求“以后再开新对话不需要让 Cursor 全读代码”。
- 块摘要按时间倒序追加，便于回溯。
- 模板固定，避免每次都写长篇说明。

### D4：不拆任何核心算法 / 核心 action

**决策**：本次只拆“边缘 tile”（纯函数、独立小组件、独立 CSS 区块、纯常量/类型）。

**理由**：
- 拆核心 action（如 `useCanvasStore.executeWorkflow`）会同时影响 UI、execution、live subscription、autosave，回滚成本高。
- 拆核心 worker 算法（mask / transform / export）会破坏跨平台一致性的测试护栏。
- 边缘 tile 风险最低，可在子 change verify 阶段被快速识别。

### D5：每个子 change 走完整 OpenSpec 流程

**决策**：每个子 change 都创建自己的 change 目录并按 `prism-workflow` schema 生成 proposal / design / tasks / verify 4 个 artifact。

**理由**：
- 子 change 之间独立可 archive / revert。
- 与仓库 OpenSpec 工作流一致。
- 父 change `codebase-large-file-split-tiles` 只承担“拆分总图”的作用，不直接 apply 任何代码。

---

## Architecture Review

### A1：当前结构分析

```text
apps/dev-tool
├─ styles/
│  ├─ global.css (2909)  ← 多页 + 弹窗 + 通用 layout 混在一起
│  └─ nodes/dense-control-node.css (977)
├─ components/
│  ├─ Inspector/Inspector.module.css (1322)
│  ├─ header/WorkflowHeader.tsx (677)  ← 内联 style 占据 300-674
│  ├─ WorkflowsView.tsx (537)  ← 含 DeleteConfirm 36-65
│  ├─ nodes/PrismNodeControls.tsx (709)  ← 节点 body + 多 Body 组件 + 多个 helper
│  └─ NodePanel.css (714)
├─ modules/editor/stores/useCanvasStore.ts (1361)  ← 不拆核心
└─ storage/IndexedDBStorageAdapter.ts (423)

packages/composer-sdk
└─ ComposerCanvas.tsx (546)  ← imageToImageData 23-31 是纯 helper

packages/image-ops
├─ worker/imageWorker.worker.ts (1042)  ← 暂不拆
├─ scheduler/workerPool.ts (621)  ← sizing helper 16-44 可拆
└─ load-image.ts (451)  ← inferMimeType 5-22 可拆
```

**问题**：
- 大文件内职责混在一起，外人难以快速定位改动范围。
- AI 上下文消耗高，每次只动一个 tile 都要先 load 整个文件。
- 高风险核心（store、worker）被边缘 UI 包裹，潜在改动会“擦边打到核心”。

### A2：方案对比

| 方案 | 优点 | 缺点 | 选择 |
|------|------|------|------|
| A. 一次性大改写 | 短期最快 | 风险极高、回滚困难、无法分阶段验证 | ❌ |
| B. 全局引入新目录 + 一次性迁移 | 结构清晰 | 需要 PR 级别 diff，对 dev-tool store、worker 风险大 | ❌ |
| C. Facade / Wrapper 外壳保留法 + change-splitting | 风险低、可回滚、符合 OpenSpec 流程 | 需要维护旧文件 re-export | ✅ |
| D. 仅生成 `docs/refactor-map.md`，不真正拆分 | 零代码风险 | 体积墙依然存在 | ❌（只能作为短期缓存） |

### A3：拆分调度

```text
父 change: codebase-large-file-split-tiles
    │
    ├── A. UI 边缘 tile（editor / ui-skin）
    │     - WorkflowsView.DeleteConfirm
    │     - PrismNodeControls.dragImageState
    │     - WorkflowHeader 内联 style
    │     - Inspector.InfoPanel 样式
    │     - dense-control-node.css Export text preview
    │
    ├── B. 服务层 tile（editor + 部分 engine）
    │     - IndexedDBStorageAdapter constants/types
    │     - load-image.ts inferMimeType
    │
    └── C. 核心 store / composer / worker 边缘 tile（high）
          - workerPool sizing helper
          - ComposerCanvas imageToImageData
          - （不拆 useCanvasStore 核心 / 不拆 worker mask/transform/export）
```

### A4：Facade / Wrapper 示例

以 `PrismNodeControls.dragImageState` 为例（子 change A）：

```text
新文件 apps/dev-tool/src/components/nodes/PrismNodeControls/dragImageState.ts
   ↓ 承接 DRAG_DATA_KEY、setDragImageState、getDragImageState 实现

旧文件 apps/dev-tool/src/components/nodes/PrismNodeControls.tsx
   ↓ re-export 对外符号
   export { setDragImageState, getDragImageState } from './PrismNodeControls/dragImageState';
   ↓ 删除本文件中的旧实现代码块
```

这样：

- 旧 import 路径仍可用。
- typecheck 只在新文件 + 旧文件 re-export 处需要验证。
- 若新文件出错，只需回退旧实现。

### A5：refactor-map 块摘要模板

```markdown
## YYYY-MM-DD - Tile: <source>.<tile>

- 原文件：<path>
- 新文件：<path>
- 新文件职责：<一句话>
- 对外暴露：<symbol>
- 仍依赖它的位置：<paths>
- 下次修改该功能先看：
  - <new file>
  - <refactored source>
```

---

## Data Flow

```text
用户操作
  ↓
UI 组件（如 WorkflowsView / WorkflowHeader）
  ↓
useCanvasStore（保持现状）
  ↓
Storage adapter / image-ops executor（保持现状）
  ↓
Worker / IndexedDB（保持现状）

拆分发生在 UI 组件和 storage adapter 的内部结构上：
  旧大文件 → Facade（re-export） + 新小文件（实现）
  行为路径不变
```

---

## File Changes

### 新增文件（父 change 视角）

| 文件 | 用途 |
|------|------|
| `openspec/changes/codebase-large-file-split-tiles/proposal.md` | 本提案 |
| `openspec/changes/codebase-large-file-split-tiles/design.md` | 本设计 |
| `openspec/changes/codebase-large-file-split-tiles/tasks.md` | 父 change 的拆分总任务（建立子 change + 维护 refactor-map） |
| `openspec/changes/split-tiles-ui-edges/*` | 子 change A artifacts（由其 own propose 生成） |
| `openspec/changes/split-tiles-service-layer/*` | 子 change B artifacts |
| `openspec/changes/split-tiles-core-edges/*` | 子 change C artifacts |
| `docs/refactor-map.md` | 拆分缓存 |
| `apps/dev-tool/src/components/workflows/DeleteConfirm.tsx` | 子 change A 产物 |
| `apps/dev-tool/src/components/nodes/PrismNodeControls/dragImageState.ts` | 子 change A 产物 |
| `apps/dev-tool/src/components/header/WorkflowHeaderStyles.css` | 子 change A 产物（替代内联 style） |
| `apps/dev-tool/src/components/Inspector/InfoPanel.module.css` | 子 change A 产物 |
| `apps/dev-tool/src/storage/indexedDbConstants.ts` | 子 change B 产物 |
| `packages/image-ops/src/load-image/inferMimeType.ts` | 子 change B 产物 |
| `packages/image-ops/src/scheduler/workerPoolSizing.ts` | 子 change C 产物 |
| `packages/composer-sdk/src/utils/imageToImageData.ts` | 子 change C 产物 |

### 修改文件

| 文件 | 修改内容 |
|------|----------|
| `apps/dev-tool/src/components/WorkflowsView.tsx` | 删除 DeleteConfirm 本体；改为 re-export 自新文件 |
| `apps/dev-tool/src/components/nodes/PrismNodeControls.tsx` | 删除 drag image state 本体；改为 re-export 自新文件 |
| `apps/dev-tool/src/components/header/WorkflowHeader.tsx` | 删除 300-674 内联 style；改为 import CSS 文件 |
| `apps/dev-tool/src/components/Inspector/Inspector.module.css` | 删除 InfoPanel 段；保留其它 |
| `apps/dev-tool/src/styles/nodes/dense-control-node.css` | 删除 Export text preview 段（按需） |
| `apps/dev-tool/src/storage/IndexedDBStorageAdapter.ts` | 删除 constants/types 本体；改为 import 自新文件 |
| `packages/image-ops/src/load-image.ts` | 删除 inferMimeType 本体；改为 import |
| `packages/image-ops/src/scheduler/workerPool.ts` | 删除 sizing helper 本体；改为 import |
| `packages/composer-sdk/src/ComposerCanvas.tsx` | 删除 imageToImageData 本体；改为 import |

### 删除文件

| 文件 | 删除原因 |
|------|----------|
| （无） | 任何 facade 留下的旧实现不立即删除；保留 1 个子 change 周期后由 verify 阶段决定 |

---

## API Design

不引入新 API。Facade / Wrapper 不改变任何 import 路径和公共签名。

---

## Error Handling

不引入新错误码。所有错误处理保持原状。

---

## State Management

不引入新 store 状态。本次拆分是结构性整理，不增加 runtime state。

---

## Verification Checklist

| 类别 | 检查项 | 验证方式 |
|------|--------|---------|
| Schema | 所有子 change 的 proposal/design/tasks 完整 | `openspec change validate <name>` |
| Core | typecheck | `pnpm typecheck` |
| Build | lint | `pnpm lint` |
| Test | 受影响包测试 | `pnpm test --filter=<pkg>` |
| Dev-tool | 启动 dev-tool 仍能加载 workflow | 手动 / 已有 Playwright 用例 |
| 缓存 | refactor-map.md 至少 3 个 tile 摘要 | 文本搜索 `## YYYY-MM-DD` |
| 行数 | 每个大文件行数有可观察下降 | `wc -l` 前后对比 |

---

## Risk Assessment

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 子 change C 与 Phase 3 Composer SDK 冲突 | 中 | 中 | 父 change tasks 显式标注 A → B → C 串行；C 中 ComposerCanvas 部分与 Phase 3 串行 |
| `useCanvasStore.ts` 任何轻微改动都引发 UI 回归 | 高 | 高 | 子 change C 不动 store 任何一行；只动 worker pool sizing 和 composer helper |
| `IndexedDBStorageAdapter` 拆分破坏 DB 升级 | 中 | 高 | DB_VERSION / DB_NAME / store names 抽到 constants 后保持数值不变；verify 阶段通过现有 e2e 验证 |
| `Inspector.module.css` 拆分导致类名漂移 | 中 | 中 | 子 change A 拆分时保持原 class 名，新文件用同名 module css |
| `refactor-map.md` 在子 change 并行时写入冲突 | 中 | 中 | 串行调度；每次写入只追加，不修改历史块 |

---

## Quality Compliance

本设计遵循 [项目全局质量与交付规范](../specs/QUALITY_STANDARDS.md)，决策已覆盖以下要求：

### 执行完整性覆盖

- 拓扑排序：未改动
- 节点级错误隔离：未改动 executor
- Cancellation 链路：未改动
- API 契约稳定性：旧 store / adapter 公开方法不变；通过 typecheck + 既有测试

### 不变量检查

- Node Registry：未新增 type
- API 契约：未引入 schema 变更
- 行为契约：未引入新行为；纯结构迁移

### 测试策略

- [ ] 单元测试：未新增；既有测试在每个子 change verify 阶段必须保持通过
- [ ] 集成测试：未新增；既有 dev-tool 启动、WorkflowsView 加载、Header 渲染通过
- [ ] 手工验收：dev-tool 启动后画布、Inspector、WorkflowsView、Header 视觉一致

---

## 子 change 拆分设计概要

### 子 change A：split-tiles-ui-edges（change_class: low / medium）

- 主要 layer：`editor` / `ui-skin`
- 目标文件：
  - `WorkflowsView.tsx` 36-65
  - `PrismNodeControls.tsx` 172-187
  - `WorkflowHeader.tsx` 300-674
  - `Inspector.module.css` 604-796
  - `dense-control-node.css` 961-977
- 验证命令：
  - `pnpm typecheck --filter=dev-tool`
  - `pnpm lint --filter=dev-tool`
  - `pnpm test --filter=dev-tool`
- 风险缓解：拆分时所有改动只动“被 Facade 取代”的旧实现行，调用方不动。

### 子 change B：split-tiles-service-layer（change_class: medium）

- 主要 layer：`editor` + `engine`（`image-ops/load-image`）
- 目标文件：
  - `IndexedDBStorageAdapter.ts` 1-25
  - `load-image.ts` 5-22
- 验证命令：
  - `pnpm typecheck --filter=dev-tool --filter=@prism/image-ops`
  - `pnpm test --filter=dev-tool --filter=@prism/image-ops`
- 风险缓解：DB constants 数值不变；executor 公开方法不变。

### 子 change C：split-tiles-core-edges（change_class: high）

- 主要 layer：`editor`（不动 store 核心）+ `engine`（worker pool sizing）+ `composer-sdk`（imageToImageData）
- 目标文件：
  - `workerPool.ts` 16-44
  - `ComposerCanvas.tsx` 23-31
- 验证命令：
  - `pnpm typecheck --filter=@prism/image-ops --filter=@prism/composer-sdk`
  - `pnpm test --filter=@prism/image-ops --filter=@prism/composer-sdk`
  - `pnpm test:e2e --filter=dev-tool`（若涉及 dev-tool canvas）
- 风险缓解：sizing helper 已是纯函数；`imageToImageData` 已是纯函数；不触碰 store / worker 核心。
- 与 Phase 3 协调：若 `phase3-composer-sdk-completion` 仍在 apply 阶段，C 必须等待。

---

## 调度策略

| 顺序 | 子 change | 阻塞条件 | 完成后归档 |
|------|-----------|---------|-----------|
| 1 | A | 无 | `openspec archive split-tiles-ui-edges` |
| 2 | B | A 完成后 | `openspec archive split-tiles-service-layer` |
| 3 | C | B 完成后 + Phase 3 不在 ComposerCanvas 行 | `openspec archive split-tiles-core-edges` |
| 4 | 父 change | 三个子 change 都 archive 后 | `openspec archive codebase-large-file-split-tiles` |
