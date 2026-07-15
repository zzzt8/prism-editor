# Design: M2-C — Server Deterministic Render Entry

## Context

M2-A 定义协议（M2-C 的设计契约层），M2-B 在 workflow-core 实现确定性执行（M2-C 的引擎依赖层）。当前 server 状态：

1. **`server/src/routes/render.ts`** 的 `/api/render/template` 路由：入参是 `RenderTemplateBody`（`templateId` + `userParams` + `inputs` + `format`），不是 `RenderRequest`。
2. **`server/src/services/product-template-service.ts:177`** 使用 `prisma.workflow.findFirst({ where: { templateId, platform: 'nodejs' } })` 选择生产 Flow（违反护栏 §1.7）。
3. **`server/src/routes/render.ts:84`** 使用 `Object.keys(results).pop()` 决定最终输出节点（违反护栏 §1.8）。
4. 当前 Prisma `Workflow` 表没有 `flowKey` 列；`Workflow.content` 是裸 Workflow JSON。

M2-C 必须让生产入口真正消费 DesignState + RenderRequest，消除两个护栏违规，并做最小正确 Prisma 迁移。

---

## Goals / Non-Goals

**Goals:**

1. `POST /api/render/design-state` 端点：入参即 `RenderRequest`，出参即 `RenderResult`（JSON）
2. `selectFlowByKey(templateId, templateVersion, flowKey)` 精确查询（`findUnique`）
3. 消除 `findFirst` + `Object.keys(results).pop()`
4. Prisma schema 增加 `flowKey` 复合唯一约束
5. 迁移脚本 + 冲突报告机制
6. 旧 `/api/render/template` 调用方调查 + 下线计划

**Non-Goals:**

- 不修改 shared-types / workflow-core / image-ops
- 不恢复 user-app / 旧登录系统
- 不实现 Mall 接入 / CORS / SKU / 订单 / 工厂账号
- 不实现 UI 修改
- 不修改 M0 / M1 已 archived 产物

---

## Architecture Review

### 当前违规分析

**违规 1 — `findFirst` 决定生产 Flow**（护栏 §1.7）：

```typescript
// server/src/services/product-template-service.ts:177
export async function selectProductionFlow(templateId: string): Promise<Workflow> {
  const flow = await prisma.workflow.findFirst({   // ← 违规
    where: { templateId, platform: 'nodejs' },
  });
  if (!flow) throw new RenderPlatformNotFoundError(templateId);
  return flow;
}
```

`platform: 'nodejs'` 是隐式过滤。如果同一个 templateId 下有 2 个 nodejs Flow，findFirst 随机命中第一条。品类升级后新增 nodejs Flow 无法预测哪条被选中。

**违规 2 — `Object.keys(results).pop()` 决定输出**（护栏 §1.8）：

```typescript
// server/src/routes/render.ts:84
const results = result.results ?? {};
const finalNodeId = Object.keys(results).pop() ?? '';   // ← 违规
const finalOutput = results[finalNodeId] as Record<string, unknown> | undefined;
```

JS 对象遍历顺序虽有规范，但在跨 process / 跨 cache 语境下，依赖 key 顺序决定最终输出是不可审计的。

### Prisma 现状

```prisma
// server/prisma/schema.prisma
model Workflow {
  id         String   @id @default(cuid())
  templateId String
  template   ProductTemplate @relation(...)
  name       String
  platform   String   // 'browser' | 'nodejs'
  content    String   // workflow JSON
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([templateId])
  @@index([templateId, platform])
}
```

缺失：`flowKey` 列。无法按 `(templateId, flowKey)` 精确定位。

### 候选方案对比

| # | 方案 | 描述 | 决策 |
|---|------|------|------|
| A | 不改 Prisma，在 service 层用 SQL 解析 content JSON | 绕过 Prisma 类型系统；脆弱 | ❌ |
| B | Prisma schema 增加 `flowKey: String @unique([templateId, flowKey])` | 最小正确迁移 | ✅ **采用** |
| C | 旧 `/api/render/template` 删掉 | 测试 e2e 破坏 | ❌ 先调查 |
| D | 旧 `/api/render/template` 转发到新路由（flowKey 默认 production） | 兼容过渡 | ✅ **采用** |
| E | `Object.keys(results).pop()` 改为 `explicitOutputs[0]` 抽取 | 消除违规但不完整 | ❌ 违反 explicitOutputs 全声明原则 |
| F | `Object.keys(results).pop()` 改为 `RenderResult.outputs[0]` | 完整 | ✅ **采用**（通过 RenderResult） |

