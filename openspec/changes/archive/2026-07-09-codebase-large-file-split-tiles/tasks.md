# Tasks

> 把项目里 6-12 个大文件按 tile 拆分，每个 tile 走 Facade / Wrapper 外壳保留法。子 change 分别为 A:UI 边缘、B:服务层、C:核心 store/worker。

---

## Progress

| Metric | Value |
|--------|-------|
| Total Tasks | 7 |
| Completed | 5 |
| In Progress | 0 |

---

## Phase 0 - 拆分总图与脚手架

### T0.1 - 建立父 change 目录与 artifacts

**opsx-meta**

```yaml
id: T0.1
layer: meta
task_type: feature
verify:
  - type: dir_exists
    path: openspec/changes/codebase-large-file-split-tiles
  - type: file_content
    path: openspec/changes/codebase-large-file-split-tiles/proposal.md
    contains: "change_class"
  - type: file_content
    path: openspec/changes/codebase-large-file-split-tiles/design.md
    contains: "Decisions"
  - type: file_content
    path: openspec/changes/codebase-large-file-split-tiles/tasks.md
    contains: "T0.1"
```

**Description**

完成父 change 的 proposal / design / tasks 三个 artifact，作为大文件拆分的总图。

**Acceptance Criteria**

- [x] `openspec/changes/codebase-large-file-split-tiles/proposal.md` 存在且包含 change_class、Why、What Changes、Capabilities、Out of Scope
- [x] `openspec/changes/codebase-large-file-split-tiles/design.md` 存在且包含 Goals、Decisions、Architecture Review、Verification Checklist
- [x] `openspec/changes/codebase-large-file-split-tiles/tasks.md` 存在且包含 T0.1–T0.5 + 子 change 调度任务

---

### T0.2 - 建立 `docs/refactor-map.md` 骨架

**opsx-meta**

```yaml
id: T0.2
layer: meta
task_type: feature
verify:
  - type: file_exists
    path: docs/refactor-map.md
  - type: file_content
    path: docs/refactor-map.md
    contains: "refactor-map"
```

**Description**

在 `docs/refactor-map.md` 中建立拆分缓存的骨架：标题、约定、块摘要模板、空状态说明。

**Acceptance Criteria**

- [x] `docs/refactor-map.md` 文件存在
- [x] 文件包含块摘要模板示例
- [x] 文件目前不包含任何 tile 块（`## YYYY-MM-DD - Tile:` 命中为 0）

---

### T0.3 - 创建子 change A：split-tiles-ui-edges

**opsx-meta**

```yaml
id: T0.3
layer: meta
task_type: feature
verify:
  - type: dir_exists
    path: openspec/changes/split-tiles-ui-edges
  - type: command
    run: openspec change validate split-tiles-ui-edges
    exit_code: 0
```

**Description**

调用 `openspec new change split-tiles-ui-edges --description "..."` 创建子 change A，并按子 change A 的设计（详见父 design）填充 proposal / design / tasks。

**Acceptance Criteria**

- [x] `openspec/changes/split-tiles-ui-edges` 目录存在
- [x] 子 change proposal.md / design.md / tasks.md 均存在
- [x] `openspec change validate split-tiles-ui-edges` 退出码 0

---

### T0.4 - 创建子 change B：split-tiles-service-layer

**opsx-meta**

```yaml
id: T0.4
layer: meta
task_type: feature
verify:
  - type: dir_exists
    path: openspec/changes/split-tiles-service-layer
  - type: command
    run: openspec change validate split-tiles-service-layer
    exit_code: 0
dependencies:
  - type: task
    refs: ["T0.3"]
```

**Description**

调用 `openspec new change split-tiles-service-layer --description "..."` 创建子 change B。

**Acceptance Criteria**

- [x] `openspec/changes/split-tiles-service-layer` 目录存在
- [x] proposal / design / tasks 完整
- [x] `openspec change validate` 通过

---

### T0.5 - 创建子 change C：split-tiles-core-edges

**opsx-meta**

```yaml
id: T0.5
layer: meta
task_type: feature
verify:
  - type: dir_exists
    path: openspec/changes/split-tiles-core-edges
  - type: command
    run: openspec change validate split-tiles-core-edges
    exit_code: 0
dependencies:
  - type: task
    refs: ["T0.4"]
```

