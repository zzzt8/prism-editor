## Context

项目经过多轮迭代，积累了技术债务：
- 重复的组件（ErrorBoundary 在两个 app 中各有一份）
- 不再使用的功能（版本历史、LocalStorage/Migration 存储）
- 调试代码（useCanvasDebugLog）
- 重复的工具实现（nodeCache）
- Git 大小写问题导致的重复文件

这些债务增加了维护成本，需要系统性清理。

## Goals / Non-Goals

**Goals:**

- 删除所有不再使用的功能
- 合并重复代码，减少维护成本
- 简化存储层，统一使用 IndexedDB
- 清理调试代码和生产环境日志
- 修复 Git 大小写问题

**Non-Goals:**

- 不改变任何用户可见的功能
- 不重构现有代码架构
- 不删除未完成的 WIP 功能

## Decisions

### Decision 1: 删除版本历史功能

**分析**：版本历史功能包含 4 个文件，约 500 行代码，但实际使用率很低。本地工作流编辑器不需要像代码仓库那样的版本控制。

**删除范围**：
- `apps/dev-tool/src/components/VersionHistory/` (4 个文件)
- 相关 store 方法（如果存在）
- 相关存储接口

**验证步骤**：在删除前，必须确认：
1. 没有其他代码引用这些组件
2. 没有其他代码调用 version 相关的存储方法

```bash
# 验证无引用
rg "VersionHistory" apps/dev-tool/src/
rg "getVersions\|saveVersion\|rollbackVersion" apps/dev-tool/src/
```

### Decision 2: 合并 ErrorBoundary 到 shared-ui

**分析**：两个 ErrorBoundary 组件代码完全相同，提取到共享包可减少重复代码。

**实现方案**：
```
1. 创建 packages/shared-ui/src/components/ErrorBoundary.tsx
2. 将 dev-tool 的 ErrorBoundary 移动到新位置
3. 更新 dev-tool 的 import 路径
4. 更新 user-app 的 import 路径
5. 删除原来的两个副本
```

**依赖更新**：
- `apps/dev-tool/src/App.tsx`
- `apps/dev-tool/src/main.tsx`
- `apps/user-app/src/App.tsx`
- `apps/user-app/src/main.tsx`

### Decision 3: 简化存储层

**分析**：当前有 4 个存储适配器，但大多数功能只需要 IndexedDB。

**删除范围**：
- `LocalStorageAdapter.ts` - 旧实现，已被 IndexedDB 替代
- `MigrationStorageAdapter.ts` - 仅用于从旧存储迁移，已完成迁移

**保留**：
- `IndexedDBStorageAdapter.ts` - 主要存储
- `ApiStorageAdapter.ts` - API 存储（user-app 使用）

**存储接口更新**：
```typescript
// apps/dev-tool/src/storage/index.ts
export { IndexedDBStorageAdapter, indexedDBStorageAdapter } from './IndexedDBStorageAdapter';
export { ApiStorageAdapter, apiStorageAdapter } from './ApiStorageAdapter';
// 删除 LocalStorageAdapter, MigrationStorageAdapter 导出
```

### Decision 4: 统一 nodeCache 实现

**分析**：`apps/dev-tool/src/utils/nodeCache.ts` 和 `apps/user-app/src/storage/nodeCache.ts` 功能相似但实现略有不同。

**决策**：保留 dev-tool 版本（功能更完整，有 LRU 驱逐和统计信息），删除 user-app 版本。

**合并策略**：
1. 将 dev-tool 的 `nodeCache.ts` 移动到 `packages/shared-utils/` 或保持原位
2. 更新 dev-tool 中的 import 路径
3. user-app 直接 import dev-tool 的版本，或将 nodeCache 提升到 shared 包

### Decision 5: 修复 Git 大小写问题

**问题**：Windows 文件系统不区分大小写，导致 Git 出现重复文件。

**处理方式**：
1. 识别重复文件（Git status 中显示的 `?? apps\dev-tool\src\` 路径）
2. 删除小写路径的重复文件
3. 确保大写路径的文件是正确版本

```bash
# 识别问题
git status | grep "?? apps\\\\"

# 解决
git rm apps\\dev-tool\\src\\App.tsx  # 删除小写版本
```

### Decision 6: 清理 Archive 目录

**策略**：
1. 识别 60 天以上的归档目录
2. 将其内容压缩为 `.zip` 文件
3. 删除原始目录

```bash
# 查找超过 60 天的目录
find openspec/changes/archive -type d -mtime +60

# 压缩并删除
for dir in $(find openspec/changes/archive -type d -mtime +60); do
  zip -r "${dir}.zip" "$dir"
  rm -rf "$dir"
done
```

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 删除版本历史后用户无法回滚 | 高 | 在删除前提示用户手动导出重要版本 |
| 误删仍在使用的代码 | 高 | 严格验证所有引用后再删除 |
| 存储层变更导致数据丢失 | 中 | 确保 IndexedDB 中的数据完整 |
| Git 大小写问题处理不当 | 中 | 先备份，再操作 |

[Risk] 合并 ErrorBoundary 可能破坏现有样式 → [Mitigation] 保持组件样式不变，只移动代码

[Risk] 删除 LocalStorageAdapter 可能影响未迁移用户 → [Mitigation] 在变更日志中说明，建议用户先迁移

## Migration Plan

### Phase 1: 准备（不影响用户）
1. 验证所有待删除代码无引用
2. 备份重要数据
3. 创建备份分支

### Phase 2: 合并共享代码
1. 创建 shared-ui/ErrorBoundary
2. 更新所有 import
3. 验证功能正常

### Phase 3: 删除不必要功能
1. 删除 VersionHistory 组件
2. 删除调试日志引用
3. 删除 console.log
4. 更新 storage/index.ts

### Phase 4: 清理
1. 处理 Git 大小写问题
2. 清理 Archive 目录
3. 验证构建成功

### 回滚策略
```bash
# 回滚到删除前
git revert <commit-hash>
```

## Open Questions

1. **nodeCache 是否应该成为共享包？** 如果两个 app 都需要，可以提升到 `packages/shared-utils/`；如果只有 dev-tool 需要，保持原位。

2. **版本历史数据是否需要保留？** 如果用户有重要版本记录，应该提供导出功能后再删除。

3. **MigrationStorageAdapter 是否 100% 完成迁移？** 确认所有旧 LocalStorage 数据都已迁移到 IndexedDB 后再删除。
