## Why

当前系统已经具备扩展性的基础设施（`registerCustom`、`executor.register()`、NodePanel 的自定义节点按钮），但这些扩展点**完全未连接**，导致：
1. 开发者无法添加自定义节点类型
2. `executeWorkflow()` 只使用内置 executors，自定义 executor 被静默忽略
3. `createRegistry()` 每次创建全新 registry，内置节点重复注册
4. 无动态加载机制，无法支持第三方节点包

这是实现"开发者生态"的核心架构改造——没有节点扩展性，就无法成为下一个 ComfyUI 或 n8n。

## What Changes

### 全局 Registry 单例
- 创建 `packages/core/src/globalRegistry.ts`，提供全局唯一的 Registry 实例
- `registerNode(definition)` / `registerExecutor(type, fn)` / `listNodes()` / `getNode(type)` / `getExecutor(type)`
- 替代模块级的 `createRegistry()` 调用，确保自定义节点在全局共享

### canvasStore 执行引擎改造
- 移除 `executeWorkflow()` 中的 `new WorkflowExecutor(imageOpsExecutors)`
- 改为 `new WorkflowExecutor()` + `executor.registerAll(globalRegistry.getExecutors())`
- 所有节点（包括自定义节点）都通过 executor.register 注册

### NodePanel 自定义节点 UI 连接
- 连接 NodePanel 的"添加自定义节点"按钮，实现节点包导入
- 支持从 JSON 文件导入节点定义，从 JS bundle 动态加载 executor
- 在 NodePanel 中显示自定义节点（按 `custom` 分类）

### 节点包格式定义
- 定义 `packages/shared-types/src/node-package.ts` — 节点包 JSON Schema
- 包含 `name`, `version`, `definition`, `executor` (URL 或内联代码)
- 节点包可独立分发，托管在 CDN 或 OSS

### 动态加载机制
- 实现 `loadNodePackage(url: string)` 函数
- 在 Web Worker 中使用 `importScripts` 或 dynamic import 动态加载 executor
- 实现包缓存（localStorage + indexedDB）避免重复加载
- 加载失败时提供重试和错误提示

### User App 节点加载
- User App 从服务端获取 PublishedWorkflow 及其所需节点包
- 动态加载缺失的节点包后再执行
- 缓存已加载的节点包

## Capabilities

### New Capabilities
- `global-registry`: 全局单例 Registry，支持节点定义和 executor 的运行时注册
- `custom-node-import`: 从 JSON/JS bundle 导入自定义节点，动态注册到全局 Registry
- `node-package-format`: 节点包格式定义，包含节点元数据和 executor 代码
- `node-dynamic-loader`: 动态加载远程节点包，支持缓存和错误恢复
- `executor-registration`: 将 executor 注册与节点定义注册解耦，支持自定义节点执行

### Modified Capabilities
- *(无)* — 本次改造仅扩展现有架构，不改变内置节点行为

## Impact

- **新增包**：`packages/core/` — 全局 Registry 单例和动态加载逻辑
- **修改包**：`@prism/workflow-core` — `executeWorkflow()` 使用全局 Registry
- **修改包**：`@prism/node-definitions` — `createRegistry()` 改为导出全局 Registry
- **修改文件**：`apps/dev-tool/src/components/NodePanel.tsx` — 连接自定义节点导入 UI
- **修改文件**：`apps/dev-tool/src/store/canvasStore.ts` — 使用全局 Registry
- **新增文件**：`packages/shared-types/src/node-package.ts` — 节点包类型定义
- **新增文件**：`apps/dev-tool/src/components/NodePackageManager.tsx` — 节点包管理面板
