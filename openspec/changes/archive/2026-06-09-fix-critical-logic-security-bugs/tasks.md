## Test Plan

> 本 change 涉及 engine 层和 backend 层。

### 测试策略

| 层级 | 测试类型 | 验证命令 |
|------|----------|----------|
| engine | 单元测试 | `pnpm test --filter=@prism/workflow-core --run && pnpm test --filter=@prism/image-ops --run` |
| backend | API 验证 | `pnpm test --filter=@prism/server --run` |
| editor | 类型检查 | `pnpm typecheck --filter=@prism/user-app` |
| runtime | 类型检查 | `pnpm typecheck --filter=@prism/dev-tool` |

### Test Cases

#### TC-1: exportExecutor 接受用户参数
- **Given**: `export-image.ts` 中的 `exportExecutor` 调用
- **When**: 用户通过 `params` 传入 `format: 'jpeg'`, `quality: 0.8`
- **Then**: `exportImage` 收到正确的参数值，不再硬编码

#### TC-2: ParamsSection hooks 调用顺序
- **Given**: `ParamsSection` 组件，`visibleFields.length === 0`
- **When**: 组件渲染
- **Then**: `useCallback` 在 return 之前被调用，React 不报警

#### TC-3: Auth middleware 检查黑名单
- **Given**: 用户 accessToken 已在 `RevokedToken` 表中
- **When**: 请求携带该 token 访问受保护路由
- **Then**: 返回 401，不处理请求

#### TC-4: Transform translateX/Y 生效
- **Given**: Transform 节点设置 `translateX: 50`
- **When**: 执行工作流
- **Then**: 输出图像相对于输入向右平移 50px

#### TC-5: Published params 锁定顺序
- **Given**: nodeConfig 中 `_internalParams.opacity = 0.5`，`params.opacity = 0.8`，`exposedParams.opacity = 1.0`
- **When**: `PublishedWorkflowExecutor` 合并参数
- **Then**: 最终 `opacity = 0.5`（developer-locked 最高优先级）

#### TC-6: WorkerPool 无重复 push
- **Given**: Worker 实例化在 Comlink ping 之前抛出异常
- **When**: `createWorker` 执行
- **Then**: `workers` 数组中该 worker 只出现一次

#### TC-7: selectWorker 均匀轮询
- **Given**: 2 个 idle workers
- **When**: 连续调用 4 次 `selectWorker`
- **Then**: 每个 worker 被选中 2 次，顺序均匀

### Backward Compatibility

- [x] 现有 published workflow 仍可运行（参数修复为加性，缺失时回退默认值）
- [x] 现有 node package 兼容（仅修改已有逻辑）
- [x] API 端点向后兼容（auth middleware 改动不改变接口）
- [x] 数据迁移安全（不涉及 schema 变更）

---

## 任务列表（change_class = high）

<!-- opsx-meta
id: T1
layer: engine
verify: unit-tests
dependencies:
  - type: task
    refs: []
-->
- [x] T1: BUG-1 修复 `exportExecutor` 硬编码参数
  - layer: engine
  - 文件: `packages/image-ops/src/export-image.ts`
  - 改动: 从 `_params` 读取 `format`、`quality`、`width`、`height`，传给 `exportImage`
  - 验证命令: `pnpm test --filter=@prism/image-ops --run`

<!-- opsx-meta
id: T2
layer: editor
verify: unit-tests
dependencies:
  - type: task
    refs: []
-->
- [x] T2: BUG-2 修复 `ParamsSection` hooks 调用顺序违规
  - layer: editor
  - 文件: `apps/user-app/src/components/ParamsSection/index.tsx`
  - 改动: 将 `useCallback` 移到 `if (visibleFields.length === 0) return null` 之前
  - 验证命令: `pnpm typecheck --filter=@prism/user-app`

<!-- opsx-meta
id: T3
layer: backend
verify: unit-tests
dependencies:
  - type: task
    refs: []
-->
- [x] T3: BUG-3 修复 AccessToken 黑名单检查缺失
  - layer: backend
  - 文件: `server/src/middleware/auth.ts`
  - 改动: 在 `authenticate` 函数中添加 `isTokenBlacklisted` 检查（需要 import）
  - 验证命令: `pnpm test --filter=@prism/server --run`

