## Why

项目在快速迭代中积累了一些结构性问题：重复文件、Windows 路径歧义、职责边界不清（shared-types 带状态管理）、类型系统有两套并存（PortType / PortDataType）、OpenSpec 归档冲突、以及若干大文件需要拆分。这些问题不影响功能但阻碍维护效率，现在有清晰的上下文可以一次性清理干净。

## What Changes

### 删除
- 删除 Windows 反斜杠路径下的重复文件（`apps\dev-tool\src\components\...` 下与 `apps/dev-tool/src/components/...` 同名的未追踪文件）
- 删除 `ui desgin/` 目录（名字拼写错误，从未使用）
- 删除 OpenSpec 归档冲突目录（`archive/2026-03-31-node-editor-comfyui-refactor/` 和 `archive/2026-03-31-publish-dialog-refactor/`，活跃目录已有完整内容）
- 删除 `packages/image-ops/src/test-setup.ts` 及其 dist 输出（位置错误，应在 `__tests__/`）

### 重组
- 将 `packages/shared-types/src/stores/` 下的 3 个 Zustand store 移入 `apps/dev-tool/src/store/`（dev-tool 专属状态），消除 shared-types 中的状态管理职责
- `packages/shared-types` 恢复为纯类型定义包
- 将 `image-ops/executors.ts` 中的 6 个 executor 拆分到各自的节点文件中（已存在文件：`load-image.ts`、`composite.ts`、`transform.ts` 等）

### 简化
- 合并 `CacheEntry` 重复定义，shared-types 中的定义作为精简版，workflow-core 用扩展版
- 统一 PortType / PortDataType 两套类型系统，明确映射关系
- 将 `apps/dev-tool/src/components/nodes/PrismNode.tsx`（1213 行）拆分为子组件
- 将 `apps/dev-tool/src/components/canvas/WorkflowCanvas.tsx`（1213 行）按关注点拆分

### 归档清理
- 统一 OpenSpec archive 目录结构，平铺所有归档（移除 `specs/` 子目录层级）

## Capabilities

### New Capabilities
- `codebase-organization`: 清理目录结构、职责边界、无用文件和重复文件，使项目结构清晰可维护
- `type-system-cleanup`: 统一 PortType/PortDataType 类型系统，合并 CacheEntry 重复定义

### Modified Capabilities
- *(无)* — 本次重构不改变任何功能行为，只是结构整理

## Impact

- **删除的文件**：约 10+ 个文件（重复文件、错误文件、冲突归档）
- **移动的文件**：3 个 Zustand store（shared-types → dev-tool）
- **修改的文件**：PortDataType 相关类型文件、CacheEntry 定义处
- **拆分的文件**：executors.ts（1 个 → 6 个）、PrismNode.tsx（1 个 → 多个）
- **无破坏性变更**：所有重构都是文件级别组织调整，不涉及 API 或功能逻辑变化
