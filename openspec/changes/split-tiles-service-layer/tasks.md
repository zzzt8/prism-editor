# Tasks

> 服务层 / 适配器 tile 拆分。父 change: `codebase-large-file-split-tiles`。

---

## Progress

| Metric | Value |
|--------|-------|
| Total Tasks | 5 |
| Completed | 5 |
| In Progress | 0 |

---

## Phase 1 - 2 个 tile 拆分

### T1 - 拆分 IndexedDBStorageAdapter DB constants

**opsx-meta**

```yaml
id: T1
layer: editor
task_type: refactor
verify:
  - type: file_exists
    path: apps/dev-tool/src/storage/indexedDbConstants.ts
  - type: command
    run: pnpm typecheck --filter=dev-tool
    exit_code: 0
```

**Description**

把 `IndexedDBStorageAdapter.ts` 1-25 的 DB constants/types 抽到 `apps/dev-tool/src/storage/indexedDbConstants.ts`，旧文件改为 `import { DB_NAME, DB_VERSION, STORE_NAMES } from './indexedDbConstants';`。

**Acceptance Criteria**

- [x] `indexedDbConstants.ts` 存在
- [x] `IndexedDBStorageAdapter.ts` 不再含 DB 常量本体，仅 import
- [x] `DB_NAME`、`DB_VERSION`、`STORE_NAMES` 数值与原值完全一致
- [x] `pnpm typecheck --filter=dev-tool` 退出码 0

---

### T2 - 拆分 inferMimeType

**opsx-meta**

```yaml
id: T2
layer: engine
task_type: refactor
verify:
  - type: file_exists
    path: packages/image-ops/src/load-image/inferMimeType.ts
  - type: command
    run: pnpm typecheck --filter=@prism/image-ops
    exit_code: 0
dependencies:
  - type: task
    refs: ["T1"]
```

**Description**

把 `load-image.ts` 5-22 的 `inferMimeType` 抽到 `packages/image-ops/src/load-image/inferMimeType.ts`，旧文件改为 `import { inferMimeType } from './load-image/inferMimeType';`。

**Acceptance Criteria**

- [x] `inferMimeType.ts` 存在
- [x] `load-image.ts` 不再含 `inferMimeType` 本体，仅 import
- [x] `pnpm typecheck --filter=@prism/image-ops` 退出码 0

---

## Phase 2 - 文档与验收

### T3 - 追加 2 个 tile 块摘要到 docs/refactor-map.md

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
dependencies:
  - type: task
    refs: ["T2"]
```

**Description**

按父 change design A5 模板，逐 tile 追加块摘要到 `docs/refactor-map.md`。

**Acceptance Criteria**

- [x] `docs/refactor-map.md` 至少 2 个 `## YYYY-MM-DD - Tile:` 块（本子 change 新增）

---

### T4 - 全量验证

**opsx-meta**

```yaml
id: T4
layer: engine
task_type: refactor
verify:
  - type: command
    run: pnpm typecheck --filter=dev-tool --filter=@prism/image-ops
    exit_code: 0
  - type: command
    run: pnpm test --filter=dev-tool --filter=@prism/image-ops
    exit_code: 0
dependencies:
  - type: task
    refs: ["T3"]
```

**Description**

跑 dev-tool + image-ops 的 typecheck 和 test。

**Acceptance Criteria**

- [ ] typecheck 通过
- [ ] dev-tool 测试通过
- [ ] image-ops 测试通过

---

### T5 - Archive 子 change B

**opsx-meta**

```yaml
id: T5
layer: meta
task_type: feature
verify:
  - type: command
    run: openspec archive --change split-tiles-service-layer --yes
    exit_code: 0
dependencies:
  - type: task
    refs: ["T4"]
```

**Description**

调用 `openspec archive --change split-tiles-service-layer --yes` 完成 archive。

**Acceptance Criteria**

- [ ] `openspec/changes/archive/` 出现 `split-tiles-service-layer` 目录
- [ ] `openspec list` 不再出现 `split-tiles-service-layer`

---

## Completion Checklist

- [ ] T1–T5 全部勾选
- [ ] 子 change B 已 archive
- [ ] `docs/refactor-map.md` 至少 2 个 tile 块摘要
- [ ] dev-tool + image-ops typecheck / test 通过
- [ ] 父 change `codebase-large-file-split-tiles` 中 T1.2 验收标准全部满足

**完成标准**：T1–T5 全部勾选且子 change B archive 后，方可继续执行父 change T1.3（子 change C）。