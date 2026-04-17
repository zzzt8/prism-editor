## Context

C5 是平台基础能力预埋，目标是给未来 change 留下干净的类型接口，而非交付具体功能。主要补齐三个缺口：执行日志、权限模型、运行协议。

---

## Goals / Non-Goals

**Goals:**

- 定义 `ExecutionLog` 类型，记录工作流执行的完整生命周期
- 定义 `AuthRole` / `AuthPermission` 权限模型类型
- 定义 `RuntimeProtocol` 运行协议抽象
- 在 executionSlice 中埋入日志记录点（实际持久化暂不实现）

**Non-Goals:**

- 执行日志的持久化存储（→ server 扩展）
- 权限 UI（→ P2）
- RuntimeProtocol 的具体 API 实现

---

## Decisions

### Decision 1: ExecutionLog 持久化策略

**选项 A**: 在 shared-types 中定义类型，executionSlice 记录到内存，暂不持久化

**选项 B**: 定义类型 + IndexedDB 持久化

**选择: A**

理由：C5 是预埋，持久化需要 server 配合，当前阶段仅做类型定义和内存记录点。

---

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| 类型定义与实际使用脱节 | 执行 slice 中埋入记录点，实际接入在后续 change |
| 权限模型过于简化 | 当前三层，后续可扩展 |

---

## change_class = low 测试指南

### Low-change 验证命令标准写法

```markdown
- [ ] T1.1: 定义 ExecutionLog 类型
  - 验证命令：`pnpm typecheck --filter=@prism/shared-types`
```

### Backward Compatibility

- [ ] 现有 executionSlice 不受影响（日志记录为可选副作用）
- [ ] 现有 user-app 消费方式不受影响（RuntimeProtocol 为新增抽象）
