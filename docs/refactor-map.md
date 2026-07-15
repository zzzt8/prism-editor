# Refactor Map

> 项目级拆分缓存。每次完成一个 tile 拆分后，**只追加**新的块摘要，不修改历史块。
> 目的：让后续 AI / 人类改某一功能时，**先看本文件定位目标 tile**，再决定是否需要读源文件全文。

---

## 约定

- 块摘要按时间**倒序**追加（最新在最上）。
- 每完成一个 tile，立即追加一条 `## YYYY-MM-DD - Tile:` 块。
- 块摘要只描述：原文件、新文件、新文件职责、对外暴露、仍依赖它的位置、下次修改先看哪些文件。
- **不**修改历史块；如某 tile 需要重新拆，追加新块并在新块里指明 supersede。
- 所有 tile 拆分一律走 **Facade / Wrapper 外壳保留法**：旧文件继续 re-export 旧符号，新文件承接实现。

---

## 块摘要模板

每次追加 tile 时，复制下面模板并填实：

```markdown
## YYYY-MM-DD - Tile: <source>.<tile>

- 原文件：<path:line-range>
- 新文件：<path>
- 新文件职责：<一句话>
- 对外暴露：<symbol list>
- 仍依赖它的位置：<path list>
- 下次修改该功能先看：
  - <new file path>
  - <refactored source path>
- 父 change：<parent change name>
- 子 change：<child change name>
- ECC lane：<lane>
```

---

## 当前状态

- 暂无 tile 块摘要。
- 第一个 tile 完成后追加在下方。

---

## 2026-07-09 - Tile: WorkflowsView.DeleteConfirm

- 原文件：`apps/dev-tool/src/components/WorkflowsView.tsx:36-65`
- 新文件：`apps/dev-tool/src/components/workflows/DeleteConfirm.tsx`
- 新文件职责：DeleteConfirm 弹窗组件本体（Esc 关闭、确认/取消按钮）
- 对外暴露：`DeleteConfirm`
- 仍依赖它的位置：`WorkflowsView.tsx`（重新 import + 自身消费）
- 下次修改该功能先看：
  - `apps/dev-tool/src/components/workflows/DeleteConfirm.tsx`
  - `apps/dev-tool/src/components/WorkflowsView.tsx`
- 父 change：`codebase-large-file-split-tiles`
- 子 change：`split-tiles-ui-edges`（T1）
- ECC lane：refactor / code-reviewer

---

## 2026-07-09 - Tile: PrismNodeControls.dragImageState

- 原文件：`apps/dev-tool/src/components/nodes/PrismNodeControls.tsx:172-187`
- 新文件：`apps/dev-tool/src/components/nodes/PrismNodeControls/dragImageState.ts`
- 新文件职责：drag image 状态 helper（window 全局暂存 setDragImageState/getDragImageState + DRAG_DATA_KEY + DragState 类型）
- 对外暴露：`setDragImageState`、`getDragImageState`、`DragState`
- 仍依赖它的位置：`PrismNodeControls.tsx`（import + re-export）、`PrismNode.tsx`（re-export）、`useCanvasDragDrop.ts`（间接通过 PrismNode）
- 下次修改该功能先看：
  - `apps/dev-tool/src/components/nodes/PrismNodeControls/dragImageState.ts`
  - `apps/dev-tool/src/components/nodes/PrismNodeControls.tsx`
- 父 change：`codebase-large-file-split-tiles`
- 子 change：`split-tiles-ui-edges`（T2）
- ECC lane：refactor / code-reviewer

---

## 2026-07-09 - Tile: WorkflowHeader 内联 style

- 原文件：`apps/dev-tool/src/components/header/WorkflowHeader.tsx:300-674`
- 新文件：`apps/dev-tool/src/components/header/WorkflowHeaderStyles.css`
- 新文件职责：WorkflowHeader 全部 CSS 样式（wf-header / wf-logo / wf-execute-btn / wf-save-badge / wf-live-badge / wf-status-msg 等约 50 个 class）
- 对外暴露：`.wf-*` className（全局，非 CSS Modules）
- 仍依赖它的位置：`WorkflowHeader.tsx`（`import './WorkflowHeaderStyles.css'`）
- 下次修改该功能先看：
  - `apps/dev-tool/src/components/header/WorkflowHeaderStyles.css`
  - `apps/dev-tool/src/components/header/WorkflowHeader.tsx`
