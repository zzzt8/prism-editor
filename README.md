# Prism Editor

一个可视化低代码图像处理工作流编辑器。在浏览器中构建工作流，实时测试，并发布给终端用户。

---

## 特性亮点

- **前端优先执行**：工作流完全在浏览器端运行，无需后端计算；支持 Web Worker 池和 lane 调度
- **可视化编辑器**：基于 React Flow 的节点画布，ComfyUI 风格（嵌入式端口、彩色连接线、节点状态指示）
- **图像处理引擎**：纯 Canvas API 实现，支持 alpha mask、亮度 mask、合成等操作；图像节点产出 ImageRuntimeObject (IRO)
- **开发者工具**：注册登录、JWT 认证、节点市场、版本历史、模板中心、节点片段、发布态参数模型
- **终端用户运行时**：浏览已发布工作流、配置参数、批量上传、ZIP 打包下载、离线缓存
- **后端 API**：Fastify + Prisma + SQLite，工作流 CRUD、版本管理、发布、节点包市场和渲染端点
- **自定义节点**：支持导入和运行自定义节点包（`@prism/core` 全局注册表）
- **OpenSpec 变更管理**：结构化的变更提案、设计、任务追踪系统
- **ECC Bridge**：在 OpenSpec apply / verify 阶段按 `task_type` 自动路由到专业 SOP lane
- **平台基础能力**：ExecutionLog 生命周期、AuthRole/AuthPermission 权限模型、RuntimeProtocol 抽象

---

## 项目架构

```
┌─────────────────────────────────────────────────────────────┐
│                     prism-editor                            │
│                     (pnpm monorepo + Turborepo)             │
├─────────────────────────────────────────────────────────────┤
│  apps/                                                      │
│  ├── dev-tool/           开发者工具 — 构建和发布工作流       │
│  │                       (React Flow 画布、Inspector、       │
│  │                        模板中心、版本历史、发布对话框)     │
│  └── user-app/           终端用户应用 — 运行已发布的工作流   │
│                          (输入配置、批量上传、ZIP 下载)       │
├─────────────────────────────────────────────────────────────┤
│  server/                                                    │
│  ├── Fastify API — 认证、工作流 CRUD、版本、发布、节点包     │
│  ├── 渲染端点 — 单图 / 批量 ZIP 渲染 (sharp)                │
│  ├── Prisma ORM — SQLite 数据库                             │
│  └── JWT 认证 + 速率限制                                    │
├─────────────────────────────────────────────────────────────┤
│  packages/                                                  │
│  ├── core/               自定义节点内联执行器 + 全局注册表   │
│  ├── image-ops/          图像处理操作（Canvas API / Workers）│
│  ├── node-definitions/   节点元数据：输入、参数、UI 配置     │
│  ├── shared-types/       跨包共享 TypeScript 类型 + Zod 验证 │
│  ├── shared-ui/          设计系统、图标库、共享 UI 组件      │
│  └── workflow-core/      执行器、拓扑排序、LRU、PublishedWF  │
├─────────────────────────────────────────────────────────────┤
│  openspec/             变更提案、设计文档、任务追踪          │
│  .cursor/               Cursor AI Agent Skill + ECC Bridge   │
│  docs/                  文档 + 变更日志（changelogs/）       │
└─────────────────────────────────────────────────────────────┘
```

### 数据流

```
开发者 (dev-tool)
  1. 登录/注册 → JWT 认证 (auth API)
  2. 创建工作流 → IndexedDB 缓存 + server-first 同步
  3. 拖拽节点 → React Flow 画布 → 端口连接（按 PortDataType 校验）
  4. 配置参数 → Inspector (参数 / 预览 / 调试 / 设置 / 信息 五 Tab)
  5. 实时执行 → WorkflowExecutor + Worker lane
  6. 发布对话框 v2 → 选择 inputs / exposedParams / outputs
                       → 写入 PublishedWorkflow（含 PublishedParamDefinition）
                       → API 服务器 (Fastify + Prisma/SQLite)
  ↓
终端用户 (user-app)
  7. 浏览已发布工作流 → 离线 IndexedDB 缓存
  8. 填写输入（支持单图 / 批量）
  9. 调整 PublishedParamDefinition 渲染的控件
  10. 运行 → PublishedWorkflowExecutor (浏览器端) → IRO 输出
  11. 下载原图 / 多尺寸 / 批量 ZIP 打包
```

---

## 节点类型

