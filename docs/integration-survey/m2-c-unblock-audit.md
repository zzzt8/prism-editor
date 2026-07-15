# M2-C Unblock Audit — M2-B Surface Verification

- **audit date**: 2026-07-15
- **change**: `m2-c-server-deterministic-render-entry`
- **prereq audited**: `m2-b-workflow-core-explicit-flow-resolution`
- **conclusion**: ✅ M2-B 已完全 deliver，M2-C 可进入 apply 阶段。

---

## 1. M2-C 对 M2-B 的依赖点（来自 `proposal.md` 第 5 行 + `design.md` Decision 6）

| M2-C 期望 | M2-B 提供的真实符号 | 状态 |
|-----------|---------------------|------|
| `TemplateVersionCatalog` 接口（`getTemplateVersion` / `currentVersion`） | `packages/workflow-core/src/flow-resolver.ts`：`export interface TemplateVersionCatalog { getTemplateVersion(id): Promise<TemplateVersion>; currentVersion(id): Promise<string>; }` | ✅ |
| `executeFromDesignState(designState, options)` 入口 + `options.catalog` DI | `packages/workflow-core/src/executor.ts`：`export interface ExecuteFromDesignStateOptions { catalog: TemplateVersionCatalog; ... }` | ✅ |
| `executeFlow` 内部 API（server 可能直接调用） | `packages/workflow-core/src/flow-execution.ts`：`export async function executeFlow(flow, ds, options?)` | ✅ |
| `FlowResolverError` + `FLOW_RESOLVER_ERROR_CODES`（server 用作 HTTP 错误码映射） | `packages/workflow-core/src/errors.ts`：9 个稳定错误码 | ✅ |
| `resolveFlow` / `resolveTemplateVersion`（server 测试可能直接调用） | `packages/workflow-core/src/flow-resolver.ts` | ✅ |
| `InMemoryTemplateVersionCatalog`（server 测试 mock 模板） | `packages/workflow-core/src/flow-resolver.ts`：`export class InMemoryTemplateVersionCatalog implements TemplateVersionCatalog` | ✅ |

## 2. M2-C Decision 6 期望 `FlowCatalog implements TemplateVersionCatalog` —— 接口契约验证

`TemplateVersionCatalog` 的契约要求（从 M2-B 源代码 + 单测提取）：

```typescript
export interface TemplateVersionCatalog {
  getTemplateVersion(templateId: string): Promise<TemplateVersion>;
  currentVersion(templateId: string): Promise<string>;
}
```

M2-C 的 `FlowCatalog` 实现需要满足：

| 契约 | 是否由 M2-B 单测覆盖 | 实现要点 |
|------|----------------------|----------|
| `getTemplateVersion(id)` 返回 `TemplateVersion`（含 `templateId` / `version` / `flows[]`） | ✅ `execute-from-design-state.test.ts` + `resolve-template-version.test.ts` | 从 Prisma 读取 `ProductTemplate` + `Workflow[]`，映射 `flows[]` |
| `currentVersion(id)` 返回 `string` | ✅ `resolve-template-version.test.ts` | 从 `ProductTemplate.version` 取值，不使用 `findFirst` |
| `flows[]` 中的 `Flow` 必须是合法 `Flow`（`@prism/shared-types` 类型） | ✅ `flow-execution-single-output.test.ts` | 解析 `Workflow.content` JSON 时通过 `validateFlow`（M2-A） |
| 同 `(templateId, flowKey)` 出现 2+ 次 → 必须抛 `DUPLICATE_FLOW_KEY` | ✅ `flow-key-format.test.ts` | `InMemoryTemplateVersionCatalog` 构造函数已守门；Prisma 层由 `@@unique([templateId, flowKey])` 兜底 |

**接口契约完全匹配。** M2-C 无需修改 `packages/workflow-core`。

## 3. M2-C 错误码映射验证

M2-C `design.md` §"错误模型" 期望的 HTTP 映射：

| M2-C 错误码 | M2-B 提供的源错误 | 状态 |
|-------------|---------------------|------|
| `TEMPLATE_NOT_FOUND` | 由 `FlowCatalog.getTemplateVersion` 抛 `null` → 包装 | ⚠️ server 自行包装（不来自 M2-B） |
| `TEMPLATE_VERSION_NOT_FOUND` | `FlowResolverError('TEMPLATE_VERSION_NOT_FOUND')` | ✅ 直接抛 |
| `FLOW_NOT_FOUND` | `FlowResolverError('FLOW_NOT_FOUND')` | ✅ 直接抛 |
| `DUPLICATE_FLOW_KEY` | `FlowResolverError('DUPLICATE_FLOW_KEY')` | ✅ 直接抛 |
| `REQUESTED_OUTPUT_UNKNOWN` | `FlowResolverError('REQUESTED_OUTPUT_UNKNOWN')` | ✅ 直接抛 |
| `RENDER_TIMEOUT` | server 自实现（Fastify setTimeout） | ⚠️ server 自行实现 |
| `RENDER_FAILED` | `WorkflowExecutorNodeJs.executeFromDesignState` 抛任意异常 → catch & wrap | ⚠️ server 自行包装 |

