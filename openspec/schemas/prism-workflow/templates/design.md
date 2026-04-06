## Context

<!-- Background and current state -->

## Goals / Non-Goals

**Goals:**
<!-- What this design aims to achieve -->

**Non-Goals:**
<!-- What is explicitly out of scope -->

## Decisions

<!-- Key design decisions and rationale -->

## Risks / Trade-offs

<!-- Known risks and trade-offs -->

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