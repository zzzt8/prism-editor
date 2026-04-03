## Why

当前项目中存在多个严重 BUG，直接影响用户体验和核心功能稳定性。其中最严重的问题是 `loadRequiredNodes` 在缓存命中后不导入节点包，导致工作流无法运行；此外还存在内存泄漏、状态不同步、存储无限增长等问题。必须立即修复这些问题，才能确保产品可用。

## What Changes

### Critical Bug Fixes (apps/user-app)

- **修复 `loadRequiredNodes` 缓存命中后不导入节点的问题**
  - 缓存命中时仍需调用 `store.importRequiredNode()` 注册到全局注册表
  - 确保节点包真正可用
  
- **修复 `App.tsx` useEffect 依赖项缺失导致的路由不同步**
  - 当 `selectedWorkflow` 变化时，路由同步逻辑未重新执行
  - 导致 URL 和 store 状态不一致

- **修复 `InputSection` Blob URL 清理逻辑错误**
  - 组件卸载时 `revoke` 的是当前值而非卸载时的值
  - 导致内存泄漏

- **修复 `ApiStorageAdapter` 缺少请求超时和取消机制**
  - 防止竞态条件，用户快速切换时请求结果互相覆盖

- **修复 `router/index.ts` URL 编码异常未捕获**
  - `decodeURIComponent` 可能抛出异常导致崩溃

### Bug Fixes (apps/dev-tool)

- **修复 `MigrationStorageAdapter` 定时器泄漏**
  - `setInterval` 未在组件卸载时清理
  - 导致内存泄漏

- **修复 `pasteNodes` 不复制边的问题**
  - 用户复制节点时，节点间的连接丢失

- **修复 `NodePackageManager` Toast 不工作的问题**
  - `useState<(msg: string) => void>` 写法错误，setToast 永远无效

- **限制 IndexedDB 版本记录数量**
  - 防止版本记录无限增长导致存储耗尽
  - 最多保留最近 50 个版本

### Type Safety Improvements

- 替换 `WorkflowCanvas.tsx` 中多处 `any[]` 类型为精确类型
- 替换 `ApiStorageAdapter` 中的 `any[]` 为具体类型

## Capabilities

### New Capabilities

- `node-cache-import`: 修复节点包缓存命中后仍需导入到全局注册表的逻辑

### Modified Capabilities

- 无（本次为纯 Bug 修复，不涉及功能变更）

## Impact

### Affected Code

- `apps/user-app/src/store/publishedStore.ts`
- `apps/user-app/src/App.tsx`
- `apps/user-app/src/components/InputSection/index.tsx`
- `apps/user-app/src/storage/ApiStorageAdapter.ts`
- `apps/user-app/src/router/index.ts`
- `apps/dev-tool/src/storage/MigrationStorageAdapter.ts`
- `apps/dev-tool/src/store/canvasStore.ts`
- `apps/dev-tool/src/components/NodePackageManager/index.tsx`
- `apps/dev-tool/src/storage/IndexedDBStorageAdapter.ts`
- `apps/dev-tool/src/components/canvas/WorkflowCanvas.tsx`

### Risk Level

- **低风险**：纯 Bug 修复，不改变用户可见功能
- 所有修改都有对应的测试或手动验证

### Breaking Changes

- 无