**Description**

调用 `openspec new change split-tiles-core-edges --description "..."` 创建子 change C。子 change C 自身需包含“与 Phase 3 串行”约束的明确说明。

**Acceptance Criteria**

- [x] `openspec/changes/split-tiles-core-edges` 目录存在
- [x] proposal / design / tasks 完整
- [x] `openspec change validate` 通过
- [x] 子 change proposal 的 Out of Scope 显式列出"不拆 useCanvasStore 核心 / 不拆 worker mask/transform/export"

---

## Phase 1 - 拆分子 change 落地（apply 阶段由子 change 自行负责）

### T1.1 - 子 change A apply + verify + archive

**opsx-meta**

```yaml
id: T1.1
layer: editor
task_type: refactor
verify:
  - type: command
    run: pnpm typecheck --filter=dev-tool
    exit_code: 0
  - type: command
    run: pnpm lint --filter=dev-tool
    exit_code: 0
  - type: command
    run: pnpm test --filter=dev-tool
    exit_code: 0
  - type: command
    run: openspec list --json
    contains: "\"split-tiles-ui-edges\""
    expect: "not contains"
dependencies:
  - type: task
    refs: ["T0.3"]
```

**Description**

执行子 change A 的 tasks：拆出 DeleteConfirm、dragImageState、WorkflowHeader 内联 style、InfoPanel 样式、dense-control-node.css Export text preview。完成后追加 `## YYYY-MM-DD` 块摘要到 `docs/refactor-map.md`，archive 子 change。

**Acceptance Criteria**

- [x] `apps/dev-tool/src/components/workflows/DeleteConfirm.tsx` 存在并被 `WorkflowsView.tsx` re-export
- [x] `apps/dev-tool/src/components/nodes/PrismNodeControls/dragImageState.ts` 存在并被 `PrismNodeControls.tsx` re-export
- [x] `apps/dev-tool/src/components/header/WorkflowHeaderStyles.css` 或等价 module 存在，`WorkflowHeader.tsx` 改为 import
- [x] `apps/dev-tool/src/components/Inspector/InfoPanel.module.css` 存在
- [x] `dense-control-node.css` 体积下降至少 20 行
- [x] `docs/refactor-map.md` 至少新增 1 个 tile 块摘要
- [x] `pnpm typecheck --filter=dev-tool` 退出码 0
- [x] `pnpm lint --filter=dev-tool` 退出码 0
- [x] `pnpm test --filter=dev-tool` 退出码 0
- [x] 子 change A 已 archive（`openspec list` 不再出现）

---

### T1.2 - 子 change B apply + verify + archive

**opsx-meta**

```yaml
id: T1.2
layer: engine
task_type: refactor
verify:
  - type: command
    run: pnpm typecheck --filter=dev-tool --filter=@prism/image-ops
    exit_code: 0
  - type: command
    run: pnpm test --filter=dev-tool --filter=@prism/image-ops
    exit_code: 0
  - type: command
    run: openspec list --json
    contains: "\"split-tiles-service-layer\""
    expect: "not contains"
dependencies:
  - type: task
    refs: ["T1.1"]
```

**Description**

执行子 change B 的 tasks：抽 `IndexedDBStorageAdapter` 的 DB constants/types；抽 `load-image.ts` 的 `inferMimeType`。完成后追加块摘要到 `docs/refactor-map.md`，archive 子 change。

**Acceptance Criteria**

- [x] `apps/dev-tool/src/storage/indexedDbConstants.ts` 存在并被 `IndexedDBStorageAdapter.ts` import
- [x] `packages/image-ops/src/load-image/inferMimeType.ts` 存在并被 `load-image.ts` import
- [x] `IndexedDBStorageAdapter` 公开方法（`save`、`load`、`list`、`delete`、`getVersions` 等）签名不变
- [x] `loadImageExecutor` / `loadMaskExecutor` 公开签名不变
- [x] `docs/refactor-map.md` 至少再新增 1 个 tile 块摘要
- [x] `pnpm typecheck --filter=dev-tool --filter=@prism/image-ops` 退出码 0
- [x] `pnpm test --filter=dev-tool --filter=@prism/image-ops` 退出码 0
- [x] 子 change B 已 archive

