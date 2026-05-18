## Test Plan（测试设计）

> 当 change 涉及以下任一情况时，必须填写此章节：
> - 修改 workflow-core / image-ops
> - 修改 server / prisma
> - 涉及协议兼容

### 测试策略

|| 层级 | 测试类型 | 验证命令 |
|------|----------|----------|
| backend | API 集成测试 | 手工测试（curl/Postman） |
| editor | Smoke test | 手工验收 |
| runtime | Smoke test | 手工验收 |

### Test Cases

#### TC-1: dev-tool Save 持久化到 server
- **Given**: dev-tool 处于登录状态，有一个空白画布
- **When**: 用户修改画布，点击 Save，输入名称
- **Then**: `GET /api/workflows` 返回该工作流，且 IndexedDB 中有对应缓存记录

#### TC-2: user-app 详情加载走单端点
- **Given**: user-app 处于登录状态，server 已有已发布工作流
- **When**: 用户从列表点击一个工作流
- **Then**: Network tab 只有 1 次 XHR 请求（`GET /api/published/:id`），工作流正确加载并可执行

#### TC-3: user-app 重命名
- **Given**: user-app 处于登录状态，有一个已发布工作流
- **When**: 用户右键重命名为 "新名称"
- **Then**: 列表中该工作流名称更新为 "新名称"，`GET /api/published/:id` 返回新名称

#### TC-4: user-app 删除
- **Given**: user-app 处于登录状态，有一个已发布工作流
- **When**: 用户右键删除该工作流
- **Then**: 列表中该工作流消失，`GET /api/published` 不再返回该记录

### Backward Compatibility（向后兼容）

- [x] 现有 published workflow JSON 格式不变
- [x] `GET /api/published` 响应格式不变（向后兼容）
- [x] `GET /api/published/:id` 新增 `content` 字段不影响现有调用方（现有调用方不存在）

---

## 任务列表（按 change_class 生成）

### change_class = high

使用 opsx-meta 块（保留完整格式）：

```html
<!-- opsx-meta
id: T1
layer: backend
verify: api-tests
dependencies:
  - type: task
    refs: []
-->
- [x] T1: 扩展 GET /api/published/:id 返回 content 字段
  - layer: backend
  - **验收标准**：`GET /api/published/:id` 响应包含 `content` 字段（JSON 字符串），格式与 `POST /api/published` 传入的 body 一致
```

> **layer 取值**：editor | runtime | backend | engine | ui-skin | meta
> **verify 取值**：unit-tests | golden-fixture | api-tests | smoke-test | visual-check | manual

> **验收标准写法规则**：必须写成**可观测、可验证**的条件，禁止写需要运行时状态才能验证的句子。
> - 好：`pnpm exec tsc --noEmit 无错误`
> - 好：`GET /api/published/:id 响应包含 content 字段`
> - 差：`用户保存后数据不丢失`（需要运行时验证）
> 如果验收标准涉及运行时行为，拆成两个 sub-task：代码可验证的 + 标记为手工验收的。

---

<!-- opsx-meta
id: T1
layer: backend
risk: low
priority: P0
verify:
  - api-tests
dependencies:
  - type: task
    refs: []
estimated_time: 30m
-->
- [x] T1: Backend — 扩展 GET /api/published/:id 返回 content 字段
  - layer: backend
  - **涉及文件**: `server/src/routes/published.ts`
  - **验收标准**: `GET /api/published/:id` 响应 body 中包含 `content` 字段（JSON string），且格式与 `POST /api/published` 传入的 content 一致

<!-- opsx-meta
id: T2
layer: backend
risk: low
priority: P0
verify:
  - api-tests
dependencies:
  - type: task
    refs: ["T1"]
estimated_time: 1h
-->
- [x] T2: Backend — 新增 PATCH /api/published/:id 支持重命名
  - layer: backend
  - **涉及文件**: `server/src/routes/published.ts`
  - **验收标准**: `PATCH /api/published/:id` 接收 `{ name: string }` body，返回 200，且 `GET /api/published/:id` 的 workflow.name 更新为新名称；未登录返回 401；非 owner 返回 404

