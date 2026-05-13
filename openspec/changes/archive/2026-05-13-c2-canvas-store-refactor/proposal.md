---
name: c2-canvas-store-refactor
change_class: high
change_profile: high
reason: "dev-tool useCanvasStore 1330 行混 7 种关注点；多个 slice 是空壳死区；计数器 4 份副本；nodeCache 重复实现"
---

## Task Anchor Echo

- **原始任务**: 修复 prism-editor 全部硬伤，分多步走
- **change 名称**: `c2-canvas-store-refactor`
- **change 名称是否服务于原始任务**: 是
- **约束/非目标追加（来自用户）**:
  - [ ] 先做纯重构，不要顺手加新功能
  - [ ] 不改变任何 Zustand 状态字段名或 store 方法签名

## Why

dev-tool 的 `useCanvasStore.ts` 有 1330 行，混合了图形操作、选中状态、审查器标签、草稿元数据、执行状态、自动保存、代码片段 7 种不同关注点。graphSlice / selectionSlice / executionSlice 三个 slice 是空壳（方法全是 no-op），代码死区。nodeCounter / edgeCounter 在 4 个位置各有一份独立副本。IndexedDBStorageAdapter 各 Store 各自 new 实例。dev-tool 和 user-app 各有一份重复的 nodeCache.ts。

## What Changes

1. `useCanvasStore.ts` 拆分为 3 个文件：`canvasStore.ts`（主 Store）+ `graphSlice.ts`（实际实现）+ `executionSlice.ts`（实际实现）
2. selectionSlice 的剪贴板职责迁移到 `canvasStore.ts` 内作为 `clipboard` 字段，删掉 `selectionSlice.ts`
3. nodeCounter / edgeCounter 只在 `canvasStore.ts` 中声明，删除所有重复副本
4.剪贴板状态从模块级变量迁移到 Zustand store
5. IndexedDBStorageAdapter 改为单例，各 Store 共用
6. `apps/dev-tool/src/utils/nodeCache.ts` 删除，改用 `apps/user-app/src/storage/nodeCache.ts` 作为唯一来源
7. `apps/user-app/src/storage/nodeCache.ts` 确认为完整可用的唯一实现

## Capabilities

### Modified Capabilities

- **Canvas Store 内部结构**: 从单文件变为分片实现，外部接口不变
- **Clipboard 状态**: 从模块变量变为 Zustand 状态，可观测
- **Node 缓存**: 从重复实现变为单一来源

## Impact

- `apps/dev-tool/src/modules/editor/stores/useCanvasStore.ts` → 拆分为 3 文件
- `apps/dev-tool/src/modules/editor/stores/selectionSlice.ts` → 删除
- `apps/dev-tool/src/modules/editor/stores/graphSlice.ts` → 实际实现
- `apps/dev-tool/src/modules/editor/stores/executionSlice.ts` → 实际实现
- `apps/dev-tool/src/modules/editor/stores/canvasStore.ts` → 新建主 Store
- `apps/dev-tool/src/utils/nodeCache.ts` → 删除
- `apps/user-app/src/storage/nodeCache.ts` → 保留作为唯一来源

## Out of Scope

- 加任何新功能
- 改变 Zustand 状态字段名或 store 方法签名
- 改 UI 样式
- 加测试（由 C5 统一覆盖）