- 父 change：`codebase-large-file-split-tiles`
- 子 change：`split-tiles-ui-edges`（T3）
- ECC lane：refactor / code-reviewer

---

## 2026-07-09 - Tile: Inspector.InfoPanel CSS module

- 原文件：`apps/dev-tool/src/components/Inspector/Inspector.module.css:604-796`
- 新文件：`apps/dev-tool/src/components/Inspector/InfoPanel.module.css`
- 新文件职责：InfoPanel 全部 CSS（info-mono / param-node-info / info-port-* / info-execution-* / info-error-* 等约 30 个 :global class）
- 对外暴露：`:global(.info-*)`、`:global(.param-node-info)`、`:global(.param-info-*)` 等全局类名
- 仍依赖它的位置：`InfoPanel.tsx`（`import './InfoPanel.module.css'`）
- 下次修改该功能先看：
  - `apps/dev-tool/src/components/Inspector/InfoPanel.module.css`
  - `apps/dev-tool/src/components/Inspector/InfoPanel.tsx`
- 父 change：`codebase-large-file-split-tiles`
- 子 change：`split-tiles-ui-edges`（T4）
- ECC lane：refactor / code-reviewer

---

## 2026-07-09 - Tile: workerPool sizing helpers

- 原文件：`packages/image-ops/src/scheduler/workerPool.ts:10-44`
- 新文件：`packages/image-ops/src/scheduler/workerPoolSizing.ts`
- 新文件职责：worker pool sizing 纯函数（`calculateWorkerCount`、`getEffectiveSize`）
- 对外暴露：`calculateWorkerCount`、`getEffectiveSize`
- 仍依赖它的位置：`workerPool.ts`（import + re-export Facade）
- 下次修改该功能先看：
  - `packages/image-ops/src/scheduler/workerPoolSizing.ts`
  - `packages/image-ops/src/scheduler/workerPool.ts`
- 父 change：`codebase-large-file-split-tiles`
- 子 change：`split-tiles-core-edges`（T1）
- ECC lane：refactor / code-reviewer

---

## 2026-07-09 - Tile: ComposerCanvas imageToImageData

- 原文件：`packages/composer-sdk/src/ComposerCanvas.tsx:20-31`
- 新文件：`packages/composer-sdk/src/utils/imageToImageData.ts`
- 新文件职责：`HTMLImageElement` → `ImageData` 转换的纯 async 函数（创建 canvas、设置尺寸、drawImage、getImageData）
- 对外暴露：`imageToImageData`
- 仍依赖它的位置：`ComposerCanvas.tsx`（import + re-export Facade）
- 下次修改该功能先看：
  - `packages/composer-sdk/src/utils/imageToImageData.ts`
  - `packages/composer-sdk/src/ComposerCanvas.tsx`
- 父 change：`codebase-large-file-split-tiles`
- 子 change：`split-tiles-core-edges`（T2）
- ECC lane：refactor / code-reviewer

---

## 2026-07-09 - Tile: IndexedDBStorageAdapter DB constants/types

- 原文件：`apps/dev-tool/src/storage/IndexedDBStorageAdapter.ts:1-25`
- 新文件：`apps/dev-tool/src/storage/indexedDbConstants.ts`
- 新文件职责：IndexedDB schema 常量（`DB_NAME`、`DB_VERSION`、`STORE_WORKFLOWS/META/INDEX/VERSIONS`、`MAX_VERSION_RECORDS`）+ `VersionRecord` 类型
- 对外暴露：`DB_NAME`、`DB_VERSION`、`STORE_WORKFLOWS`、`STORE_META`、`STORE_INDEX`、`STORE_VERSIONS`、`MAX_VERSION_RECORDS`、`VersionRecord`
- 仍依赖它的位置：`IndexedDBStorageAdapter.ts`（import）
- 下次修改该功能先看：
  - `apps/dev-tool/src/storage/indexedDbConstants.ts`
  - `apps/dev-tool/src/storage/IndexedDBStorageAdapter.ts`
- 父 change：`codebase-large-file-split-tiles`
- 子 change：`split-tiles-service-layer`（T1）
- ECC lane：refactor / code-reviewer

---

## 2026-07-09 - Tile: load-image inferMimeType

