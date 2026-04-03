## Context

服务端骨架（`backend-storage-migration`）已搭建完成，包含 User model 的 Prisma schema。本提案在其基础上实现用户认证。

当前 Prisma schema 中的 User model：
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  password  String   // bcrypt 哈希
  workflows Workflow[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## Goals / Non-Goals

**Goals:**
- 实现 JWT-based 用户认证（注册 + 登录 + Token 续期）
- 保护所有 API 路由，验证用户身份
- 在前端管理认证状态（登录状态、Token 存储）
- 实现工作流的用户归属（每个工作流关联创建者）

**Non-Goals:**
- 不实现 OAuth 第三方登录（Google/GitHub），后续提案添加
- 不实现团队/组织功能，后续提案添加
- 不实现密码重置/邮箱验证，后续提案添加
- 不实现 RBAC 权限控制（Role-Based Access Control）

## Decisions

### 决策 1: JWT 方案选择

**选择**: `@fastify/jwt` + Access Token + Refresh Token 双 Token 方案

**理由**:
- Access Token 短期有效（15min），泄露风险低
- Refresh Token 长期有效（7d），用于续期
- Refresh Token 存储在 httpOnly cookie，防止 XSS
- Fastify 官方插件，稳定可靠

**工具文档**:
- @fastify/jwt: https://github.com/fastify/fastify-jwt
- JWT RFC 7519: https://datatracker.ietf.org/doc/html/rfc7519
- Refresh Token: https://auth0.com/refresh-token

**替代方案**:
- Session + Cookie: 简单但不支持分布式，Fastify sessions 不如 JWT 成熟
- OAuth2 + OIDC: 功能完整但实现复杂，适合需要第三方登录的场景

---

### 决策 2: 密码哈希

**选择**: `bcryptjs` (纯 JS 实现，无 native 依赖)

**理由**:
- 已在 Prisma schema 中预置 `password String` 字段
- bcrypt 是行业标准，成本因子 12
- `bcryptjs` 无需编译，跨平台兼容

**工具文档**:
- bcryptjs: https://github.com/dcodeIO/bcrypt.js
- bcrypt cost factor: https://en.wikipedia.org/wiki/Bcrypt

---

### 决策 3: 前端 Token 存储

**选择**: Access Token 存储在内存（Zustand store），Refresh Token 存储在 httpOnly cookie

**理由**:
- Access Token 存内存：页面刷新丢失，但 XSS 无法获取
- Refresh Token 存 httpOnly cookie：JS 无法访问，防止 XSS
- 每次 API 请求自动附加 cookie
- 登出时清除 cookie

**工具文档**:
- HttpOnly Cookie: https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#restrict_access_to_cookies
- Zustand: https://zustand.docs.pmnd.rs/

---

### 决策 4: Auth Middleware 实现方式

**选择**: Fastify Plugin 作为 `onRequest` hook

**理由**:
- Fastify Plugin 机制天然适合 middleware
- `onRequest` hook 在路由处理前拦截
- 可通过 `request.user` 访问当前用户

**替代方案**:
- 路由级别手动验证: 重复代码，不推荐
- PreHandler hook: 在 onRequest 之后，不够早

---

## API Design

### Auth Routes

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/auth/refresh` | 刷新 Access Token |
| POST | `/api/auth/logout` | 登出 |
| GET | `/api/auth/me` | 获取当前用户信息 |

### Request/Response Schemas

#### POST /api/auth/register
Request:
```json
{ "email": "user@example.com", "password": "secure123", "name": "用户名" }
```
Response: `201 Created`
```json
{ "user": { "id": "...", "email": "...", "name": "..." } }
```
Set-Cookie: `refreshToken=<token>; HttpOnly; Secure; SameSite=Strict`

#### POST /api/auth/login
Request:
```json
{ "email": "user@example.com", "password": "secure123" }
```
Response: `200 OK`
```json
{ "user": { "id": "...", "email": "...", "name": "..." } }
```
Set-Cookie: `refreshToken=<token>; HttpOnly; Secure; SameSite=Strict`

#### POST /api/auth/refresh
Request: Cookie `refreshToken`
Response: `200 OK`
```json
{ "user": { "id": "...", "email": "...", "name": "..." } }
```
Set-Cookie: `refreshToken=<new-token>; HttpOnly; Secure; SameSite=Strict`

## Project Structure

```
server/
├── src/
│   ├── routes/
│   │   └── auth.ts          # 新增：auth routes
│   ├── middleware/
│   │   └── auth.ts          # 新增：auth middleware plugin
│   └── schemas/
│       └── auth.ts          # 新增：auth Zod schemas
apps/dev-tool/
├── src/
│   ├── pages/
│   │   ├── LoginPage.tsx    # 新增
│   │   └── RegisterPage.tsx # 新增
│   ├── store/
│   │   └── authStore.ts     # 新增：Zustand auth store
│   ├── contexts/
│   │   └── AuthContext.tsx  # 新增：React Context
│   ├── components/
│   │   └── AuthGuard.tsx    # 新增：路由守卫
│   └── App.tsx              # 修改：添加路由守卫
```

## Migration Plan

### Phase 1: 服务端 Auth Routes (Week 1)
1. 添加 `@fastify/jwt` 和 `bcryptjs` 依赖
2. 实现 auth schemas (Zod)
3. 实现 auth routes (register, login, refresh, logout, me)
4. 实现 auth middleware plugin
5. 在所有 API routes 注册 middleware

### Phase 2: 前端 Auth UI (Week 2)
1. 创建 authStore (Zustand)
2. 创建 LoginPage / RegisterPage
3. 创建 AuthContext
4. 创建 AuthGuard 组件
5. 在 App.tsx 添加路由守卫
6. 连接 ApiStorageAdapter 添加 Token

### Rollback Strategy
- Phase 1 回滚：移除 auth middleware，前端无感知
- Phase 2 回滚：移除登录页，开放所有路由

## Risks / Trade-offs

[Risk] JWT Secret 泄露
→ Mitigation: 使用强随机字符串作为 JWT_SECRET，存储在环境变量，不提交到代码库

[Risk] Refresh Token 被盗用
→ Mitigation: 使用 httpOnly + Secure + SameSite=Strict cookie；实现 Token 黑名单

[Risk] 用户忘记密码
→ Mitigation: 初期不支持，后续提案添加邮箱验证和密码重置

## Open Questions

1. **是否需要实现登录限流（防止暴力破解）？** 初期不加，后续可加 `@fastify/rate-limit`。
2. **是否需要实现 Refresh Token 黑名单？** 初期不加，后续可加 Redis 存储黑名单。
3. **是否需要实现 OAuth 第三方登录？** 后续提案添加 `@fastify/oauth2`。
