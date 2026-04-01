## Why

当前服务端骨架（`backend-storage-migration`）没有用户认证，所有数据没有归属。这导致：
1. 无法区分不同开发者的工作流
2. 无法实现权限控制（谁可以编辑/发布/查看）
3. 无法实现团队协作（同一团队的工作流共享）
4. 无法实现审计日志（谁在什么时间做了什么）

本提案在服务端骨架基础上添加用户认证和会话管理。

## What Changes

### 用户注册与登录
- 支持邮箱 + 密码注册和登录
- JWT Token 签发和验证
- Token 续期机制（Refresh Token）

### 前端认证状态
- 登录页 / 注册页 UI
- AuthContext / Zustand auth store
- 路由守卫（未登录重定向到登录页）

### API 路由保护
- 所有 `/api/*` 路由需要有效 JWT
- Auth middleware 在每个请求中验证 Token
- 用户 ID 注入到请求上下文

### 用户数据关联
- Workflow 关联 userId（创建者）
- API 返回用户的工作流列表（而非所有工作流）
- 团队成员邀请（可选，本提案不含）

## Capabilities

### New Capabilities
- `user-registration`: 用户邮箱注册，密码哈希存储
- `user-login`: JWT 签发与验证，支持 Refresh Token
- `auth-middleware`: Fastify 插件，验证所有 API 请求的 Token
- `user-context`: 将当前用户信息注入到请求上下文和 API 响应

### Modified Capabilities
- *(无)* — 本提案扩展 backend-api，不改变现有行为

## Impact

- **修改目录**：`server/src/routes/` — 添加 auth 路由
- **修改目录**：`server/src/middleware/` — 添加 auth middleware
- **修改文件**：`server/prisma/schema.prisma` — 添加 User model（已在 backend-storage-migration 中预定义）
- **新增目录**：`apps/dev-tool/src/pages/` — 添加 LoginPage / RegisterPage
- **新增文件**：`apps/dev-tool/src/store/authStore.ts` — 认证状态管理
- **新增文件**：`apps/dev-tool/src/contexts/AuthContext.tsx` — React Context for auth
- **环境变量**：`JWT_SECRET`, `JWT_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN`