- 原文件：`packages/image-ops/src/load-image.ts:4-22`
- 新文件：`packages/image-ops/src/load-image/inferMimeType.ts`
- 新文件职责：根据 URL 扩展名推断 MIME type 的纯函数（jpg/jpeg/webp/gif/bmp/ico → 对应 mime；默认 png）
- 对外暴露：`inferMimeType`
- 仍依赖它的位置：`load-image.ts`（import）
- 下次修改该功能先看：
  - `packages/image-ops/src/load-image/inferMimeType.ts`
  - `packages/image-ops/src/load-image.ts`
- 父 change：`codebase-large-file-split-tiles`
- 子 change：`split-tiles-service-layer`（T2）
- ECC lane：refactor / code-reviewer

---

## 2026-07-10 - Tile: useCanvasStore.SnippetStubs ✅ 已完成

- 原文件：`apps/dev-tool/src/modules/editor/stores/useCanvasStore.ts:1348-1353`
- 新文件：`apps/dev-tool/src/modules/editor/stores/useCanvasStore/snippetStubs.ts`
- 新文件职责：4 个空 snippet 方法（snippetSave/List/insertSnippet/deleteSnippet），已废弃功能桩
- 对外暴露：`snippetSave`、`snippetList`、`insertSnippet`、`deleteSnippet`
- 仍依赖它的位置：`useCanvasStore.ts`（re-export Facade）
- 下次修改该功能先看：
  - `apps/dev-tool/src/modules/editor/stores/useCanvasStore/snippetStubs.ts`
  - `apps/dev-tool/src/modules/editor/stores/useCanvasStore.ts`
- 父 change：`codebase-large-file-split-tiles`
- 子 change：`split-tiles-canvas-store`（T4）
- ECC lane：refactor
- **状态：✅ 已完成（2026-07-10，commit 83a0c82，typecheck 通过）**

---

## 2026-07-10 - Tile: useCanvasStore.LiveExecutionState

- 原文件：`apps/dev-tool/src/modules/editor/stores/useCanvasStore.ts:48-174`
- 新文件：`(未拆分 — 建议拆)` `useCanvasStore/liveExecutionState.ts`
- 新文件职责：live preview 订阅逻辑 + 模块级状态（`_pendingLiveResults`、`_lastManualUiUpdate`、`armLiveTimer`、`installLiveSubscription`、`applyResultsToStore`、`nodeExecFingerprint`）
- 对外暴露：`armLiveTimer`、`installLiveSubscription`、`applyResultsToStore`、`nodeExecFingerprint`、`nodesExecFingerprint`
- 仍依赖它的位置：`useCanvasStore.ts`（import + 使用 `useCanvasStore.getState()`）
- 下次修改该功能先看：
  - `useCanvasStore/liveExecutionState.ts`
  - `useCanvasStore.ts`
- 父 change：`codebase-large-file-split-tiles`
- 子 change：`split-tiles-canvas-store`
- ECC lane：refactor
- **优先级：P1（纯函数 + 模块状态，与 store 实现体解耦清晰）**

---

## 2026-07-10 - Tile: imageWorker.convertBlendMode ✅ 已完成

- 原文件：`packages/image-ops/src/worker/imageWorker.worker.ts:1017-1033`
- 新文件：`packages/image-ops/src/worker/blendModeMap.ts`
- 新文件职责：BlendMode → canvas GlobalCompositeOperation 纯映射函数（17 行）
- 对外暴露：`convertBlendMode`
- 仍依赖它的位置：`imageWorker.worker.ts`（import + re-export）、`worker/index.ts`（re-export chain）、`workerRunner.ts`、`workerPool.ts`
- 下次修改该功能先看：
  - `worker/blendModeMap.ts`
  - `imageWorker.worker.ts`
- 父 change：`codebase-large-file-split-tiles`
- 子 change：`split-tiles-worker`（T1）
- ECC lane：refactor
- **状态：✅ 已完成（2026-07-10，typecheck 通过）**

---

## 2026-07-10 - Tile: imageWorker.Interfaces ✅ 已完成

- 原文件：`packages/image-ops/src/worker/imageWorker.worker.ts:1-59`
- 新文件：`packages/image-ops/src/worker/types.ts`
- 新文件职责：WorkerImageResult / WorkerLoadResult / WorkerExportResult / WorkerStatus 4 个接口 + hasOffscreenCanvas 环境检测
- 对外暴露：`WorkerImageResult`、`WorkerLoadResult`、`WorkerExportResult`、`WorkerStatus`、`hasOffscreenCanvas`
- 仍依赖它的位置：`imageWorker.worker.ts`（import + re-export）、`worker/index.ts`（re-export chain）
- 下次修改该功能先看：
  - `worker/types.ts`
  - `imageWorker.worker.ts`
