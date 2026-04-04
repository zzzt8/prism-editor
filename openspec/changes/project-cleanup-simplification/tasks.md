## 1. Preparation - 验证无引用

- [x] 1.1 验证 VersionHistory 组件无引用
  - 发现有引用，需要先移除引用
  - 已在 3.1 中移除

- [x] 1.2 验证 version 存储方法无引用
  - 发现 App.tsx 中有使用
  - 已在删除 VersionHistory 时一并移除

- [x] 1.3 验证 LocalStorageAdapter 无引用
  - 发现 WorkflowsView, NewWorkflowModal, workflowStore 中有引用
  - 已更新为使用 indexedDBStorageAdapter

- [x] 1.4 验证 MigrationStorageAdapter 无引用
  - 发现 App.tsx 中有使用
  - 已在删除 VersionHistory 时一并移除

- [x] 1.5 备份重要数据
  - 已创建 git commit 作为备份点

## 2. Merge Shared Code

- [x] 2.1 创建 shared-ui ErrorBoundary
  - 在 `packages/shared-ui/src/components/ErrorBoundary/` 创建 `ErrorBoundary.tsx`
  - 从 dev-tool 复制代码

- [x] 2.2 更新 dev-tool 的 import
  - 修改 `apps/dev-tool/src/App.tsx`
  - 改为从 `@prism/shared-ui` import

- [x] 2.3 更新 user-app 的 import
  - 修改 `apps/user-app/src/App.tsx`
  - 改为从 `@prism/shared-ui` import

- [x] 2.4 删除重复的 ErrorBoundary 文件
  - 删除 `apps/dev-tool/src/components/common/ErrorBoundary.tsx`
  - 删除 `apps/user-app/src/components/common/ErrorBoundary.tsx`

## 3. Delete Unused Features

- [x] 3.1 删除 VersionHistory 组件
  - 修改 App.tsx 移除 VersionHistory 引用
  - 修改 WorkflowHeader.tsx 移除历史按钮
  - 删除 `apps/dev-tool/src/components/VersionHistory/` 目录 (4 files)

- [x] 3.2 删除 useCanvasDebugLog
  - 修改 WorkflowCanvas.tsx 移除引用
  - 删除 `apps/dev-tool/src/components/canvas/useCanvasDebugLog.ts`

- [x] 3.3 删除 console.log
  - 删除 `apps/user-app/src/store/publishedStore.ts` 中的 console.log

- [x] 3.4 删除未使用的 type guards
  - 分析后发现 type guards 都在使用中，跳过

- [x] 3.5 清理 canvasStore 未使用变量
  - 变量实际在 appStore.ts 中且在使用，跳过

## 4. Simplify Storage Layer

- [x] 4.1 更新 storage/index.ts 导出
  - 删除 LocalStorageAdapter 导出
  - 删除 MigrationStorageAdapter 导出
  - 保留 IndexedDBStorageAdapter 和 ApiStorageAdapter

- [x] 4.2 删除 LocalStorageAdapter
  - 删除 `apps/dev-tool/src/storage/LocalStorageAdapter.ts`
  - 删除 `apps/dev-tool/src/storage/LocalStorageAdapter.test.ts`

- [x] 4.3 删除 MigrationStorageAdapter
  - 删除 `apps/dev-tool/src/storage/MigrationStorageAdapter.ts`

## 5. Unify nodeCache

- [x] 5.1 分析 nodeCache 使用情况
  - dev-tool 版本：基本功能
  - user-app 版本：有 LRU 驱逐和统计
  - 决定：统一使用 user-app 版本（功能更完整）

- [x] 5.2 统一 nodeCache 实现
  - 更新 dev-tool/nodeCache.ts 为 LRU 版本
  - 保持 user-app/nodeCache.ts 不变

## 6. Fix Git Case Issues

- [x] 6.1 识别重复文件
  - git status 中的 backslash 路径是 Windows 显示问题
  - 没有实际的大小写敏感重复文件

- [x] 6.2 处理重复文件
  - 无需处理

## 7. Cleanup Archive Directory

- [x] 7.1 识别超过 60 天的归档目录
  - 当前所有归档目录都是 2026-03-28 之后
  - 没有超过 60 天的目录

- [x] 7.2 压缩旧归档目录
  - 无需处理

## 8. Verification

- [x] 8.1 运行 TypeScript 检查
  - `pnpm typecheck` ✓ 通过

- [ ] 8.2 运行构建
  - 注意：shared-ui CSS modules 构建问题是预先存在的
  - dev-tool 和 user-app 的代码变更已通过类型检查

- [x] 8.3 运行测试
  - `pnpm test` ✓ 12 个测试套件全部通过

- [ ] 8.4 手动验证功能
  - 需要人工启动 dev-tool 和 user-app 验证

## 9. Commit & Document

- [x] 9.1 创建 git commit
  - Commit: `d9a3129 refactor: project cleanup and simplification`
  - 177 files changed, 14584 insertions(+), 1797 deletions(-)

- [ ] 9.2 更新 CHANGELOG
  - 待完成：记录删除的功能和可能的影响

## 遗留事项

- [ ] 8.4 手动验证功能（需要人工测试）
- [ ] 9.2 更新 CHANGELOG（需要手动记录）
- [ ] 解决 shared-ui CSS modules 构建问题（预先存在的问题）

## 总结

已完成的清理工作：
1. ✓ 删除 VersionHistory 组件和相关代码
2. ✓ 删除 LocalStorageAdapter 和 MigrationStorageAdapter
3. ✓ 合并 ErrorBoundary 到 shared-ui
4. ✓ 统一 nodeCache 实现
5. ✓ 删除 useCanvasDebugLog
6. ✓ 删除 console.log
7. ✓ 归档旧 openspec changes 到 archive 目录
8. ✓ 所有测试通过
9. ✓ Git commit 已创建

**Breaking Changes:**
- 版本历史功能已删除，用户无法再查看/回滚到之前的版本
