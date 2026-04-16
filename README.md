# Prism Editor

一个可视化低代码图像处理工作流编辑器。在浏览器中构建工作流，实时测试，并发布给终端用户。

---

## 特性亮点

- **前端优先执行**：工作流完全在浏览器端运行，无需后端计算
- **可视化编辑器**：基于 React Flow 的节点画布，拖拽连线
- **图像处理引擎**：纯 Canvas API 实现，支持 alpha mask、亮度 mask、合成等操作
- **开发者工具**：注册登录、JWT 认证、节点市场、版本历史
- **终端用户运行时**：浏览已发布工作流、配置参数、导出结果
- **后端 API**：Fastify + Prisma + SQLite，工作流 CRUD 和发布
- **自定义节点**：支持导入和运行自定义节点包
- **OpenSpec 变更管理**：结构化的变更提案、设计、任务追踪系统

---

## 项目架构

```
┌─────────────────────────────────────────────────────────────┐
│                     prism-editor                            │
│                     (pnpm monorepo)                         │
├─────────────────────────────────────────────────────────────┤
│  apps/                                                      │
│  ├── dev-tool/           开发者工具 — 构建和发布工作流       │
│  │                       (登录注册、节点画布、工作流仪表盘)  │
│  └── user-app/           终端用户应用 — 运行已发布的工作流   │
├─────────────────────────────────────────────────────────────┤
│  server/                                                   │
│  ├── Fastify API — 工作流 CRUD + 发布 + 认证               │
│  ├── Prisma ORM — SQLite 数据库                            │
│  └── JWT 认证系统                                          │
├─────────────────────────────────────────────────────────────┤
│  packages/                                                  │
│  ├── core/               自定义节点内联执行器               │
│  ├── image-ops/          图像处理操作（Canvas API）        │
│  ├── node-definitions/   节点元数据：输入、参数、UI 配置   │
│  ├── shared-types/       工作流、已发布工作流、类型定义    │
│  ├── shared-ui/          设计系统和共享 UI 组件            │
│  └── workflow-core/      执行器、拓扑排序、LRU 缓存        │
├─────────────────────────────────────────────────────────────┤
│  openspec/             变更提案、设计文档、任务追踪        │
├─────────────────────────────────────────────────────────────┤
│  .cursor/               Cursor AI Agent Skill 系统          │
└─────────────────────────────────────────────────────────────┘
```

### 数据流

```
开发者 (dev-tool)
  1. 登录/注册 → JWT 认证
  2. 创建工作流 → 拖拽节点 → 画布
  3. 连接节点端口
  4. 配置参数
  5. 实时预览输出
  6. 发布 → API 服务器 (Fastify + Prisma/SQLite)
         ↓
终端用户 (user-app)
  7. 浏览已发布的工作流
  8. 填写输入 / 调整参数
  9. 运行 → PublishedWorkflowExecutor → HTML img
```

---

## 节点类型

| 节点 | 分类 | 描述 |
|------|------|------|
| **LoadImage** | 输入 | 从 URL / 文件上传 / Blob 加载图像 |
| **LoadMask** | 输入 | 加载蒙版图像（alpha / brightness / luminance） |
| **Transform** | 处理 | 裁剪、缩放、旋转、平移 |
| **ApplyMask** | 处理 | 应用 alpha / brightness / luminance 蒙版 |
| **Composite** | 处理 | 合成两张图像 — 支持多层叠加、混合模式 + 透明度 |
| **Export** | 输出 | 导出为 PNG / JPEG / WebP，可选调整尺寸 |

---

## 核心功能

### 开发者工具 (`apps/dev-tool`)

- **认证系统**：登录/注册，JWT token 管理
- **节点画布**：基于 React Flow 的可视化编辑器
  - 从节点面板拖拽节点
  - 连接端口连线
  - 内联参数配置
  - 任意节点实时预览
- **工作流管理**：创建、编辑、复制、删除
- **版本历史**：追踪和回滚工作流版本
- **发布对话框**：配置用户输入和导出设置
- **节点包管理器**：导入自定义节点包
- **节点市场**：浏览和安装共享节点包

### 终端用户应用 (`apps/user-app`)

- **工作流浏览器**：浏览和搜索已发布的工作流
- **运行时执行器**：完全在客户端运行
- **输入配置**：填写 URL，调整参数
- **导出选项**：下载 PNG / JPEG / WebP 格式结果

### 后端服务 (`server/`)

- **认证 API**：注册、登录、登出、token 刷新
- **工作流 API**：CRUD 操作、版本管理、发布
- **已发布 API**：列出和获取已发布的工作流
- **节点包 API**：发布和浏览自定义节点包

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

