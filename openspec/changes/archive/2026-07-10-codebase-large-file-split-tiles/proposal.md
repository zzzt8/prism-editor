# Proposal: codebase-large-file-split-tiles

**change_class: high**
_reason: 跨多包（dev-tool / image-ops / composer-sdk），触及 Zustand store、Web Worker、IndexedDB adapter、React 组件，多层耦合，重构不当会破坏现有功能。

---

## Why

当前仓库存在多个"大文件"（300-1400 行），所有逻辑堆积在同一文件内，导致：

- AI 每次读文件需要扫描大量无关代码，容易"误改"核心逻辑
- 大文件无法独立测试，CI 难以定位回归
- 团队成员修改某一小功能时必须理解整文件
- `refactor-map.md` 已有 9 个历史 tile 记录，但缺乏正式 change 框架推进

本 change 通过"渐进式 Facade 抽离"将大文件逐块瘦身，每次拆分仅影响 import 调用方，风险可控。

---

## What Changes

1. 对以下 5 个大文件按切块地图逐块拆分（每轮只拆 1 个 tile）：
   - `useCanvasStore.ts`（1362 行）→ 拆出 SnippetStubs、LiveExecutionState
   - `imageWorker.worker.ts`（1043 行）→ 拆出 convertBlendMode、WorkerInterfaces
   - `PrismNodeControls.tsx`（700 行）→ 拆出 imageThumbnails（makeThumbnail + getExecThumb）
   - `ComposerCanvas.tsx`（538 行）→ 拆出 imageMaskUtils（applyMaskToImageData）
   - `IndexedDBStorageAdapter.ts`（416 行）→ 拆出 idbCrud

2. 建立正式 OpenSpec change，推进 tile 拆分进度追踪。

---

## Capabilities

- 每个 tile 独立可测试，不破坏现有 import 调用方
- 旧文件保留 Facade re-export，外壳不变，实际逻辑移入子文件
- 所有 tile 记录到 `docs/refactor-map.md`，供后续 AI/人类快速定位

---

## Impact

- **影响范围**：dev-tool app、image-ops 包、composer-sdk 包
- **风险**：中（每次只拆 1 个 tile，CI 覆盖）
- **收益**：长期降低代码理解成本，减少未来改 bug 时的误改风险

---

## Out of Scope

- 不修改任何业务逻辑，仅做结构重组
- 不合并 vendor/ 下的文件
- 不在本次拆分中做性能优化
- 不做 TypeScript 严格模式升级
