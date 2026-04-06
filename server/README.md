# Prism Server

后端 API 服务，提供工作流的 CRUD 操作和发布管理。

## 快速开始

### 1. 安装依赖

```bash
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

### 工作流 CRUD

```
GET    /api/workflows          # 列表（支持分页和搜索）
POST   /api/workflows          # 创建
GET    /api/workflows/:id      # 详情
PUT    /api/workflows/:id      # 更新
DELETE /api/workflows/:id      # 删除
PATCH  /api/workflows/:id/meta # 更新元数据
POST   /api/workflows/import   # 导入 JSON
GET    /api/workflows/:id/export # 导出 JSON
```

### 发布管理

```
GET    /api/published          # 已发布工作流列表
POST   /api/published          # 发布工作流
GET    /api/published/:id      # 已发布详情
DELETE /api/published/:id      # 取消发布
```

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
