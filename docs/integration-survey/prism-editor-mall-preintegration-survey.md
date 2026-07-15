# Prism Editor 接入 Mall 前置调查报告

> 调查对象：`c:\PM\Product\prism-editor`（不含 mall 侧代码）
> 调查原则：只读、不安装依赖、不迁移数据库、不实现接入；所有结论标注事实/推断/未知。
> 关键事实标签：`[已确认]`、`[根据代码推断]`、`[当前无法确认]`

---

## 1. 执行摘要

prism-editor 当前处于 **Phase 2 (ProductTemplate 多流化)** 阶段，整体形态已经显著偏离 `README.md` 描述的"三件套 (dev-tool / user-app / server)"模型：实际只有 `dev-tool` + `server` 在代码库中可见，`apps/user-app/` 目录不存在。Phase 2 决策（`openspec/specs/PHASE2_DECISIONS.md`）明确：**彻底删除 JWT/登录页，改为 mall trust 模式（X-PRISM-SECRET）**；**彻底删除 PublishedWorkflow 发布态，用 ProductTemplate 多 Flow 模型替代**。

这意味着早期 PRD 中"user-app 给终端用户跑已发布工作流"的形态在代码上并不存在——但同时沉淀出 `@prism/composer-sdk`（PS 风格画布）作为面向 mall 的最终接入界面，是 PRD §3 描述的主战场。当前可直接复用的入口只有一条：`POST /api/render/template`（mall backend 调用，返回 PNG/JPEG 二进制）。其余 mall 接入所需字段（externalUserId / productId / skuId / orderId / callbackUrl / returnUrl / 草稿生命周期 / Webhook 等）**当前全部不存在**。

最自然的接入方向（详见 §12）：**Composer SDK 嵌入 + mall backend 用 API 密钥调用生产渲染**。本期改造量：小-中；需要新增上传、绘制项目/订单/用户字段、并增加对 mall 域名的 CORS 与 X-Frame-Options/CSP 策略。

---

## 2. 项目架构

### 2.1 子项目

| 模块 | 路径 | 类型 |
|------|------|------|
| 根 | `c:\PM\Product\prism-editor\package.json` | pnpm + Turborepo monorepo |
| `apps/dev-tool` | `c:\PM\Product\prism-editor\apps\dev-tool` | 内部品类搭建工具 |
| `apps/user-app` | — | `[已确认] 当前代码库不存在`（README/deploy 文档仍提及，需注意文档漂移） |
| `server` | `c:\PM\Product\prism-editor\server` | Fastify + Prisma + SQLite API |
| `packages/core` | `c:\PM\Product\prism-editor\packages\core` | globalRegistry、节点注册 |
| `packages/image-ops` | `c:\PM\Product\prism-editor\packages\image-ops` | 浏览器 Canvas + sharp Node 端图像算子 |
| `packages/node-definitions` | `c:\PM\Product\prism-editor\packages\node-definitions` | 节点元数据 |
| `packages/shared-types` | `c:\PM\Product\prism-editor\packages\shared-types` | 跨包类型契约 |
| `packages/shared-ui` | `c:\PM\Product\prism-editor\packages\shared-ui` | 设计系统 |
| `packages/workflow-core` | `c:\PM\Product\prism-editor\packages\workflow-core` | WorkflowExecutor / nodejs 执行器 |
| `packages/composer-sdk` | `c:\PM\Product\prism-editor\packages\composer-sdk` | 面向 mall 的 PS 风格画布（接入面） |

### 2.2 技术栈与版本（`[已确认]`）

- 前端：`react@18`、`react-router-dom@6`、`@xyflow/react@12`、`zustand@4`、`vite@5`、`@prism/image-ops/browser`、`@prism/workflow-core` (executor 客户端版)（`apps/dev-tool/package.json`）。
- Node 端：`fastify@5`、`prisma@6`、`sqlite`、`sharp@0.34`、`zod`、`@fastify/multipart`、`@fastify/cors`、`@fastify/cookie`、`bcryptjs`、`archiver`、`@aws-sdk/client-s3`（OSS 开关未启用）（`server/package.json`）。
- SDK：`@prism/composer-sdk` peerDeps `react >= 17`（`packages/composer-sdk/package.json`）。

### 2.3 主要目录与核心模块

- 前端：`apps/dev-tool/src/{components,layouts,modules/editor,modules/repositories,pages,store,storage,utils}`。
- 编辑器核心：`apps/dev-tool/src/modules/editor/stores/useCanvasStore.ts`（graph + selection + inspector + draft + execution 五 slice 合并）；sliced 服务 `apps/dev-tool/src/modules/editor/services/{autosaveService,executionService,importExportService,livePreviewService}`。
- 画布 UI：`components/canvas/WorkflowCanvas.tsx`、`components/header/WorkflowHeader.tsx`、`components/ParamPanel.tsx`（Inspector 旧名）。
- 模板编辑：`components/ProductTemplateEditor/{index,FlowsTab,AddFlowModal,BindingsEditor}.tsx`，路由 `/templates/:id`。
- Server：`server/src/index.ts`（Fastify 入口）、`server/src/app.ts`、`server/src/routes/{templates,render,assets}.ts`、`server/src/services/product-template-service.ts`、`server/src/services/file-storage.ts`、`server/src/middleware/api-key.ts`。
- SDK：`packages/composer-sdk/src/{ComposerCanvas,ComposerParams,ComposerState,maskUtils,utils}*`、`packages/composer-sdk/src/types.ts`。

### 2.4 路由 / 页面入口

dev-tool 仅以下 React Router 路由（`apps/dev-tool/src/App.tsx`）：

| 路径 | 组件 | AuthGuard |
|------|------|----------|
| `/` | `HomePage`（ProductTemplate 列表） | `[已确认] 当前为 no-op passthrough`（`apps/dev-tool/src/components/AuthGuard.tsx`） |
| `/workflow/:workflowId` | `EditorPage`（画布 + Inspector） | no-op |
| `/templates/:id` | `ProductTemplateEditor` | no-op |
| `/settings` | `SettingsPage` | no-op |
| `*` | 重定向至 `/` | — |

dev-tool 在 Vite dev 中代理 `/api → 127.0.0.1:3001`（`apps/dev-tool/vite.config.ts`）。

### 2.5 API 层组织

- 前端 `StorageAdapter` 契约在 `@prism/shared-types`；实现 `ApiStorageAdapter`（X-PRISM-SECRET 鉴权）/ `IndexedDBStorageAdapter`（autosave）/ `JsonFileAdapter`（JSON 导入导出）（`apps/dev-tool/src/storage/{ApiStorageAdapter,IndexedDBStorageAdapter,JsonFileAdapter}.ts`）。
- 后端 routes：仅 templates（增删改查 + flows）/ render（`/render/template`）/ assets（仅 GET 已渲染文件）/ health（`server/src/routes/{templates,render,assets}.ts`）。**[已确认] 当前代码中不存在 README 描述的 `/api/auth`、`/api/workflows`、`/api/published`、`/api/nodes`、`/api/skus`、`/api/assets/upload`**——README 与部署说明存在显著漂移，详见 §11.1 与 §16。

