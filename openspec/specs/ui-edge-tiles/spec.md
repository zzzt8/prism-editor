# ui-edge-tiles Specification

## Purpose
TBD - created by archiving change split-tiles-ui-edges. Update Purpose after archive.
## Requirements
### Requirement: UI 边缘 tile MUST 能被拆分为独立文件且保持调用方零改动

子 change A MUST 把 `WorkflowsView.tsx`、`PrismNodeControls.tsx`、`WorkflowHeader.tsx`、`Inspector.module.css`、`dense-control-node.css` 中识别的 5 个 UI 边缘 tile 抽到独立文件，SHALL 通过 Facade re-export 保持调用方 import 路径不变。

#### Scenario: DeleteConfirm 抽出为独立组件文件

- **WHEN** T1 完成
- **THEN** `apps/dev-tool/src/components/workflows/DeleteConfirm.tsx` 存在并包含原 DeleteConfirm 实现
- **AND** `WorkflowsView.tsx` 不再含 DeleteConfirm 本体，仅 re-export
- **AND** 所有引用 DeleteConfirm 的文件 import 路径不变

#### Scenario: dragImageState helper 抽出为独立模块

- **WHEN** T2 完成
- **THEN** `apps/dev-tool/src/components/nodes/PrismNodeControls/dragImageState.ts` 存在
- **AND** `PrismNodeControls.tsx` 仅 re-export `DRAG_DATA_KEY`、`setDragImageState`、`getDragImageState`

#### Scenario: WorkflowHeader 内联 style 抽出为独立 CSS 文件

- **WHEN** T3 完成
- **THEN** `apps/dev-tool/src/components/header/WorkflowHeaderStyles.css` 存在
- **AND** `WorkflowHeader.tsx` 不再含内联 style 段
- **AND** 旧 className 全部迁移到新 CSS 文件

#### Scenario: InfoPanel 样式抽出为独立 CSS module

- **WHEN** T4 完成
- **THEN** `apps/dev-tool/src/components/Inspector/InfoPanel.module.css` 存在
- **AND** `Inspector.module.css` 不再含 InfoPanel 段
- **AND** 旧 className 全部迁移

#### Scenario: dense-control-node.css Export text preview 段按需拆分

- **WHEN** T5 完成
- **THEN** `apps/dev-tool/src/styles/nodes/dense-control-node-export-text.css` 存在（若段值得拆）
- **AND** `dense-control-node.css` 体积下降至少 10 行

#### Scenario: 拆分后 dev-tool typecheck / lint / test 通过

- **WHEN** T7 完成
- **THEN** `pnpm typecheck --filter=dev-tool` 退出码 0
- **AND** `pnpm lint --filter=dev-tool` 退出码 0
- **AND** `pnpm test --filter=dev-tool` 退出码 0

#### Scenario: refactor-map.md 追加 5 个 tile 块摘要

- **WHEN** T6 完成
- **THEN** `docs/refactor-map.md` 至少 5 个 `## YYYY-MM-DD - Tile:` 块摘要
- **AND** 每块包含原文件、新文件、新文件职责、对外暴露、依赖位置、下次修改先看

#### Scenario: 子 change A archive 完成

- **WHEN** T8 完成
- **THEN** `openspec archive --change split-tiles-ui-edges --yes` 退出码 0
- **AND** `openspec list` 不再出现 `split-tiles-ui-edges`

