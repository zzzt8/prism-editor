# Tasks: M1-A — DesignState / RenderRequest / RenderResult / RuntimeTemplate 类型契约

> **依赖**：无（M1-A 是 M0 之后第一个 change）
> **阻塞**：M1-B 才能开始

---

## Task 1: DesignState 类型 + JSON schema

- **id**: m1-a-t1
- **layer**: ui-skin (`packages/shared-types/`)
- **status**: completed
- **verify**: `pnpm --filter @prism/shared-types test -- --run design-state`

### 验收标准

- [ ] 文件 `packages/shared-types/src/design-state.ts` 存在，导出 `DesignState` 与子类型（`DesignStateInputs` / `AssetRef` / `DesignStateMetadata` / `DesignStateTrace`）
- [ ] 文件 `packages/shared-types/src/validation/design-state.schema.json` 存在，编译通过 `ajv.compile`
- [ ] `DesignState` 全字段标 `readonly`，不暴露 `Blob/File/Canvas/ImageBitmap/DOM/Function/Store/blob URL`
- [ ] `JSON.parse(JSON.stringify(designState))` 与原对象字段深度相等（单元测试覆盖）
- [ ] `schemaVersion` 类型为字面量 `1`
- [ ] 测试用例覆盖：最小必填字段合法 / 缺必填字段拒绝 / 多余字段拒绝 / `schemaVersion` 非 1 拒绝

---

## Task 2: RenderRequest 类型 + JSON schema

- **id**: m1-a-t2
- **layer**: ui-skin
- **status**: completed
- **verify**: `pnpm --filter @prism/shared-types test -- --run render-request`

### 验收标准

- [ ] 文件 `packages/shared-types/src/render-request.ts` 导出 `RenderRequest` / `RenderRequestTrace` / `RenderRequestOptions`
- [ ] 文件 `packages/shared-types/src/validation/render-request.schema.json` 存在
- [ ] `RenderRequest.designState` 字段指向 `DesignState`，不在 RenderRequest schema 内重新描述 DesignState 结构（用 `$ref: "./design-state.schema.json"`）
- [ ] `trace.requestId` / `trace.traceId` / `trace.externalReferenceId` 全部可选 string
- [ ] 测试覆盖：合法最小请求 / 缺 designState 拒绝 / 多未知 trace 字段拒绝

---

## Task 3: RenderResult 类型 + JSON schema

- **id**: m1-a-t3
- **layer**: ui-skin
- **status**: completed
- **verify**: `pnpm --filter @prism/shared-types test -- --run render-result`

### 验收标准

- [ ] 文件 `packages/shared-types/src/render-result.ts` 导出 `RenderResult` / `RenderResultOutput` / `RenderResultStatus` / `RenderError`
- [ ] 文件 `packages/shared-types/src/validation/render-result.schema.json` 存在
- [ ] `RenderResult.designState` 字段镜像原请求结构（用 `$ref: "./design-state.schema.json"`）
- [ ] `outputs: ReadonlyArray<RenderResultOutput>`，每项含 `id / image / slot`；`status: 'done' | 'error' | 'cancelled'`；`status === 'done'` 时 `outputs.length >= 1`
- [ ] 测试覆盖：done + outputs / error + error.code+message / cancelled + 空 outputs

---

## Task 4: RuntimeTemplate 类型 + JSON schema

- **id**: m1-a-t4
- **layer**: ui-skin
- **status**: completed
- **verify**: `pnpm --filter @prism/shared-types test -- --run runtime-template`

### 验收标准

- [ ] 文件 `packages/shared-types/src/runtime-template.ts` 导出 `RuntimeTemplate` / `RuntimeTemplateInputField` / `RuntimeTemplateFlow`
- [ ] 文件 `packages/shared-types/src/validation/runtime-template.schema.json` 存在
- [ ] `RuntimeTemplate.flows[].nodes` 仅含 `{id, type}`（**不**含 params/position/dag 内部结构）
- [ ] `RuntimeTemplate` 与现有 `Template`（来自 `@prism/shared-types/template.ts`）类型并立存在，互相不引用
- [ ] 测试覆盖：最小模板（仅 id/version/inputs/flows/createdAt/updatedAt）/ 缺必填字段拒绝

---

## Task 5: ajv validator 封装 + 4 校验入口

- **id**: m1-a-t5
- **layer**: ui-skin
- **status**: completed
- **verify**: `pnpm --filter @prism/shared-types test -- --run validation`

### 验收标准

- [ ] 文件 `packages/shared-types/src/validation/index.ts` 存在
- [ ] 4 个导出：`validateDesignState` / `validateRenderRequest` / `validateRenderResult` / `validateRuntimeTemplate`
- [ ] 4 函数签名均为 `(input: unknown) => asserts input is <Type>`
- [ ] 抛出 `ValidationError extends Error`，含 `target: string` + `errors: AjvError[]`
- [ ] ajv 配置：`{ allErrors: true, strict: true, removeAdditional: false, useDefaults: true }`
- [ ] ajv 用 `$ref` 解析跨 schema 引用
- [ ] `packages/shared-types/package.json` 添加 `ajv` 到 `dependencies`（runtime，非 devDependency）
- [ ] 校验失败时，错误信息含 JSON Pointer 路径
- [ ] 校验成功时不调用 `JSON.stringify` / 不修改入参（pure function）
- [ ] 测试覆盖：合法对象不抛 / 非法对象抛 ValidationError / multiple errors 全报告

---

## Task 6: packages/shared-types/src/index.ts 导出 + README

- **id**: m1-a-t6
- **layer**: ui-skin
- **status**: pending
- **verify**: `pnpm --filter @prism/shared-types typecheck`

### 验收标准

- [ ] `packages/shared-types/src/index.ts` 追加 4 个 `export *`
- [ ] `packages/shared-types/README.md` 增补"M1-A 公共契约"章节，列出 4 类型与 4 校验入口
- [ ] README 必须包含：版本策略、序列化约束、`asserts` 类型守卫说明
- [ ] 不修改现有类型或导出；只追加
- [ ] `pnpm typecheck` 通过；`pnpm --filter @prism/shared-types test` 全部通过

---

## Task 7: OpenSpec M1-A 收尾

- **id**: m1-a-t7
- **layer**: meta
- **status**: pending
- **verify**: `cat openspec/changes/m1-a-design-state-types/tasks.md | grep status`

### 验收标准

- [ ] 所有 6 个具体 task 状态为 `completed`
- [ ] M1-A 全套单元测试通过
- [ ] 不动架构文档 / 不动 roadMap / 不动 guardrail
- [ ] 可以 archived 后由 `/opsx-archive` 处理

---

## 依赖关系

```
T1 (DesignState) ──┐
T2 (RenderRequest) │   依赖 T5
T3 (RenderResult)  │───┘    依赖 T1
T4 (RuntimeTemplate)       独立
T5 (ajv 封装)   ──┬── 依赖 T1-T4
                  │
T6 (index + README) ── 依赖 T1-T5
T7 (收尾) ── 依赖 T1-T6
```

---

## 回退方式

- 删除整个 `openspec/changes/m1-a-design-state-types/` 目录
- `git checkout -- packages/shared-types/src/index.ts packages/shared-types/package.json packages/shared-types/README.md`
- 删除 `packages/shared-types/src/{design-state,render-request,render-result,runtime-template,validation}/` 整个子树
