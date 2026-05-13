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
- [x] T1: `@fastify/rate-limit` 注册；对 `/auth/login` 和 `/auth/register` 配置 `max: 10, timeWindow: '15 minutes'`
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
- [x] T2: Token 黑名单实现 — 模块内 Set，记录 jti；登出时 add，过期后自动 delete；中间件检查黑名单
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
- [x] T3: Refresh token cookie 加 `secure: true`（生产环境）
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
- [x] T4: `oss.ts` 的 `deleteFromOss` 失败时抛出错误（OSS enabled 且删除失败时）
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
- [x] T5: 生产环境 `requireSignatures` 默认为 `true`
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
- [x] T6: `.env.example` 加生产环境安全配置注释
  - layer: backend
  - **验收标准**: .env.example 包含 CORS/SECURITY/JWT 等关键配置的注释说明

---

### 验收清单（E2E 优先原则）

> 机器能做的先让机器做：E2E 测试 > 单元测试 > 命令行验证 > 人工验收。
> 填写时按上述优先级选择验证方式，人工验收仅作为兜底。

- [x] E2E / Playwright 测试覆盖（如有）
- [x] 单元/集成测试通过（如有）
- [x] `pnpm typecheck` 无错误
- [ ] API 限流验证：`curl` 或 API 测试脚本触发 429
- [ ] 人工验收（上述均无法覆盖时）

> 若某个验收项已有测试覆盖，则不加人工验收项。
> 只有"无法编写测试"且"命令行无法验证"时才加人工验收。

---

## N. 质量合规性验收

> 交付前必须完成以下任务，否则不得合入 main 分支。
> **选择性应用**：仅添加与 c4 直接相关的章节。

### N.3 Registry 与 API 契约

- [x] N.3.1 Token 黑名单中间件在 `/auth/*` 路由生效（`@fastify/rate-limit`）
- [x] N.3.2 Prisma migration 验证（`pnpm --filter=@prism/server exec prisma migrate status`）

### N.4 交互完整性

- [x] N.4.1 `.env.example` 注释完整，生产安全配置有明确说明
- [x] N.4.2 错误文案可读性检查（429 / 401 / 500 均应有友好提示）

### N.5 安全与类型

- [x] N.5.1 `as any` 使用检查（仅测试文件例外）
- [x] N.5.2 Refresh token cookie 在 production 设置 `secure: true`