### 2.6 状态管理

- Zustand sliced store（`useCanvasStore`，5 slice）；UI preferences 在 `useAppStore`（localStorage 持久化，key `prism.dev-tool.app-prefs.v1`，见 `apps/dev-tool/src/store/appStore.ts`）。
- 自动保存 5 分钟防抖（`apps/dev-tool/src/modules/editor/services/autosaveService.ts`，`AUTO_SAVE_DELAY_MS = 5 * 60 * 1000`）。

### 2.7 数据库 / ORM

- Prisma 6 + SQLite，迁移目录 `server/prisma/migrations/20260709030108_add_workflow_template_platform_index/`。Phase 2 当前 schema：3 表 `ProductTemplate`、`Workflow`、`Asset`（外键 `Workflow.templateId / Asset.templateId → ProductTemplate.id`，`@@index([templateId])` 与 `@@index([templateId, platform])`；`server/prisma/schema.prisma`）。**[已确认] 当前没有任何 User / Order / SKU / 外键指向 mall 的表**。

### 2.8 文件与素材存储

- 浏览器：`FileReader.readAsDataURL` 转为 `dataUrl`（`apps/dev-tool/src/hooks/useImageFilePreview.ts`，`ImageFileValue`）。
- 服务端：渲染产物落地 `server/assets/renders/{hash16}.{png|jpg}`，URL `/api/assets/renders/:filename`，Cache-Control `public, max-age=31536000`（`server/src/services/file-storage.ts`、`server/src/routes/assets.ts`）。
- 数据库对 Asset 的建模已存在（`Asset.templateId / name / url / type`），**但当前 server routes 没有任何 asset CRUD**（详见 §5）。

### 2.9 部署

- Ubuntu + 1Panel + OpenResty + cloudflared；dev-tool 端口 80，user-app 端口 8080（规划；当前代码无 user-app），prism-server 监听 `127.0.0.1:3001`（`docs/Prism Editor 部署与维护说明书.md`）。
- 没有 Dockerfile / docker-compose（`[已确认]`）。
- CI：仅 GitHub Actions `ci.yml`（typecheck + test + build，无镜像发布）。

### 2.10 已发布工作流 vs 本地开发

- "已发布"语义已被 Phase 2 取消：**没有 `/api/published` / PublishedWorkflow 表 / 用户发布态**（`openspec/specs/PHASE2_DECISIONS.md` Q1 决策）。
- 本地开发工作流：`POST /api/templates/:id/flows` 创建工作流，浏览器内 Canvas 即时预览；远端渲染走 `POST /api/render/template`。
- "发布"按钮在 dev-tool UI 上仅是新流程中的"Publish"占位（`apps/dev-tool/src/components/header/WorkflowHeader.tsx`：`onPublishClick = () => {}`）。

### 2.11 环境变量

| 变量 | 用途 | 默认 |
|------|------|------|
| `PRISM_API_SECRET` | 后端鉴权密钥（`api-key.ts`） | `dev-secret` |
| `DATABASE_URL` | DB 连接 | `file:./dev.db` |
| `PORT` | 服务端口 | `3001` |
| `CORS_ORIGINS` | 允许的跨域来源，逗号分隔 | `http://localhost:3000,http://localhost:3002` |
| `NODE_ENV` | `development` / `production` | `development` |
| `OSS_ENABLED` | 是否启用 R2/S3 节点包存储 | `false` |
| `OSS_ENDPOINT` / `OSS_BUCKET` / `AWS_REGION` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | 仅用于 OSS 关闭时的提示型配置 | — |
| `VITE_API_BASE_URL` | 前端 API 根（dev-tool） | `/api` |
| `VITE_PRISM_SECRET` | 前端携带的 shared secret | （dev-tool 启动会 warn） |

不读取真实值，仅列出变量名。

---

## 3. 编辑器启动入口

### 3.1 核心编辑器页面与入口组件

- 路由：`/workflow/:workflowId`（`apps/dev-tool/src/App.tsx`，`EditorPage`）。
- 主要组件：`DevToolLayout`（左 NodePanel + 右 Inspector + 中画布，`apps/dev-tool/src/layouts/DevToolLayout.tsx`）、`WorkflowCanvas`、`WorkflowHeader`、`ParamPanel`。

### 3.2 创建新项目入口

- HomePage 按钮 → `useTemplates.createTemplate` → `POST /api/templates`，跳转 `/templates/:id`（`apps/dev-tool/src/pages/HomePage.tsx`、`apps/dev-tool/src/hooks/useTemplates.ts`）。
- 旧路径：`/editor/new` + `NewWorkflowModal`（IndexedDB 写，未提交到 server，已经不大用）。`[根据代码推断] 已不在默认主流程上`。

### 3.3 打开已有项目入口

- HomePage 列表点击 → `/templates/:id`。
- 直接访问 `/workflow/:id`（`/workflow/:workflowId`）仍可用，但 server 实际记录的是 ProductTemplate，而不是 "workflow"。

### 3.4 URL 参数启动

- **[已确认] 当前不支持任何 query 参数**：`grep useSearchParams` 命中 0；编辑器入口只认路径参数。
- 没有 `?templateId=`、`?productId=`、`?userId=` 协议。

### 3.5 通过 ID 打开

- `/templates/:id`（ProductTemplate 维度）。
- `/workflow/:id`（Workflow 维度，但 server 端 `/api/workflows` 未实现）。

### 3.6 隐藏首页直达

- **[已确认] 没有"绕过 HomePage 直接进入编辑器"的开关**：Route 跳转逻辑写死 `navigate('/templates/' + id)`。

### 3.7 浏览器本地状态依赖

- **`/workflow/:id` 不依赖本地 IndexedDB**：进入即可显示（通过 `loadWorkflowFromStore` → `activeStorageAdapter.load` → `GET /api/templates/:id`）。
- **`/templates/:id`** 才是 server-first 主入口。

### 3.8 刷新恢复

- `/workflow/:id` 每次都从 server 拉取；`/templates/:id` 同理。`[已确认]` dev-tool 不依赖 IndexedDB 恢复。
- `IndexedDBStorageAdapter` 仅作为自动保存缓存（5 分钟防抖）。

### 3.9 外部嵌入

- **`ComposerCanvas`（@prism/composer-sdk）** 是项目明文支持的嵌入方式（`packages/composer-sdk/README.md`、`packages/composer-sdk/src/ComposerCanvas.tsx`）。
- `RuntimeProtocolType` 含 `'embed'`（`packages/shared-types/src/runtime-protocol.ts`）。
- dev-tool React 编辑器**不**支持嵌入、`/`、`/templates/:id` 不带 iframe 模式。

### 3.10 iframe / postMessage / SDK / 组件导出

- 仅 `ComposerCanvas / ComposerParams / LayerPanel`（`packages/composer-sdk/src`）。
- **[已确认] ComposerCanvas 没有任何 postMessage**；API 是 React props（`onChange`、`onSubmit`）回调（`packages/composer-sdk/src/types.ts`）。
- **[已确认] 当前 server 完全未配置 `X-Frame-Options` / `Content-Security-Policy: frame-ancestors`**（`server/src/index.ts`），iframe 嵌入是否能跑通完全取决于 Web 服务层（Cloudflare/1Panel 默认行为）。

