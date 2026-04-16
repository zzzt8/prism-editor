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

## Architecture Review（技术方案评审）

> 当 change 涉及以下任一情况时，必须填写此章节：
> - 影响 workflow-core / published protocol / node package / server schema
> - 跨 app 改动（dev-tool + server 或 user-app + server）
> - 涉及数据迁移或协议兼容

### 目标

[明确本次技术方案要解决的核心问题]

### 约束

- 技术约束: ...
- 时间约束: ...
- 不变量: ...

### 候选方案

#### 方案 A
**Pros**:
- ...

**Cons**:
- ...

#### 方案 B
**Pros**:
- ...

**Cons**:
- ...

### 决策

选择方案 B，原因：
1. ...
2. ...

### 风险与回滚

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| ... | ... | ... | ... |

**回滚方案**: ...

### Migration Strategy（迁移策略）

1. 数据迁移脚本
2. 灰度发布步骤
3. 回滚触发条件

---

## change_class 分层处理指南

> 根据 proposal 顶部的 `change_class` 字段选择对应模板。

### change_class = high

使用上方完整的 Architecture Review 章节。

### change_class = low

> Low-risk change，跳过 formal Architecture Review。
> 仅需在下方填写简要设计说明。

**简要设计说明：**
<!-- 简要描述技术方案（1-3 句话）-->

**替代方案考虑：**
<!-- 简要说明为何选择此方案而非更简单的替代方案 -->
