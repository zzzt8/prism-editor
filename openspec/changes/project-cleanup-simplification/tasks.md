## 1. Preparation - 验证无引用

- [ ] 1.1 验证 VersionHistory 组件无引用
  ```bash
  rg "VersionHistory" apps/dev-tool/src/
  ```
  - 确认无引用后可安全删除

- [ ] 1.2 验证 version 存储方法无引用
  ```bash
  rg "getVersions\|saveVersion\|rollbackVersion" apps/dev-tool/src/
  ```

- [ ] 1.3 验证 LocalStorageAdapter 无引用
  ```bash
  rg "LocalStorageAdapter\|localStorageAdapter" apps/dev-tool/src/
  ```

- [ ] 1.4 验证 MigrationStorageAdapter 无引用
  ```bash
  rg "MigrationStorageAdapter\|migrationStorageAdapter" apps/dev-tool/src/
  ```

- [ ] 1.5 备份重要数据
  - 导出 IndexedDB 中的工作流数据
  - 创建备份分支 `backup-pre-cleanup`

## 2. Merge Shared Code

- [ ] 2.1 创建 shared-ui ErrorBoundary
  - 在 `packages/shared-ui/src/components/` 创建 `ErrorBoundary.tsx`
  - 从 dev-tool 复制代码
  - 导出 `ErrorBoundary` 组件

- [ ] 2.2 更新 dev-tool 的 import
  - 修改 `apps/dev-tool/src/App.tsx`
  - 修改 `apps/dev-tool/src/main.tsx`
  - 改为从 `@prism/shared-ui` import

- [ ] 2.3 更新 user-app 的 import
  - 修改 `apps/user-app/src/App.tsx`
  - 修改 `apps/user-app/src/main.tsx`
  - 改为从 `@prism/shared-ui` import

- [ ] 2.4 删除重复的 ErrorBoundary 文件
  - 删除 `apps/dev-tool/src/components/common/ErrorBoundary.tsx`
  - 删除 `apps/user-app/src/components/common/ErrorBoundary.tsx`

## 3. Delete Unused Features

- [ ] 3.1 删除 VersionHistory 组件
  - 删除 `apps/dev-tool/src/components/VersionHistory/VersionList.tsx`
  - 删除 `apps/dev-tool/src/components/VersionHistory/VersionDiff.tsx`
  - 删除 `apps/dev-tool/src/components/VersionHistory/RollbackConfirm.tsx`
  - 删除 `apps/dev-tool/src/components/VersionHistory/index.tsx`

- [ ] 3.2 删除 useCanvasDebugLog
  - 检查 `apps/dev-tool/src/components/canvas/` 中是否有引用
  - 如果有引用，先移除引用
  - 删除 `useCanvasDebugLog.ts` 文件

- [ ] 3.3 删除 console.log
  - 读取 `apps/user-app/src/store/publishedStore.ts` 第 265 行
  - 删除 `console.log` 语句

- [ ] 3.4 删除未使用的 type guards
  - 读取 `packages/shared-types/src/execution.ts`
  - 删除未使用的 type guard 函数

- [ ] 3.5 清理 canvasStore 未使用变量
  - 读取 `apps/dev-tool/src/store/canvasStore.ts` 第 28-29 行
  - 删除 `leftPanelOpen`, `rightPanelOpen` 读取（如果未使用）

## 4. Simplify Storage Layer

- [ ] 4.1 更新 storage/index.ts 导出
  - 读取 `apps/dev-tool/src/storage/index.ts`
  - 删除 `LocalStorageAdapter` 导出
  - 删除 `MigrationStorageAdapter` 导出
  - 保留 `IndexedDBStorageAdapter` 和 `ApiStorageAdapter`

- [ ] 4.2 删除 LocalStorageAdapter
  - 删除 `apps/dev-tool/src/storage/LocalStorageAdapter.ts`

- [ ] 4.3 删除 MigrationStorageAdapter
  - 删除 `apps/dev-tool/src/storage/MigrationStorageAdapter.ts`

## 5. Unify nodeCache

- [ ] 5.1 分析 nodeCache 使用情况
  - 读取 `apps/dev-tool/src/utils/nodeCache.ts`
  - 读取 `apps/user-app/src/storage/nodeCache.ts`
  - 确定保留哪个版本

- [ ] 5.2 统一 nodeCache 实现
  - 保留功能更完整的版本（dev-tool 版本有 LRU 和统计）
  - 删除另一个副本
  - 更新所有 import 路径

## 6. Fix Git Case Issues

- [ ] 6.1 识别重复文件
  - 检查 git status 中的小写路径文件
  - `apps\dev-tool\src\` 路径下的文件

- [ ] 6.2 处理重复文件
  - 确保大写路径文件是正确的版本
  - 删除小写路径的重复文件
  - 使用 `git rm` 而非普通 rm

## 7. Cleanup Archive Directory

- [ ] 7.1 识别超过 60 天的归档目录
  ```bash
  find openspec/changes/archive -type d -mtime +60 -maxdepth 1
  ```

- [ ] 7.2 压缩旧归档目录
  - 对每个旧目录创建 .zip 压缩包
  - 删除原始目录
  - 保留最近 60 天内的目录

## 8. Verification

- [ ] 8.1 运行 TypeScript 检查
  ```bash
  pnpm exec tsc --noEmit
  ```

- [ ] 8.2 运行构建
  ```bash
  pnpm build
  ```

- [ ] 8.3 运行测试
  ```bash
  pnpm test
  ```

- [ ] 8.4 手动验证功能
  - 启动 dev-tool，确认功能正常
  - 启动 user-app，确认功能正常
  - 测试存储功能

## 9. Commit & Document

- [ ] 9.1 创建 git commit
  - 使用 descriptive commit message
  - 列出所有删除的文件

- [ ] 9.2 更新 CHANGELOG
  - 记录删除的功能
  - 提醒用户可能的影响