### 3.11 路由守卫 / 登录检查

- `AuthGuard` 全部 no-op（`apps/dev-tool/src/components/AuthGuard.tsx`）。
- 唯一鉴权是 `apiKeyAuth` 中间件（`server/src/middleware/api-key.ts`）校验 `X-PRISM-SECRET`，**这是 server → mall 的 API 密钥，不是用户身份**。

### 3.12 mall 发起编辑最自然的入口

- **[根据代码推断]** mall 应当嵌入 `@prism/composer-sdk` 的 `<ComposerCanvas template={...} onSubmit={...} />`，让用户在 mall 前端以 PS 风格改图；完成后 mall 调 `POST /api/render/template`（以 API secret 走 server）拿生产图。

---

## 4. 项目与编辑状态模型

### 4.1 核心数据结构

- 服务端真实写入的是 **ProductTemplate**：
  - `ProductTemplate { id, name, description, version, content, createdAt, updatedAt, workflows[], assets[] }`（`server/prisma/schema.prisma`）。
  - 每个 ProductTemplate 下挂 N 条 `Workflow { id, templateId, name, platform: 'browser' | 'nodejs', content }`，其中 `platform='browser'` 是浏览器预览工作流，`platform='nodejs'` 是后端生产工作流。
  - canvas 草稿结构：`EditorDraft { nodes, edges, groups, workflowMeta, viewport }`（`packages/shared-types/src/editor-draft.ts`）。`workflowMeta = { id, name, version, targetPlatform, publishedId? }`。
  - 工作流对象：`Workflow { id, name, version, nodes, connections, inputs, outputs, metadata }`，节点：`WorkflowNode { id, type, position, params }`（`packages/shared-types/src/workflow.ts`）。

### 4.2 项目 ID 生成

- **Prisma 默认 `@default(cuid())`**（`server/prisma/schema.prisma`）。前端编辑器在用 `createId()`（`packages/shared-types/src/createId.ts`），写入 server 后会被 cuid 覆盖。

### 4.3 归属

- **[已确认] ProductTemplate 没有 userId / ownerId 字段**；server 没有 User 表（schema.prisma）。
- 任何持有 `X-PRISM-SECRET` 的客户端都能读写所有数据（信任全部 mall 内部）。

### 4.4 关系

`ProductTemplate (1) — (N) Workflow`，每条 Workflow 有 `platform` 标记；模板的 `content` 是字符串型 JSON：
- `ProductTemplate.content` 默认存 `{}` / `''`（`apps/dev-tool/src/hooks/useTemplates.ts` 创建时），实际使用时（例如 Composer SDK）解析为 `{ inputs, designParams, layers, bindings }`（`packages/composer-sdk/src/types.ts`、`ComposerCanvas.tsx`）。
- 画布节点 / 边 / 分组只存在于 `Workflow.content` JSON 中。

### 4.5 编辑状态保存在哪里

| 形式 | 来源 |
|------|------|
| React/Zustand | `useCanvasStore`（内存）+ `livePreviewService` 订阅（`apps/dev-tool/src/modules/editor/stores/useCanvasStore.ts`、`services/livePreviewService.ts`） |
| localStorage | 仅 `useAppStore` 的偏好设置（`apps/dev-tool/src/store/appStore.ts`，key `prism.dev-tool.app-prefs.v1`） |
| IndexedDB | autosave 缓存（`IndexedDBStorageAdapter`，DB 名见 `apps/dev-tool/src/storage/indexedDbConstants.ts`，`getStoredIds` 索引 + `STORE_WORKFLOWS / STORE_META / STORE_INDEX / STORE_VERSIONS` 四个 store） |
| 本地文件 | JSON 导入 / 导出（`JsonFileAdapter`） |
| 后端数据库 | Prisma `ProductTemplate` + `Workflow`（核心事实来源） |
| 远程 API | `/api/templates/*`（主存），dev-tool 上线运行时真正依赖它 |

### 4.6 自动保存 / 手动保存 / 草稿恢复

- 自动保存：`autosaveService` 5 分钟防抖，调 `IndexedDBStorageAdapter.save`（`autosaveService.ts`）；注释说明 "Phase 2: save is a no-op via API (IndexedDB handles autosave)"（`ApiStorageAdapter.save`）。`[根据代码推断] 自动保存目前并不真正上传 server，仅本地缓存。`
- 手动保存：保存按钮 → `useCanvasStore.saveWorkflow()` → `workflowRepository.save(workflow)` → 走 `activeStorageAdapter.save`，主存 API（`saveWorkflow` 在 `useCanvasStore.ts`）。
- 草稿恢复：无显式"重打开上次未关闭浏览器"的恢复路径，因为状态在 server。

### 4.7 版本 / 回滚

- `IndexedDBStorageAdapter` 提供 `getVersions`、`rollbackWorkflow`、`diffVersions`，最大保留 `MAX_VERSION_RECORDS` 条版本（`apps/dev-tool/src/storage/IndexedDBStorageAdapter.ts`）。
- **`[已确认]` server 端没有对应 API**（routes 没 `versions`），版本回滚只在 dev-tool 内部浏览期生效。

### 4.8 复制 / 跨设备

- 复制：homepage 创建新模板即可复制；没有专门的 duplicate API。
- 跨设备：server-first，全部走 API，理论上可跨设备。但 "当前用户身份缺失" → 实际是"任何持有密钥者都看得见全部"，无法限定到具体用户。

### 4.9 删除时素材与导出处理

- `DELETE /api/templates/:id` 在 service 层直接删 `ProductTemplate`（`product-template-service.ts`）。SQLite 默认 `ON DELETE RESTRICT`（迁移 SQL），但 Prisma 没有显式 cascade 字段的设置；当前 service 实现没有先删 Workflow 的步骤，`[根据代码推断]` 在生产库删除会触发外键约束失败。
- 渲染产物落地于 `server/assets/renders/` 文件系统，**删除模板不会连带清理**文件；`Asset` 表存在但读路径缺失。

### 4.10 外部业务 ID / metadata 扩展字段

- **[已确认] 完全没有**：`ProductTemplate.description` 是描述，`content` 是任意 JSON 字符串。
- `[根据代码推断]` 现阶段只能利用 `ProductTemplate.content` 这个灵活 JSON（即 `ProductTemplateContent { inputs, designParams, layers, bindings }`）作为接入 mall 的承载容器。

---

## 5. 模板与商品生产规格

### 5.1 数据结构

- `template.content`（string） → JSON.stringify 的 `{ inputs?: ProductTemplateInput[], designParams?: ProductTemplateDesignParam[], layers?: LayerState[] }`（`packages/composer-sdk/src/types.ts`）。
- `template.workflows[]` 的 `content`（string）→ 节点 / 边 / inputs / outputs JSON，由 dev-tool 节点编辑器产生。
- 节点层 `WorkflowNode { id, type, position, params }`，内置节点类型：`load-image / load-mask / apply-mask / composite / transform / export / empty-input`（`packages/node-definitions/src/definitions.ts`）。

### 5.2 模板是数据还是代码

