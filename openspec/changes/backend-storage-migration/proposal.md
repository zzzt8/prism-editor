## Why

当前所有工作流数据存储在浏览器 localStorage 中，存在以下问题：
1. **容量限制**：localStorage 最大 5-10MB，大型工作流无法存储
2. **跨设备无法访问**：用户换设备或清浏览器数据后工作流丢失
3. **无法支持多用户**：没有用户体系，所有数据混杂在一起
4. **无法实现发布/订阅**：Dev Tool 发布的工作流无法跨设备同步到 User App
5. **多 Tab 并发冲突**：无并发控制，多 Tab 同时编辑会相互覆盖

本提案是所有服务端改造的基础，后续的用户认证、工作流版本管理、团队协作、节点市场等能力都依赖于此。

## What Changes

### 服务端骨架
- 搭建 `server/` 目录，使用 Fastify + Prisma + SQLite 技术栈
- 实现 RESTful API 覆盖 StorageAdapter 接口定义的所有操作
- 开发环境支持 CORS 和热重载

### StorageAdapter API 实现
- `POST /api/workflows` — 创建工作流
- `GET /api/workflows` — 列表（支持分页、搜索）
- `GET /api/workflows/:id` — 详情
- `PUT /api/workflows/:id` — 更新
- `DELETE /api/workflows/:id` — 删除
- `POST /api/workflows/import` — 导入 JSON
- `GET /api/workflows/:id/export` — 导出 JSON

### 数据模型
- 使用 Prisma ORM 定义 User、Workflow、WorkflowMeta 数据模型
- 支持 workflow 与 user 的多对一关系
- PublishedWorkflow 独立存储，支持 workflow → user 的发布关系

### 前端存储层迁移
- 创建 `ApiStorageAdapter` 实现 StorageAdapter 接口
- 实现渐进迁移策略：双写 → 读切换 → 清理 localStorage
- 开发环境 fallback 到 localStorage，生产环境切换到 API

## Capabilities

### New Capabilities
- `backend-api`: 服务端 RESTful API 骨架，支持工作流的 CRUD 操作
- `api-storage-adapter`: 前端 StorageAdapter 实现，替换 localStorage
- `data-migration`: 从 localStorage 到服务端的渐进式数据迁移策略

### Modified Capabilities
- *(无)* — 本次重构不改变现有功能行为，只是存储层从浏览器迁移到服务端

## Impact

- **新增目录**：`server/` — Fastify 服务端代码
- **修改文件**：
  - `packages/shared-types/src/storage.ts` — 添加 API 端点相关的类型定义
  - `apps/dev-tool/src/storage/` — 添加 `ApiStorageAdapter`
  - `apps/dev-tool/src/main.tsx` — 注入 API 基础 URL
  - `apps/user-app/src/storage/` — 替换为 `ApiStorageAdapter`
- **环境变量**：`VITE_API_BASE_URL` — 服务端基础 URL
- **数据库**：SQLite（`prisma/dev.db`），可无缝迁移到 PostgreSQL
