## ADDED Requirements

### Requirement: Canvas Store 分片重构

dev-tool 的 `useCanvasStore` 当前将 7 种不同关注点混在单一文件中。重构为多个 Zustand slice 文件，保持相同外部接口，拆分内部实现。

#### Scenario: Store 文件拆分后行为不变
- **WHEN** 重构后运行 `pnpm dev`，在编辑器中执行拖拽节点、连线、发布等操作
- **THEN** 所有操作行为与重构前完全一致

### Requirement: 计数器统一管理

Node 和 Edge 的 ID 计数器目前在 4 个位置各有一份独立副本。统一为单一来源，消除 ID 碰撞风险。

#### Scenario: 复制粘贴节点 ID 唯一
- **WHEN** 在编辑器中连续复制粘贴多个节点
- **THEN** 每个新节点的 ID 唯一，无碰撞

### Requirement: 剪贴板状态 Zustand 化

当前剪贴板状态用模块级变量存储（`clipboardNodes` / `clipboardEdges`）。迁移到 Zustand store，保证状态可追踪。

#### Scenario: 剪贴板状态在 devtools 可观测
- **WHEN** 复制节点后在 React DevTools 查看 Zustand store
- **THEN** clipboard 字段存在于 store 中

## MODIFIED Requirements

### Requirement: graphSlice / selectionSlice / executionSlice 实现补全
<graphSlice / selectionSlice / executionSlice 当前是空壳（所有方法为 no-op），实际逻辑在 useCanvasStore 中>
→ <这些 slice 保留接口签名不变，但实现由 useCanvasStore 内部委托，不再是空壳；或直接合并到主 Store 中保留一个清晰的文件结构>

**Rationale**: 空壳 slice 造成代码死区，容易被误改且不报错。纯重构不改变行为，消除死区即可。

### Requirement: IndexedDBStorageAdapter 单例化
<当前 useCanvasStore 和 workflowStore 各 new 了一个独立的 IndexedDBStorageAdapter 实例>
→ <统一为一个单例实例，各 Store 共用>

**Rationale**: 多实例浪费连接资源，且可能导致数据不一致。

## REMOVED Requirements

### Requirement: dev-tool/nodeCache.ts 重复实现移除
**Reason**: `apps/dev-tool/src/utils/nodeCache.ts` 与 `apps/user-app/src/storage/nodeCache.ts` 功能完全重复。统一到一处。
**Migration**: dev-tool 的 node 缓存逻辑改用 user-app 的那份，或在 packages/core 中维护唯一实现。