- **数据库记录 + JSON content 字符串**：在 SQLite；在路由层 CRUD 简单。

### 5.3 创建 / 发布 / 加载

- 当前阶段没有"发布"语义。`create / update / delete / list / get` 模板；`addFlow / updateFlow / deleteFlow` 工作流；`selectProductionFlow(templateId)` 挑出 `platform === 'nodejs'` 的工作流。
- 渲染加载：`/api/render/template` 通过 `templateId` 取模板 → 通过 `selectProductionFlow` 拿 nodejs Flow → 用 `WorkflowExecutorNodeJs` 执行 → 返回二进制。

### 5.4 模板中是否包含

| 项 | 是否包含 | 证据 |
|----|---------|------|
| 画布尺寸 | 部分（仅 width/height 像素） | `ExportOptions` (`packages/shared-types/src/image.ts`)、`EmptyInput params` 默认 512 |
| 印刷区域 | **当前不存在**（PRD 把它列为目标，本期无 schema） | — |
| 出血线 / 安全区 | **不存在** | — |
| 裁切线 | **不存在** | — |
| 遮罩 | **存在**（仅 `alpha / brightness / luminance`） | `applyMaskDefinition.maskType`，`MaskType` (`shared-types/src/image.ts`) |
| 商品底图 | 经 `Asset`（含 URL）间接存在，但 routes 缺 CRUD | `Asset.url` in `prisma/schema.prisma` |
| 透视变形 | **不存在** | — |
| 实物 mockup | **不存在**专用模型 | 仅 `Composite` 节点可遮挡底图，缺乏对齐/透视 |
| 合成规则 | BlendMode 12 种 | `shared-types/src/image.ts` |
| 导出尺寸 | ExportOptions.width/height | 同上 |
| 文件格式 | png/jpeg/webp | `ExportOptions.format`，server 仅暴露 png/jpeg |

### 5.5 同一商品不同 SKU 使用不同模板

- 没有 SKU 表；同一 ProductTemplate 在 `content.layers` 里配置多个图层（卡片正反面、SKU 分类等）。
- **`[根据代码推断]` 当前不直接支持 SKU → template 的一对一映射**。

### 5.6 外部通过 templateId 指定模板

- **`[已确认] 支持`**：路径参数 `/templates/:id`、API `templateId`、`/api/render/template?templateId=...`、`renderTemplate({ templateId })`（`ApiStorageAdapter.renderTemplate`）。

### 5.7 模板更新对已有项目影响

- Prism server 没有"项目"概念；重渲染调用如果改 Flow.content，会按当前最新内容执行（不存在"Pinned 版本"）。
- `[根据代码推断]` 没有"草稿绑定 template 版本号"，更新模板会影响所有下游 mall 调用方。

### 5.8 模板版本

- `ProductTemplate.version`（默认 `1.0.0`，`schema.prisma`），仅作为字段保存，没有可见的版本递增逻辑。

### 5.9 模板是否适合绑定 productId / skuId

- `ProductTemplate.content` 是任意 JSON：可以内嵌 `productId / skuId` 作为 metadata（写入 `bindings`/自定义字段）；但 SQL 上没有这部分关系。
- **[已确认]** schema 不存在 `productId / skuId` 列，需新增。

### 5.10 是否已具备谷子商品生产模板

- 节点能力很通用（叠图、mask、变换、空画布），可以搭 mockup，但：
  - 缺打印尺寸、出血、安全区。
  - 缺 SKU 绑定。
  - 缺 PDF / SVG / PSD 输出。
  - 单一 hot-path 只有 png/jpeg。
- **`[已确认] 当前不具备工业"生产图"语义**；"所谓生产图"目前只是后端 sharp 的高清 PNG/JPEG 导出。

---

## 6. 图片上传与素材系统

### 6.1 入口

- `LoadImage` 节点的 `params.imageFile` 字段（UI 拖拽 / `<input type="file" accept="image/*">`）。
- `ImageFileField` 走 `useImageFilePreview + processImageFile` → `FileReader.readAsDataURL` 拿到 `ImageFileValue { dataUrl, width, height, fileName }`（`useImageFilePreview.ts`）。

### 6.2 上传接口 / 鉴权

- dev-tool 端**不上传到 server**：仅存内存 dataUrl + autosave 到 IndexedDB。
- server 侧 **`@fastify/multipart` 已注册**（50MB/file, 100 files，bodyLimit 10MB），但**没有 POST /api/assets/upload 路由**（`server/src/index.ts`、`server/src/routes/assets.ts`）。
- **当前不存在任何公开上传接口** → mall 无法通过 API 推送素材；只能让用户在前端 FileReader 上传 → 落到 canvas，提交时 mall 调 `render` 拿图。

### 6.3 支持格式 / 尺寸 / 体积

- 客户端：浏览器 `<input type="file" accept="image/*">`，理论任意浏览器可解码（PNG / JPEG / WebP / GIF / BMP）。
- browser `exportImage` 仅 `png/jpeg/webp`；server 仅 `png/jpeg` 渲染。
- 客户端没有 size limit；server 接受 multipart 单文件 50MB。

### 6.4 上传后保存位置 / 返回标识

- 客户端：渲染时跟随 `Workflow.content`（JSON 字符串）保存到 server。
- server：无可用上传接口；没有返回 `assetId` / `fileId` 路径。

### 6.5 保留原始图 / 中间文件

- 原始图作为 `dataUrl` 保存在 `Workflow.content` 中。
- 中间产物：`useImageFilePreview.thumb` 临时 `dataUrl`；`ImageMemoryManager.createObjectURL` 给节点预览；这些**均不落盘 server**。

### 6.6 透明 PNG / CMYK / PSD / SVG / PDF / TIFF

- 浏览器：`apply-mask` 支持 alpha / brightness / luminance；输入天然支持 PNG alpha；CMYK 不在客户端处理范围；没有 PSD / PDF / SVG / TIFF 解析器。
- server：用 sharp，可接受这些格式锐解析（jpeg/png/webp/gif/svg/pdf/raw/heic/tiff 等），但 codebase **没有任何显式 TIFF/CMYK 处理路径**。

### 6.7 EXIF / 色彩空间 / DPI / 方向

- 浏览器层 `processImageFile` 不处理 EXIF 方向、不处理色彩空间、不写 DPI metadata。
- `[根据代码推断] 服务器渲染时不保证色彩管理，CMYK 工件可能偏色（gamut 不一致）`。

### 6.8 大图 / 高分辨率

- 浏览器用 `OffscreenCanvas` worker pool；最大 `BaseSize 2 / MaxSize 4`、并发默认 4，默认超时 30s（`packages/image-ops/src/scheduler/{workerPool,taskQueue}.ts`）。
- server 渲染 30s 强制 timeout（`server/src/routes/render.ts`）。

### 6.9 压缩损失风险

- 浏览器导出 PNG 默认 `quality 0.92`，JPEG/WebP 用 `toBlob(..., quality)`。
- server 渲染产物 PNG / JPEG (sharp `quality: 90` 在 file-storage 中)。
- `[根据代码推断] 当前不是无损管线，可能影响生产精度。`

### 6.10 素材与项目绑定 / 删除清理

- 资产绑定逻辑没有；`Asset` 表存在但 routes 缺失。
- 删除模板不会连带清文件。

### 6.11 外部访问安全

- `/api/assets/renders/:filename` Cache-Control `public, max-age=31536000`，**没有鉴权**。
- `[根据代码推断]` 这是 mall 可直接抓回的 CDN-like URL，但也意味着任何拿到 URL 的人都能访问。

### 6.12 预签名 URL / 私有下载

- **不存在**；`OSS_ENABLED` 是给节点包用的（`server/.env.example`），不是资产；`AWS_ACCESS_KEY_ID` 也只与 node-package 路径相关。

---

## 7. 编辑与图像处理能力

### 7.1 编辑能力

- 浏览器内置节点：`load-image / load-mask / apply-mask / composite / transform / export / empty-input`（`packages/node-definitions/src/definitions.ts`）。
- SDK 内置：`<ComposerCanvas />` 的图层变换（`x / y / scale / rotation / opacity / blendMode`）。

### 7.2 在浏览器 / 后端 / AI 模型

- 浏览器：Canvas + Web Worker 池；`composite` 可并行（`composite.ts` 的 `parallelComposite`）。
- 后端：sharp + `WorkflowExecutorNodeJs`，用于 `nodejs` Flow 的 `/api/render/template`。
- AI：**无**（grep `openai / claude / anthropic / gemini / model` 在代码层命中 0；仅 PRD 文档历史）。

### 7.3 异步任务

- 浏览器：`TaskQueue` + `WorkerPool`；`ExecutionContext.registerAsyncTask / isTaskPending`；任务类型 `SYNC / ASYNC / POLL`（`packages/shared-types/src/execution.ts`）。
- 后端：单次 HTTP + AbortController 30s 超时，**无任务队列**。

### 7.4 进度反馈

- 浏览器：`ExecutionProgress { totalNodes, completedNodes, currentNodeId, results[] }`，100ms 节流刷入 store（`useCanvasStore.executeWorkflow.progressCallback`）。
- 后端：**无进度回传**；SDK 阻塞等待返回。

### 7.5 失败重试 / 取消

- 浏览器：`AbortController`、取消 `cancelExecution()`；UI 显示 `error / cancelled`。
- 后端：客户端断开 → abort 触发；204 / 499 / 500 处理。

### 7.6 页面关闭后续

- 前端 bundle 销毁 → 任务结束；server 端正在跑的渲染会在 abort 后退出。

### 7.7 处理参数持久化

- 节点 `params` 全部随 `Workflow.content` 序列化保存。
- `EditorDraft` 序列化结构不含运行时 `executionResult`（由 shared-types 注释 `EditorDraft` 不含 runtime 状态），但 `Workflow` 序列化含 `params` 完整字段。

### 7.8 完全可重复

- 节点级 `CompositeExecutor` 使用确定性的 `compositeImages`（premultiplied alpha 处理）→ 浏览器与 Node sharp executor 应当像素一致。
- `[根据代码推断] 若不引入随机 AI 模型、且 nodejs Flow 的 `sharp` 版本稳定，渲染结果理论可完全再现`。
- 但 server 没有 seed cache 机制，每次重渲染即重新全图计算。

### 7.9 随机性 / 模型版本 / 参数丢失

- `EmptyInput.backgroundColor` 默认 `#ffffff`；`load-image` 的 `params.url/blob/dataUrl/imageFile` 任一即可，结果确定。
- 无 AI 模型，因此无随机性。