| 节点 | 分类 | 描述 |
|------|------|------|
| **LoadImage** | 输入 | 从 URL / 文件上传 / Blob 加载图像 |
| **LoadMask** | 输入 | 加载蒙版图像（alpha / brightness / luminance） |
| **Transform** | 处理 | 裁剪、缩放、旋转、平移 |
| **ApplyMask** | 处理 | 应用 alpha / brightness / luminance 蒙版 |
| **Composite** | 处理 | 合成多张图像（动态端口叠加 `overlayN`） |
| **Export** | 输出 | 导出为 PNG / JPEG / WebP，可选尺寸调整 |
| **EmptyInput** | 输入 | 仅作为参数入口，不参与图像流 |

端口类型：`image | mask | number | string | boolean | file`，按 `PORT_COMPATIBILITY` 严格校验连接。

---

## 核心功能

### 开发者工具 (`apps/dev-tool`)

- **认证系统**：注册 / 登录，JWT token 管理（自动同步到 ApiStorageAdapter）
- **节点画布（ComfyUI 风格）**：基于 React Flow
  - 从节点面板拖拽或双击画布搜索节点
  - 嵌入式端口行（paired / unpaired inputs / outputs）
  - 端口类型着色、彩色贝塞尔连接线（按 source 数据类型）
  - 节点状态：idle / pending / running / done / error
  - 拖拽图像到 LoadImage / LoadMask 节点直接替换
  - 实时执行中节点显示半透明遮罩、done 节点绿边框、running 节点脉冲动画
- **Inspector 5 Tab**：参数 / 预览 / 调试 / 设置 / 信息
  - 预览：自动刷新 + 手动刷新 + 全屏查看
  - 调试：执行耗时、输入/输出 JSON 快照、错误信息
  - 信息：节点 ID、类型、分类、端口连接状态
- **工作流管理**：仪表盘、搜索、排序、视图切换、重命名、删除、复制
- **版本历史**：变更追踪与回滚（基于 server 生成的版本号）
- **模板中心（TemplateCenter）**：浏览、搜索、分类、版本化模板
- **发布对话框 v2**：手动选择 inputs、显式白名单 exposedParams、自动检测 outputs；支持参数可见性（visible / hidden / locked）
- **节点片段（snippets，已弱化保留 stub）**：选中节点保存为片段、画布右键插入
- **节点包管理器**：从 JSON 导入自定义节点包（通过 `globalRegistry` 注入）
- **节点市场**：浏览和安装共享节点包
- **存储层**：ApiStorageAdapter（主存）+ IndexedDBStorageAdapter（autosave 缓存）+ JsonFileAdapter（导入/导出）

### 终端用户应用 (`apps/user-app`)

- **工作流浏览器**：列表、搜索、排序、本地重命名、删除
- **运行时执行器**：`PublishedWorkflowExecutor` 完全在客户端运行（支持 worker lane）
- **输入配置**：URL 输入 + 拖拽上传 + 单图/批量模式
  - 图像：拖拽 / 粘贴 / 文件选择 / URL
  - 蒙版：同图像字段，单独类型
  - 文本：URL / 任意字符串
- **参数控件渲染器**：根据 `PublishedParamDefinition.controlType` 渲染
  - `number` → 滑块（带 min/max/validation）
  - `select` → 下拉框
  - `string` → 文本输入
  - `boolean` → 开关
  - `image-file` → URL 输入
- **执行结果展示**：原图预览（lightbox）、多尺寸下载（512/1024/2048）、批量 ZIP 打包
- **取消执行**：运行中可取消，状态机：idle → running → cancelling → cancelled
- **执行日志导出**：导出 ExecutionLog 用于排障
- **离线支持**：IndexedDB 缓存已发布工作流，无网也能浏览
- **存储层**：ApiStorageAdapter + IndexedDBStorageAdapter

### 后端服务 (`server/`)

- **认证 API**：注册、登录、登出、token 刷新、当前用户信息（含速率限制）
- **工作流 API**：CRUD、元数据更新、JSON 导入/导出
- **版本 API**：列表、创建、详情（服务端生成版本号）
- **发布 API**：列表、发布（v2 参数模型）、取消发布
- **节点包 API**：发布、获取、列表
- **渲染端点**：
  - `POST /api/render/workflow`：单工作流执行（multipart 上传图像）
  - `POST /api/render/batch`：批量执行 → ZIP 打包（archiver）
- **数据库**：Prisma + SQLite，模型：User / Workflow / SKU / PublishedWorkflow / ProductTemplate / NodePackage / RevokedToken

