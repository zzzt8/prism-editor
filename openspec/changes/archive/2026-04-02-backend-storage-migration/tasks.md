## Part 1: 服务端骨架

> 工具文档：Fastify (https://fastify.dev/) · tsx (https://github.com/privatenumber/tsx)

- [x] 1.1 创建 `server/` 目录结构（参照 design.md Project Structure）
- [x] 1.2 初始化 `server/package.json`，安装依赖：`fastify@5`, `zod@3`, `@fastify/cors`, `prisma`, `@prisma/client`
- [x] 1.3 配置 `server/tsconfig.json`，设置 `module: ESNext`, `moduleResolution: Bundler`
- [x] 1.4 创建 `server/src/index.ts` — Fastify 入口，配置 CORS、端口监听
- [x] 1.5 创建 `server/src/app.ts` — Fastify 实例配置，导出 app 实例
- [x] 1.6 配置 tsx 热重载脚本：`package.json` 添加 `"server:dev": "tsx watch src/index.ts"`
- [x] 1.7 验证：运行 `pnpm server:dev`，确认服务启动日志

## Part 2: Prisma 数据模型

> 工具文档：Prisma (https://www.prisma.io/docs) · Prisma Schema (https://www.prisma.io/docs/orm/reference/prisma-schema-reference)

- [x] 2.1 初始化 Prisma：`cd server && npx prisma init --datasource-provider sqlite`
- [x] 2.2 编写 `server/prisma/schema.prisma`（参照 design.md Data Model）
- [x] 2.3 创建 `model User`、`model Workflow`、`model PublishedWorkflow`、`enum WorkflowStatus`
- [x] 2.4 运行 `npx prisma migrate dev --name init` 生成 SQLite 数据库
- [x] 2.5 创建 `server/src/db/client.ts` — Prisma Client 单例导出
- [x] 2.6 验证：`npx prisma studio` 打开数据库管理界面，确认表结构正确

## Part 3: Workflow CRUD API

> 工具文档：Fastify Routes (https://fastify.dev/) · Zod (https://zod.dev/)

- [x] 3.1 创建 `server/src/schemas/workflow.ts` — Zod schemas（createWorkflow, updateWorkflow, workflowParams）
- [x] 3.2 创建 `server/src/routes/workflow.ts` — 工作流 CRUD 路由
- [x] 3.3 实现 `GET /api/workflows` — 列表（支持分页 `page/limit`、搜索 `search`）
- [x] 3.4 实现 `POST /api/workflows` — 创建（调用 Prisma `workflow.create`）
- [x] 3.5 实现 `GET /api/workflows/:id` — 详情（包含完整 content JSON）
- [x] 3.6 实现 `PUT /api/workflows/:id` — 更新（序列化 content 为 JSON string）
- [x] 3.7 实现 `DELETE /api/workflows/:id` — 删除
- [x] 3.8 实现 `PATCH /api/workflows/:id/meta` — 更新元数据（name/status/category）
- [x] 3.9 实现 `POST /api/workflows/import` — 导入 JSON
- [x] 3.10 实现 `GET /api/workflows/:id/export` — 导出 JSON（设置 Content-Disposition）
- [x] 3.11 在 `app.ts` 中注册 workflow 路由插件
- [x] 3.12 验证：使用 curl/Postman 测试所有端点，确认 CRUD 操作正常

## Part 4: Published Workflow API

> 工具文档：Fastify Routes (https://fastify.dev/) · Prisma Relations (https://www.prisma.io/docs/orm/relations) · Fastify Error Handling (https://fastify.dev/) · Zod Error Formatting (https://zod.dev/)

- [x] 4.1 创建 `server/src/schemas/published.ts` — Zod schemas
- [x] 4.2 创建 `server/src/routes/published.ts` — 发布工作流路由
- [x] 4.3 实现 `GET /api/published` — 列表所有已发布工作流
- [x] 4.4 实现 `GET /api/published/:id` — 详情
- [x] 4.5 实现 `POST /api/published` — 发布（创建 PublishedWorkflow + 更新 Workflow status）
- [x] 4.6 实现 `DELETE /api/published/:id` — 取消发布
- [x] 4.7 配置 Zod 验证错误响应格式（返回 `{ errors: [...] }`）
- [x] 4.8 配置全局错误处理器（4xx 返回描述性消息，5xx 返回通用消息 + 日志）
- [x] 4.9 实现 404 处理（无效路由返回 `{ error: "Not found" }`）
- [x] 4.10 在 `app.ts` 中注册 published 路由插件
- [x] 4.11 验证：Dev Tool 发布工作流，确认 PublishedWorkflow 记录创建
- [x] 4.12 验证：发送无效请求，确认错误响应格式正确

## Part 5: ApiStorageAdapter

> 工具文档：fetch API (https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) · StorageAdapter (packages/shared-types/src/storage.ts)

- [x] 5.1 创建 `apps/dev-tool/src/storage/ApiStorageAdapter.ts`
- [x] 5.2 实现 `save()` — `PUT /api/workflows/:id`
- [x] 5.3 实现 `load()` — `GET /api/workflows/:id`
- [x] 5.4 实现 `list()` — `GET /api/workflows`
- [x] 5.5 实现 `delete()` — `DELETE /api/workflows/:id`
- [x] 5.6 实现 `createWorkflow()` — `POST /api/workflows`
- [x] 5.7 实现 `updateWorkflowMeta()` — `PATCH /api/workflows/:id/meta`
- [x] 5.8 实现 `exportToJson()` — `GET /api/workflows/:id/export`
- [x] 5.9 实现 `importFromJson()` — `POST /api/workflows/import`
- [x] 5.10 添加 HTTP 错误处理（404 → Error("Workflow not found")，网络错误 → Error("Network request failed")）
- [x] 5.11 验证：TypeScript 类型检查通过（`tsc --noEmit`）

## Part 6: 迁移与 User App

> 工具文档：localStorage API (https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) · BroadcastChannel (https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API) · Node.js File System

- [x] 6.1 创建 `apps/dev-tool/src/storage/MigrationStorageAdapter.ts` — 封装双写逻辑
- [x] 6.2 实现双写：同时调用 `ApiStorageAdapter` 和 `LocalStorageAdapter`
- [x] 6.3 实现 fallback：API 失败时读取 localStorage
- [x] 6.4 实现 API 可用性检测（启动时健康检查 + 周期性重试）
- [x] 6.5 配置环境变量：`VITE_API_BASE_URL`、`VITE_STRICT_API`
- [x] 6.6 修改 `apps/dev-tool/src/storage/index.ts` — 根据环境变量选择适配器
- [x] 6.7 验证：开发环境走 localStorage，生产环境走 API
- [x] 6.8 创建 `apps/user-app/src/storage/ApiStorageAdapter.ts`
- [x] 6.9 修改 `apps/user-app/src/storage/index.ts` — 使用 `ApiStorageAdapter`
- [x] 6.10 移除 BroadcastChannel 监听代码（publishedStore.ts 中的 `bootstrapBroadcastListener`）
- [x] 6.11 验证：User App 从 API 加载已发布工作流，执行流程正常
- [x] 6.12 创建 `server/src/scripts/migrate.ts` — 迁移脚本入口
- [x] 6.13 实现 `loadFromLocalStorage()` — 从 localStorage 读取所有工作流
- [x] 6.14 实现 `migrateWorkflow()` — 调用 API 创建工作流
- [x] 6.15 实现跳过逻辑：已存在的 workflow 跳过并记录
- [x] 6.16 实现错误处理：单个失败不中断，记录并继续
- [x] 6.17 添加进度输出和最终统计
- [x] 6.18 验证：运行迁移脚本，确认历史数据成功迁移到 API

## Part 7: 文档与测试

- [x] 7.1 创建 `server/README.md` — 服务端使用文档（启动、迁移、API 文档）
- [x] 7.2 创建 `server/.env.example` — 环境变量示例（`DATABASE_URL`, `PORT`, `CORS_ORIGIN`）
- [x] 7.3 在项目根 `package.json` 添加脚本：`"server:dev": "cd server && tsx src/index.ts"`, `"server:migrate": "cd server && tsx src/scripts/migrate.ts"`
- [x] 7.4 验证：`pnpm server:dev` 正常启动，无 TypeScript 错误
- [x] 7.5 Dev Tool 创建新工作流 → 保存 → 刷新页面 → 数据正确加载
- [x] 7.6 Dev Tool 发布工作流 → User App 加载 → 执行 → 结果正确
- [x] 7.7 多 Tab 同时编辑 → 数据不冲突（最后一个保存覆盖）
- [x] 7.8 API 不可用时（离线）→ localStorage fallback → 正常工作
- [ ] 7.9 迁移脚本 → localStorage 数据 → API → 数据完整性验证
