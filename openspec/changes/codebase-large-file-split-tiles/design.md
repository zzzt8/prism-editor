# Design: codebase-large-file-split-tiles

## Goals

1. 将 ≥300 行的大文件按切块地图逐块拆分为独立文件
2. 每次拆分仅移出 1 个 tile，旧文件保留 Facade re-export，不破坏调用方
3. 所有拆分记录到 `docs/refactor-map.md`，形成项目级"切块地图缓存"

## Non-Goals

- 不修改任何业务逻辑
- 不做性能优化或类型系统升级
- 不动 vendor/ 目录

---

## Decision 1: Tile 抽取原则

**边缘优先**：每次优先拆"与其他代码耦合最少"的块——纯函数 > 类型定义 > 状态管理 > 核心渲染逻辑。

**Facade 保留法**：
```
原文件.ts（变薄，re-export）
  └── 新文件.ts（承接逻辑）
```

旧文件不删除旧符号，改为 `export { symbol } from './新文件'`。

**最小拆分粒度**：1 个 tile = 1 个或若干相邻的纯函数 / 类型块。

---

## Decision 2: tile 执行顺序

按 P0 风险从低到高排列：

| 轮次 | Tile | 文件 | 行范围 | 风险 |
|------|------|------|--------|------|
| T1 | convertBlendMode | imageWorker.worker.ts | 1017-1033 | P0 |
| T2 | WorkerInterfaces | imageWorker.worker.ts | 1-58 | P0 |
| T3 | makeThumbnail + getExecThumb | PrismNodeControls.tsx | 196-231 | P0 |
| T4 | SnippetStubs | useCanvasStore.ts | 1348-1353 | P0 |
| T5 | idbCrud | IndexedDBStorageAdapter.ts | 22-112 | P0 |
| T6 | imageMaskUtils | ComposerCanvas.tsx | 24-78 | P0 |
| T7 | LiveExecutionState | useCanvasStore.ts | 48-174 | P1 |
| ... | 剩余 tile | （按 refactor-map.md 记录继续） | — | P1-P2 |

---

## Decision 3: 测试策略

- 每拆完一个 tile，立即运行 `pnpm typecheck` 验证类型
- 运行受影响包的单元测试（若存在）
- Facade 层的 re-export 在 TypeScript 编译时天然验证一致性

---

## Architecture Review

### 候选方案 A：一步到位拆分（不采用）

将整个大文件一次性重构成 `features/` / `components/` / `services/` 子目录。

**缺点**：改动范围大，难以在单个 PR 内 review 通过；一旦出错影响面广；AI 更容易"改错"。

### 候选方案 B：Facade 渐进法（采用）

按上述 tile 顺序逐块拆分，每次只改变 import 路径，旧文件保留 re-export。

**优点**：每次 PR 改动小、可独立验证、CI 成本低。
**缺点**：中间态文件数量增加，但这是可接受的技术债务。

### 候选方案 C：只在 refactor-map.md 记录，不实际拆分（不采用）

记录无法阻止大文件继续膨胀。

---

## Simplified Review Checklist

- [ ] 每个 tile 拆分后，`pnpm typecheck` 通过
- [ ] 旧文件保留 `export { symbol } from './新文件'`
- [ ] 新文件已记录到 `docs/refactor-map.md`
- [ ] 受影响的包的测试套件通过