---

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动所有应用（dev-tool、user-app、server）
pnpm dev

# 仅启动 dev-tool
pnpm dev:dev-tool

# 仅启动 user-app
pnpm dev:user-app

# 仅启动后端 API 服务器
pnpm server:dev

# 从 localStorage 迁移数据到 API（一次性）
pnpm server:migrate

# 生产构建
pnpm build

# 运行所有测试
pnpm test

# 类型检查
pnpm typecheck

# 清理构建产物
pnpm clean
```

**环境要求：** Node.js >= 18, pnpm >= 8

---

## 应用详情

### dev-tool (`apps/dev-tool`)

开发者工作空间。基于 React Flow 构建节点画布，Zustand sliced store 管理状态。

- JWT 认证登录/注册
- 从节点面板拖拽到画布，或双击空白区域打开命令面板式节点搜索
- 连接端口连线（按 PortDataType 严格校验）
- 内联节点参数配置 + Inspector 5 Tab
- 点击 **Preview** 查看实时输出；运行中节点高亮，已完成节点绿边框
- **Publish Dialog v2**：手动选择 inputs、白名单 exposedParams、自动检测 outputs、配置参数可见性/控件类型
- **Version History**：追踪变更并回滚到之前版本
- **Template Center**：分类/标签/搜索 + 版本化模板
- **Node Package Manager**：从 JSON 导入自定义节点包
- **Marketplace**：浏览和安装共享节点包
- 存储：`ApiStorageAdapter`（主）+ `IndexedDBStorageAdapter`（autosave 缓存，仅崩溃恢复用）

### user-app (`apps/user-app`)

终端用户运行时。从 API 加载已发布工作流，通过 `PublishedWorkflowExecutor` 完全在客户端运行。

- 浏览已发布的工作流
- 填写输入（单图 / 批量、URL / 文件）
- 调整 PublishedParamDefinition 渲染的控件
- 运行工作流并查看结果（实时进度）
- 多尺寸下载（512/1024/2048）、单图原图下载、批量 ZIP 打包
- 离线：IndexedDB 缓存已浏览过的工作流

---

## 后端服务 (`server/`)

基于 Fastify + Prisma + SQLite 的后端 API，JWT 认证。

| 脚本 | 描述 |
|------|------|
| `pnpm server:dev` | 启动开发服务器，热重载（端口 3001） |
| `pnpm server:migrate` | 从 localStorage 迁移工作流到 API |

### API 端点

**健康检查**
- `GET /health`

**认证**
- `POST /api/auth/register` - 注册新用户
- `POST /api/auth/login` - 登录
- `POST /api/auth/logout` - 登出
- `POST /api/auth/refresh` - 刷新 token
- `GET /api/auth/me` - 获取当前用户

**工作流**
- `GET /api/workflows` - 列出用户工作流
- `POST /api/workflows` - 创建工作流
- `GET /api/workflows/:id` - 获取工作流
- `PUT /api/workflows/:id` - 更新工作流
- `DELETE /api/workflows/:id` - 删除工作流
- `PATCH /api/workflows/:id/meta` - 更新元数据
- `POST /api/workflows/import` - 导入 JSON
- `GET /api/workflows/:id/export` - 导出 JSON

**版本**
- `GET /api/workflows/:id/versions` - 列出版本
- `POST /api/workflows/:id/versions` - 创建版本
- `GET /api/workflows/:id/versions/:vid` - 获取版本

**已发布**
- `GET /api/published` - 列出已发布工作流
- `POST /api/published` - 发布工作流
- `GET /api/published/:id` - 获取已发布工作流
- `DELETE /api/published/:id` - 取消发布

**节点包**
- `GET /api/nodes` - 列出节点包
- `POST /api/nodes` - 发布节点包
- `GET /api/nodes/:name` - 获取节点包

**渲染**
- `POST /api/render/workflow` - 单工作流执行（multipart/form-data）
- `POST /api/render/batch` - 批量执行 → ZIP 压缩包

详细 API 文档见 `server/README.md`。

---

## 核心概念

### ImageRuntimeObject (IRO)

节点间传递的统一图像数据结构：

```typescript
interface ImageRuntimeObject {
  data: ImageData | Blob;
  width: number;
  height: number;
  previewUrl: string;
  format: string;
  metadata?: Record<string, unknown>;
}
```

### ExecutionContext

每个执行器接收 `ExecutionContext`：

- `requireInput(name, expectedType?)` — 读取上游输出；缺失则抛错
- `setOutput(name, value)` — 存储执行结果
- `getParameter<T>(name)` — 读取节点配置参数
- `signal` — `AbortSignal` 取消信号

### 发布模型（v2）

`buildPublishedConfig` 将 React Flow 画布（节点 ID、边）映射为可移植的 `PublishedWorkflow`：

- `config.nodeTypes[nodeId]` — UUID 锚点 → 节点类型
- `config.nodeConfigs[nodeId]` — 参数值；用户输入节点的 `dataUrl` 大字符串被剥离
- `config.inputs: PublishedInputConfig[]` — 开发者手动选择的源节点（image / mask / string）
- `config.exposedParams: PublishedParamConfig[]` — 白名单参数
- `config.outputs: PublishedOutputConfig[]` — 自动检测的叶子节点（export/composite）
- `config.paramDefinitions?: PublishedParamDefinition[]` — 富参数定义（controlType / options / validation / visibility）
- `config.requiredNodes` — 自定义节点包依赖清单
- `connections` — 源 → 目标连线，使用节点 ID

### PublishedParamDefinition

发布态参数模型，user-app 端按 `controlType` 渲染对应控件：

```typescript
interface PublishedParamDefinition {
  nodeId: string;
  paramId: string;
  label: string;
  controlType: 'select' | 'number' | 'string' | 'boolean' | 'image-file';
  options?: Array<{ label: string; value: unknown }>;
  defaultValue?: unknown;
  validation?: { required?: boolean; min?: number; max?: number; pattern?: string };
  visibility?: 'visible' | 'hidden' | 'locked';
  description?: string;
}
```

`controlType` 由 `NodeDefinition.paramSchema` 在发布时自动推断，作者无需手动指定。

### ExecutionLog

平台基础能力之一，定义在 `packages/shared-types/src/execution-log.ts`：

```typescript
interface ExecutionLog {
  runId: string;
  workflowId: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  status: 'started' | 'completed' | 'failed' | 'cancelled';
  startedAt: number;
  completedAt?: number;
  duration?: number;
  nodeTimings: NodeTiming[];
  errors: ExecutionError[];
}
```

`useCanvasStore.executeWorkflow` 在开始时创建记录，`progressCallback` 增量更新节点耗时，完成时计算 duration / errors / outputs。

### RuntimeProtocol

抽象运行时协议，支持未来嵌入 / 远程执行等不同 runtime 后端：

```typescript
interface RuntimeEndpoint { /* 端点描述 */ }
interface EmbedConfig { /* 嵌入参数 */ }
```

---

## 目录结构

```
prism-editor/
├── apps/
│   ├── dev-tool/          开发者工具（React Flow 节点画布 + ComfyUI 风格）
│   │   ├── src/
│   │   │   ├── components/        # canvas, header, Inspector, nodes, edges, ...
│   │   │   ├── layouts/           # DevToolLayout 三栏布局
│   │   │   ├── modules/
│   │   │   │   ├── editor/        # 画布 mappers / services / sliced stores
│   │   │   │   ├── persistence/
│   │   │   │   └── repositories/  # WorkflowRepository / TemplateVersionRepository
│   │   │   ├── pages/             # Dashboard / Editor / Login / Register / Settings / Marketplace
│   │   │   ├── store/             # authStore / appStore (重导出 canvasStore)
│   │   │   └── storage/           # Api / IndexedDB / JsonFile 适配器
│   │   └── package.json
│   └── user-app/          终端用户运行时
│       ├── src/
│       │   ├── components/        # InputSection / ParamsSection / RunSection / OutputSection / WorkflowHeader
│       │   ├── layouts/           # UserLayout 双栏布局
│       │   ├── modules/
│       │   │   ├── catalog/       # workflowCatalogStore
│       │   │   ├── node-runtime/  # Web Worker
│       │   │   ├── repositories/  # 数据仓库
│       │   │   ├── runner/        # runStore / runWorkflow
│       │   │   └── selection/     # 选择管理
│       │   ├── pages/             # WorkflowListPage / WorkflowRunPage
│       │   ├── storage/
│       │   └── utils/             # download (单图 / 多尺寸 / ZIP)
│       └── package.json
├── packages/
│   ├── core/              globalRegistry + parseInlineExecutor
│   ├── image-ops/         图像操作 + Web Worker pool + 内存管理
│   ├── node-definitions/  节点元数据 (inputs / outputs / params / ui)
│   ├── shared-types/      workflow / published / editor / runtime / execution-log / auth / port-data-types
│   ├── shared-ui/         设计系统 + 图标库 (Lucide React)
│   └── workflow-core/     WorkflowExecutor / topologicalSort / LRU / PublishedWorkflowExecutor
├── server/                Fastify API + Prisma + SQLite + 渲染端点
│   ├── src/
│   │   ├── routes/        # auth / workflows / published / render / node-package
│   │   ├── plugins/       # auth / cors
│   │   ├── services/      # auth / node-package
│   │   └── utils/         # jwt
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── package.json
├── openspec/              OpenSpec 变更管理
│   ├── changes/           变更提案、设计、任务
│   │   └── archive/       已归档变更 (c1-c6 资产/发布/编辑器/版本/平台/片段)
│   └── README.md
├── .cursor/               Cursor AI Agent Skills + Commands
│   ├── skills/            # openspec-* + ecc-* 闭环
│   ├── commands/          # /opsx-* / /ecc-* 入口
│   ├── rules/
│   └── hooks.json
└── docs/
    └── changelogs/        # 每次归档自动同步的 changelog
