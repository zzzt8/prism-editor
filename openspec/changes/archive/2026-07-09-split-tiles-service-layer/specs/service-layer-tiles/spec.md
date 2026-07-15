# Service Layer Tiles Capability

> 本 spec 描述子 change B（`split-tiles-service-layer`）的拆分边界：仅拆服务层 / 适配器 tile，不动公开方法与执行器核心。所有拆分走 Facade / Wrapper 外壳保留法。

---

## ADDED Requirements

### Requirement: 服务层 tile MUST 能被拆分为独立文件且保持调用方零改动

子 change B MUST 把 `IndexedDBStorageAdapter.ts` 的 DB constants/types 和 `load-image.ts` 的 `inferMimeType` 抽到独立文件，SHALL 保持 adapter 公开方法与 executor 公开签名不变。

#### Scenario: IndexedDBStorageAdapter DB constants 抽出为独立模块

- **WHEN** T1 完成
- **THEN** `apps/dev-tool/src/storage/indexedDbConstants.ts` 存在
- **AND** `IndexedDBStorageAdapter.ts` 不再含 DB 常量本体，仅 import
- **AND** `DB_NAME`、`DB_VERSION`、`STORE_NAMES` 数值与原值完全一致
- **AND** `IndexedDBStorageAdapter` 公开方法（`save`、`load`、`list`、`delete`、`getVersions` 等）签名不变

#### Scenario: inferMimeType 抽出为独立模块

- **WHEN** T2 完成
- **THEN** `packages/image-ops/src/load-image/inferMimeType.ts` 存在
- **AND** `load-image.ts` 不再含 `inferMimeType` 本体，仅 import
- **AND** `loadImageExecutor` / `loadMaskExecutor` 公开签名不变

#### Scenario: 拆分后 dev-tool + image-ops typecheck / test 通过

- **WHEN** T4 完成
- **THEN** `pnpm typecheck --filter=dev-tool --filter=@prism/image-ops` 退出码 0
- **AND** `pnpm test --filter=dev-tool --filter=@prism/image-ops` 退出码 0

#### Scenario: refactor-map.md 追加 2 个 tile 块摘要

- **WHEN** T3 完成
- **THEN** `docs/refactor-map.md` 至少 2 个新增 `## YYYY-MM-DD - Tile:` 块摘要（本子 change 贡献）

#### Scenario: 子 change B archive 完成

- **WHEN** T5 完成
- **THEN** `openspec archive --change split-tiles-service-layer --yes` 退出码 0
- **AND** `openspec list` 不再出现 `split-tiles-service-layer`