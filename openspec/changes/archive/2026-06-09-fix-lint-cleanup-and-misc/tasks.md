## Test Plan

> 本 change 涉及全项目 lint 清理和 4 个杂项修复。

### 测试策略

| 层级 | 测试类型 | 验证命令 |
|------|----------|----------|
| 全项目 | 类型检查 | `pnpm typecheck` |
| 全项目 | Lint | `pnpm lint` |
| 全项目 | 单元测试 | `pnpm test --run` |

### Test Cases

#### TC-1: ESLint 全绿
- **Given**: 所有源文件
- **When**: `pnpm lint` 执行
- **Then**: 无 error 输出（warning 允许存在）

#### TC-2: WorkerPool replaceWorker 超时
- **Given**: Worker 永远无法达到 idle 状态
- **When**: `replaceWorker` 被调用
- **Then**: 30s 后 resolve，不再无限轮询

#### TC-3: transform.ts 无日志残留
- **Given**: `transform.ts`
- **When**: `grep -r "console.log" packages/image-ops/src/transform.ts`
- **Then**: 无匹配

#### TC-4: memory-manager memoryUsed 准确
- **Given**: 同一 URL 被 `registerRef` 多次调用
- **When**: `registerRef` 对新条目增加 memoryUsed
- **Then**: `memoryUsed` 不会变为负数

#### TC-5: 执行前清理旧 AbortController
- **Given**: 上一次执行未完成
- **When**: `executeWorkflow` 被再次调用
- **Then**: 旧 controller 被 abort，新的被创建

### Backward Compatibility

- [x] 现有 published workflow 仍可运行（纯 lint + 稳定性修复）
- [x] 现有 node package 兼容
- [x] API 端点向后兼容
- [x] 数据迁移安全（无 schema 变更）

---

## 任务列表（change_class = medium）

- [x] T1: Lint 清理 — `shared-types` 包
  - layer: meta
  - 文件: `packages/shared-types/src/auth.ts`、`execution.ts`、`port-data-types.ts`、`runtime-protocol.ts`、`storage.ts`、`port-types.ts`
  - 改动: 未使用 enum 值和接口参数加 `_` 前缀
  - 验证命令: `pnpm lint 2>&1 | grep -c "shared-types"`

- [x] T2: Lint 清理 — `image-ops` 包
  - layer: meta
  - 文件: `packages/image-ops/src/scheduler/taskQueue.ts`、`workerRunner.ts`、`task-scheduler.ts`、`test-setup.ts`
  - 改动: 未使用变量加 `_` 前缀或删除
  - 验证命令: `pnpm lint 2>&1 | grep -c "image-ops"`

- [x] T3: Lint 清理 — `core` 包
  - layer: meta
  - 文件: `packages/core/src/globalRegistry.ts`
  - 改动: 未使用的函数参数加 `_` 前缀
  - 验证命令: `pnpm lint 2>&1 | grep -c "packages/core"`

- [x] T4: Lint 清理 — `dev-tool` 包
  - layer: meta
  - 文件: `apps/dev-tool/src/components/NodePanel.tsx`、`store/authStore.ts`、`utils/portTypeStyles.ts`
  - 改动: 未使用变量处理
  - 验证命令: `pnpm lint 2>&1 | grep -c "dev-tool"`

- [x] T5: Lint 清理 — `user-app` 包
  - layer: meta
  - 文件: `apps/user-app/src/modules/runner/runStore.ts`
  - 改动: 未使用变量处理
  - 验证命令: `pnpm lint 2>&1 | grep -c "user-app"`

- [x] T6: Lint 清理 — `shared-ui` 包
  - layer: meta
  - 文件: `packages/shared-ui/src/components/ErrorBoundary/ErrorBoundary.tsx`、`Tooltip/Tooltip.tsx`
  - 改动: 未使用参数处理
  - 验证命令: `pnpm lint 2>&1 | grep -c "shared-ui"`

- [x] T7: Lint 清理 — `workflow-core` 包
  - layer: meta
  - 文件: `packages/workflow-core/src/cache.ts`
  - 改动: 未使用参数处理
  - 验证命令: `pnpm lint 2>&1 | grep -c "workflow-core"`

- [x] T8: FIX-2 — 删除 `transform.ts` 调试日志
  - layer: engine
  - 文件: `packages/image-ops/src/transform.ts`
  - 改动: 删除所有 `console.log` 调用
  - 验证命令: `grep "console.log" packages/image-ops/src/transform.ts` 应无输出

- [x] T9: FIX-1 — `replaceWorker` 添加超时
  - layer: engine
  - 文件: `packages/image-ops/src/scheduler/workerPool.ts`
  - 改动: 添加 `maxWaitMs` 配置，超时则 resolve
  - 验证命令: `pnpm test --filter=@prism/image-ops --run`

- [x] T10: FIX-3 — `memory-manager` 竞态修复
  - layer: engine
  - 文件: `packages/image-ops/src/memory-manager.ts`
  - 改动: `registerRef` 对新条目也增加 estimatedSize
  - 验证命令: `pnpm test --filter=@prism/image-ops --run`

- [x] T11: FIX-4 — `executeWorkflow` 清理旧 controller
  - layer: editor
  - 文件: `apps/dev-tool/src/modules/editor/stores/useCanvasStore.ts`
  - 改动: `executeWorkflow` 开始时调用 `get()._executionAbort?.()`
  - 验证命令: `pnpm typecheck --filter=@prism/dev-tool`

- [ ] T12: 全局验证
  - layer: meta
  - 验证命令: `pnpm typecheck && pnpm lint && pnpm test --run`

---

## N. 质量合规性验收

### N.1 执行引擎完整性

- [ ] N.1.1 拓扑排序测试覆盖：不涉及
- [ ] N.1.2 节点 executor 错误隔离测试：不涉及
- [ ] N.1.3 AbortController 链路测试：T11 FIX-4

### N.2 状态一致性

- [ ] N.2.1 Canvas 执行状态机转换测试：T11
- [ ] N.2.2 取消后 Zustand store 状态检查：T11

### N.3 Registry 与 API 契约

- [ ] N.3.1 Node Registry 重复注册报错验证：不涉及
- [ ] N.3.2 Prisma migration 验证：不涉及 schema 变更
- [ ] N.3.3 现有 workflow JSON 向后兼容验证：T1-T12

### N.4 交互完整性

- [ ] N.4.1 无 `onClick={() => {}}` 占位交互：无新增
- [ ] N.4.2 错误文案可读性检查：manual (optional)

### N.5 安全与类型

- [ ] N.5.1 `as any` 使用检查：T1-T12 lint 清理
- [ ] N.5.2 API 输入 Zod 验证覆盖：不涉及新 API