---

## 8. 效果图与生产图导出能力

| 能力 | 触发入口 | 生成模块 | 输入 | 格式 / 像素 / 物理 | 透明 | 出血 | 保存位置 | 返回数据结构 | fileId 稳定? | URL 过期? | 证据 |
|------|----------|----------|------|--------------------|-------|-------|----------|---------------|---------------|-----------|------|
| **商城预览图** | dev-tool 节点编辑器中 `Export` 节点 / ComposerSDK onSubmit | `exportExecutor` (browser) 或 server `/api/render/template` | ImageData | png/jpeg/webp，原始 ImageData 宽高，可强制 width/height | 是（PNG） | 否 | 浏览器：本地 dataURL/server: `assets/renders/` | `ExportResult { blob, dataUrl, width, height, mimeType }` + `Content-Disposition: inline; filename="${tid}-${ts}.${ext}"` | name 是 sha256(workflowName+ts+random)[:16]，不稳定 | 1 年 cache-control | `export-image.ts`、`render.ts`、`file-storage.ts` |
| **实物效果图/mockup** | 节点 `Composite` + 模板素材底图 | `compositeExecutor` | base ImageData + overlay ImageData | 任意 ImageData | 是 | 否 | 同上 | `CompositeExecutorOutput { image }` + `previewUrl` | 否（只是 preview） | 同上 | `composite.ts`、`apply-mask.ts` |
| **工厂生产图** | `POST /api/render/template` 调 `WorkflowExecutorNodeJs` | `executor-nodejs.ts` + `nodeExecutors` | template + userParams + inputs | png/jpeg，30s timeout | 是（png） | 否 | `assets/renders/{hash16}.png` | 二进制 image/png | `name` 哈希 | 1 年 cache | `render.ts` |
| **透明背景图** | Export 节点 format=png | `exportImage` PNG | ImageData | 与原图一致 | 是（PNG alpha） | 否 | 本地 blob | `ExportExecutorOutput.dataUrl` | 否 | N/A | `export-image.ts` |
| **原始分辨率图** | 节点 Export，width=0/height=0 | 同上 | 同上 | 原 ImageData 宽高 | 是 | 否 | 同上 | 同上 | 否 | N/A | 同上 |
| **带出血/裁切线** | **不支持** | — | — | — | — | — | — | — | — | — | 当前节点/组合无出血语义 |
| **PDF** | **不支持** | — | — | — | — | — | — | — | — | — | — |
| **SVG** | **不支持** | — | — | — | — | — | — | — | — | — | — |
| **PSD / 分层文件** | **不支持** | — | — | — | — | — | — | — | — | — | — |
| **项目配置 JSON** | 浏览器 FileReader / Network `importExportService.exportAsJson` | `JsonFileAdapter.exportToFile` | Workflow | JSON 文件 | N/A | N/A | 本地下载 / server `Workflow.content` | `Workflow { id, name, version, nodes, connections, inputs, outputs, metadata }` | N/A | N/A | `JsonFileAdapter.ts`、`importExportService.ts` |

**判断：所谓"生产图"，目前只是 `sharp` 高分辨率 PNG/JPEG 渲染产物，不含出血 / 裁切 / 安全区 / CMYK / 多分层文件。**要达到工厂交付要求，需要补充：规格 metadata（DPI / 物理尺寸 / 出血 / 安全区）、矢量输出（PDF / SVG）、以及锁定版本。

---

## 9. 保存、发布与外部接口

### 9.1 项目保存 / 读取 / 更新 / 删除

- `POST /api/templates`：创建（`server/src/routes/templates.ts`）。
- `GET /api/templates`：列表。
- `GET /api/templates/:id`：详情。
- `PUT /api/templates/:id`：更新（name / description / content）。
- `DELETE /api/templates/:id`：删除。

