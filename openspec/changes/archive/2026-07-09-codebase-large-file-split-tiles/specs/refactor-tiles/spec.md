# Refactor Tiles Capability

> 本 spec 描述“大文件按 tile 拆分”的可验证能力。它不对应业务功能，但要求每个子 change 在 apply 阶段满足外壳保留法、可自动验证、可回滚等约束。

---

## ADDED Requirements

### Requirement: 大文件 MUST 可被按 tile 拆分为独立模块

系统 MUST 支持把上一轮分析中识别的大文件（`useCanvasStore.ts`、`global.css`、`Inspector.module.css`、`dense-control-node.css`、`PrismNodeControls.tsx`、`WorkflowHeader.tsx`、`WorkflowsView.tsx`、`IndexedDBStorageAdapter.ts`、`ComposerCanvas.tsx`、`workerPool.ts`、`load-image.ts`）按 tile 拆分为独立模块，且 SHALL 不破坏现有 import 路径与公开行为。

#### Scenario: 旧文件作为 Facade 继续 re-export 新文件的实现

- **WHEN** 一个 tile 被拆分完成
- **THEN** 旧文件应继续 re-export 旧符号，调用方 import 路径不变
- **AND** 新文件应承接具体实现

#### Scenario: 拆分后 typecheck、lint、相关包测试仍通过

- **WHEN** 任一子 change 完成 apply
- **THEN** `pnpm typecheck`、`pnpm lint`、受影响包 `pnpm test` 必须退出码 0
- **AND** `openspec change validate <子 change>` 必须通过

#### Scenario: 拆分后旧公开方法签名不变

- **WHEN** 拆分完成
- **THEN** `IndexedDBStorageAdapter` / `loadImageExecutor` / `loadMaskExecutor` / `useCanvasStore` 的公开方法签名保持不变
- **AND** `useCanvasStore.ts`、`imageWorker.worker.ts` 在子 change C 内不被修改

#### Scenario: refactor-map.md 持续追加 tile 块摘要

- **WHEN** 任一 tile 拆分完成
- **THEN** `docs/refactor-map.md` 应追加一条 `## YYYY-MM-DD - Tile: <source>.<tile>` 块摘要
- **AND** 该块摘要至少包含原文件、新文件、新文件职责、对外暴露、仍依赖它的位置、下次修改先看哪些文件
