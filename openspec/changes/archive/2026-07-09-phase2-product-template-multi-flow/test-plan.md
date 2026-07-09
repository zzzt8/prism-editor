# Test Plan: Phase 2 — ProductTemplate 多流化

> 本文档描述 Phase 2 的测试策略。每个 Scenario 映射到具体测试用例，结合 tasks.md 验收标准。

---

## 1. 测试策略概览

| 类型 | 范围 | 工具 | 何时运行 |
|------|------|------|----------|
| 单元测试 | product-template-service 纯函数 | Vitest | 每次 PR |
| 集成测试 | server routes API 边界 | Vitest | 每次 PR |
| E2E 测试 | 完整用户流程、UI 交互 | Playwright | CI + 手动验收 |
| Smoke 测试 | 全仓编译/构建 | pnpm typecheck/build | 每次 PR |

---

## 2. Scenario → 测试用例映射

### 2.1 ProductTemplate API（`specs/product-template/spec.md`）

| Scenario | 测试文件 | 测试用例 |
|----------|----------|----------|
| 列出所有 ProductTemplate | `server/src/routes/templates.test.ts` | `should list all templates` |
| 列表为空 | `server/src/routes/templates.test.ts` | `should return empty array` |
| 鉴权失败 | `server/src/routes/templates.test.ts` | `should return 401 when X-PRISM-SECRET missing` |
| 成功创建 | `server/src/routes/templates.test.ts` | `should create template` |
| 输入无效 | `server/src/routes/templates.test.ts` | `should return 400 for invalid input` |
| 通过 ID 查找 | `server/src/routes/templates.test.ts` | `should get template by id` |
| ID 不存在 | `server/src/routes/templates.test.ts` | `should return 404 for unknown id` |
| 部分更新 | `server/src/routes/templates.test.ts` | `should update template partially` |
| 级联删除 flows | `server/src/routes/templates.test.ts` | `should cascade delete flows` |
| 新增 Flow | `server/src/routes/templates.test.ts` | `should add flow to template` |
| platform 取值校验 | `server/src/routes/templates.test.ts` | `should reject invalid platform` |
| 列出 flows | `server/src/routes/templates.test.ts` | `should list flows by template` |
| 更新 Flow content | `server/src/routes/templates.test.ts` | `should update flow content` |
| 删除 Flow | `server/src/routes/templates.test.ts` | `should delete flow` |
| 平台一致性校验 | `server/src/services/product-template-service.test.ts` | `should enforce at least 1 browser + 1 nodejs flow` |
| selectProductionFlow 逻辑 | `server/src/services/product-template-service.test.ts` | `should select nodejs flow` |
| getById 含 flows | `server/src/services/product-template-service.test.ts` | `should return template with flows` |

### 2.2 Render API（`specs/render-api/spec.md`）

| Scenario | 测试文件 | 测试用例 |
|----------|----------|----------|
| 成功渲染 PNG | `server/src/routes/render.test.ts` | `should render PNG and return image/png` |
| 成功渲染 JPEG | `server/src/routes/render.test.ts` | `should render JPEG with format=jpeg` |
| Template 不存在 | `server/src/routes/render.test.ts` | `should return 404 for unknown templateId` |
| 无 Production Flow | `server/src/routes/render.test.ts` | `should return 422 when no nodejs flow` |
| 渲染超时 | `server/src/routes/render.test.ts` | `should return 504 when executor times out` |
| 渲染失败 | `server/src/routes/render.test.ts` | `should return 500 when executor throws` |
| 请求体非法 | `server/src/routes/render.test.ts` | `should return 400 for invalid body` |
| 取消请求 | `server/src/routes/render.test.ts` | `should abort executor on client disconnect` |
| PNG 默认格式 | `server/src/routes/render.test.ts` | `should default to PNG when format missing` |
| format 取值校验 | `server/src/routes/render.test.ts` | `should reject unsupported format` |

### 2.3 Dev-Tool UX（`specs/dev-tool-ux/spec.md`）

| Scenario | 测试文件 | 测试用例 |
|----------|----------|----------|
| 正常注水 | `apps/dev-tool/src/storage/ApiStorageAdapter.test.ts` | `should inject X-PRISM-SECRET header` |
| Secret 缺失警告 | `apps/dev-tool/src/storage/ApiStorageAdapter.test.ts` | `should warn when VITE_PRISM_SECRET missing` |
| HomePage 显示列表 | `tests/e2e/template-list.spec.ts` | `should list templates on home page` |
| 列表为空 | `tests/e2e/template-list.spec.ts` | `should show empty state when no templates` |
| 打开 New Modal | `tests/e2e/template-create.spec.ts` | `should open New ProductTemplate modal` |
| 提交创建 | `tests/e2e/template-create.spec.ts` | `should create template and navigate to editor` |
| 校验失败 | `apps/dev-tool/src/components/NewProductTemplateModal.test.tsx` | `should show validation error when name empty` |
| 显示所有 flows | `tests/e2e/flow-manage.spec.ts` | `should list flows grouped by platform` |
| 新增 Flow | `tests/e2e/flow-manage.spec.ts` | `should add new flow via modal` |
| 删除 Flow | `tests/e2e/flow-manage.spec.ts` | `should delete flow with confirmation` |
| 编辑 Flow bindings | `tests/e2e/flow-manage.spec.ts` | `should edit flow bindings JSON` |
| E2E: 完整链路 | `tests/e2e/render-template.spec.ts` | `should render template via API and verify binary` |