```

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | React 18, React Flow 12 (`@xyflow/react`), Zustand 4 |
| 样式 | CSS Modules, 设计令牌 (CSS 变量) |
| 构建 | Vite 5, Turborepo, TypeScript 5 |
| 后端 | Fastify 5, Prisma 6, JWT (`@fastify/jwt`) |
| 数据库 | SQLite (Prisma ORM) |
| 图像 | Canvas API, sharp (服务端), Comlink (Worker) |
| 测试 | Vitest, jsdom, fake-indexeddb, @testing-library/react |
| 运行时协议 | AbortController (取消), Web Worker lane |
| 类型 | Zod（运行时验证） |

---

## OpenSpec 与 ECC 协同

- **OpenSpec** 管理 change 生命周期（proposal / design / tasks / verify / archive）
- **ECC Bridge** 在 `apply` / `verify` 阶段按 `task_type` 自动路由到专业 lane：
  - `ecc-api-design` — API / schema / contract 任务
  - `ecc-tdd-workflow` — 测试优先 / feature 任务
  - `ecc-build-error-resolver` — build / typecheck / lint / CI 修复
- 在 `tasks.md` 中显式写 `opsx-meta.task_type` 可让 bridge 优先按显式标注路由，减少 fallback 推断

详见 [openspec/README.md](./openspec/README.md) 与 [.cursor/README.md](./.cursor/README.md)。

---

## 最近更新

查看 `git log` 获取完整历史；归档 changelog 见 `docs/changelogs/`。重要里程碑：

- **2026-06**：interface 契约修复，params 合并顺序统一，添加 `text` 类型支持
- **2026-05**：TypeScript 类型检查错误修复、代码库质量优化（canvasStore sliced 化、Snippet stub 化）
- **2026-04**：
  - **c1 资产模型**：Template 类型 + TemplateRepository，EditorDraft / PublishedConfig / Template 三态并行
  - **c2 发布协议**：PublishedParamDefinition 升级，支持 controlType / options / validation / visibility
  - **c3 编辑器体验**：Inspector 5 Tab（参数 / 预览 / 调试 / 设置 / 信息）+ 节点状态 UI
  - **c4 版本管理**：TemplateCenter UI、模板版本历史与回滚
  - **c5 平台基础**：ExecutionLog + AuthRole / AuthPermission + RuntimeProtocol
  - **c6 节点片段**：snippets IndexedDB 持久化（当前 stub 化保留接口）
- **更早**：
  - ComfyUI 风格节点画布（嵌入式端口、彩色连接线）
  - server-first 存储架构（API 主存 + IndexedDB autosave 缓存）
  - 节点包市场 + 自定义节点运行时注册
  - 工作流版本控制 + 模板中心
  - Fastify API + Prisma + SQLite 后端
  - 批量处理（user-app 多图顺序处理 + ZIP 打包）
  - 自定义节点支持（globalRegistry + parseInlineExecutor）

---

## 贡献

欢迎提交 Issue 和 Pull Request！请遵循 OpenSpec 流程：使用 `/opsx-explore` → `/opsx-propose` → `/opsx-apply`（或 `/opsx-ecc-apply`）→ `/opsx-verify` → `/opsx-archive`。

---

## 许可证

MIT License

Copyright (c) 2024-2026 Prism Editor