### 9.2 Flow 的 CRUD

- `GET/POST /api/templates/:id/flows`，`PUT/DELETE /api/templates/:id/flows/:flowId`。

### 9.3 `PublishedWorkflow` / 发布

- 已删除（Phase 2 决策 Q1）。`PublishedWorkflowExecutor` 仍被旧 openspec 引用，但代码层不再存在相关 API。
- dev-tool 中 "Publish" 按钮是 `onPublishClick = () => {}` 空实现（`WorkflowHeader.tsx`）。

### 9.4 是否支持外部创建 / 更新 / 查询 / 读取导出结果

- **可以**：所有 `/api/templates*` 接口均对 mall backend 开放（共享 `X-PRISM-SECRET`）。
- mall 可创建 ProductTemplate → 打开 dev-tool 让设计搭工作流 → 提交到 mall。但 server 没有提供"列出某个 mall user 的草稿"接口（参见 §10）。

### 9.5 渲染读取

- 通过 `POST /api/render/template` → `Content-Disposition: inline`，或上传到 mall 后用 `/api/assets/renders/:filename` 抓回（`Content-Type` 含 png/jpeg）。

### 9.6 回调 / 重定向 / webhook

- **`[已确认] 完全不存在`**：没有 webhook / callback / SSE / WebSocket；dev-tool 没有通知 mall 的手段。
- mall 只能 **轮询**或**长轮询式等待**渲染完成（当前 API 是同步阻塞）。

### 9.7 是否区分"草稿 / 已提交"语义

- `ProductTemplate` 没有状态字段。`Workflow` 也没有状态字段。
- `[根据代码推断]` 当前不能锁定提交后的版本：用户编辑模板内容会影响该 ProductTemplate 下所有 Flow 的下次渲染。

### 9.8 /api/skus/:id/render 等参考

- **[已确认]** dev-tool 前端 `RenderProductionModal` 调用 `/api/skus/:skuId/render`（`apps/dev-tool/src/components/header/RenderProductionModal.tsx`），但 server 实际**未实现**该路由（grep `skus` 在 server 命中 0）。**这是个已废弃/未完成前向引用**。

### 9.9 接口 × 鉴权矩阵

| 方法 | 路径 | 鉴权 | 状态码 |
|------|------|-----|--------|
| POST | /api/templates | X-PRISM-SECRET | 201 |
| GET | /api/templates | X-PRISM-SECRET | 200 |
| GET | /api/templates/:id | X-PRISM-SECRET | 200 / 404 |
| PUT | /api/templates/:id | X-PRISM-SECRET | 200 / 404 |
| DELETE | /api/templates/:id | X-PRISM-SECRET | 204 / 404 |
| GET | /api/templates/:id/flows | 同上 | 200 / 404 |
| POST | /api/templates/:id/flows | 同上 | 201 |
| PUT | /api/templates/:id/flows/:flowId | 同上 | 200 / 404 |
| DELETE | /api/templates/:id/flows/:flowId | 同上 | 204 / 404 |
| POST | /api/render/template | 同上 | 200/422/504/500 |
| GET | /api/assets/renders/:filename | **无鉴权** | 200/404 |
| GET | /api/health | **公开** | 200 |
| POST | /api/render/workflow | — | 410 Gone |
| POST | /api/render/batch | — | 410 Gone |

---

## 10. 用户、鉴权与安全

### 10.1 是否有用户系统

- **没有**。`prisma/schema.prisma` 无 User 表；`api-key.ts` 鉴权仅校验共享 secret。
- Phase 0 决策 "删除 JWT / User / RevokedToken"（`openspec/specs/PHASE2_DECISIONS.md` Q-相关条目，`server/README.md` 仍写有 `/api/auth/register` 等接口是历史/规划漂移）。

### 10.2 userId 从哪里来

- 任何客户端都不知道"用户是谁"，只能凭借 X-PRISM-SECRET。
- `[当前无法确认]` mall 接入时是否需要 mall 内部 userId 通过 custom header 透传——目前 server 不读取。

### 10.3 项目权限

- 无；所有 mall 内部调用方等同。

### 10.4 角色 / 多租户

- 无；不存在 admin/editor/user 区分。

### 10.5 外部用户访问隔离

- 不可：缺少 userId 与 ownership 列。

### 10.6 URL 越权风险

- 严重：知道 ProductTemplate.id 即可读写。
- `[根据代码推断]` mall 调用需要把所有 ID 当"服务端内部资源 ID"处理，不要外露给最终用户侧。

### 10.7 文件 URL 公开

- `GET /api/assets/renders/:filename` **无鉴权**（1 年 cache-control）。
- `[根据代码推断]` mall 可直接拼合 `BASE_URL/api/assets/renders/<filename>`；若担心泄漏，可改为短时签名。

### 10.8 临时 token / 短期凭证

- 没有；只共享 secret。

### 10.9 服务端签名 URL

- 没有。

### 10.10 身份接入最接近的方式

- mall 后端持有 `X-PRISM-SECRET`，调用 Prism APIs；mall 前端通过 mall backend 拉数据，**不发 secret**给浏览器。
- mall 用户在 mall 前端嵌入 Composer SDK 时，template 由 mall backend 代理取回，**前端不直连 prism**。

### 10.11 iframe 限制

- `[已确认]` server 未配置 `X-Frame-Options` / CSP `frame-ancestors` / `helmet`。
- `[当前无法确认]` 当前 OpenResty/Cloudflare/1Panel 配置是否带默认 Deny。当前边缘配置在部署文档以外未在仓库内可见。
- `[根据代码推断]` 嵌入初期必须先在网关层放开 `frame-ancestors` 白名单，或部署并自实现 frame-ancestors header。

---

## 11. 现有字段对应表

| 业务字段 | 实际状态 | 备注 |
|----------|----------|------|
| userId | 不存在 | schema 无此列；`useAuthStore` 已删除（Phase 2 Q2） |
| externalUserId | 不存在 | 推荐由 mall 写入 `ProductTemplate.content.metadata.externalUserId` 或新建 `User`-like 表 |
| productId | 不存在 | 可塞 `ProductTemplate.content.bindings.productId` |
| skuId | 不存在 | 同上 |
| templateId | 已存在 | `ProductTemplate.id` 与 `templateId` 字段在 `render` API 与 SDK props 中已存在 |
| editorProjectId | **不存在** | **当前模型就是 ProductTemplate，没有"用户编辑项目"概念**。需要新增 `EditorProject` 表关联 userId + templateId + 设计态 |
| designId | 不存在 | 可用 `Workflow.id` 作为草稿 ID；缺与 mall 业务关联 |
| designVersion | 不存在 | `ProductTemplate.version` 与 `Workflow.content` 内的 `version` 字段存在，但都不是设计版本号 |
| designStatus | 不存在 | 缺状态机（draft / submitted / locked / produced） |
| sourceAsset | 不存在 | 客户端 dataUrl 残留于 content 中，未独立 |
| sourceFileId | 不存在 | server 没有 file upload 接口 |
| previewImage | 部分 | `ExecutionResult.previewUrl` 是 blob:URL；server 渲染后 `/api/assets/renders/<filename>` |
| mockupImage | 不存在 | 没有"实物效果图"独立模型 |
| productionFile | **部分** | `POST /api/render/template` 返回的 PNG/JPEG 落盘 `assets/renders/`，有 `/api/assets/renders/:filename` URL |
| productionFileId | **不存在稳定 id** | 文件名是 sha256(workflowName+ts+random)[:16]，**1 年保留，URL 公开**；没有持久 fileId 数据库记录 |
| designMetadata | 临时塞入 `ProductTemplate.content` | JSON 字符串字段灵活，无类型约束 |
| cartItemId | 不存在 | 整个购物车概念在此项目不可见 |
| orderId | 不存在 | — |
| orderItemId | 不存在 | — |
| callbackUrl | 不存在 | server 没有任何 webhook / 通知能力 |
| returnUrl | 不存在 | 同上 |
| externalReferenceId | 不存在 | 推荐由 mall 写入 `ProductTemplate.content.metadata.externalRefId` |

