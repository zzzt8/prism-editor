## Context

<!-- 背景和当前状态 -->

## Goals / Non-Goals

**Goals:**
<!-- 本设计要实现的目标 -->

**Non-Goals:**
<!-- 明确排除的范围 -->

## Decisions

<!-- 关键设计决策和理由 -->

## Risks / Trade-offs

<!-- 已知风险和权衡 -->

---

## Architecture Review

<!-- change_class = high 时填写完整；medium 时精简；low 时只需简要说明 -->

### 目标

[明确核心问题]

### 约束

- 技术约束: ...
- 时间约束: ...
- 不变量: ...

### 候选方案

<!-- low/medium 可跳过 -->

#### 方案 A

**Pros**: ...
**Cons**: ...

#### 方案 B

**Pros**: ...
**Cons**: ...

### 决策

选择方案...，原因：...

### 回滚方案

<!-- change_class = high 时填写 -->

---

## Review Checklist

<!-- change_class = high 时使用完整清单；medium 时使用简化版 -->

### 完整版（high）

- [ ] 方案是否覆盖 proposal 中所有 goal？
- [ ] 是否存在更简单的替代方案？
- [ ] 最坏情况回退路径是什么？
- [ ] 对现有 specs/ 有哪些 ADDED / MODIFIED / REMOVED？
- [ ] Layer 间是否有隐式依赖？

### 简化版（medium）

- [ ] 方案是否覆盖主要目标？
- [ ] 回退路径是否清晰？
- [ ] 影响是否可控？

### 轻量版（low）

> Low-risk change，跳过 formal review。

---

## 质量合规性

本设计遵循 [项目全局质量与交付规范](../../specs/QUALITY_STANDARDS.md)，决策已覆盖以下要求：

### 执行完整性覆盖

- 拓扑排序：[是否改动 / 改动影响]
- 节点级错误隔离：[executor 清单 / 错误处理方案]
- Cancellation 链路：[哪些节点参与取消 / signal 传递路径]

### 不变量检查

- Node Registry：[新增 type / 复用现有]
- API 契约：[是否涉及 schema 变更 / 向后兼容方案]

### 测试策略

- [ ] 单元测试：拓扑排序 + cycle detection
- [ ] 集成测试：executor 报错后下游节点继续执行
- [ ] 手工验收：取消操作后结果保留验证
