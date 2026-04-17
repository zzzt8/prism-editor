## 任务列表

<!-- opsx-meta
id: T1
layer: engine
verify: unit-tests
dependencies:
  - type: task
    refs: []
-->
- [x] T1.1: 定义 ExecutionLog 类型
  - layer: engine
  - 文件: `packages/shared-types/src/execution-log.ts`
  - 内容:
    - `ExecutionLog` 接口：runId, workflowId, publishedConfigId, inputs, outputs, status, startedAt, completedAt, duration, nodeTimings[], errors[]
    - `NodeTiming` 接口：nodeId, nodeType, duration, status
    - `ExecutionError` 接口：nodeId, error, timestamp
  - 验证命令：`pnpm typecheck --filter=@prism/shared-types`

<!-- opsx-meta
id: T2
layer: engine
verify: unit-tests
dependencies:
  - type: task
    refs: []
-->
- [x] T2.1: 定义 Auth 权限模型类型
  - layer: engine
  - 文件: `packages/shared-types/src/auth.ts`
  - 内容:
    - `AuthRole` 枚举：author | operator | admin
    - `AuthPermission` 枚举：read | execute | edit | publish | manage
    - `RolePermissions` 映射：每个角色对应的权限集合
    - `AuthContext` 接口：userId, roles[], permissions[]
  - 验证命令：`pnpm typecheck --filter=@prism/shared-types`

<!-- opsx-meta
id: T3
layer: engine
verify: unit-tests
dependencies:
  - type: task
    refs: []
-->
- [x] T3.1: 定义 RuntimeProtocol 类型
  - layer: engine
  - 文件: `packages/shared-types/src/runtime-protocol.ts`
  - 内容:
    - `RuntimeProtocol` 接口：type(page | api | embed), endpoints?, embedConfig?
    - `RuntimeEndpoint` 接口：method, path, params, headers
    - `EmbedConfig` 接口：containerId, theme, onResult
  - 验证命令：`pnpm typecheck --filter=@prism/shared-types`

<!-- opsx-meta
id: T4
layer: editor
verify: smoke-test
dependencies:
  - type: task
    refs: [T1]
-->
- [x] T4.1: 在 shared-types index.ts 中导出新类型
  - layer: engine
  - 文件: `packages/shared-types/src/index.ts`
  - 内容: 导出 execution-log, auth, runtime-protocol

<!-- opsx-meta
id: T5
layer: editor
verify: smoke-test
dependencies:
  - type: task
    refs: [T1]
-->
- [x] T5.1: 在 executionSlice 中埋入日志记录点
  - layer: editor
  - 文件: `apps/dev-tool/src/modules/editor/stores/executionSlice.ts`
  - 内容:
    - 执行开始时创建 ExecutionLog 记录
    - 节点执行完成时记录 nodeTimings
    - 执行异常时记录 errors
    - 执行完成时计算 duration
    - 日志存储到内存（暂不持久化）
  - 验证命令: `pnpm typecheck --filter=@prism/dev-tool`

---

### 手工验收清单

- [ ] typecheck 通过
- [ ] ExecutionLog 类型可正常导入
- [ ] executionSlice 执行后内存中存在 ExecutionLog 记录