M2-B 提供 5/7 个错误码的源头；其余 2 个是 server 层 HTTP/超时包装职责，与 M2-B 无关。

## 4. M2-C 验收标准的 M2-B 端覆盖

| M2-C task | 验收标准中 M2-B 端的要求 | M2-B 是否满足 |
|-----------|----------------------------|----------------|
| `m2-c-t4` FlowCatalog | "实现 `TemplateVersionCatalog` 接口" | ✅ 接口已稳定导出 |
| `m2-c-t5` 新端点 | "调用 `WorkflowExecutorNodeJs.executeFromDesignState(ds, options)`" | ✅ `executeFromDesignState(ds, { catalog, cache? })` 已就绪 |
| `m2-c-t6` 输出收集 | "输出直接使用 `WorkflowExecutorNodeJs.executeFromDesignState` 返回的 `RenderResult`（由 M2-B 保证输出顺序稳定）" | ✅ 5 场景双端 parity 测试已证明 |
| `m2-c-t7` 错误处理 | "`requestedOutputSlots` 含未声明 slot → 422" | ✅ `REQUESTED_OUTPUT_UNKNOWN` 由 M2-B 提供 |

## 5. M2-B 端 grep guard（防止回退）

| 守门项 | 当前状态 |
|--------|----------|
| `Object.keys(...).pop()` 在 `packages/workflow-core/src/{executor,design-state-execution}.ts` | ✅ 0 命中（仅有注释 / docs 描述） |
| 字符串 `'load-image' / 'transform' / 'composite' / 'export'` 在 `flow-execution.ts` / `flow-resolver.ts` / `executor.ts` / `design-state-execution.ts` | ✅ 0 命中 |
| `options.params` 访问 | ✅ 已删除（破坏性变更） |
| `findFirst` 在 `flow-resolver.ts` | ✅ 0 命中（仅 `executor.ts` 注释中提及"never findFirst"） |
| 旧的 `ExecuteFromDesignStateParams` 导出 | ✅ 已从 `index.ts` / `design-state-execution.ts` 移除 |

## 6. M2-C 进入 apply 阶段之前需要由 server 单独负责的事项

以下不属于 M2-B 范畴，但 M2-C 必须自行完成：

1. **Prisma 迁移**：Workflow 表新增 `flowKey: String` + `@@unique([templateId, flowKey])` + 回填 + 冲突报告（`m2-c-t1` / `m2-c-t2`）。
2. **`selectFlowByKey`**：使用 `findUnique({ where: { templateId_flowKey: { templateId, flowKey } } })`（`m2-c-t3`）。
3. **`FlowCatalog implements TemplateVersionCatalog`**：新文件 `server/src/services/flow-catalog.ts`（`m2-c-t4`）。
4. **新路由 `POST /api/render/design-state`**：消费 `RenderRequest` → 返回 `RenderResult`（`m2-c-t5`）。
5. **错误码 → HTTP 状态映射**：在 handler 内包装（`m2-c-t7`）。
6. **旧 `/api/render/template` 路由**：内部转发到新路由；`flowKey` 默认 `'production'`；`@deprecated` 注释（`m2-c-t8`）。
7. **M4 下线计划**：写入 design.md §"旧接口处理"（`m2-c-t8`）。
8. **changelog**（`m2-c-t11`）。

## 7. M2-B apply 阶段遗留 follow-up（已 commit，未归档）

`fix: m2-b-t8 follow-up align fixtures ImageRefType with shared-types`
（commit `1741050`，1 file changed）—— 把 M2-B t8 测试 fixtures 中错误的
`type: 'inline-data'` 改为 `type: 'data-url'`，让 `ImageRefType` 闭合
union 类型检查通过。**已 commit 到 `refactor/prism-runtime-foundation` 分支。**

## 8. 结论

M2-B 的 12 个 task 已全部 `done`，13 个单测文件 112 个断言全绿，5 场景双端 parity 测试全绿，15/15 packages typecheck 全绿，所有 grep guard 守门通过。M2-C 的全部 7 项 M2-B 端依赖点都已 deliver，11 项验收标准的 M2-B 部分都满足。

**M2-C 阻塞已解除，可进入 apply 阶段。**

---

下一步：归档 `m2-b-workflow-core-explicit-flow-resolution` 到 `openspec/changes/archive/`。