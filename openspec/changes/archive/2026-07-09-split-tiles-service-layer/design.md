# Design

> 服务层 / 适配器 tile 拆分。父 change: `codebase-large-file-split-tiles`。

---

## Goals

1. 把 2 个服务层 tile 抽到独立文件，旧文件作为 Facade / Wrapper 继续 import。
2. 每个 tile 拆分后立即在 `docs/refactor-map.md` 追加块摘要。
3. 任何拆分都不删除既有行为、测试和文档。
4. DB constants 数值与原值完全一致。

## Non-Goals

- ~~替换 storage adapter 底层实现~~
- ~~修改 IndexedDBStorageAdapter 公开方法~~
- ~~修改 load-image 公开签名~~
- ~~改 Prisma schema / node schema~~

---

## Decisions

### D1：Facade / Wrapper 外壳保留法

DB 常量 / 类型 / `inferMimeType` 抽出后，旧文件改为 `import`，调用方零改动。

### D2：DB constants 抽出范围

`apps/dev-tool/src/storage/indexedDbConstants.ts` 包含：
- `DB_NAME`：IndexedDB 数据库名
- `DB_VERSION`：当前版本号
- `STORE_NAMES`：object store 名常量集合
- 任何与 DB schema 相关的 type / interface

### D3：inferMimeType 抽出范围

`packages/image-ops/src/load-image/inferMimeType.ts` 包含：
- `inferMimeType(magic: Uint8Array): string` 纯函数
- 相关常量（如 magic bytes 前缀）

### D4：旧文件策略

`IndexedDBStorageAdapter.ts`：删除 constants 本体，改为 `import { DB_NAME, DB_VERSION, STORE_NAMES } from './indexedDbConstants';`，旧文件作为 Facade 不再 re-export（adapter 是 default class，没有 re-export 必要）。

`load-image.ts`：删除 `inferMimeType` 本体，改为 `import { inferMimeType } from './load-image/inferMimeType';`。

---

## Architecture Review

### A1：当前结构分析

```text
apps/dev-tool/src/storage/
└─ IndexedDBStorageAdapter.ts (423)  ← DB constants 1-25 + adapter class
packages/image-ops/src/
└─ load-image.ts (451)  ← inferMimeType 5-22 + loadImageExecutor/loadMaskExecutor
```

### A2：方案对比

| 方案 | 优点 | 缺点 | 选择 |
|------|------|------|------|
| A. 一次拆 2 个 tile，1 个 commit | 简单 | 单 tile 出问题难定位 | ❌ |
| B. 一个 tile 一个 commit，分别验证 | 单 tile 出问题可回滚 | 略多 commit | ✅ |
| C. 不拆，只文档化 | 零风险 | 体积墙存在 | ❌ |

---

## File Changes

### 新增文件

| 文件 | 用途 |
|------|------|
| `apps/dev-tool/src/storage/indexedDbConstants.ts` | DB_NAME、DB_VERSION、STORE_NAMES、相关类型 |
| `packages/image-ops/src/load-image/inferMimeType.ts` | inferMimeType 纯函数本体 |

### 修改文件

| 文件 | 修改内容 |
|------|----------|
| `apps/dev-tool/src/storage/IndexedDBStorageAdapter.ts` | 删除 1-25 常量/类型；改为 import |
| `packages/image-ops/src/load-image.ts` | 删除 5-22 inferMimeType 本体；改为 import |
| `docs/refactor-map.md` | 追加 2 个 tile 块摘要 |

### 删除文件

无。

---

## API Design

不引入新 API。`IndexedDBStorageAdapter` / `loadImageExecutor` / `loadMaskExecutor` 公开方法签名不变。

---

## Verification Checklist

| 类别 | 检查项 | 验证方式 |
|------|--------|---------|
| Schema | 子 change 的 proposal/design/tasks 完整 | `openspec validate --changes split-tiles-service-layer` |
| Core | typecheck | `pnpm typecheck --filter=dev-tool --filter=@prism/image-ops` |
| Test | dev-tool + image-ops 测试 | `pnpm test --filter=dev-tool --filter=@prism/image-ops` |
| 缓存 | refactor-map.md 至少 2 个 tile 摘要 | 文本搜索 |

---

## 子 change 调度

本子 change B 在父 change 调度中位于第 2 位（A 完成后执行）。