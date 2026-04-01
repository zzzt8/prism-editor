## 1. 服务端骨架搭建

> 工具文档：Fastify (https://fastify.dev/) · tsx (https://github.com/privatenumber/tsx)

- [ ] 1.1 创建 `server/` 目录结构（参照 design.md Project Structure）
- [ ] 1.2 初始化 `server/package.json`，安装依赖：`fastify@5`, `zod@3`, `@fastify/cors`, `prisma`, `@prisma/client`
- [ ] 1.3 配置 `server/tsconfig.json`，设置 `module: ESNext`, `moduleResolution: Bundler`
- [ ] 1.4 创建 `server/src/index.ts` — Fastify 入口，配置 CORS、端口监听
- [ ] 1.5 创建 `server/src/app.ts` — Fastify 实例配置，导出 app 实例
- [ ] 1.6 配置 tsx 热重载脚本：`package.json` 添加 `"server:dev": "tsx watch src/index.ts"`
- [ ] 1.7 验证：运行 `pnpm server:dev`，确认服务启动日志

## 2. Prisma 数据模型

> 工具文档：Prisma (https://www.prisma.io/docs) · Prisma Schema (https://www.prisma.io/docs/orm/reference/prisma-schema-reference)

- [ ] 2.1 初始化 Prisma：`cd server && npx prisma init --datasource-provider sqlite`
- [ ] 2.2 编写 `server/prisma/schema.prisma`（参照 design.md Data Model）
- [ ] 2.3 创建 `model User`、`model Workflow`、`model PublishedWorkflow`、`enum WorkflowStatus`
- [ ] 2.4 运行 `npx prisma migrate dev --name init` 生成 SQLite 数据库
- [ ] 2.5 创建 `server/src/db/client.ts` — Prisma Client 单例导出
- [ ] 2.6 验证：`npx prisma studio` 打开数据库管理界面，确认表结构正确

## 3. Workflow API 路由

> 工具文档：Fastify Routes (https://fastify.dev/) · Zod (https://zod.dev/)

- [ ] 3.1 创建 `server/src/schemas/workflow.ts` — Zod schemas（createWorkflow, updateWorkflow, workflowParams）
- [ ] 3.2 创建 `server/src/routes/workflow.ts` — 工作流 CRUD 路由
- [ ] 3.3 实现 `GET /api/workflows` — 列表（支持分页 `page/limit`、搜索 `search`）
- [ ] 3.4 实现 `POST /api/workflows` — 创建（调用 Prisma `workflow.create`）
- [ ] 3.5 实现 `GET /api/workflows/:id` — 详情（包含完整 content JSON）
- [ ] 3.6 实现 `PUT /api/workflows/:id` — 更新（序列化 content 为 JSON string）
- [ ] 3.7 实现 `DELETE /api/workflows/:id` — 删除
- [ ] 3.8 实现 `PATCH /api/workflows/:id/meta` — 更新元数据（name/status/category）
- [ ] 3.9 实现 `POST /api/workflows/import` — 导入 JSON
- [ ] 3.10 实现 `GET /api/workflows/:id/export` — 导出 JSON（设置 Content-Disposition）
- [ ] 3.11 在 `app.ts` 中注册 workflow 路由插件
- [ ] 3.12 验证：使用 curl/Postman 测试所有端点，确认 CRUD 操作正常

## 4. Published Workflow API 路由

> 工具文档：Fastify Routes · Prisma Relations

- [ ] 4.1 创建 `server/src/schemas/published.ts` — Zod schemas
- [ ] 4.2 创建 `server/src/routes/published.ts` — 发布工作流路由
- [ ] 4.3 实现 `GET /api/published` — 列表所有已发布工作流
- [ ] 4.4 实现 `GET /api/published/:id` — 详情
- [ ] 4.5 实现 `POST /api/published` — 发布（创建 PublishedWorkflow + 更新 Workflow status）
- [ ] 4.6 实现 `DELETE /api/published/:id` — 取消发布
- [ ] 4.7 在 `app.ts` 中注册 published 路由插件
- [ ] 4.8 验证：Dev Tool 发布工作流，确认 PublishedWorkflow 记录创建

## 5. API 验证与错误处理

> 工具文档：Fastify Error Handling (https://fastify.dev/) · Zod Error Formatting

- [ ] 5.1 配置 Zod 验证错误响应格式（返回 `{ errors: [...] }`）
- [ ] 5.2 配置全局错误处理器（4xx 返回描述性消息，5xx 返回通用消息 + 日志）
- [ ] 5.3 实现 404 处理（无效路由返回 `{ error: "Not found" }`）
- [ ] 5.4 验证：发送无效请求，确认错误响应格式正确

## 6. 前端 ApiStorageAdapter

> 工具文档：fetch API (https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) · StorageAdapter (packages/shared-types/src/storage.ts)

- [ ] 6.1 创建 `apps/dev-tool/src/storage/ApiStorageAdapter.ts`
- [ ] 6.2 实现 `save()` — `PUT /api/workflows/:id`
- [ ] 6.3 实现 `load()` — `GET /api/workflows/:id`
- [ ] 6.4 实现 `list()` — `GET /api/workflows`
- [ ] 6.5 实现 `delete()` — `DELETE /api/workflows/:id`
- [ ] 6.6 实现 `createWorkflow()` — `POST /api/workflows`
- [ ] 6.7 实现 `updateWorkflowMeta()` — `PATCH /api/workflows/:id/meta`
- [ ] 6.8 实现 `exportToJson()` — `GET /api/workflows/:id/export`
- [ ] 6.9 实现 `importFromJson()` — `POST /api/workflows/import`
- [ ] 6.10 添加 HTTP 错误处理（404 → Error("Workflow not found")，网络错误 → Error("Network request failed")）
- [ ] 6.11 验证：TypeScript 类型检查通过（`tsc --noEmit`）

## 7. 渐进迁移策略

> 工具文档：localStorage API (https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) · 环境变量配置

- [ ] 7.1 创建 `apps/dev-tool/src/storage/MigrationStorageAdapter.ts` — 封装双写逻辑
- [ ] 7.2 实现双写：同时调用 `ApiStorageAdapter` 和 `LocalStorageAdapter`
- [ ] 7.3 实现 fallback：API 失败时读取 localStorage
- [ ] 7.4 实现 API 可用性检测（启动时健康检查 + 周期性重试）
- [ ] 7.5 配置环境变量：`VITE_API_BASE_URL`、`VITE_STRICT_API`
- [ ] 7.6 修改 `apps/dev-tool/src/storage/index.ts` — 根据环境变量选择适配器
- [ ] 7.7 验证：开发环境走 localStorage，生产环境走 API

## 8. User App 适配

> 工具文档：BroadcastChannel (https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API)

- [ ] 8.1 创建 `apps/user-app/src/storage/ApiStorageAdapter.ts`
- [ ] 8.2 修改 `apps/user-app/src/storage/index.ts` — 使用 `ApiStorageAdapter`
- [ ] 8.3 移除 BroadcastChannel 监听代码（publishedStore.ts 中的 `bootstrapBroadcastListener`）
- [ ] 8.4 验证：User App 从 API 加载已发布工作流，执行流程正常

## 9. 数据迁移脚本

> 工具文档：Node.js File System · localStorage API

- [ ] 9.1 创建 `server/src/scripts/migrate.ts` — 迁移脚本入口
- [ ] 9.2 实现 `loadFromLocalStorage()` — 从 localStorage 读取所有工作流
- [ ] 9.3 实现 `migrateWorkflow()` — 调用 API 创建工作流
- [ ] 9.4 实现跳过逻辑：已存在的 workflow 跳过并记录
- [ ] 9.5 实现错误处理：单个失败不中断，记录并继续
- [ ] 9.6 添加进度输出和最终统计
- [ ] 9.7 验证：运行迁移脚本，确认历史数据成功迁移到 API

## 10. 文档与环境配置

- [ ] 10.1 创建 `server/README.md` — 服务端使用文档（启动、迁移、API 文档）
- [ ] 10.2 创建 `server/.env.example` — 环境变量示例（`DATABASE_URL`, `PORT`, `CORS_ORIGIN`）
- [ ] 10.3 在项目根 `package.json` 添加脚本：`"server:dev": "cd server && tsx src/index.ts"`, `"server:migrate": "cd server && tsx src/scripts/migrate.ts"`
- [ ] 10.4 验证：`pnpm server:dev` 正常启动，无 TypeScript 错误

## 11. 端到端测试

- [ ] 11.1 Dev Tool 创建新工作流 → 保存 → 刷新页面 → 数据正确加载
- [ ] 11.2 Dev Tool 发布工作流 → User App 加载 → 执行 → 结果正确
- [ ] 11.3 多 Tab 同时编辑 → 数据不冲突（最后一个保存覆盖）
- [ ] 11.4 API 不可用时（离线）→ localStorage fallback → 正常工作
- [ ] 11.5 迁移脚本 → localStorage 数据 → API → 数据完整性验证
