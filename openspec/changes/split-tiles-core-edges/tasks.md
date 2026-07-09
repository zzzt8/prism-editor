# Tasks

> 核心 store / composer / worker 边缘 tile 拆分。父 change: `codebase-large-file-split-tiles`。

---

## Progress

| Metric | Value |
|--------|-------|
| Total Tasks | 5 |
| Completed | 5 |
| In Progress | 0 |

---

## Phase 1 - 2 个 tile 拆分

### T1 - 拆分 workerPool sizing helper

**opsx-meta**

```yaml
id: T1
layer: engine
task_type: refactor
verify:
  - type: file_exists
    path: packages/image-ops/src/scheduler/workerPoolSizing.ts
  - type: command
    run: pnpm typecheck --filter=@prism/image-ops
    exit_code: 0
  - type: command
    run: git diff --stat packages/image-ops/src/scheduler/workerPool.ts
    not_contains: "queue|execute|replace"
```

**Description**

把 `workerPool.ts` 16-44 的 sizing helper 抽到 `packages/image-ops/src/scheduler/workerPoolSizing.ts`，旧文件改为 `import` 引用。**不**触碰 queue / execute / replace 主体。

**Acceptance Criteria**

- [x] `workerPoolSizing.ts` 存在
- [x] `workerPool.ts` 不再含 sizing 本体，仅 import
- [x] queue / execute / replace 段未被修改
- [x] `pnpm typecheck --filter=@prism/image-ops` 退出码 0

---

### T2 - 拆分 ComposerCanvas imageToImageData

**opsx-meta**

```yaml
id: T2
layer: editor
task_type: refactor
verify:
  - type: file_exists
    path: packages/composer-sdk/src/utils/imageToImageData.ts
  - type: command
    run: pnpm typecheck --filter=@prism/composer-sdk
    exit_code: 0
  - type: command
    run: git diff --stat packages/composer-sdk/src/ComposerCanvas.tsx
    not_contains: "useState|useEffect|useCallback|componentDidMount"
dependencies:
  - type: task
    refs: ["T1"]
```

**Description**

把 `ComposerCanvas.tsx` 23-31 的 `imageToImageData` 抽到 `packages/composer-sdk/src/utils/imageToImageData.ts`，旧文件改为 `import { imageToImageData } from './utils/imageToImageData';`。**不**触碰组件主体（hooks / lifecycle / JSX）。

**Acceptance Criteria**

- [x] `imageToImageData.ts` 存在
- [x] `ComposerCanvas.tsx` 不再含 `imageToImageData` 本体，仅 import
- [x] 组件主体未被修改
- [x] `pnpm typecheck --filter=@prism/composer-sdk` 退出码 0

---

## Phase 2 - 文档与不变量验证

### T3 - 追加 2 个 tile 块摘要 + 不变量验证

**opsx-meta**

```yaml
id: T3
layer: meta
task_type: feature
verify:
  - type: file_content
    path: docs/refactor-map.md
    contains: "## YYYY-MM-DD - Tile:"
    min_occurrences: 2
  - type: command
    run: git diff --stat HEAD~2..HEAD
    not_contains: "useCanvasStore|imageWorker.worker"
dependencies:
  - type: task
    refs: ["T2"]
```

**Description**

1. 按父 change design A5 模板，逐 tile 追加块摘要到 `docs/refactor-map.md`。
2. 验证 `useCanvasStore.ts` 与 `imageWorker.worker.ts` 在本子 change 内未被修改。

**Acceptance Criteria**

- [x] `docs/refactor-map.md` 至少 2 个新增 `## YYYY-MM-DD - Tile:` 块（本子 change 贡献）
- [x] `git diff` 不含 `useCanvasStore.ts`
- [x] `git diff` 不含 `imageWorker.worker.ts`

---

### T4 - 全量验证

**opsx-meta**

```yaml
id: T4
layer: engine
task_type: refactor
verify:
  - type: command
    run: pnpm typecheck --filter=@prism/image-ops --filter=@prism/composer-sdk
    exit_code: 0
  - type: command
    run: pnpm test --filter=@prism/image-ops --filter=@prism/composer-sdk
    exit_code: 0
dependencies:
  - type: task
    refs: ["T3"]
```

**Description**

跑 image-ops + composer-sdk 的 typecheck 和 test。

**Acceptance Criteria**

- [x] typecheck 通过
- [x] image-ops 测试通过
- [x] composer-sdk 测试通过

---

### T5 - Archive 子 change C

**opsx-meta**

```yaml
id: T5
layer: meta
task_type: feature
verify:
  - type: command
    run: openspec archive --change split-tiles-core-edges --yes
    exit_code: 0
dependencies:
  - type: task
    refs: ["T4"]
```

**Description**

调用 `openspec archive --change split-tiles-core-edges --yes` 完成 archive。

**Acceptance Criteria**

- [ ] `openspec/changes/archive/` 出现 `split-tiles-core-edges` 目录
- [ ] `openspec list` 不再出现 `split-tiles-core-edges`

---

## Completion Checklist

- [ ] T1–T5 全部勾选
- [ ] 子 change C 已 archive
- [ ] `docs/refactor-map.md` 至少 2 个 tile 块摘要
- [ ] image-ops + composer-sdk typecheck / test 通过
- [ ] `useCanvasStore.ts` 与 `imageWorker.worker.ts` 在本子 change 内不被修改
- [ ] 父 change `codebase-large-file-split-tiles` 中 T1.3 验收标准全部满足

**完成标准**：T1–T5 全部勾选且子 change C archive 后，方可 archive 父 change。