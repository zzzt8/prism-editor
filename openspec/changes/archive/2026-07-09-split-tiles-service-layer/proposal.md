# Proposal

> 服务层 / 适配器 tile 拆分。父 change: `codebase-large-file-split-tiles`。

---

## Metadata

| 字段 | 值 |
|------|-----|
| change_class | medium |
| reason | 触及 `apps/dev-tool/src/storage/IndexedDBStorageAdapter.ts` 和 `packages/image-ops/src/load-image.ts` 两个跨包文件，但拆的是 DB 常量/类型与 mime 推断纯函数，不动公开方法与执行器核心算法，按 medium 处理。 |

---

## Why

### 背景

父 change 识别 2 个服务层 tile：
- `IndexedDBStorageAdapter.ts` 1-25：`DB_VERSION`、`DB_NAME`、store names、类型定义
- `load-image.ts` 5-22：`inferMimeType` 纯函数

### 问题

- `IndexedDBStorageAdapter` 同时承载 DB 配置、CRUD 实现、未来加 schema 升级逻辑时文件还会膨胀。
- `load-image.ts` 同时承担图像加载 + mime 推断，纯函数与 I/O 逻辑混在一起。

### 动机

- 把 DB 常量/类型抽到独立模块后，未来 DB 升级（DB_VERSION +1）只需改一个 constants 文件。
- 把 `inferMimeType` 抽到独立模块，未来 mime 推断规则增多时不影响 `load-image.ts` 主体。

---

## What Changes

### 核心变更

1. 把 `IndexedDBStorageAdapter` 的 DB 常量/类型抽到 `apps/dev-tool/src/storage/indexedDbConstants.ts`，旧文件改为 `import`。
2. 把 `load-image.ts` 的 `inferMimeType` 抽到 `packages/image-ops/src/load-image/inferMimeType.ts`，旧文件改为 `import`。

### 新增内容

- `apps/dev-tool/src/storage/indexedDbConstants.ts`
- `packages/image-ops/src/load-image/inferMimeType.ts`

### 修改内容

- `apps/dev-tool/src/storage/IndexedDBStorageAdapter.ts`：删除 1-25 常量/类型本体，改为 import。
- `packages/image-ops/src/load-image.ts`：删除 5-22 `inferMimeType` 本体，改为 import。
- `docs/refactor-map.md`：追加 2 个 tile 块摘要。

### 删除内容

- 不删除任何业务行为。
- 不删除任何测试。
- 不删除任何归档后文档。
- 旧实现段在本 change 内删除（Facade re-export 完全替代），不留死代码。

---

## Capabilities

- **能力 1**：DB constants 与 adapter 主体解耦；`inferMimeType` 与 `load-image` 主体解耦。
- **能力 2**：未来 DB schema 升级、mime 规则扩展仅需改单一小文件。
- **能力 3**：所有拆分通过 typecheck / lint / 相关包测试验证。

---

## Impact

| 包/应用 | 影响 |
|---------|------|
| `apps/dev-tool` | `IndexedDBStorageAdapter.ts` 体积下降 |
| `packages/image-ops` | `load-image.ts` 体积下降；新增 `load-image/inferMimeType.ts` 子目录 |
| `docs/` | `refactor-map.md` 新增 2 条 tile 块摘要 |

层映射（按仓库 layer 约定）：
- `editor`：IndexedDBStorageAdapter 改动主战场
- `engine`：image-ops/load-image 改动主战场
- `meta`：`docs/refactor-map.md` 维护

---

## Out of Scope

- ~~修改 `IndexedDBStorageAdapter` 公开方法（`save`、`load`、`list`、`delete`、`getVersions` 等）签名~~
- ~~修改 `loadImageExecutor` / `loadMaskExecutor` 公开签名~~
- ~~替换 storage adapter 底层实现（如从 IndexedDB 切到 SQLite / Dexie）~~
- ~~修改 Prisma schema / node schema~~
- ~~拆 `imageWorker.worker.ts` 核心算法（属子 change C）~~
- ~~拆 `useCanvasStore.ts` 核心 action（属子 change C）~~

---

## Dependencies

| 依赖 | 原因 |
|------|------|
| `codebase-large-file-split-tiles`（父 change） | 父 change 已批准本子 change B 的拆分范围 |
| `split-tiles-ui-edges`（子 change A） | 无强依赖；串行调度避免 `refactor-map.md` 写入冲突 |
| `split-tiles-core-edges`（子 change C） | 无强依赖；串行调度 |

---

## Success Criteria

| 标准 | 验证方式 |
|------|----------|
| 2 个新文件存在 | `ls <path>` 命中 |
| 旧文件 import 路径不变 | `git diff` 仅显示 import 行 + 常量引用 |
| `pnpm typecheck --filter=dev-tool --filter=@prism/image-ops` 退出码 0 | shell 验证 |
| `pnpm test --filter=dev-tool --filter=@prism/image-ops` 退出码 0 | shell 验证 |
| `IndexedDBStorageAdapter` 公开方法签名不变 | typecheck + 既有测试 |
| `loadImageExecutor` / `loadMaskExecutor` 公开签名不变 | typecheck + 既有测试 |
| `docs/refactor-map.md` 新增 2 个 tile 块摘要 | 文本搜索 `## YYYY-MM-DD - Tile:` |

---

## Risks

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| DB constants 抽出后 adapter 引用路径错误 | 中 | 高 | 保持旧 adapter 文件内仍可访问所有常量（通过 import + re-export）；typecheck 验证 |
| `inferMimeType` 抽出后被 `load-image` 主体多处引用导致漏改 | 中 | 中 | grep `inferMimeType` 全部引用，验证仅 1 处 import |
| DB_VERSION / DB_NAME 数值变动 | 低 | 高 | 仅移动不修改；verify 阶段对比新旧值 |

---

## Quality Standards Compliance

本 change 遵循 [项目全局质量与交付规范](../../specs/QUALITY_STANDARDS.md)。

### 执行完整性检查

| 检查维度 | 是否涉及 | 验证方式 |
|---------|---------|---------|
| 拓扑排序正确性 | 否 | executor 未改动 |
| 节点级错误隔离 | 否 | executor 未改动 |
| Cancellation 完整性 | 否 | cancel 链路未改动 |
| Canvas 状态一致性 | 否 | useCanvasStore 未改动 |
| Node Registry 不变量 | 否 | node registry 未改动 |
| API 契约稳定性 | 是 | 公开方法签名不变；既有测试 |
| Node Package 安全 | 否 | node package 未改动 |
| 交互完整性 | 否 | UI 未改动 |

### 验收要求

- [ ] 每个 tile 拆完的旧文件保持公开 API 不变
- [ ] 旧 import 路径全部保留
- [ ] 不删除任何测试
- [ ] `docs/refactor-map.md` 至少 2 个 tile 块摘要
- [ ] `tasks.md` 显式列出 typecheck / lint / test 验证命令