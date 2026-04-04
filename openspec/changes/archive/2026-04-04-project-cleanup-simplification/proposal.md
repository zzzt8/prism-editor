## Why

项目经过多轮迭代，积累了多项不再使用或重复的功能和代码。这些"技术债务"增加了维护成本、编译时间和最终包体积。必须进行清理，简化项目结构，降低维护负担，让团队能够更高效地开发核心功能。

## What Changes

### 删除不必要功能

- **删除版本历史功能 (VersionHistory/)**
  - 删除 `VersionList.tsx`、`VersionDiff.tsx`、`RollbackConfirm.tsx`、`index.tsx`
  - 删除相关 store 逻辑和存储接口
  - 用户不需要工作流的版本控制功能

- **删除调试日志 (useCanvasDebugLog.ts)**
  - 删除或移除 `useCanvasDebugLog` 的所有 import
  - 防止生产环境输出调试信息

- **删除 console.log 语句**
  - 清理 `publishedStore.ts:265` 的 console.log
  - 确保生产环境无调试输出

### 合并重复代码

- **合并 ErrorBoundary 到 shared-ui**
  - 将 `apps/dev-tool/src/components/common/ErrorBoundary.tsx` 和 `apps/user-app/src/components/common/ErrorBoundary.tsx` 合并
  - 提取到 `packages/shared-ui/` 作为共享组件
  - 删除两个重复的副本

- **统一 nodeCache 实现**
  - `apps/dev-tool/src/utils/nodeCache.ts` 和 `apps/user-app/src/storage/nodeCache.ts` 功能相似
  - 合并为一个实现，保留 dev-tool 版本（功能更完整）

### 简化存储层

- **删除 LocalStorageAdapter 和 MigrationStorageAdapter**
  - 只保留 `IndexedDBStorageAdapter` 作为唯一存储方案
  - 删除 `apps/dev-tool/src/storage/LocalStorageAdapter.ts`
  - 删除 `apps/dev-tool/src/storage/MigrationStorageAdapter.ts`
  - 更新 `apps/dev-tool/src/storage/index.ts` 的导出

- **修复 git 大小写重复文件问题**
  - 处理 Windows 文件系统下的大小写敏感问题
  - 清理 `apps\dev-tool\src\` 路径下的重复文件

### 清理 Archive 目录

- 删除 `openspec/changes/archive/` 中超过 60 天的归档目录
- 压缩保留的归档文件到 `.zip` 便于存档

### 清理未使用代码

- 删除 `packages/shared-types/src/execution.ts` 中未使用的 type guards
- 清理 canvasStore.ts 中未使用的变量（`leftPanelOpen`, `rightPanelOpen`）
- 删除未使用的 CSS 内联样式

## Capabilities

### New Capabilities

- `storage-single-adapter`: 简化为单一 IndexedDB 存储适配器

### Modified Capabilities

- 无

## Impact

### Deleted Components

- `apps/dev-tool/src/components/VersionHistory/` (4 个文件)
- `apps/dev-tool/src/storage/LocalStorageAdapter.ts`
- `apps/dev-tool/src/storage/MigrationStorageAdapter.ts`
- `apps/dev-tool/src/utils/nodeCache.ts` (合并后删除)
- `apps/user-app/src/storage/nodeCache.ts` (合并后删除)

### Modified Components

- `apps/dev-tool/src/storage/index.ts`
- `apps/dev-tool/src/components/common/ErrorBoundary.tsx` (移动到 shared-ui)
- `apps/user-app/src/components/common/ErrorBoundary.tsx` (删除，使用共享组件)
- `packages/shared-ui/src/components/ErrorBoundary.tsx` (新增)

### Risk Level

- **中风险**：删除功能需要确保无其他代码依赖
- 需要先验证无 import 引用

### Breaking Changes

- **BREAKING**: 删除版本历史功能，用户将无法查看和回滚到旧版本
- **BREAKING**: 简化存储层，现有数据需要迁移（如果用户依赖旧存储）