<!-- opsx-meta
id: T4
layer: engine
verify: unit-tests
dependencies:
  - type: task
    refs: [T1]
-->
- [x] T4: BUG-4 修复 `transform.ts` translateX/Y 被忽略
  - layer: engine
  - 文件: `packages/image-ops/src/transform.ts`
  - 改动: (a) 添加 `translateX`/`translateY` 到 `transformOptions` 对象；(b) 在 `transformImage` 中实现平移（使用 canvas `translate`）
  - 验证命令: `pnpm test --filter=@prism/image-ops --run`

<!-- opsx-meta
id: T5
layer: engine
verify: unit-tests
dependencies:
  - type: task
    refs: []
-->
- [x] T5: BUG-5 修复 params 合并顺序与注释矛盾
  - layer: engine
  - 文件: `packages/workflow-core/src/published-executor.ts`
  - 改动: 调整 spread 顺序为 `{ ...params, ..._internalParams, ...exposedParams }`，更新注释
  - 验证命令: `pnpm test --filter=@prism/workflow-core --run`

<!-- opsx-meta
id: T6
layer: engine
verify: unit-tests
dependencies:
  - type: task
    refs: []
-->
- [x] T6: BUG-6 修复 WorkerPool 重复 push 和 selectWorker 索引
  - layer: engine
  - 文件: `packages/image-ops/src/scheduler/workerPool.ts`
  - 改动: (a) catch 块 push 前加守卫 `if (!this.workers.includes(pooledWorker))`；(b) 删除循环体中的 `this.currentWorkerIndex++`
  - 验证命令: `pnpm test --filter=@prism/image-ops --run`

<!-- opsx-meta
id: T7
layer: backend
verify: command
dependencies:
  - type: task
    refs: [T3]
-->
- [x] T7: BUG-7 修复 Content-Disposition 特殊字符过滤
  - layer: backend
  - 文件: `server/src/routes/workflow.ts`
  - 改动: 使用更安全的文件名处理（移除 RFC 5987 特殊字符）
  - 验证命令: `pnpm typecheck --filter=@prism/server`

<!-- opsx-meta
id: T8
layer: meta
verify: command
dependencies:
  - type: task
    refs: [T1, T2, T3, T4, T5, T6, T7]
-->
- [x] T8: 全局验证
  - layer: meta
  - 验证命令: `pnpm typecheck && pnpm test --run`
  - 改动: 无代码改动，仅运行验证

---

## N. 质量合规性验收

### N.1 执行引擎完整性

> 本 change 不涉及拓扑排序和 executor 错误隔离修改，但 T1/T4/T6 触发的 engine 测试可验证无回归。

- [ ] N.1.1 拓扑排序测试覆盖（含 cycle detection）：不涉及
- [ ] N.1.2 节点 executor 错误隔离测试：不涉及，exportExecutor 已有 try/catch
- [ ] N.1.3 AbortController 链路测试（取消后结果保留）：不涉及

### N.2 状态一致性

- [ ] N.2.1 Canvas 执行状态机转换测试：不涉及
- [ ] N.2.2 取消后 Zustand store 状态检查：不涉及

### N.3 Registry 与 API 契约

- [ ] N.3.1 Node Registry 重复注册报错验证：不涉及
- [ ] N.3.2 Prisma migration 验证：`prisma migrate status` — 不涉及 schema 变更
- [ ] N.3.3 现有 workflow JSON 向后兼容验证：T1/T5 修复为加性，不破坏兼容性

### N.4 交互完整性

- [ ] N.4.1 无 `onClick={() => {}}` 占位交互：T2 为 React 修复，不涉及占位交互
- [ ] N.4.2 错误文案可读性检查：manual (optional)

### N.5 安全与类型

- [ ] N.5.1 `as any` 使用检查：`grep -r " as any" --include="*.ts" --include="*.tsx" --exclude="*.test.ts" --exclude="*.spec.ts" packages/ apps/` — 无新增
- [ ] N.5.2 API 输入 Zod 验证覆盖：不涉及新 API

---

## Layer 优先级执行策略

按 engine > backend > editor > meta 顺序执行：
- T1 (engine) → T4 (engine, 依赖 T1) → T5 (engine) → T6 (engine)
- T3 (backend) → T7 (backend, 依赖 T3)
- T2 (editor)
- T8 (meta, 依赖所有)