### 评审清单

- [x] 是否触及 Mall 业务模型？——否（server 内部 service 变更）
- [x] 是否恢复旧 user system？——否
- [x] 是否携带不可序列化对象？——否
- [x] 是否引入 `findFirst` / 隐式遍历？——否（M2-C 消除）
- [x] 是否引入新数据库表？——否（仅变更 Workflow 表）
- [x] 是否修改 shared-types / workflow-core / image-ops？——否
- [x] 是否影响 Composer / Dev Tool？——否（M4 才动）
- [x] 是否引入 CORS / Mall 接入？——否

---

## Decisions

### Decision 1: 新端点 `POST /api/render/design-state`

**选择**：

```typescript
// server/src/routes/render.ts

// POST /api/render/design-state
fastify.post<{ Body: RenderRequest }>(
  '/design-state',
  {
    schema: {
      body: {
        // Fastify JSON Schema — 验证 RenderRequest 结构
        // ajv validateRenderRequest 在 handler 内部调用
      },
    },
  },
  async (request, reply) => {
    // 1. ajv validateRenderRequest(request.body) — 失败返回 400
    // 2. selectFlowByKey(templateId, templateVersion, flowKey)
    // 3. inject catalog into executeFromDesignState options
    // 4. WorkflowExecutorNodeJs.executeFromDesignState(ds, options)
    // 5. reply.send(renderResult) — JSON
  },
);
```

**理由**：
- 请求体直接是 `RenderRequest`（M1-A 契约），不需要额外 DTO。
- 返回 `RenderResult`（M1-A 契约），完整可审计。
- 路由路径遵循现有 server API 约定（`/api/render/...` 前缀）。

### Decision 2: `selectFlowByKey` 使用 Prisma `findUnique`

**选择**：

```typescript
// server/src/services/product-template-service.ts

export async function selectFlowByKey(
  templateId: string,
  templateVersion: string,
  flowKey: string,
): Promise<Workflow> {
  // 1. findUnique by composite unique constraint
  const flow = await prisma.workflow.findUnique({
    where: {
      templateId_flowKey: { templateId, flowKey },
    },
    include: { template: true },
  });

  // 2. 校验 template.version === templateVersion
  if (!flow || flow.template.version !== templateVersion) {
    throw new FlowNotFoundError(...);
  }

  return flow;
}
```

**理由**：
- Prisma `findUnique` 是 O(1) 精确查找，不依赖遍历顺序。
- 复合唯一约束 `(templateId, flowKey)` 物理上保证了唯一定位。
- templateVersion 比对保证 TemplateVersion 参与精确定位（护栏 §1.4 / 用户决定 #5）。

### Decision 3: Prisma schema 增加 `flowKey` 列 + 复合唯一约束

**选择**：

```prisma
model Workflow {
  id         String   @id @default(cuid())
  templateId String
  template   ProductTemplate @relation(fields: [templateId], references: [id])
  name       String
  flowKey    String   // 新增：Flow 标识，如 'production.print'
  platform   String   // 'browser' | 'nodejs'
  content    String   // workflow JSON
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([templateId, flowKey])
  @@index([templateId])
  @@index([templateId, platform])
}
```

**理由**：
- 复合唯一约束 `(templateId, flowKey)` 物理保证唯一定位。
- 不使用 `platform` 作为选择条件（`platform` 只用于执行兼容性）。
- `flowKey` 是 `String` 类型，对应 `FlowKey` 字符串别名（FlowKey 是带 brand 的 string，`@unique` 用 String 列即可）。

### Decision 4: 迁移策略

**迁移阶段**：

1. **审计阶段**：读取现有 `Workflow` 表全部记录，解析 `content` JSON 中的 `flowKey` 字段（若存在）或回退到从 `name` 推断（如 `'production'` → `flowKey: 'production'`）。
2. **冲突报告**：若同一 `templateId` 下存在 2+ 条记录解析出相同 `flowKey` → 迁移停止，写入 `server/prisma/migrations/flowKey-backfill-conflict.md`，报告每条冲突记录。
3. **数据回填**：执行 `UPDATE Workflow SET flowKey = <inferred>`。
4. **应用唯一约束**：`@@unique([templateId, flowKey])`。
5. **向后兼容**：旧 `selectProductionFlow` 保留（但标记 `@deprecated`），新调用使用 `selectFlowByKey`。

**理由**：
- 用户决定 #5 要求"如果历史数据出现重复 flowKey，迁移必须停止并输出冲突报告，禁止自动把第一条命名为 production"。
- 迁移脚本需要读取 Prisma 生成的迁移文件。