---

## 12. 三种接入形态评估

### 12.1 方案 A：mall 跳转独立部署的 prism-editor，编辑后跳回 mall

- **入口**：以 `/templates/:id?mall_user_id=…` 形式打开 dev-tool。dev-tool 当前路由不解析 query，需要小改造以接收 mall 参数。
- **身份**：dev-tool 自身仍不带用户身份，编辑后通过跳转 URL 把结果状态带给 mall。
- **项目创建**：需要 mall backend 先 POST `/api/templates` 占位 + 写入 external metadata。
- **结果返回**：完成后 window.location=`returnUrl?designVersion=…&productionFileUrl=…`。
- **草稿再开**：通过同一 `templateId` 重复打开。
- **跨域**：dev-tool 部署到独立域名；只要 mall 后端持有 secret 即可，浏览器跨域调 mall 后端由 mall 网关处理。
- **改造量**：小-中。需新增：dev-tool query 解析、把 `ProductTemplate.content.metadata` 与 query 双向同步、跳转结果传参。
- **风险**：用户体验需要"离开 mall、跳出新窗口"。无法 PS 风格拖拽实时反馈（dev-tool 是节点编辑器，不是 PS 风格画布）。

### 12.2 方案 B：mall 用 iframe / 子应用嵌入 prism-editor

- **入口**：`<iframe src="{PRISM_BASE}/templates/{templateId}?mall_user_id=…&design_id=…">` 或基于 Vue/React 子应用包装；或在 mall 前端引入 `@prism/composer-sdk` 的 ComposerCanvas（更轻量）。
- **风险**：
  - dev-tool editor 没有 iframe-mode（无 `X-Frame-Options` 配置，需要网关层放开 CSP `frame-ancestors`）。
  - dev-tool 路由没有 query 参数解析。
  - 文件上传 / Canvas 受同源策略限制（`loadImageExecutor` 校验 `Access-Control-Allow-Origin: *`，外部域素材需要 CORS 头）。
- **改造量**：中。需：新增 `frame-ancestors` 配置、dev-tool 接收 query、把 secret 替换为一次性 JWT 或 session。
- **风险**：`Composer SDK` 已经是设计为嵌入 mall 的最成熟路径，建议直接用 SDK 而非嵌入 dev-tool。

### 12.3 方案 C：将编辑器封装成组件 / 包并入 mall（推荐）

- **现状已经具备**：`@prism/composer-sdk`（`packages/composer-sdk`）。
- **mall 改造**：在 mall 商品定制页面引入 SDK，`<ComposerCanvas template={...} onSubmit={...} />`。
- **身份**：mall 调用 `/api/templates/:id` 拿模板；template JSON 内嵌入 `bindings.productId / skuId / userId`；前端用 mall 用户态 ID 写入。
- **项目创建**：shop 详情页加载模板（mall backend 调 `/api/templates/:id`），决定 SDK 何时挂载。
- **结果返回**：用户点 onSubmit → mall 收集 `{ layers[], designParams, inputs }` → mall backend 调 `/api/render/template` 拿二进制 → 落 mall 库（图片落在 mall 后或重新上传到 mall OSS）。
- **草稿再开**：localStorage / mall 后端 / ProductTemplate.content 三者协同——推荐方案：每次 onChange 仍只画，本地草稿存 localStorage，提交时一次性 POST。
- **跨域**：SDK 不需要 secret；如果调 mall 自己后端再调 prism，则与跨域无关；如果前端直连 prism，需要 mall 后端代发或下发 session token。
- **改造量**：小（mall 工程在新增一个 React 组件并对接 3 个 API）。
- **风险**：当前 SDK 是"PS 风格画布"，但 `setLayers` 等只接受 `imageUrl`，不持 mime 类型校验，需要 mall 提供稳定图床；`template.content` 没有 `sku/product` 显式字段，需要约定额外 metadata JSON。

### 12.4 对比

| 维度 | A 跳转 | B iframe | C 组件 |
|------|--------|---------|--------|
| 改造量 | 小-中 | 中 | 小 |
| 用户体验割裂感 | 强 | 中 | 无 |
| 与 mall 视觉一致性 | 差 | 中 | 高 |
| 跨域问题 | 少 | 多 | 无 |
| 安全隔离 | 中 | 差 | 高 |

**最自然的方向**：**方案 C + 必要时的方案 A**（先以 SDK 嵌入为主，对运营/管理员保留 dev-tool 跳转体验）。

---

## 13. 业务数据流推演

按 mall → Prism 流程逐环节梳理当前能力（`[已确认]`/`[缺失]`）：

### 13.1 mall 传入 userId / productId / skuId / templateId

- mall backend `GET /api/templates/:id` 已存在。**缺失**：userId/productId/skuId 不在 schema；需要新增 `metadata Json` 字段或新表 `EditorProject` 来承载 mall 业务 ID 关联。
- **[缺失]** 锁定模板到 mall 用户的关系表。

### 13.2 创建编辑项目

- 当前：mall backend `POST /api/templates` 创建空白 ProductTemplate；或直接给定现成 templateId。
- **[缺失]** creatorId / externalUserId / status / mall 业务 ID 关系表。

### 13.3 上传原图

- mall 用户在 SDK 拖图片：浏览器 FileReader → `dataUrl` 进入 `LoadImage.params.imageFile`。
- **[缺失]** mall backend 想要保存"用户原图到 OSS"：**当前不存在上传 API**，需新增 `POST /api/assets/upload` 或 mall OSS 自管。

### 13.4 保存草稿

- 浏览器侧：5 分钟 IndexedDB autosave（`autosaveService`），主写不会进 server。
- **[缺失]** 实际兜底：用户需要 mall 前端自己存草稿（localStorage / mall backend）。

### 13.5 生成效果图

- 浏览器：`Composite` + `transform` + `apply-mask` 组合，实时合成预览。worker pool + progress callback。
- 浏览器 `ExecutionProgress` 有完整进度；后端渲染 30s 超时无进度。

### 13.6 生成生产图