---

## 3. Task 层验收测试映射

### T2.0.3 — PublishedWorkflow hard cleanup

```bash
# 验收命令
pnpm grep -r "PublishedWorkflow\|publishRepository\|published-executor\|PublishedConfig" packages/ apps/ server/ --include="*.ts" --include="*.tsx"
# 期望：0 行

test ! -f packages/shared-types/src/published.ts
test ! -f packages/workflow-core/src/published-executor.ts
test ! -f packages/workflow-core/src/published-executor.e2e.test.ts
test ! -f apps/dev-tool/src/modules/repositories/publishRepository.ts
test ! -f apps/dev-tool/src/modules/editor/mappers/workflowToPublished.ts
test ! -f apps/dev-tool/src/modules/persistence/mappers/publishedToWorkflow.ts
test ! -f apps/dev-tool/src/modules/persistence/mappers/publishedToWorkflow.test.ts
test ! -f apps/dev-tool/src/utils/workflowExport.ts

cd packages/shared-types && pnpm tsc --noEmit   # 期望：0
cd packages/workflow-core && pnpm tsc --noEmit  # 期望：0
cd apps/dev-tool && pnpm tsc --noEmit          # 期望：0
```

### T2.0.2 — 删除 dev-tool 端 JWT 残余

```bash
# 验收命令
test ! -f apps/dev-tool/src/store/authStore.ts
test ! -f apps/dev-tool/src/pages/LoginPage.tsx
test ! -f apps/dev-tool/src/pages/RegisterPage.tsx
pnpm --filter dev-tool typecheck  # 期望：0
```

### T2.1 — Prisma schema 微调

```bash
# 验收命令
cd server && pnpm prisma migrate status
# 期望：Database schema is up to date

# SQLite 验证
sqlite3 dev.db "EXPLAIN QUERY PLAN SELECT * FROM Workflow WHERE templateId = 'x' AND platform = 'nodejs';"
# 期望：USING INDEX Workflow_templateId_platform_idx
```

### T2.2 — templates routes + service

```bash
# 验收命令
cd server && pnpm tsc --noEmit     # 期望：0
cd server && pnpm test             # 期望：N passed, 0 failed
```

### T2.3 — ApiStorageAdapter 重写

```bash
# 验收命令
grep "VITE_PRISM_SECRET" apps/dev-tool/src/storage/ApiStorageAdapter.ts
grep "X-PRISM-SECRET" apps/dev-tool/src/storage/ApiStorageAdapter.ts
pnpm --filter dev-tool typecheck   # 期望：0
pnpm --filter dev-tool build       # 期望：0
```

### T2.4 — ProductTemplateEditor UI

```bash
# 验收命令
pnpm --filter dev-tool typecheck   # 期望：0
pnpm --filter dev-tool build       # 期望：0
# 手动验收：dev-tool 启动 → HomePage → New → 跳转编辑器 → Flows Tab
```

### T2.5 — Render API 重写

```bash
# 验收命令
cd server && pnpm tsc --noEmit     # 期望：0
cd server && pnpm test             # 期望：N passed, 0 failed
```

### T2.7 — E2E 重写

```bash
# 验收命令（需要 dev-tool + server 运行）
cd apps/dev-tool && pnpm exec playwright test ../../tests/e2e/
# 期望：4 specs, all passed
```

---

## 4. 覆盖率目标

| 包 | 目标 | 说明 |
|----|------|------|
| `server/src/services/product-template-service.ts` | > 90% | 核心业务逻辑 |
| `server/src/routes/templates.ts` | > 80% | API 边界 |
| `server/src/routes/render.ts` | > 80% | Render 边界 |
| `apps/dev-tool/src/storage/ApiStorageAdapter.ts` | > 70% | 认证注水 |
| `apps/dev-tool/src/modules/repositories/` | > 70% | 数据层 |

---

## 5. 禁止的模式

- 禁止硬编码时间等待（`waitForTimeout(2000)`），使用显式 `waitForSelector`
- 禁止测试间共享状态
- 禁止 `test.skip`（修复问题而非跳过）
- E2E 测试禁止依赖特定数据库数据（使用 `beforeEach` 清理 + `setup`)
