## Context

dev-tool 的 `useCanvasStore.ts` 有 1330 行，混合了 7 种不同关注点（图形操作、选中状态、审查器标签、草稿元数据、执行状态、自动保存、代码片段）。此外 graphSlice / selectionSlice / executionSlice 三个 slice 是空壳，代码死区。计数器在 4 个位置各有一份独立副本。IndexedDB 仓库各 Store 各自 new 实例。

## Goals / Non-Goals

**Goals:**
- 拆分 useCanvasStore.ts 为结构清晰的多个文件，保持外部接口不变
- 统一 nodeCounter / edgeCounter 来源，删除重复副本
- 剪贴板状态从模块级变量迁移到 Zustand
- 各 Store 共用单一 IndexedDBStorageAdapter 单例
- 删除重复的 nodeCache.ts

**Non-Goals:**
- 不加任何新功能
- 不改变任何 Zustand 状态字段名或 store 方法签名
- 不改 UI 样式
- 不加测试（本 change 是纯重构，测试由 C5 统一覆盖）

## Decisions

### 1: Store 拆分策略

将 1330 行的 `useCanvasStore.ts` 拆分为：
- `canvasStore.ts` — 主 Store，整合所有 slice，只保留 Zustand `create()` 调用和 store 导出
- `graphSlice.ts` — 图形操作（节点/边/组的新增、删除、修改），**实际实现**，不是空壳
- `executionSlice.ts` — 执行状态（_executionStatus / _currentNodeId / _executionAbort / _executionLog 等），**实际实现**

selectionSlice 的职责（clipboard）迁移到 `canvasStore.ts` 内作为 `clipboard` 状态字段，删掉 `selectionSlice.ts`。

### 2: 计数器统一

所有 nodeCounter / edgeCounter 只在 `canvasStore.ts` 中声明。`graphSlice.ts` 通过闭包或参数访问主 Store 的计数器，不自行持有。

### 3: 剪贴板 Zustand 化

在 `canvasStore.ts` 中加 `clipboard` 状态：
```ts
clipboard: { nodes: EditorCanvasNode[]; edges: EditorCanvasEdge[] } | null
```
删除 `selectionSlice.ts` 中的模块级 `clipboardNodes` / `clipboardEdges` 变量。

### 4: Repository 单例

在 `apps/dev-tool/src/storage/` 下 export 一个 `indexedDBStorageAdapter` 单例，`useCanvasStore` 和 `workflowStore` 都导入这个单例。

### 5: 重复 nodeCache 删除

dev-tool 和 user-app 各有一份 `nodeCache.ts`，功能完全重复。统一保留 `apps/user-app/src/storage/nodeCache.ts` 作为唯一来源，删除 `apps/dev-tool/src/utils/nodeCache.ts`，dev-tool 改用 user-app 的实现或 packages/core 中维护统一一份。

### 6: user-app nodeCache 统一保留

确认 `apps/user-app/src/storage/nodeCache.ts` 的 `memoryCache` / `localStorage` / LRU 逻辑完整，作为 node 缓存的唯一实现。

## Risks / Trade-offs

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 拆分后接口不匹配导致编译错误 | 高 | 无法启动 dev | 每个拆分步骤立即 `pnpm typecheck`，不出错再继续 |
| 计数器统一时遗漏某处引用 | 中 | ID 碰撞 | 用全局搜索确认所有 `nodeCounter` / `edgeCounter` 引用都指向同一来源 |
| 删掉 selectionSlice 后其他文件 import 它 | 低 | 编译错误 | 确认没有其他文件 import selectionSlice |

**回滚方案**: `git checkout` 整个 `stores/` 目录，一次性回滚所有改动

---

## Architecture Review（技术方案评审）

### 目标

在不改变任何外部行为的前提下，重构代码文件结构，使长期维护更安全。

### 约束

- 技术约束：Zustand slice 接口签名不变；React Flow Provider 接收的 store 类型不变
- 不变量：所有用户操作的结果不变；API 调用参数和返回值不变

### 候选方案

#### 方案 A：完全按 slice 拆分（graphSlice / selectionSlice / executionSlice 各自独立 store）
**Pros**: 最彻底的拆分
**Cons**: 需要改所有引用方（3 个 store 的 import 路径全改）；React Flow 的 `useStore` 需要合并多个 store

#### 方案 B：单文件内部重构（不拆分文件，只整理代码顺序和注释）
**Pros**: 零接口改动风险
**Cons**: 不解决文件过长问题，只是换行更清晰

#### 方案 C：拆分为 3 个文件（主 Store + graphSlice + executionSlice）+ selectionSlice 并入主 Store
**Pros**: 平衡拆分粒度和风险；计数器统一容易
**Cons**: 需要更新 import 路径

### 决策

选择方案 C，理由：
1. 文件数适中（4 个文件替代 1 个），风险可控
2. 计数器统一到主 Store 后，slice 通过函数参数传递，无需改外部接口
3. 不引入多 store 合并的复杂度

### 风险与回滚

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 拆分时遗漏某个方法或状态 | 中 | 运行时 bug | 每个拆分步骤后立即手动验收（拖节点、连线、运行） |
| TypeScript 类型丢失 | 低 | 编译错误 | 保持原类型注解不变 |

**回滚方案**: `git checkout apps/dev-tool/src/modules/editor/stores/`

### Migration Strategy（迁移策略）

1. 在新文件写入内容前，先在旧文件内做每个 slice 的逻辑移动（commit 粒度小）
2. 每移动完一个 slice，`pnpm typecheck --filter=@prism/dev-tool` 通过后再继续
3. 所有 slice 移完后，删除旧文件，更新 import 路径

---

## 评审清单

> 适用于 change_class = high

- [ ] 方案是否覆盖了 proposal 中的所有 goal 和 acceptance criteria？
- [ ] 是否存在更简单的替代方案？已在 design.md 中选择方案 C
- [ ] 最坏情况的回退路径是什么？`git checkout` 整个 stores 目录
- [ ] 对现有 specs/ 有哪些 ADDED / MODIFIED / REMOVED 语义变化？
  - Canvas Store 内部结构：REMOVED 空壳 slice；ADDED 实际实现的 graphSlice/executionSlice
  - Clipboard 状态：MODIFIED 从模块变量迁移到 Zustand
- [ ] Layer 间是否有隐式依赖未在设计层面显式声明？
  - 依赖 React Flow 的 store 类型（类型不变，无影响）
  - 依赖各 Service 层（autosaveService、executionService）—接口不变，无影响