- mall backend 调 `POST /api/render/template { templateId, userParams, inputs, format }`，返回 png/jpeg 二进制。
- **[缺失]** `userParams` 与 mall `inputs` 的精确对应 schema，没有"绑定到某个草稿"的 trace ID。
- **[缺失]** 返回 fileId 不存在稳定 DB 行，仅靠文件名 + URL 抓取。

### 13.7 用户确认设计

- SDK `onSubmit` 触发 `ComposerSubmitParams { templateId, inputs, layers, designParams }`。
- mall 前端把这段加上 mall 业务 ID，调 `/api/render/template` 与下单接口。

### 13.8 将结果返回 mall

- 当前：文件落到 prism 服务磁盘（`assets/renders/`），URL 1 年有效。mall 必须自行同步保存到自己的资产库。
- **[缺失]** callback / webhook；同步需要靠 mall 主动调 `GET /api/assets/renders/:filename`。

### 13.9 用户以后继续编辑

- 再打开同一 `templateId`，system 取最新 template + 最新 Flow.content。
- **[缺失]** 无法锁定"上次确认版本"；需要新增 `designStatus` 状态机。

### 13.10 后续订单关联

- **[缺失]** 没有 orderId / orderItemId 概念。

### 13.11 最大风险

1. **无用户体系**：mall 业务 ID 无法透传到 Prism，所有用户的数据混在一起（严重）。
2. **无发布态**：无法锁定"已确认设计"，模板改版会影响历史订单（严重）。
3. **无 webhook/callback**：mall 无法及时获知设计完成通知（中等）。
4. **生产图缺规格 metadata**：不含 DPI / 物理尺寸 / 出血，工厂直接用可能有误差（中等）。
5. **无上传 API**：用户原图必须经浏览器中转，无法 mall 统一图床（中等）。

---

## 14. 文档与代码不一致之处

| 文档位置 | 描述 | 实际代码状态 |
|----------|------|------------|
| `README.md` | 三件套：dev-tool / user-app / server | `apps/user-app/` **不存在**（`[已确认]`） |
| `README.md` | `/api/auth/*` 接口 | **不存在**（Phase 2 删除 JWT，`server/src/middleware/api-key.ts` 仅 `X-PRISM-SECRET` 校验） |
| `README.md` | `/api/published` 发布态 | **不存在**（Phase 2 决策 Q1 取消） |
| `server/README.md` | `POST /api/assets/upload`、`GET /api/assets/:id` | **不存在**（`server/src/routes/assets.ts` 仅 GET renders） |
| `server/README.md` | `/api/render/workflow`（multipart 上传） | **返回 410 Gone**（`server/src/routes/render.ts`） |
| `docs/Prism Editor 部署与维护说明书.md` | user-app 部署在 8080 | **当前代码无 user-app** |
| `docs/prd/Prism Composer Platform 产品基线 PRD v1.0.md` | 完整 Phase 3/4/5 路线图 | 仅 Phase 2 交付状态 |
| `apps/dev-tool/src/components/header/RenderProductionModal.tsx` | 调用 `/api/skus/:skuId/render` | **server 未实现**（已废弃前向引用） |
| `packages/composer-sdk/README.md` | 完整 SDK 使用文档 | README 基本内容正确；组件 props 与 types.ts 一致 |

**结论：README / 文档严重漂移，必须以代码为事实来源。**

---

## 15. 本次改造缺口清单（按优先级）

### P0 — 必须先修，否则无法接入

| 缺口 | 影响 | 改造建议 |
|------|------|----------|
| 无 userId / ownership 列 | mall 用户之间无数据隔离，越权风险极高 | 新增 `EditorProject` 表（userId + templateId + designId + status + externalRefId） |
| 无上传 API | mall 无法统一管理用户原图 | 新增 `POST /api/assets/upload` + `Asset` CRUD routes |
| `/api/assets/renders/:filename` 无鉴权 | 生产图对外暴露 | 网关层鉴权或加 short-lived token |
| server 无 CORS 白名单 mall 域名 | SDK 嵌入跨域被拒 | 在 `CORS_ORIGINS` 添加 mall 域名 |
| dev-tool 不接收 mall 参数 | 无法从 mall 跳转打开编辑态 | 新增 `useSearchParams` 解析 + 写入 metadata |

### P1 — 核心闭环所需

| 缺口 | 建议 |
|------|------|
| 无 webhook / callback | 新增 `POST /api/designs/:id/notify`（mall 提供回调 URL） |
| 无 designStatus 状态机 | 新增 `status: 'draft' | 'confirmed' | 'locked'` 列 |
| 无 template 版本锁定 | 新增 `DesignSnapshot` 表，提交时拍快照 |
| 生产图缺 DPI / 物理尺寸 | 新增 `ProductionSpec` 表（templateId + width + height + dpi + bleed） |

### P2 — 生产质量提升

| 缺口 | 建议 |
|------|------|
| 缺 PDF / SVG / PSD 导出 | 新增 `exportDefinition` 对应 executor |
| 缺 CMYK 色彩管理 | server 层 sharp 加载 ICC profile |
| 无 CDN / 预签名 URL | 接入 OSS/CDN + `getSignedUrl` |
| 跨设备草稿同步 | 借 mall backend 作为草稿存储 proxy |
| 生产图 fileId DB 记录 | `ProductionFile` 表（workflowId + filename + url + sha256 + createdAt） |

---

## 16. 总结与建议

### 核心结论

1. **Phase 2 已完成**：认证简化为 mall trust API secret，发布态已取消，当前核心是 ProductTemplate + 双平台 Flow + Composer SDK。
2. **接入面是 Composer SDK，不是 dev-tool**：PRD §3 描述的"用户侧 PS 风格画布"已实现为 `@prism/composer-sdk`；dev-tool 仅为"品类搭建设器"，不应直接暴露给 mall 终端用户。
3. **API 层面只有一个生产渲染端点**：`POST /api/render/template` 是 mall backend 唯一需要调用的渲染接口。
4. **所有 mall 业务字段当前不存在**：需要新增 `EditorProject` / `DesignSnapshot` / `ProductionSpec` 表 + metadata JSON 约定。
5. **文档漂移严重**：README、PRD、部署文档与实际代码存在显著差异，必须以代码为基准。

### 最快接入路径

1. mall 后端：`POST /api/templates` 创建/管理模板；`GET /api/templates/:id` 取模板 JSON；`POST /api/render/template` 拿生产图；mall OSS 保存图。
2. mall 前端：引入 `@prism/composer-sdk`；`<ComposerCanvas template={mallTemplate} onSubmit={handleSubmit} />`；提交时 mall 后端立即渲染。
3. 临时草稿：利用 localStorage + `template.content.metadata`（无需 server 改）。
4. 生产图 URL：mall 后端主动抓 `/api/assets/renders/:filename` 到自己 OSS，1 年内有效。

### 建议下一阶段

- **Phase 2.5**：先补 P0（用户隔离、上传 API、CORS、CSP）打通端到端 demo。
- **Phase 3**：补 P1（webhook、设计态、快照）完整业务闭环。
- **Phase 4**：补 P2（矢量输出、色彩管理、CDN）提升工厂交付质量。

---

*报告生成：2026-07-14 | 调查深度：全量源码 + Prisma schema + API routes + SDK types + 部署文档 | 不含实际运行验证*
