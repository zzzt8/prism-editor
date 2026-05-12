## 任务列表

> **Task 元数据格式：**
> ```html
> <!-- opsx-meta
> id: T1
> layer: backend
> verify: api-tests
> dependencies:
>   - type: change
>     refs: [c1-security-data-isolation]
>     status_required: completed
> -->
> ```

<!-- opsx-meta
id: T1
layer: backend
verify: api-tests
dependencies:
  - type: change
    refs: [c1-security-data-isolation]
    status_required: completed
-->
- [ ] T1: `@fastify/rate-limit` 注册；对 `/auth/login` 和 `/auth/register` 配置 `max: 10, timeWindow: '15 minutes'`
  - layer: backend
  - **验收标准**: 同一 IP 在 1 分钟内发 10 次登录请求，第 11 次返回 429

<!-- opsx-meta
id: T2
layer: backend
verify: api-tests
dependencies:
  - type: change
    refs: [c1-security-data-isolation]
    status_required: completed
-->
- [ ] T2: Token 黑名单实现 — 模块内 Set，记录 jti；登出时 add，过期后自动 delete；中间件检查黑名单
  - layer: backend
  - **验收标准**: 登出后旧 refresh token 再次使用返回 401

<!-- opsx-meta
id: T3
layer: backend
verify: api-tests
dependencies:
  - type: change
    refs: [c1-security-data-isolation]
    status_required: completed
-->
- [ ] T3: Refresh token cookie 加 `secure: true`（生产环境）
  - layer: backend
  - **验收标准**: `NODE_ENV=production` 时 cookie 设置 Secure 标志

<!-- opsx-meta
id: T4
layer: backend
verify: api-tests
dependencies:
  - type: change
    refs: [c1-security-data-isolation]
    status_required: completed
-->
- [ ] T4: `oss.ts` 的 `deleteFromOss` 失败时抛出错误（OSS enabled 且删除失败时）
  - layer: backend
  - **验收标准**: OSS 开启时删除失败会抛出错误而非静默

<!-- opsx-meta
id: T5
layer: runtime
verify: smoke-test
dependencies:
  - type: change
    refs: [c1-security-data-isolation]
    status_required: completed
-->
- [ ] T5: 生产环境 `requireSignatures` 默认为 `true`
  - layer: runtime
  - **验收标准**: `NODE_ENV=production` 加载未签名节点包报错"签名缺失"

<!-- opsx-meta
id: T6
layer: backend
verify: smoke-test
dependencies:
  - type: change
    refs: [c1-security-data-isolation]
    status_required: completed
-->
- [ ] T6: `.env.example` 加生产环境安全配置注释
  - layer: backend
  - **验收标准**: .env.example 包含 CORS/SECURITY/JWT 等关键配置的注释说明

---

### 手工验收清单

- [ ] 连续 11 次登录请求触发限流（429 响应）
- [ ] 登出后用旧 token 访问 `/auth/me` 返回 401
- [ ] 生产环境 cookie 包含 Secure 标志
- [ ] OSS 删除失败时 API 返回 500（而非静默成功）
- [ ] 生产环境加载未签名节点包报错
