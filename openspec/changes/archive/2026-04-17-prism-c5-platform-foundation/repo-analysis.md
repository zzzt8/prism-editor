## 影响层（Impact Map）

| 影响层 | 涉及模块 | 影响原因 |
|--------|----------|----------|
| engine | `packages/shared-types/` | 新增 execution-log.ts、auth.ts、runtime-protocol.ts |
| editor | `apps/dev-tool/` | executionSlice 扩展记录日志 |
| runtime | `apps/user-app/` | 按 RuntimeProtocol 消费发布物 |
| backend | `server/` | Auth 相关 schema 扩展（参考） |
| ui-skin | `packages/shared-ui/` | 不涉及 |

---

## 关键模块

### ExecutionLog 类型（新增）

- **位置**: `packages/shared-types/src/execution-log.ts`
- **职责**: 记录每次工作流执行的完整上下文，供问题追踪和性能分析
- **字段**: runId, workflowId, publishedConfigId, inputs, outputs, status, startedAt, completedAt, duration, nodeTimings[], errors[]

### Auth 权限模型（新增）

- **位置**: `packages/shared-types/src/auth.ts`（server 已有 auth schema，需同步到 shared-types）
- **职责**: 定义最小三层权限体系（author / operator / admin）

### RuntimeProtocol（新增）

- **位置**: `packages/shared-types/src/runtime-protocol.ts`
- **职责**: 统一描述发布物的消费方式（页面 / API / 嵌入模块）

---

## 现有问题

1. **ExecutionLog 缺失**：执行记录无法持久化，问题无法追踪
2. **Auth 类型散落**：server/auth.ts 有局部类型，shared-types 无对应定义
3. **RuntimeProtocol 未抽象**：user-app 消费发布物的接口未从协议层面固化

---

## Impact Summary

本次 change 影响：

- **新增依赖**: 无
- **破坏性变更**: 无
- **向后兼容**: 完全向后兼容
