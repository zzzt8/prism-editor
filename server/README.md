# Prism Server

后端 API 服务，提供工作流的 CRUD 操作和发布管理。

## 目录结构

```
server/
├── src/
│   ├── index.ts           # Fastify 应用入口
│   ├── routes/
│   │   ├── auth.ts        # 认证路由
│   │   ├── workflows.ts   # 工作流 CRUD 路由
│   │   ├── published.ts   # 发布管理路由
│   │   └── nodes.ts       # 节点包路由
│   ├── plugins/
│   │   ├── auth.ts        # JWT 认证插件
│   │   └── cors.ts        # CORS 配置插件
│   ├── services/
│   │   └── auth.ts        # 认证服务逻辑
│   └── utils/
│       └── jwt.ts         # JWT 工具函数
├── prisma/
│   ├── schema.prisma      # 数据库 Schema
│   └── migrations/        # 数据库迁移文件
├── .env.example           # 环境变量示例
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

### 3. 数据库迁移

```bash
# 生成 Prisma Client（如需更新类型）
pnpm prisma generate

# 运行数据库迁移（首次或 schema 变更时）
pnpm prisma migrate dev

# 生产环境迁移
pnpm prisma migrate deploy
```

### 4. 启动开发服务器

```bash
pnpm dev
```

服务器将在 `http://localhost:3001` 启动。

## API 端点

### 健康检查

```
GET /health
```

### 认证

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/auth/register` | 注册新用户 |
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/auth/logout` | 用户登出 |
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
| PATCH | `/api/workflows/:id/meta` | 更新元数据 |
| POST | `/api/workflows/import` | 导入 JSON |
| GET | `/api/workflows/:id/export` | 导出 JSON |

### 版本管理

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/workflows/:id/versions` | 列出版本 |
| POST | `/api/workflows/:id/versions` | 创建版本 |
| GET | `/api/workflows/:id/versions/:vid` | 获取版本详情 |

### 发布管理

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/published` | 已发布工作流列表 |
| POST | `/api/published` | 发布工作流 |
| GET | `/api/published/:id` | 已发布详情 |
| DELETE | `/api/published/:id` | 取消发布 |

### 数据导出

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/workflows/:id/export` | 导出工作流 JSON |
| POST | `/api/workflows/import` | 导入工作流 JSON |

### 节点包

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/nodes` | 节点包列表 |
| POST | `/api/nodes` | 发布节点包 |
| GET | `/api/nodes/:name` | 获取节点包详情 |

## 迁移脚本

### 从 localStorage 迁移数据

```bash
# 导出 localStorage 数据
# 在浏览器控制台运行：
JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([k]) => k.startsWith("prism:"))))

# 保存为 JSON 文件后运行迁移
pnpm migrate:local ./path/to/export.json
```

## 环境变量

| 变量 | 描述 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | SQLite 数据库连接字符串 | `file:./prisma/dev.db` |
| `PORT` | 服务端口 | `3001` |
| `CORS_ORIGIN` | 允许的 CORS 源 | `http://localhost:5173` |
| `NODE_ENV` | 运行环境 | `development` |

## 技术栈

- **框架**: Fastify
- **ORM**: Prisma
- **数据库**: SQLite
- **认证**: JWT (JSON Web Token)
- **语言**: TypeScript