---

### T1.3 - 子 change C apply + verify + archive

**opsx-meta**

```yaml
id: T1.3
layer: engine
task_type: refactor
verify:
  - type: command
    run: pnpm typecheck --filter=@prism/image-ops --filter=@prism/composer-sdk
    exit_code: 0
  - type: command
    run: pnpm test --filter=@prism/image-ops --filter=@prism/composer-sdk
    exit_code: 0
  - type: command
    run: openspec list --json
    contains: "\"split-tiles-core-edges\""
    expect: "not contains"
dependencies:
  - type: task
    refs: ["T1.2"]
```

**Description**

执行子 change C 的 tasks：抽 `workerPool.ts` 的 sizing helper；抽 `ComposerCanvas.tsx` 的 `imageToImageData`。**不**拆 `useCanvasStore.ts`、不拆 `imageWorker.worker.ts` 核心算法。完成后追加块摘要到 `docs/refactor-map.md`，archive 子 change。

**Acceptance Criteria**

- [x] `packages/image-ops/src/scheduler/workerPoolSizing.ts` 存在并被 `workerPool.ts` import
- [x] `packages/composer-sdk/src/utils/imageToImageData.ts` 存在并被 `ComposerCanvas.tsx` import
- [x] `useCanvasStore.ts` 在本子 change 内不被修改（verify 阶段通过 `git diff` 验证）
- [x] `imageWorker.worker.ts` 在本子 change 内不被修改
- [x] `docs/refactor-map.md` 至少再新增 1 个 tile 块摘要
- [x] `pnpm typecheck --filter=@prism/image-ops --filter=@prism/composer-sdk` 退出码 0
- [x] `pnpm test --filter=@prism/image-ops --filter=@prism/composer-sdk` 退出码 0
- [x] 子 change C 已 archive

---

## N. 质量合规性验收

> 交付前必须完成以下任务，否则不得合入 main 分支。

### N.1 执行引擎完整性

- [ ] N.1.1 拓扑排序测试覆盖（含 cycle detection）：未改动
- [ ] N.1.2 节点 executor 错误隔离测试：未改动
- [ ] N.1.3 AbortController 链路测试：未改动

### N.2 状态一致性

- [ ] N.2.1 Canvas 执行状态机转换测试：通过
- [ ] N.2.2 取消后 Zustand store 状态检查：通过

### N.3 Registry 与 API 契约

- [ ] N.3.1 Node Registry 重复注册报错验证：未新增 type
- [ ] N.3.2 Prisma migration 验证：未涉及 schema
- [ ] N.3.3 现有 workflow JSON 向后兼容验证：未改格式

### N.4 交互完整性

- [ ] N.4.1 无 `onClick={() => {}}` 占位交互：未引入
- [ ] N.4.2 错误文案可读性检查：未引入新文案

### N.5 安全与类型

- [ ] N.5.1 `as any` 使用检查：未引入
- [ ] N.5.2 API 输入 Zod 验证覆盖：未涉及 API 变更

---

## Completion Checklist

### 功能完成

- [ ] 所有 tasks 完成（T0.1–T1.3）
- [ ] 3 个子 change 均已 archive
- [ ] `docs/refactor-map.md` 至少 3 个 tile 块摘要

### 质量门禁

- [ ] `pnpm lint` 通过
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm test` 通过
- [ ] `pnpm build` 通过
- [ ] 覆盖率达标

### 文档

- [ ] proposal.md 完整
- [ ] design.md 完整
- [ ] tasks.md 完整
- [ ] 子 change A/B/C 的 proposal/design/tasks/verify 完整

### Review

- [ ] AI Review 无 Critical/High 问题
- [ ] 人工 Review 通过
- [ ] 所有问题已修复或计划

**最终状态**: DRAFT / READY_FOR_REVIEW / APPROVED / MERGED

---

**完成标准**: T0.1–T1.3 全部勾选且子 change A/B/C 全部 archive 后，方可标记父 change 为 completed 并申请合并。
