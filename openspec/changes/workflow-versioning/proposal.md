## Why

当前工作流保存只存储最新版本，没有版本历史。这导致：
1. 无法回滚到之前的版本
2. 无法对比两个版本的差异
3. 无法追踪工作流的修改历史
4. 发布工作流时没有版本概念

本提案在服务端存储和用户认证基础上，实现工作流版本管理。

## What Changes

### 版本历史存储
- 每次保存自动创建版本快照
- 存储版本号、内容、时间戳、修改者
- 支持版本列表查询

### 版本回滚
- 支持回滚到任意历史版本
- 回滚创建新版本（不删除历史）

### 版本对比
- 支持比较两个版本的差异
- 高亮显示新增/删除/修改的节点和连线

## Capabilities

### New Capabilities
- `workflow-versioning`: 工作流版本历史存储和回滚
- `workflow-diff`: 两个版本之间的差异对比

### Modified Capabilities
- *(无)* — 本提案扩展 backend-api，不改变现有行为

## Impact

- **修改文件**：`server/prisma/schema.prisma` — 添加 `WorkflowVersion` model
- **新增路由**：`server/src/routes/versions.ts`
- **新增 API**：`GET /api/workflows/:id/versions`, `POST /api/workflows/:id/rollback`, `GET /api/workflows/:id/diff`
- **前端改动**：Dev Tool 添加版本历史面板