<!-- opsx-meta
id: T3
layer: backend
risk: low
priority: P1
verify:
  - api-tests
dependencies:
  - type: task
    refs: []
estimated_time: 30m
-->
- [x] T3: Backend — 验证 DELETE /api/published/:id 实现正确
  - layer: backend
  - **涉及文件**: `server/src/routes/published.ts`
  - **验收标准**: `DELETE /api/published/:id` 已存在且可正常工作（非 owner 返回 404，已登录用户可删除自己发布的 workflow）；验证后可标记为 `[x]`

<!-- opsx-meta
id: T4
layer: editor
risk: high
priority: P0
verify:
  - typecheck
  - smoke-test
dependencies:
  - type: task
    refs: ["T1"]
estimated_time: 2h
-->
- [x] T4: Editor — 切换 activeStorageAdapter 为 ApiStorageAdapter
  - layer: editor
  - **涉及文件**: `apps/dev-tool/src/storage/index.ts`
  - **验收标准**: `pnpm typecheck --filter=@prism/dev-tool` 无错误；`pnpm build --filter=@prism/dev-tool` 构建成功

<!-- opsx-meta
id: T5
layer: editor
risk: medium
priority: P0
verify:
  - typecheck
  - smoke-test
dependencies:
  - type: task
    refs: ["T4"]
estimated_time: 1h
-->
- [x] T5: Editor — Save/New/Delete 操作路由到 server API
  - layer: editor
  - **涉及文件**: `apps/dev-tool/src/storage/ApiStorageAdapter.ts`
  - **验收标准**: `save()` → `PUT /api/workflows/:id`，`create()` → `POST /api/workflows`，`delete()` → `DELETE /api/workflows/:id`；网络不可达时优雅降级（console.warn + 不阻断）

<!-- opsx-meta
id: T6
layer: editor
risk: medium
priority: P1
verify:
  - typecheck
dependencies:
  - type: task
    refs: ["T5"]
estimated_time: 1h
-->
- [x] T6: Editor — Publish 操作路由到 server API
  - layer: editor
  - **涉及文件**: `apps/dev-tool/src/modules/repositories/publishRepository.ts`
  - **验收标准**: `publishToServer()` 调用 `POST /api/published`；`unpublish()` 调用 `DELETE /api/published/:id`；未登录时给出明确提示

<!-- opsx-meta
id: T7
layer: runtime
risk: low
priority: P0
verify:
  - typecheck
dependencies:
  - type: task
    refs: ["T1"]
estimated_time: 1h
-->
- [x] T7: Runtime — 重写 selectWorkflow 直接调用 GET /api/published/:id
  - layer: runtime
  - **涉及文件**: `apps/user-app/src/store/workflowCatalogStore.ts`
  - **验收标准**: `pnpm typecheck --filter=@prism/user-app` 无错误；详情页打开时 Network tab 只有 1 次 XHR 请求

<!-- opsx-meta
id: T8
layer: runtime
risk: low
priority: P0
verify:
  - typecheck
  - smoke-test
dependencies:
  - type: task
    refs: ["T2", "T3"]
estimated_time: 1h
-->
- [ ] T8: Runtime — 实现 rename 和 delete 操作调用 server API
  - layer: runtime
  - **涉及文件**: `apps/user-app/src/store/workflowCatalogStore.ts`, `apps/user-app/src/pages/WorkflowRunPage.tsx`
  - **验收标准**: `renameWorkflow(sourceId, name)` 调用 `PATCH /api/published/:sourceId`；`deleteWorkflow(sourceId)` 调用 `DELETE /api/published/:sourceId`；UI 反馈及时更新

<!-- opsx-meta
id: T9
layer: runtime
risk: low
priority: P1
verify:
  - typecheck
  - visual-check
dependencies:
  - type: task
    refs: []
