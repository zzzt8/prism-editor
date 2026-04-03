## 1. 服务端 Auth 依赖安装

> 工具文档：@fastify/jwt (https://github.com/fastify/fastify-jwt) · bcryptjs (https://github.com/dcodeIO/bcrypt.js)

- [x] 1.1 安装 `cd server && pnpm add @fastify/jwt bcryptjs`
- [x] 1.2 安装类型定义 `pnpm add -D @types/bcryptjs`

## 2. 服务端 Auth Schemas

> 工具文档：Zod (https://zod.dev/)

- [x] 2.1 创建 `server/src/schemas/auth.ts`
- [x] 2.2 定义 `registerSchema`: `{ email: z.string().email(), password: z.string().min(8), name?: z.string() }`
- [x] 2.3 定义 `loginSchema`: `{ email: z.string().email(), password: z.string() }`
- [x] 2.4 验证：运行 TypeScript 检查通过

## 3. Auth Routes 实现

> 工具文档：Fastify Routes · bcryptjs

- [x] 3.1 创建 `server/src/routes/auth.ts`
- [x] 3.2 实现 `POST /api/auth/register`:
  - 验证请求 body
  - 检查 email 是否已存在
  - bcrypt.hash(password, 12)
  - Prisma `user.create()`
  - 返回用户对象（不含 password）
- [x] 3.3 实现 `POST /api/auth/login`:
  - 验证请求 body
  - Prisma `user.findUnique({ where: { email } })`
  - bcrypt.compare(password, hash)
  - JWT 签发 accessToken + refreshToken
  - 设置 httpOnly cookie (refreshToken)
  - 返回 user + accessToken
- [x] 3.4 实现 `POST /api/auth/refresh`:
  - 读取 refreshToken cookie
  - JWT ��证 refreshToken
  - 签发新 accessToken + refreshToken (rotation)
  - 设置新 httpOnly cookie
  - 返回 user
- [x] 3.5 实现 `POST /api/auth/logout`:
  - 清除 refreshToken cookie
  - 返回 200
- [x] 3.6 实现 `GET /api/auth/me`:
  - 从 `request.user` 获取当前用户
  - 返回用户对象
- [x] 3.7 在 `app.ts` 注册 auth 路由
- [x] 3.8 验证：使用 curl 测试注册/登录/刷新/登出流程

## 4. Auth Middleware

> 工具文档：Fastify Plugin (https://fastify.dev/) · onRequest hook

- [x] 4.1 创建 `server/src/middleware/auth.ts`
- [x] 4.2 实现 Fastify Plugin:
  - `fastify.decorate('authenticate', async function(request, reply) { ... })`
  - 在 onRequest hook 中验证 accessToken
  - 验证失败返回 401
- [x] 4.3 在 `app.ts` 中注册插件到 Fastify 实例
- [x] 4.4 保护所有 API 路由（除了 auth 路由）
- [x] 4.5 验证：未登录请求返回 401

## 5. 工作流与用户关联

> 工具文档：Prisma Relations (https://www.prisma.io/docs/orm/reference/prisma-schema-reference)

- [x] 5.1 修改 `POST /api/workflows` — 从 `request.user.id` 获取 userId，保存到 workflow
- [x] 5.2 修改 `GET /api/workflows` — 添加 `where: { userId: request.user.id }` 过滤
- [x] 5.3 修改 `PUT /api/workflows/:id` — 验证 `workflow.userId === request.user.id`
- [x] 5.4 修改 `DELETE /api/workflows/:id` — 验证所有权
- [x] 5.5 验证：用户 A 创建的工作流不在用户 B 的列表中

## 6. 前端 Auth Store

> 工具文档：Zustand (https://zustand.docs.pmnd.rs/)

- [x] 6.1 创建 `apps/dev-tool/src/store/authStore.ts`
- [x] 6.2 定义状态：`user`, `accessToken`, `isAuthenticated`
- [x] 6.3 实现 `login(email, password)` — 调用 `/api/auth/login`
- [x] 6.4 实现 `register(email, password, name)` — 调用 `/api/auth/register`
- [x] 6.5 实现 `logout()` — 调用 `/api/auth/logout`，清除状态
- [x] 6.6 实现 `refreshToken()` — 调用 `/api/auth/refresh`，更新 token
- [x] 6.7 实现 `fetchCurrentUser()` — 调用 `/api/auth/me`
- [x] 6.8 验证：登录后刷新页面保持登录状态

## 7. 前端登录/注册页面

> 工具文档：React Router (https://reactrouter.com/)

- [x] 7.1 创建 `apps/dev-tool/src/pages/LoginPage.tsx`
- [x] 7.2 创建 `apps/dev-tool/src/pages/RegisterPage.tsx`
- [x] 7.3 实现表单验证和错误提示
- [x] 7.4 实现登录成功跳转到 `/editor`
- [x] 7.5 实现注册成功自动登录并跳转
- [x] 7.6 验证：完整登录/注册流程

## 8. Auth Guard 路由守卫

> 工具文档：React Router Loader · Protected Routes

- [x] 8.1 创建 `apps/dev-tool/src/components/AuthGuard.tsx`
- [x] 8.2 未登录用户访问受保护路由 → 重定向到 `/login`
- [x] 8.3 已登录用户访问 `/login` → 重定向到 `/editor`
- [x] 8.4 修改 `App.tsx` — 添加路由守卫
- [x] 8.5 验证：未登录访问 `/editor` 跳转到登录页

## 9. ApiStorageAdapter Token 注入

> 工具文档：fetch API · Authorization Header

- [x] 9.1 修改 `ApiStorageAdapter` — 在每个请求中添加 `Authorization: Bearer <token>` header
- [x] 9.2 实现自动刷新：在收到 401 响应时调用 `authStore.refreshToken()` 后重试
- [x] 9.3 实现刷新失败处理：清除 token，跳转到登录页
- [x] 9.4 验证：API 请求自动携带 token

## 10. 端到端测试

- [x] 10.1 注册新用户 → 登录 → 登出 → 再次登录
- [x] 10.2 用户 A 创建工作流 → 用户 B 无法访问
- [x] 10.3 Token 过期 → 自动刷新 → 继续使用
- [x] 10.4 Refresh Token 过期 → 跳转到登录页
- [x] 10.5 未登录访问 `/editor` → 跳转到 `/login` → 登录后返回 `/editor`
