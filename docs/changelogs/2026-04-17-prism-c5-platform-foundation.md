# Changelog — prism-c5-platform-foundation

归档时间：2026-04-17
状态：archived

## 变更摘要

本次归档涉及以下代码变更：

| 文件 | 变更 |
|------|------|
| `packages/shared-types/src/execution-log.ts` | 新增 ExecutionLog / NodeTiming / ExecutionError 接口（P1-6 执行日志模型） |
| `packages/shared-types/src/auth.ts` | 新增 AuthRole / AuthPermission / RolePermissions / AuthContext 三层权限模型（P1-5） |
| `packages/shared-types/src/runtime-protocol.ts` | 新增 RuntimeProtocol / RuntimeEndpoint / EmbedConfig 运行协议抽象（架构约束 6.1） |
| `packages/shared-types/src/index.ts` | 导出 execution-log / auth / runtime-protocol 三个模块 |
| `apps/dev-tool/src/modules/editor/stores/useCanvasStore.ts` | ExecutionLog 生命周期集成：开始时创建记录、progressCallback 记录节点耗时、完成时计算 duration/errors/outputs |

涉及 layers：`engine`, `editor`

## 关键决策

1. **ExecutionLog 持久化策略**：在 shared-types 中定义类型，executionSlice 记录到内存，暂不持久化（持久化依赖 server 扩展）
2. **日志记录点**：T5.1 在 `useCanvasStore.ts` 的 `executeWorkflow()` 中埋入记录点，作为可选副作用，不影响现有执行逻辑

## README 同步建议

**当前 README 内容：**
> 平台基础能力：运行协议抽象、基础权限模型、执行日志

**Proposal Goal：**
> 定义 ExecutionLog / AuthRole+AuthPermission / RuntimeProtocol 三类平台基础类型；在 executionSlice 中埋入日志记录点；为未来 change 预留干净的类型接口

**同步检查：**
- [x] README 是否准确反映本次 change 的核心目标？ — 是，简洁描述了三大能力
- [ ] 是否需要同步至总 README？ — 建议在项目总 README 的功能列表中确认包含"平台基础能力（执行日志/权限模型/运行协议抽象）"条目

## 归档元数据

- Git commit：`d6d1ff4`
- 涉及 layers：engine, editor
- Tasks 完成数：5/5（所有 tasks 已完成）
