# Prism Server

后端 API 服务，基于 Fastify + Prisma + SQLite，提供工作流的 CRUD / 版本管理 / 发布 / 节点包市场和渲染端点。配套 JWT 认证 + 速率限制。

## 目录结构

```
server/
├── src/
│   ├── index.ts              # Fastify 应用入口（注册路由 / 插件 / 启动）
│   ├── routes/
│   │   ├── auth.ts           # 认证路由 (register / login / logout / refresh / me)
│   │   ├── workflows.ts      # 工作流 CRUD + 版本 + 导入/导出
│   │   ├── published.ts      # 发布管理 (v2 参数模型)
│   │   ├── render.ts         # 工作流渲染端点 (单图 / 批量 ZIP)
│   │   ├── node-package.ts   # 节点包路由
│   │   └── health.ts         # 健康检查
│   ├── plugins/
│   │   ├── auth.ts           # JWT 认证插件（Fastify 装饰器）
│   │   └── cors.ts           # CORS 配置插件
│   ├── services/
│   │   ├── auth.ts           # 认证服务逻辑
│   │   └── node-package.ts   # 节点包服务
│   └── utils/
│       └── jwt.ts            # JWT 工具函数
├── prisma/
│   ├── schema.prisma         # Prisma Schema (User / Workflow / SKU / PublishedWorkflow / ProductTemplate / NodePackage / RevokedToken)
│   ├── migrations/           # 数据库迁移文件
│   └── seed.ts               # 种子数据
├── .env.example              # 环境变量示例
└── package.json
```

## 快速开始

### 1. 安装依赖

```bash
cd server
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置以下变量：

| 变量 | 描述 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | SQLite 数据库连接字符串 | `file:./prisma/dev.db` |
| `PORT` | 服务端口 | `3001` |
| `CORS_ORIGIN` | 允许的 CORS 源 | `http://localhost:5173` |
| `JWT_SECRET` | JWT 签名密钥 | (必填，部署时务必设置) |
| `JWT_REFRESH_SECRET` | Refresh token 签名密钥 | (必填) |
| `NODE_ENV` | 运行环境 | `development` |

### 3. 数据库迁移

```bash
# 生成 Prisma Client（如需更新类型）
pnpm db:generate

# 运行数据库迁移（首次或 schema 变更时）
pnpm db:migrate

# 生产环境迁移
pnpm prisma migrate deploy
```

### 4. 启动开发服务器

```bash
pnpm dev
```

服务器将在 `http://localhost:3001` 启动。

## 数据模型 (Prisma)

```prisma
// 核心模型
model User { id, email, password, name, role, createdAt, workflows, published, tokens }
model Workflow { id, userId, name, version, content (JSON), createdAt, updatedAt }
model PublishedWorkflow { id, sourceId, name, version, inputs, outputs, config (JSON), requiredNodes }
model NodePackage { id, name, version, content (JSON), publishedAt, publisherId }
model ProductTemplate { id, name, content, version, createdAt }
model SKU { id, productId, attributes }
model RevokedToken { id, token, revokedAt }
```

## API 端点

### 健康检查

```
GET /health
```

### 认证

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/auth/register` | 注册新用户（速率限制） |
| POST | `/api/auth/login` | 用户登录（速率限制） |
| POST | `/api/auth/logout` | 用户登出（撤销 token） |
| POST | `/api/auth/refresh` | 刷新 Token |
| GET | `/api/auth/me` | 获取当前用户信息 |

### 工作流 CRUD

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/workflows` | 列表（支持分页和搜索） |
| POST | `/api/workflows` | 创建工作流 |
| GET | `/api/workflows/:id` | 获取工作流详情 |
| PUT | `/api/workflows/:id` | 更新工作流 |
| DELETE | `/api/workflows/:id` | 删除工作流 |
| PATCH | `/api/workflows/:id/meta` | 更新元数据（名称 / 描述 / 标签） |
| POST | `/api/workflows/import` | 导入 JSON |
| GET | `/api/workflows/:id/export` | 导出 JSON |