开发者工作空间。基于 React Flow 构建节点画布，Zustand 管理状态。

- JWT 认证登录/注册
- 从节点面板拖拽到画布
- 连接端口连线
- 内联节点参数配置
- 点击 **Preview** 查看实时输出
- **Publish** 对话框：手动选择用户输入节点、配置参数可见性、导出工作流
- **Version History**：追踪变更并回滚到之前版本
- **Node Package Manager**：从 JSON 导入自定义节点包
- **Marketplace**：浏览和安装共享节点包

### user-app (`apps/user-app`)

终端用户运行时。从 API 服务器加载已发布工作流，通过 `PublishedWorkflowExecutor` 完全在客户端运行。

- 浏览已发布的工作流
- 填写输入和调整参数
- 运行工作流并查看结果
- 导出结果图像

---

## 后端服务 (`server/`)

基于 Fastify + Prisma + SQLite 的后端 API，JWT 认证。

| 脚本 | 描述 |
|------|------|
| `pnpm server:dev` | 启动开发服务器，热重载（端口 3001） |
| `pnpm server:migrate` | 从 localStorage 迁移工作流到 API |

### API 端点

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

**版本**
- `GET /api/workflows/:id/versions` - 列出版本
- `POST /api/workflows/:id/versions` - 创建版本
- `GET /api/workflows/:id/versions/:vid` - 获取版本

**已发布**
- `GET /api/published` - 列出已发布的工作流
- `GET /api/published/:id` - 获取已发布工作流

**节点包**
- `GET /api/nodes` - 列出节点包
- `POST /api/nodes` - 发布节点包
- `GET /api/nodes/:name` - 获取节点包

详细 API 文档见 `server/README.md`。

---

## 核心概念

### ImageRuntimeObject (IRO)

节点间传递的统一图像数据结构：

```typescript
{ data: ImageData | Blob; width: number; height: number; previewUrl: string; ... }
```

### 执行上下文

每个执行器接收 `ExecutionContext`：

- `requireInput(name, nodeType)` — 读取上游输出；缺失则抛错
- `setOutput(name, value)` — 存储执行结果
- `signal` — `AbortSignal` 取消信号

### 发布模型

`buildPublishedConfig` 将 React Flow 画布（节点 ID、边）映射为可移植的 `PublishedWorkflow` 配置：

- `nodeConfigs[nodeId]` — 参数值；用户输入节点的大 `dataUrl` 字符串被剥离
- `config.inputs` — 手动选择暴露给终端用户的节点
- `config.outputs` — 自动检测的叶子节点（export/composite），格式为 `{nodeId}:image`
- `connections` — 源 → 目标连线，使用节点 ID

---

## 目录结构

```
prism-editor/
├── apps/
│   ├── dev-tool/          开发者工具（React Flow 节点画布）
│   └── user-app/          终端用户运行时
├── packages/
│   ├── core/              自定义节点内联执行器
│   ├── image-ops/         图像处理操作（Canvas API）
│   ├── node-definitions/  节点类型定义
│   ├── shared-types/      共享 TypeScript 类型
│   ├── shared-ui/         设计系统和共享组件
│   └── workflow-core/     工作流执行引擎
├── server/                Fastify API + Prisma + SQLite
├── openspec/              OpenSpec 变更管理
│   └── changes/           变更提案、设计、任务
│       └── archive/       已归档变更
├── .cursor/               Cursor AI Agent Skill 系统
│   ├── commands/         命令入口
│   └── skills/           Skill 定义
└── docs/                  文档
```

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | React 18, React Flow, Zustand |
| 样式 | Tailwind CSS, CSS Modules |
| 构建 | Vite, Turborepo |
| 后端 | Fastify, Prisma ORM |
| 数据库 | SQLite |
| 认证 | JWT |
| 测试 | Vitest, canvas (Node.js polyfill) |
| 语言 | TypeScript 5 |

---

## 最近更新

查看 `git log` 获取完整历史。主要更新：

- **IndexedDB 存储**：替换 localStorage，支持更大存储容量
- **自定义节点支持**：导入和运行自定义节点包
- **用户认证系统**：JWT 认证，注册/登录/登出流程
- **节点包市场**：共享和浏览自定义节点包
- **工作流版本控制**：版本历史追踪和回滚
- **后端存储迁移**：Fastify API 服务器，Prisma ORM + SQLite
- **代码库清理**：移除废弃功能，统一共享组件，优化存储层

---

## 许可证

MIT License

Copyright (c) 2024 Prism Editor
