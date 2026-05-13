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

### 验收清单（E2E 优先原则）

> 机器能做的先让机器做：E2E 测试 > 单元测试 > 命令行验证 > 人工验收。
> 填写时按上述优先级选择验证方式，人工验收仅作为兜底。

- [ ] E2E / Playwright 测试覆盖（如有）
- [ ] 单元/集成测试通过（如有）
- [ ] `pnpm typecheck` 无错误
- [ ] API 限流验证：`curl` 或 API 测试脚本触发 429
- [ ] 人工验收（上述均无法覆盖时）

> 若某个验收项已有测试覆盖，则不加人工验收项。
> 只有"无法编写测试"且"命令行无法验证"时才加人工验收。

---

## N. 质量合规性验收

> 交付前必须完成以下任务，否则不得合入 main 分支。

### N.1 执行引擎完整性

- [ ] N.1.1 拓扑排序测试覆盖（含 cycle detection）
- [ ] N.1.2 节点 executor 错误隔离测试
- [ ] N.1.3 AbortController 链路测试（取消后结果保留）

### N.2 状态一致性

- [ ] N.2.1 Canvas 执行状态机转换测试
- [ ] N.2.2 取消后 Zustand store 状态检查

### N.3 Registry 与 API 契约

- [ ] N.3.1 Node Registry 重复注册报错验证
- [ ] N.3.2 Prisma migration 验证（`pnpm --filter=@prism/server exec prisma migrate status`）
- [ ] N.3.3 现有 workflow JSON 向后兼容验证（如涉及格式变更）

### N.4 交互完整性

- [ ] N.4.1 无 `onClick={() => {}}` 占位交互
- [ ] N.4.2 错误文案可读性检查

### N.5 安全与类型

- [ ] N.5.1 `as any` 使用检查（仅测试文件例外）
- [ ] N.5.2 API 输入 Zod 验证覆盖（如涉及 API 变更）