### 版本管理

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/workflows/:id/versions` | 列出版本 |
| POST | `/api/workflows/:id/versions` | 创建版本（服务端生成版本号） |
| GET | `/api/workflows/:id/versions/:vid` | 获取版本详情 |

### 发布管理（v2 参数模型）

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/published` | 已发布工作流列表 |
| POST | `/api/published` | 发布工作流（含 `PublishedParamDefinition` 富参数定义） |
| GET | `/api/published/:id` | 已发布详情 |
| PATCH | `/api/published/:id/meta` | 更新已发布元数据 |
| DELETE | `/api/published/:id` | 取消发布 |

### 节点包

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/nodes` | 节点包列表（市场浏览） |
| POST | `/api/nodes` | 发布节点包 |
| GET | `/api/nodes/:name` | 获取节点包详情 |

### 工作流渲染

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/render/workflow` | 执行工作流，返回结果 JSON |
| POST | `/api/render/batch` | 批量执行工作流，返回 ZIP |

#### POST /api/render/workflow

执行单个工作流。

**请求**: `multipart/form-data`
- `workflow` (string, required): 工作流 JSON 字符串
- `images` (file[], optional): 上传的图像文件

**响应**:
```json
{
  "status": "done",
  "results": { ... }
}
```

服务端使用 `sharp` 处理图像，并复用 `@prism/workflow-core` 的 `WorkflowExecutor`。

#### POST /api/render/batch

批量执行工作流，返回 ZIP 压缩包。

**请求**: `multipart/form-data`
- `workflow` (string, required): 工作流 JSON 字符串
- `images` (file[], required): 图像文件（最多 100 张）
- `limit` (string, optional): 批量大小限制（默认 10，最大 100）

**响应**: `application/zip`

使用 `archiver` 流式打包为 ZIP。

## 迁移脚本

### 从 localStorage 迁移数据

```bash
# 1. 导出 localStorage 数据
#    在浏览器控制台运行：
JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([k]) => k.startsWith("prism:"))))

# 2. 保存为 JSON 文件后运行迁移
pnpm migrate:local ./path/to/export.json
```

迁移脚本会读取导出 JSON、转换字段格式（如 `publishedId` / `version`）、调用 server API 批量 upsert。

## 环境变量

| 变量 | 描述 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | SQLite 数据库连接字符串 | `file:./prisma/dev.db` |
| `PORT` | 服务端口 | `3001` |
| `CORS_ORIGIN` | 允许的 CORS 源 | `http://localhost:5173` |
| `JWT_SECRET` | JWT 签名密钥 | 必填 |
| `JWT_REFRESH_SECRET` | Refresh token 签名密钥 | 必填 |
| `NODE_ENV` | 运行环境 | `development` |

## 中间件 / 插件

- `@fastify/cors` - CORS 配置
- `@fastify/jwt` - JWT 签名 / 验证
- `@fastify/cookie` - Cookie 解析
- `@fastify/multipart` - multipart / form-data 解析（用于上传图像）
- `@fastify/rate-limit` - 速率限制（auth 路由）

## 技术栈

- **框架**: Fastify 5
- **ORM**: Prisma 6
- **数据库**: SQLite
- **认证**: JWT (access + refresh), bcryptjs 密码哈希, RevokedToken 撤销列表
- **图像处理**: sharp（服务端高性能图像操作）
- **打包**: archiver（流式 ZIP 打包）
- **校验**: Zod
- **类型**: TypeScript 5
- **测试**: Vitest

## 脚本

| 命令 | 描述 |
|------|------|
| `pnpm dev` | 启动开发服务器（tsx watch 热重载） |
| `pnpm build` | 编译 TypeScript |
| `pnpm start` | 启动生产服务器 |
| `pnpm db:generate` | Prisma generate |
| `pnpm db:migrate` | Prisma migrate dev |
| `pnpm db:studio` | 启动 Prisma Studio |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm test` | 运行测试 |
| `pnpm test:watch` | Vitest 监听模式 |
| `pnpm migrate:local <file>` | 从 localStorage 导出文件迁移数据 |
