# Tasks

> UI 边缘 tile 拆分。父 change: `codebase-large-file-split-tiles`。

---

## Progress

| Metric | Value |
|--------|-------|
| Total Tasks | 8 |
| Completed | 2 |
| In Progress | 0 |

---

## Phase 1 - 5 个 tile 拆分

### T1 - 拆分 DeleteConfirm

**opsx-meta**

```yaml
id: T1
layer: editor
task_type: refactor
verify:
  - type: file_exists
    path: apps/dev-tool/src/components/workflows/DeleteConfirm.tsx
  - type: command
    run: pnpm typecheck --filter=dev-tool
    exit_code: 0
```

**Description**

把 `WorkflowsView.tsx` 36-65 的 `DeleteConfirm` 组件抽到 `apps/dev-tool/src/components/workflows/DeleteConfirm.tsx`，旧文件改为 `export { DeleteConfirm } from './workflows/DeleteConfirm';`。

**Acceptance Criteria**

- [x] `apps/dev-tool/src/components/workflows/DeleteConfirm.tsx` 存在
- [x] `WorkflowsView.tsx` 不再含 `DeleteConfirm` 本体，仅 re-export
- [x] `pnpm typecheck --filter=dev-tool` 退出码 0

---

### T2 - 拆分 dragImageState

**opsx-meta**

```yaml
id: T2
layer: editor
task_type: refactor
verify:
  - type: file_exists
    path: apps/dev-tool/src/components/nodes/PrismNodeControls/dragImageState.ts
  - type: command
    run: pnpm typecheck --filter=dev-tool
    exit_code: 0
dependencies:
  - type: task
    refs: ["T1"]
```

**Description**

把 `PrismNodeControls.tsx` 172-187 的 `dragImageState` helper 抽到 `apps/dev-tool/src/components/nodes/PrismNodeControls/dragImageState.ts`，旧文件 re-export `DRAG_DATA_KEY`、`setDragImageState`、`getDragImageState`。

**Acceptance Criteria**

- [ ] `dragImageState.ts` 存在
- [ ] `PrismNodeControls.tsx` 不再含 helper 本体，仅 re-export
- [ ] `pnpm typecheck --filter=dev-tool` 退出码 0

---

### T3 - 拆分 WorkflowHeader 内联 style

**opsx-meta**

```yaml
id: T3
layer: ui-skin
task_type: refactor
verify:
  - type: file_exists
    path: apps/dev-tool/src/components/header/WorkflowHeaderStyles.css
  - type: command
    run: pnpm typecheck --filter=dev-tool
    exit_code: 0
dependencies:
  - type: task
    refs: ["T2"]
```

**Description**

把 `WorkflowHeader.tsx` 300-674 的内联 `<style jsx>` 或 `<style>` 段抽到 `apps/dev-tool/src/components/header/WorkflowHeaderStyles.css`，旧文件改为 `import './WorkflowHeaderStyles.css';`。

**Acceptance Criteria**

- [ ] `WorkflowHeaderStyles.css` 存在
- [ ] `WorkflowHeader.tsx` 不再含内联 style 段
- [ ] 旧 className 全部迁移
- [ ] `pnpm typecheck --filter=dev-tool` 退出码 0

---

### T4 - 拆分 Inspector.InfoPanel CSS module

**opsx-meta**

```yaml
id: T4
layer: ui-skin
task_type: refactor
verify:
  - type: file_exists
    path: apps/dev-tool/src/components/Inspector/InfoPanel.module.css
  - type: command
    run: pnpm typecheck --filter=dev-tool
    exit_code: 0
dependencies:
  - type: task
    refs: ["T3"]
```

**Description**

把 `Inspector.module.css` 604-796 的 InfoPanel 段抽到 `InfoPanel.module.css`，旧文件改为 `@import './InfoPanel.module.css';`。

**Acceptance Criteria**

- [ ] `InfoPanel.module.css` 存在
- [ ] `Inspector.module.css` 不再含 InfoPanel 段
- [ ] 旧 className 全部迁移
- [ ] `pnpm typecheck --filter=dev-tool` 退出码 0

---

### T5 - 拆分 dense-control-node.css Export text preview（按需）

**opsx-meta**

```yaml
id: T5
layer: ui-skin
task_type: refactor
verify:
  - type: file_exists
    path: apps/dev-tool/src/styles/nodes/dense-control-node-export-text.css
  - type: command
    run: pnpm typecheck --filter=dev-tool
    exit_code: 0
dependencies:
  - type: task
    refs: ["T4"]
```

**Description**

把 `dense-control-node.css` 961-977 的 Export text preview 段抽到 `dense-control-node-export-text.css`。如该段本身已短到不值得拆，可保留原状并在本任务备注中说明。

**Acceptance Criteria**

- [ ] `dense-control-node.css` 至少下降 10 行（按需；若无可拆内容，标注"保留"）
- [ ] `pnpm typecheck --filter=dev-tool` 退出码 0

---

## Phase 2 - 文档与验收

### T6 - 追加 5 个 tile 块摘要到 docs/refactor-map.md

**opsx-meta**

```yaml
id: T6
layer: meta
task_type: feature
verify:
  - type: file_content
    path: docs/refactor-map.md
    contains: "## YYYY-MM-DD - Tile:"
    min_occurrences: 5
dependencies:
  - type: task
    refs: ["T5"]
```

**Description**

按父 change design A5 模板，逐 tile 追加块摘要到 `docs/refactor-map.md`。

**Acceptance Criteria**

- [ ] `docs/refactor-map.md` 至少 5 个 `## YYYY-MM-DD - Tile:` 块
- [ ] 每块包含原文件、新文件、对外暴露、依赖位置、下次修改先看

---

### T7 - 全量验证

**opsx-meta**

```yaml
id: T7
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
dependencies:
  - type: task
    refs: ["T6"]
```

**Description**

跑 `pnpm typecheck --filter=dev-tool`、`pnpm lint --filter=dev-tool`、`pnpm test --filter=dev-tool` 三个 layer smoke，确认所有 5 个 tile 拆分无回归。

**Acceptance Criteria**

- [ ] typecheck 通过
- [ ] lint 通过
- [ ] dev-tool 测试通过

---

### T8 - Archive 子 change A

**opsx-meta**

```yaml
id: T8
layer: meta
task_type: feature
verify:
  - type: command
    run: openspec archive --change split-tiles-ui-edges --yes
    exit_code: 0
dependencies:
  - type: task
    refs: ["T7"]
```

**Description**

调用 `openspec archive --change split-tiles-ui-edges --yes` 完成 archive。完成后 `openspec list` 不再出现 `split-tiles-ui-edges`。

**Acceptance Criteria**

- [ ] `openspec/changes/archive/` 出现 `split-tiles-ui-edges` 目录
- [ ] `openspec list` 不再出现 `split-tiles-ui-edges`

---

## Completion Checklist

- [ ] T1–T8 全部勾选
- [ ] 子 change A 已 archive
- [ ] `docs/refactor-map.md` 至少 5 个 tile 块摘要
- [ ] dev-tool typecheck / lint / test 通过
- [ ] 父 change `codebase-large-file-split-tiles` 中 T1.1 验收标准全部满足

**完成标准**：T1–T8 全部勾选且子 change A archive 后，方可继续执行父 change T1.2（子 change B）。