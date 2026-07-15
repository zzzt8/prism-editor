# Proposal: M1-A — DesignState / RenderRequest / RenderResult / RuntimeTemplate 类型契约

> **change_class**: high
> **reason**: 引入 4 个跨包公开类型（`DesignState` / `RenderRequest` / `RenderResult` / `RuntimeTemplate`）和对应 JSON schema + ajv 运行时校验；这些类型被 `@prism/shared-types` 暴露，下游 `@prism/workflow-core` / `@prism/image-ops` / `@prism/server` / `apps/dev-tool` 都将引用；属于跨包接口新增，按照 openspec-propose 规则为 `high`。
> **depends_on**: 无
> **blocks**: `m1-b-design-state-roundtrip`（M1-B 必须消费 M1-A 导出的类型与 ajv 校验入口）

---

## Why

Prism 架构护栏 §1.5 强制要求"浏览器预览和 Node 生产必须共享同一套 `DesignState` 与参数语义"。路线图 M0 阶段已用 fixture 完成几何一致性验证（`archive/2026-07-14-m0-dual-runtime-reproduction` 已 archived），但当时的输入结构是内存 fixture，没有正式协议。M1 第一步（M1-A）必须把这些"裸 fixture 输入"正式抽象为版本化、JSON 可序列化、跨端共享的类型契约与 JSON schema，让 M1-B 可以把它作为唯一的入参格式。

本次（M1-A）只解决"类型契约 + 校验"问题，**不**解决：
- 双端 runtime 真的消费它（M1-B）
- 服务端接入（M2/M6）
- UI 改造（M4）
- 多 flow 选择（M2）

## What Changes

1. **新增 `packages/shared-types/src/design-state.ts`**
   - 导出 `DesignState`：版本化、JSON 可序列化的设计输入快照
   - 必须字段：`schemaVersion`、`templateId`、`templateVersion`、`flowKey`、`inputs`、`createdAt`
   - 可选字段：`metadata`、`trace`
2. **新增 `packages/shared-types/src/render-request.ts`**
   - 导出 `RenderRequest`：包裹 `DesignState` + 不透明追踪字段 + 渲染执行上下文
3. **新增 `packages/shared-types/src/render-result.ts`**
   - 导出 `RenderResult`：双端统一的渲染输出形状
   - 必须字段：`renderId`、`designState`（用于溯源）、`outputs`、`status`、`timingMs`
4. **新增 `packages/shared-types/src/runtime-template.ts`**
   - 导出 `RuntimeTemplate`：运行时模板定义（与 EditorDraft / Workflow 语义正交）
5. **新增 `packages/shared-types/src/validation/`**
   - 4 个 JSON schema 文件：`design-state.schema.json`、`render-request.schema.json`、`render-result.schema.json`、`runtime-template.schema.json`
   - `ajv` validator 封装：导出 `validateDesignState` / `validateRenderRequest` / `validateRenderResult` / `validateRuntimeTemplate`（assertion-style）
   - `ajv` 升级为 `@prism/shared-types` 的 runtime dependency
6. **`packages/shared-types/src/index.ts`** 增加对上述 4 个新模块的 `export *`
7. **新增 `packages/shared-types/src/design-state.test.ts`** 等 4 个单元测试：JSON stringify round-trip、ajv 校验正反路径、版本号策略断言
8. **`packages/shared-types/package.json`** 添加 `ajv` runtime 依赖
9. **`packages/shared-types/README.md`** 增补 M1-A 章节（类型契约 + 版本策略 + 校验入口说明）

---

## Capabilities

- **跨端共享契约**：Browser / Node / Server 三端 import 同一份类型定义，无需任何运行时 polyfill
- **版本化**：`DesignState.schemaVersion` 是显式字段；后续字段增减通过 minor / patch 版本递增
- **可序列化**：`JSON.stringify(designState) → JSON.parse(...)` 必须能完整还原；测试覆盖
- **结构校验**：ajv schema 拒绝任何不符合契约的对象，错误输出包含 JSON Pointer 路径
- **设计期静态类型**：TypeScript 消费者在 IDE 即时报错，与运行时校验双层防护
- **可审计**：每个 `RenderResult` 都镜像其 `DesignState`，历史生产任务可定位回原始输入

---

## Impact

| 范围 | 影响 |
|------|------|
| 新增文件 | `packages/shared-types/src/{design-state,render-request,render-result,runtime-template}.ts`、`packages/shared-types/src/validation/*.schema.json`、`packages/shared-types/src/validation/{validate,index}.ts`、`packages/shared-types/src/*.test.ts`（4 个） |
| 修改文件 | `packages/shared-types/src/index.ts`（追加 `export *`）、`packages/shared-types/package.json`（新增 ajv dependency）、`packages/shared-types/README.md` |
| 触及层 | ui-skin（`@prism/shared-types`）— 只增不改；不破坏任何现有导出 |
| 数据库 | **无** |
| 公开 API | **新增 4 类型 + 4 校验函数**，无破坏 |
| Mall 接入 | **无** |
| M1-B 阻塞项 | M1-A 完成后才能开始 M1-B |
| Browser Runtime / Node Runtime | **无改动**（M1-A 不引入 Runtime 消费） |

---

## Decisions（high class 必须 Section，引用 `design.md`）

详见 `design.md`：
- `schemaVersion` 字段语义与递增规则
- `flowKey` 当前为 `string`，M1 不强制枚举（由 M2 收紧）
- 4 个 JSON schema 文件的组织方式（每类型一文件，路径稳定）
- ajv 版本与配置（`allErrors: true`、`removeAdditional: false`）
- `RenderResult.outputs` 形状（M1 不暴露中间 ExecutorOutput 子类型，只暴露最终帧）
- 不暴露的历史类型 `RenderProductionModal` / `PublishedWorkflowExecutor` 不复活

---

## Out of Scope

明确**不**在本 change 范围内：

- 在 `@prism/workflow-core` 引入新的 executor 入口（M1-B）
- 在 `@prism/image-ops` 增加 DesignState adapter（M1-B）
- 任何与 M0 fixture 的对端实测（M1-B）
- 多 flow 选择 / `findFirst` 替换 / `explicitOutputs`（M2 范围）
- 服务端路由 / API 契约 / Prisma schema 变更
- Mall BFF / 跨域 / CORS 配置
- Composer / Dev Tool 的 UI 切换
- 公共类型字段扩展到 Prisma 数据模型
- 把运行时校验日志接到 metrics 通道
- 任何 ajv 之外的备选 schema 库
- ajv 插件生态（ajv-formats / ajv-keywords）—— M1-A 用 ajv 核心即可
