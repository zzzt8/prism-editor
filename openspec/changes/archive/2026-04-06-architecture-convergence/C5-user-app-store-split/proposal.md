# C5: user-app store 拆分

> 派生自 meta-change: `architecture-convergence`

## Why

publishedStore.ts 混了 workflow 列表加载、详情选择、runState 管理、节点包下载/校验/缓存/注册、inline executor 解析、URL executor 代理。拆后每个 store 职责单一，节点包加载可独立做安全边界。

## What Changes

拆成 4 个 store + 2 个 service：

- **workflowCatalogStore**：列表加载、排序
- **selectedWorkflowStore**：select / clear / 当前 workflow
- **runStore**：runState
- **nodePackageLoader**（service）：requiredNodes 加载、缓存、校验
- **runtimeRegistry**（service）：registry 组装
- **runWorkflow**（service）：执行入口

## Impact Summary

| Layer | 文件 | 影响 |
|-------|------|------|
| runtime | `apps/user-app/src/modules/` | 新增目录，4 个 store + 2 个 service |
| runtime | `apps/user-app/src/App.tsx` | store 初始化更新 |