- 父 change：`codebase-large-file-split-tiles`
- 子 change：`split-tiles-worker`（T2）
- ECC lane：refactor
- **状态：✅ 已完成（2026-07-10，typecheck 通过）**

---

## 2026-07-10 - Tile: PrismNodeControls.makeThumbnail ✅ 已完成

- 原文件：`apps/dev-tool/src/components/nodes/PrismNodeControls.tsx:200-234`
- 新文件：`apps/dev-tool/src/components/nodes/PrismNodeControls/imageThumbnails.ts`
- 新文件职责：`makeThumbnail`（ImageData → dataUrl）+ `getExecThumb`（从 executionResult 提取 previewUrl）
- 对外暴露：`makeThumbnail`、`getExecThumb`
- 仍依赖它的位置：`PrismNodeControls.tsx`（import + re-export Facade）
- 下次修改该功能先看：
  - `PrismNodeControls/imageThumbnails.ts`
  - `PrismNodeControls.tsx`
- 父 change：`codebase-large-file-split-tiles`
- 子 change：`split-tiles-ui-nodes`（T3）
- ECC lane：refactor
- **状态：✅ 已完成（2026-07-10，typecheck 通过）**

---

## 2026-07-10 - Tile: ComposerCanvas.applyMaskToImageData ✅ 已完成

- 原文件：`packages/composer-sdk/src/ComposerCanvas.tsx:24-78`
- 新文件：`packages/composer-sdk/src/utils/imageMaskUtils.ts`
- 新文件职责：像素级 alpha/brightness/gradient/feather mask 应用到 ImageData
- 对外暴露：`applyMaskToImageData`
- 仍依赖它的位置：`ComposerCanvas.tsx`（import + re-export Facade）
- 下次修改该功能先看：
  - `packages/composer-sdk/src/utils/imageMaskUtils.ts`
  - `packages/composer-sdk/src/ComposerCanvas.tsx`
- 父 change：`codebase-large-file-split-tiles`
- 子 change：`split-tiles-composer-sdk`（T6）
- ECC lane：refactor
- **状态：✅ 已完成（2026-07-10，commit d8872f9，typecheck 通过）**

---

## 2026-07-10 - Tile: IndexedDBStorageAdapter.idbCrud ✅ 已完成

- 原文件：`apps/dev-tool/src/storage/IndexedDBStorageAdapter.ts:22-112`
- 新文件：`apps/dev-tool/src/storage/idbCrud.ts`
- 新文件职责：IndexedDB 底层 CRUD 封装（`setIdbCrudAdapter` / `idbGetAll` / `idbGet` / `idbPut` / `idbRemove`），通过 adapter 模式与类实例解耦
- 对外暴露：`setIdbCrudAdapter`、`idbGetAll`、`idbGet`、`idbPut`、`idbRemove`、`DbGetter`
- 仍依赖它的位置：`IndexedDBStorageAdapter.ts`（import + constructor 中调用 `setIdbCrudAdapter`）
- 下次修改该功能先看：
  - `apps/dev-tool/src/storage/idbCrud.ts`
  - `apps/dev-tool/src/storage/IndexedDBStorageAdapter.ts`
- 父 change：`codebase-large-file-split-tiles`
- 子 change：`split-tiles-storage`（T5）
- ECC lane：refactor
- **状态：✅ 已完成（2026-07-10，commit 7b5f91e，typecheck 通过）**

---

## 2026-07-09 - Tile: dense-control-node.css Export text preview

- 原文件：`apps/dev-tool/src/styles/nodes/dense-control-node.css:961-977`
- 新文件：`apps/dev-tool/src/styles/nodes/dense-control-node-export-text.css`
- 新文件职责：Export 节点 Text preview 样式（`.dcn-text-preview`、`.dcn-text-preview:hover`）
- 对外暴露：`.dcn-text-preview`、`.dcn-text-preview:hover`
- 仍依赖它的位置：`main.tsx`（新增 `import './styles/nodes/dense-control-node-export-text.css'`）
- 下次修改该功能先看：
  - `apps/dev-tool/src/styles/nodes/dense-control-node-export-text.css`
- 父 change：`codebase-large-file-split-tiles`
- 子 change：`split-tiles-ui-edges`（T5）
- ECC lane：refactor / code-reviewer