### Decision 5: 旧 `/api/render/template` 处理

**调查结论**：

`tests/e2e/render-template.spec.ts` 仅有一个测试用例：

```typescript
test('POST /api/render/template returns 404 for non-existent template', async ({ request }) => {
  await request.post('http://localhost:3001/api/render/template', { data: { templateId: 'non-existent-id-12345' } });
  expect(res.status()).toBe(404);
});
```

**处理方案**：

| 调用方 | 处理 |
|--------|------|
| `tests/e2e/render-template.spec.ts` | 迁移到 `POST /api/render/design-state` 调用 |
| 真实调用方 | 未发现（Mall 当前未接入 Prism 生产端） |

旧路由改为内部转发到新路由：

```typescript
// POST /api/render/template — 转发到新路由
fastify.post<{ Body: RenderTemplateBody }>(
  '/template',
  async (request, reply) => {
    // backward compat: 构造 RenderRequest(DesignState) from RenderTemplateBody
    const ds = {
      schemaVersion: 1,
      templateId: request.body.templateId,
      templateVersion: '1', // backward compat: default to current
      flowKey: 'production', // backward compat: default
      inputs: { assets: [], params: request.body.userParams ?? {} },
      createdAt: new Date().toISOString(),
    };
    const renderReq: RenderRequest = {
      designState: ds,
      requestedOutputSlots: ['production'],
    };
    // 内部调用新 handler
    return handleDesignStateRender(renderReq, reply, fastify);
  },
);
```

**M4 下线计划**：
- `tests/e2e/render-template.spec.ts` 迁移完成后，旧 `/api/render/template` 在 M4 阶段删除。
- 不允许默认 `flowKey = 'production'` 长期存在。

### Decision 6: `FlowCatalog` 实现 `TemplateVersionCatalog` 接口

```typescript
// server/src/services/flow-catalog.ts

import type { TemplateVersionCatalog } from '@prism/workflow-core';

export class FlowCatalog implements TemplateVersionCatalog {
  async getTemplateVersion(templateId: string): Promise<TemplateVersion> {
    const template = await getById(templateId); // ProductTemplate
    const flows = await listFlows(templateId); // Workflow[]

    return {
      templateId: template.id,
      version: template.version,
      flows: flows.map((w) => parseFlowFromContent(w.content, w.flowKey)),
      createdAt: template.createdAt.toISOString(),
    };
  }

  async currentVersion(templateId: string): Promise<string> {
    const template = await getById(templateId);
    return template.version;
  }
}
```

**理由**：
- `FlowCatalog` 实现 `TemplateVersionCatalog` 接口（由 M2-B 定义）。
- server 层将 catalog 实例注入 `executeFromDesignState` 的 options。

---

## 错误模型

| 错误码 | HTTP 状态 | 触发条件 |
|--------|-----------|----------|
| `TEMPLATE_NOT_FOUND` | 404 | templateId 不存在 |
| `TEMPLATE_VERSION_NOT_FOUND` | 404 | templateVersion 不匹配 |
| `FLOW_NOT_FOUND` | 404 | flowKey 在该 TemplateVersion 中不存在 |
| `DUPLICATE_FLOW_KEY` | 409 | Prisma 复合唯一约束冲突 |
| `REQUESTED_OUTPUT_UNKNOWN` | 422 | requestedOutputSlots 含未声明 slot |
| `RENDER_TIMEOUT` | 504 | 执行超时（30s） |
| `RENDER_FAILED` | 500 | 执行错误 |

---

## 兼容策略

- 旧 `/api/render/template` 内部转发到新路由（flowKey 默认 production）
- `selectProductionFlow` 标记 `@deprecated` 但仍可用（M4 删）
- 新端点默认 30s 超时（与旧路由一致）

---

## 回滚方案

1. `git checkout -- server/prisma/schema.prisma`
2. 删除新增的 Prisma migration
3. `git checkout -- server/src/services/product-template-service.ts server/src/routes/render.ts`
4. 删除 `server/src/services/flow-catalog.ts`
5. 删除 `server/src/routes/render.test.ts` 新增测试
6. 恢复 `tests/e2e/render-template.spec.ts`

---

## 不做什么

- 不修改 shared-types / workflow-core / image-ops
- 不实现 Mall 接入 / CORS
- 不恢复 user-app / 旧登录系统
- 不实现 SKU / 订单 / 工厂账号
- 不实现 UI 修改
- 不修改 M0 / M1 已 archived 产物
- 不在迁移中自动重命名冲突 flowKey（必须报告）