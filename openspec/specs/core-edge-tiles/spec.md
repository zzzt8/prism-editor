# core-edge-tiles Specification

## Purpose
TBD - created by archiving change split-tiles-core-edges. Update Purpose after archive.
## Requirements
### Requirement: 核心边缘 tile MUST 能被拆分为独立文件且严格不触碰 store/worker 核心

子 change C MUST 把 `workerPool.ts` 的 sizing helper 和 `ComposerCanvas.tsx` 的 `imageToImageData` 抽到独立文件，SHALL **不修改** `useCanvasStore.ts` 任何一行，SHALL **不修改** `imageWorker.worker.ts` 任何一行。

#### Scenario: workerPool sizing helper 抽出为独立模块

- **WHEN** T1 完成
- **THEN** `packages/image-ops/src/scheduler/workerPoolSizing.ts` 存在
- **AND** `workerPool.ts` 不再含 sizing 本体（16-44 段），仅 import
- **AND** `workerPool.ts` 的 queue / execute / replace 段未被修改

#### Scenario: ComposerCanvas imageToImageData 抽出为独立 utils 模块

- **WHEN** T2 完成
- **THEN** `packages/composer-sdk/src/utils/imageToImageData.ts` 存在
- **AND** `ComposerCanvas.tsx` 不再含 `imageToImageData` 本体（23-31 段），仅 import
- **AND** `ComposerCanvas.tsx` 的组件主体（hooks / lifecycle / JSX）未被修改

#### Scenario: useCanvasStore 与 imageWorker 核心算法不被修改

- **WHEN** T3 完成
- **THEN** `git diff --stat` 不含 `apps/dev-tool/src/modules/editor/stores/useCanvasStore.ts`
- **AND** `git diff --stat` 不含 `packages/image-ops/src/worker/imageWorker.worker.ts`

#### Scenario: 拆分后 image-ops + composer-sdk typecheck / test 通过

- **WHEN** T4 完成
- **THEN** `pnpm typecheck --filter=@prism/image-ops --filter=@prism/composer-sdk` 退出码 0
- **AND** `pnpm test --filter=@prism/image-ops --filter=@prism/composer-sdk` 退出码 0

#### Scenario: refactor-map.md 追加 2 个 tile 块摘要

- **WHEN** T3 完成
- **THEN** `docs/refactor-map.md` 至少 2 个新增 `## YYYY-MM-DD - Tile:` 块摘要（本子 change 贡献）

#### Scenario: 子 change C archive 完成

- **WHEN** T5 完成
- **THEN** `openspec archive --change split-tiles-core-edges --yes` 退出码 0
- **AND** `openspec list` 不再出现 `split-tiles-core-edges`