estimated_time: 1h
-->
- [ ] T9: Runtime — 删除 Import 按钮和 Ctrl+V 粘贴导入逻辑
  - layer: runtime
  - **涉及文件**: `apps/user-app/src/pages/WorkflowListPage.tsx`, `apps/user-app/src/utils/workflowImport.ts`
  - **验收标准**: Import 按钮从 UI 移除；Ctrl+V 粘贴不再触发导入（不再监听 paste 事件）；`pnpm typecheck --filter=@prism/user-app` 无错误

<!-- opsx-meta
id: T10
layer: backend
risk: medium
priority: P1
verify:
  - typecheck
dependencies:
  - type: task
    refs: []
estimated_time: 1h
-->
- [ ] T10: Editor — 验证 IndexedDB 作为 autosave 缓存仍可用
  - layer: editor
  - **涉及文件**: `apps/dev-tool/src/storage/IndexedDBStorageAdapter.ts`
  - **验收标准**: autosaveService 的 `setTimeout` 回调中同时调用 `indexedDbAdapter.save()` 写入本地缓存；dev-tool 重启后 IndexedDB 中的草稿仍可恢复（手工验收）

---

## 验收清单（E2E 优先原则）

> 机器能做的先让机器做：E2E 测试 > 单元测试 > 命令行验证 > 人工验收。
> 填写时按上述优先级选择验证方式，人工验收仅作为兜底。

- [ ] `pnpm typecheck --filter=@prism/server` 无错误
- [ ] `pnpm typecheck --filter=@prism/dev-tool` 无错误
- [ ] `pnpm typecheck --filter=@prism/user-app` 无错误
- [ ] `pnpm build --filter=@prism/server` 构建成功
- [ ] `pnpm build --filter=@prism/dev-tool` 构建成功
- [ ] `pnpm build --filter=@prism/user-app` 构建成功
- [ ] API 验证（curl）：`GET /api/published/:id` 包含 `content` 字段
- [ ] API 验证（curl）：`PATCH /api/published/:id` 更新名称
- [ ] 手工验收（dev-tool）：Save 后 server 有记录
- [ ] 手工验收（user-app）：打开详情时 Network 只有 1 次请求

> 若某个验收项已有测试覆盖，则不加人工验收项。
> 只有"无法编写测试"且"命令行无法验证"时才加人工验收。

---

## N. 质量合规性验收

> 交付前必须完成以下任务，否则不得合入 main 分支。
> **选择性应用**：只添加与 change 直接相关的 N.x 章节，无关的不写。

### N.3 Registry 与 API 契约

- [ ] N.3.1 `GET /api/published/:id` 新增 `content` 字段向后兼容验证（原有调用方不受影响）
- [ ] N.3.2 Prisma migration 验证（`pnpm --filter=@prism/server exec prisma migrate status`）— 预期无需 migration

### N.4 交互完整性

- [ ] N.4.1 无 `onClick={() => {}}` 占位交互
- [ ] N.4.2 错误文案可读性检查（网络错误、401 认证失败、404 未找到等场景的提示文案）

### N.5 安全与类型

- [ ] N.5.1 `as any` 使用检查（仅测试文件例外）
- [ ] N.5.2 API 输入 Zod 验证覆盖（PATCH body schema 验证存在）

---

## Layer 优先级执行策略

> 仅适用于 change_class = medium 或 high。

- 按优先级从高到低执行：backend > editor > runtime
- 同一 layer 内的 task 按 id 字母顺序执行
- 高 layer task 完成后才执行依赖它的低 layer task
- 跨层依赖时，允许依赖链存在，但不能跳过优先级倒置

**依赖链**：
```
T1 (backend) ──┬──→ T4 (editor)
T2 (backend) ──┤
T3 (backend) ──┤
               └──→ T7 (runtime) ←── T8 (runtime)
                              ↑
T9 (runtime) ─────────────────┘
T10 (editor) ← 无依赖
```

执行顺序建议：
1. T1 → T2 → T3（backend 层，依次执行）
2. T4 → T5 → T6（editor 层，依次执行）
3. T7 → T8 → T9（runtime 层，依次执行）
4. T10（editor，任意位置可执行）
