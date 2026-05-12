## Test Plan（测试设计）

> 当 change 涉及以下任一情况时，必须填写此章节：
> - 修改 workflow-core / image-ops
> - 修改 server / prisma
> - 涉及协议兼容

### 测试策略

| 层级 | 测试类型 | 验证命令 |
|------|----------|----------|
| backend | API 集成测试（带 token / 不带 token） | `pnpm test --filter=@prism/server` |

### Test Cases

#### TC-1: 未登录用户无法访问 published 端点
- **Given**: 用户未携带任何 token
- **When**: `GET /published`
- **Then**: 返回 401 Unauthorized
- **验证命令**: 手工 curl 或 `pnpm test --filter=@prism/server -- --grep "TC-1"`

#### TC-2: 未登录用户无法创建 published workflow
- **Given**: 用户未携带 token
- **When**: `POST /published`
- **Then**: 返回 401 Unauthorized

#### TC-3: 未登录用户无法访问 nodes 端点
- **Given**: 用户未携带 token
- **When**: `GET /nodes`
- **Then**: 返回 401 Unauthorized

#### TC-4: 用户只能看到自己的 published workflows
- **Given**: 用户 A 和用户 B 各有一个 published workflow
- **When**: 用户 A 的 token 调用 `GET /published`
- **Then**: 只返回用户 A 的 published workflow，不包含 B 的

#### TC-5: 用户无法删除他人的 published workflow
- **Given**: 用户 B 拥有 published workflow ID=xxx
- **When**: 用户 A 的 token 调用 `DELETE /published/xxx`
- **Then**: 返回 404

#### TC-6: 用户只能看到自己上传的 node packages
- **Given**: 用户 A 和用户 B 各上传了一个 node package
- **When**: 用户 A 的 token 调用 `GET /nodes`
- **Then**: 只返回用户 A 的 node package，不包含 B 的

#### TC-7: 删除 workflow 时 cascade 删除 published 记录
- **Given**: workflow 有一个 published 记录
- **When**: `DELETE /workflows/:id`
- **Then**: published 记录同步删除

#### TC-8: manifest 字段正常返回
- **Given**: 有一个 node package
- **When**: `GET /nodes/:id`
- **Then**: 响应包含 `manifest` 字段（不是 false/null）

### Backward Compatibility（向后兼容）

- [ ] 已登录用户的现有 token 仍可正常使用
- [ ] 现有前端代码的 API 调用方式不变（已带 token）
- [ ] Prisma migration 对已有数据安全（SQLite backup）

---

## 任务列表

> **Task 元数据格式：**
> ```html
> <!-- opsx-meta
> id: T1
> layer: backend
> verify: api-tests
> dependencies:
>   - type: task
>     refs: []
> -->
> ```

<!-- opsx-meta
id: T1
layer: backend
verify: api-tests
dependencies:
  - type: task
    refs: []
-->
- [x] T1: `published.ts` 全量端点加 `@authenticate` 装饰器
  - layer: backend
  - **验收标准**: `GET /published` 无 token → 401

<!-- opsx-meta
id: T2
layer: backend
verify: api-tests
dependencies:
  - type: task
    refs: [T1]
-->
- [x] T2: `published.ts` 查询强制带上 `where: { workflow: { userId: currentUser.id } }`
  - layer: backend
  - **验收标准**: 用户 A 的 token 看不到用户 B 的数据

<!-- opsx-meta
id: T3
layer: backend
verify: api-tests
dependencies:
  - type: task
    refs: [T1]
-->
- [x] T3: `nodes.ts` 全量端点加 `@authenticate` 装饰器
  - layer: backend
  - **验收标准**: `GET /nodes` 无 token → 401

<!-- opsx-meta
id: T4
layer: backend
verify: api-tests
dependencies:
  - type: task
    refs: [T3]
-->
- [x] T4: `nodes.ts` 查询强制带上 `where: { authorId: currentUser.id }`
  - layer: backend
  - **验收标准**: 用户 A 的 token 看不到用户 B 的节点包

<!-- opsx-meta
id: T5
layer: backend
verify: api-tests
dependencies:
  - type: task
    refs: [T1, T3]
-->
- [x] T5: 删除 `published.ts` 和 `nodes.ts` 中的默认用户 fallback
  - layer: backend
  - **验收标准**: 未登录请求不降级为默认用户，直接返回 401

<!-- opsx-meta
id: T6
layer: backend
verify: api-tests
dependencies:
  - type: task
    refs: [T1, T3]
-->
- [x] T6: `versions.ts` 的 version list / diff / rollback 加鉴权和归属检查
  - layer: backend
  - **验收标准**: 未登录用户访问 version 端点 → 401

<!-- opsx-meta
id: T7
layer: backend
verify: api-tests
dependencies:
  - type: task
    refs: []
-->
- [x] T7: Prisma schema 补 `onDelete: Cascade`；修复 `manifest: false` bug
  - layer: backend
  - **验收标准**: `prisma migrate status` 无 pending；`GET /nodes/:id` 返回 manifest 字段

<!-- opsx-meta
id: T8
layer: backend
verify: smoke-test
dependencies:
  - type: task
    refs: [T5]
-->
- [x] T8: `scripts/seed.ts` 和 `scripts/migrate.ts` 中的默认密码从环境变量读取（`process.env.SEED_USER_PASSWORD`），不硬编码明文
  - layer: backend
  - **验收标准**: `pnpm seed` 和 `pnpm migrate` 仍能正常执行，但代码中无明文密码

---

### 手工验收清单

- [x] 停掉浏览器 token，刷新页面，API 请求返回 401
- [x] 用户 A 登录后看不到用户 B 的 published workflows
- [x] 删除一个有 published 记录的 workflow，published 表同步清空
- [x] `GET /nodes/:id` 正常返回 manifest JSON（修复了 `manifest: false` bug，改为返回实际 manifest）

---

## Layer 优先级执行策略

> 按优先级从高到低执行：engine > backend > editor > runtime > ui-skin > meta

- 同一 layer 内的 task 按 id 顺序执行
- T1 → T2（T2 依赖 T1 的鉴权装饰器）
- T3 → T4（T4 依赖 T3 的鉴权装饰器）
- T5、T6 依赖 T1 和 T3
- T7 可并行（T7 是 schema 独立改动）
- T8 依赖 T5（默认密码 fallback 删掉之后，migration 脚本需要能独立运行）
