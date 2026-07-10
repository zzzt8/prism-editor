# Tasks: codebase-large-file-split-tiles

## Change-splitting

本 change 包含 **6 个子 change**，可并行或串行推进：

| 子 change | 主要 layer | 依赖 | 描述 |
|-----------|-----------|------|------|
| `split-tiles-worker` | worker | 无 | imageWorker 的 convertBlendMode + Interfaces 拆分 |
| `split-tiles-ui-nodes` | component | 无 | PrismNodeControls 的 makeThumbnail 拆分 |
| `split-tiles-canvas-store` | store | 无 | useCanvasStore 的 SnippetStubs + LiveExecutionState 拆分 |
| `split-tiles-storage` | storage | 无 | IndexedDBStorageAdapter 的 idbCrud 拆分 |
| `split-tiles-composer-sdk` | composer-sdk | 无 | ComposerCanvas 的 imageMaskUtils 拆分 |
| `split-tiles-map-update` | meta | 依赖上述 5 个 | 将所有 tile 追加到 docs/refactor-map.md |

---

## Tasks

### T1: split-tiles-worker — imageWorker.convertBlendMode

```
opsx_meta:
  id: T1
  layer: worker
  verify: pnpm --filter @prism/image-ops typecheck
```

- [x] **已完成**（2026-07-10，commit 83a0c82）

- **原文件**：`packages/image-ops/src/worker/imageWorker.worker.ts:1017-1033`
- **新文件**：`packages/image-ops/src/worker/blendModeMap.ts`
- **操作**：
  1. 新建 `blendModeMap.ts`，移入 `convertBlendMode` 函数（17 行）
  2. `imageWorker.worker.ts` 顶部添加 `import { convertBlendMode } from './blendModeMap'`
  3. 删除原位置的 `convertBlendMode` 函数体，替换为 re-export `export { convertBlendMode } from './blendModeMap'`
- **验收标准**：`pnpm --filter @prism/image-ops typecheck` 通过

---

### T2: split-tiles-worker — imageWorker.Interfaces

```
opsx_meta:
  id: T2
  layer: worker
  verify: pnpm --filter @prism/image-ops typecheck
```

- [x] **已完成**（2026-07-10，commit 83a0c82）

- **原文件**：`packages/image-ops/src/worker/imageWorker.worker.ts:1-58`
- **新文件**：`packages/image-ops/src/worker/types.ts`
- **操作**：
  1. 新建 `types.ts`，移入 4 个 interface + `hasOffscreenCanvas`
  2. `imageWorker.worker.ts` 顶部改为 `import type {...} from './types'`
  3. 原位置删除，re-export
- **验收标准**：`pnpm --filter @prism/image-ops typecheck` 通过

---

### T3: split-tiles-ui-nodes — PrismNodeControls.makeThumbnail

```
opsx_meta:
  id: T3
  layer: component
  verify: pnpm --filter dev-tool typecheck
```

- [x] **已完成**（2026-07-10，commit 83a0c82）

- **原文件**：`apps/dev-tool/src/components/nodes/PrismNodeControls.tsx:196-231`
- **新文件**：`apps/dev-tool/src/components/nodes/PrismNodeControls/imageThumbnails.ts`
- **操作**：
  1. 新建 `imageThumbnails.ts`，移入 `makeThumbnail` + `getExecThumb`
  2. `PrismNodeControls.tsx` 添加 import，替换内联的 `getExecThumb` 定义（215-231 行）
  3. 原位置删除，re-export
- **验收标准**：`pnpm --filter dev-tool typecheck` 通过

---

### T4: split-tiles-canvas-store — useCanvasStore.SnippetStubs

```
opsx_meta:
  id: T4
  layer: store
  verify: pnpm --filter dev-tool typecheck
```

- [x] **已完成**（2026-07-10，commit 83a0c82）

- **原文件**：`apps/dev-tool/src/modules/editor/stores/useCanvasStore.ts:1348-1353`
- **新文件**：`apps/dev-tool/src/modules/editor/stores/useCanvasStore/snippetStubs.ts`
- **操作**：
  1. 新建 `snippetStubs.ts`，移入 4 个空 snippet 方法
  2. `useCanvasStore.ts` 顶部 import，删除原定义，re-export
- **验收标准**：`pnpm --filter dev-tool typecheck` 通过

---

### T5: split-tiles-storage — IndexedDBStorageAdapter.idbCrud

```
opsx_meta:
  id: T5
  layer: storage
  verify: pnpm --filter dev-tool typecheck
```

- [x] **已完成**（2026-07-10，commit 7b5f91e）

- **原文件**：`apps/dev-tool/src/storage/IndexedDBStorageAdapter.ts:22-112`
- **新文件**：`apps/dev-tool/src/storage/idbCrud.ts`
- **操作**：
  1. 新建 `idbCrud.ts`，移入 5 个 private 方法（getDb/getStore/getAll/get/put/remove）
  2. `IndexedDBStorageAdapter.ts` 顶部 import，删除原定义，re-export
- **验收标准**：`pnpm --filter dev-tool typecheck` 通过

---

### T6: split-tiles-composer-sdk — ComposerCanvas.imageMaskUtils

```
opsx_meta:
  id: T6
  layer: composer-sdk
  verify: pnpm --filter @prism/composer-sdk typecheck
```

- [x] **已完成**（2026-07-10，commit d8872f9）

- **原文件**：`packages/composer-sdk/src/ComposerCanvas.tsx:24-78`
- **新文件**：`packages/composer-sdk/src/utils/imageMaskUtils.ts`
- **操作**：
  1. 新建 `imageMaskUtils.ts`，移入 `applyMaskToImageData`
  2. `ComposerCanvas.tsx` 顶部 import，删除原定义，re-export
- **验收标准**：`pnpm --filter @prism/composer-sdk typecheck` 通过

---

### T7: split-tiles-map-update — 更新 refactor-map.md

```
opsx_meta:
  id: T7
  layer: meta
  verify: grep "split-tiles" docs/refactor-map.md | wc -l
```

- **原文件**：`docs/refactor-map.md`
- **操作**：将 T1-T6 每个 tile 的摘要追加到 `docs/refactor-map.md`（YYYY-MM-DD = 2026-07-10）
- **验收标准**：文件中包含至少 6 个 `split-tiles-*` 子 change 引用

---

## Quality Checklist

- [ ] T1-T7 每个 task 执行前，CI/typecheck 均为绿
- [ ] 每个 task 完成后，立即运行 typecheck 确认为绿再推进下一个
- [ ] 旧文件均保留 `export { symbol } from './新文件'` Facade
- [ ] 每个 tile 拆分后更新 `docs/refactor-map.md`
- [ ] 拆分期间不修改任何业务逻辑
