---
name: openspec-quick
description: 轻量改动直达实现。先判定边界，再自动选择 ECC lane 执行与验证。
version: "1.0"
category: quick
tags:
  - openspec
  - quick
  - layer:meta
aliases:
  - /opsx-quick
depends_on: []
verify:
  - typecheck
---

> **定位：** `openspec-quick` 不是 OpenSpec 五阶段的一部分，而是面向**轻量任务**的快速通道。
> 适用于“无需建立 change artifacts、无需跨层设计评审、可直接实现并验证”的改动。
> quick 通过后，默认**自动选择 ECC lane**，把 ECC 作为实现与验证的 SOP 增强层。

## 1. 先做 Quick Gate（必须）

先判断任务是否满足轻量条件。

### 允许进入 `/opsx-quick`

满足 **全部** 条件才可继续：

- 改动目标清晰，不需要额外需求探索
- 修改范围局部，通常在 1-3 个目录内
- 不需要新增或修改 OpenSpec change artifacts
- 不涉及跨层架构决策
- 可以用少量命令完成验证

### 命中以下任一项，禁止继续 quick，必须升级

若命中任一项，立即停止 quick，建议切换到 `openspec` 流程：

- 需要改 `workflow-core`
- 需要改 `image-ops`
- 需要改 `node-definitions`
- 需要改 executor
- 需要改 server Prisma schema
- 需要改 published API contract
- 需要改跨包共享运行时契约，且影响多个消费方
- 需要数据迁移
- 需要设计多个候选方案
- 需要拆成多阶段实施

**升级建议：**
- 需求还不清楚 → `/opsx-explore`
- 已清楚但需要正式建 change → `/opsx-propose`

## 2. 输出 Quick Decision（强制）

在开始修改前，必须先输出以下结构：

```markdown
## Quick Decision

- task: <一句话回显用户任务>
- mode: quick / escalate
- reason: <为什么可走 quick，或为什么必须升级>
- scope: <涉及目录/文件>
- ecc_lane: <自动选择的 ECC lane；若升级则填 none>
- verify: <计划执行的验证命令>
```

如果 `mode = escalate`：
- 停止修改
- 明确建议用户切到 `/opsx-explore` 或 `/opsx-propose`

如果 `mode = quick`：
- 先执行“ECC lane 自动选择”
- 再继续后续步骤

## 3. 实施边界

`/opsx-quick` 的默认实现规则：

- 只做**最小必要改动**
- 优先补文档、类型、局部适配层、小范围修复
- 不主动扩大 scope
- 不顺手重构无关代码
- 不创建 OpenSpec change
- 不补 proposal/design/tasks artifacts

适合的任务类型：

- 新增类型定义
- 文档补充
- 小范围文案/配置调整
- 局部 bug fix
- 单点 import/export 修复
- 局部类型错误修复

不适合的任务类型：

- 新业务链路落地
- 跨 editor/runtime/backend 的联动改造
- 发布流程改造
- 持久化模型升级
- 执行引擎行为变更

## 4. ECC lane 自动选择

Quick Gate 通过后，必须自动选择 ECC lane。

### 选择顺序

1. 优先读取显式信号：用户要求、任务标题、目标路径、验证命令
2. 若存在多个候选 lane，按“主实现风险最高者优先”选择主 lane
3. 若仍无法判断，默认使用 `code-reviewer`

### 默认映射

| 命中信号 | ECC lane |
|---|---|
| `api` / `route` / `schema` / `contract` / `repository` / `auth` / `published` | `api-design` |
| `test` / `spec` / `assertion` / `coverage` / `*.test.ts` / `*.spec.ts` | `tdd-workflow` |
| `build` / `typecheck` / `lint` / `ci` / 构建报错修复 | `build-error-resolver` |
| `refactor` / `cleanup` / `consistency` / 小范围结构整理 | `code-reviewer` |
| `security` / `jwt` / `permission` / `validation` | `security-reviewer` |
| `e2e` / `flow` / `visual` / UI 主链路交互 | `e2e-runner` |

### 执行规则

- 只选择一个**主 lane** 作为默认 SOP
- 如存在明显辅助需求，可在摘要中记录 secondary lane，但不扩大为完整 OpenSpec apply 流程
- lane 选择结果必须写入 `Quick Decision`

## 5. 执行流程

### Step 1 — 读取上下文

至少读取：
- 目标文件
- 相邻文件
- 相关导出入口
- 受影响说明文档（若存在）
- 与所选 ECC lane 直接相关的错误/测试/契约上下文

### Step 2 — 按 ECC lane 做最小实现

修改原则：
- 优先最小改动
- 与现有代码风格保持一致
- 新增内容只覆盖当前任务边界
- 实现与验证遵循所选 ECC lane 的 SOP

### Step 3 — 按 ECC lane 做最小验证

优先执行与改动最接近的验证：

- 单包 build
- 单应用 build
- 定向 typecheck
- 定向 lint
- lane 对应的最小测试或检查

只在必要时扩大到更大范围验证。

## 6. 验证建议矩阵

按改动类型选择验证：

| 改动类型 | 推荐验证 |
|---|---|
| 文档 only | 可不跑构建；必要时检查引用路径 |
| 类型文件 | `pnpm --filter <pkg> build` 或 `typecheck` |
| 单应用 UI 文案/局部组件 | `pnpm build:<app>` |
| server 局部 TS 改动（非 schema） | `pnpm --filter @prism/server build` |
| 多处 export/import 调整 | 受影响包逐个 build |

如果用户明确给出验证命令，优先执行用户指定命令。

## 7. 失败处理

### quick 内可自行修复的失败

- import/export 路径错误
- 简单 TS 类型错误
- 漏导出
- 文档路径错误

### 必须停止并升级的失败

如果修复过程中发现：

- 真实影响面比预估更大
- 需要改运行时契约
- 需要改多个 layer 的协同逻辑
- 需要设计迁移方案

则必须停止 quick，并输出：

```markdown
## Quick Escalation

- reason: <发现的问题>
- from: /opsx-quick
- to: /opsx-explore or /opsx-propose
- expanded_scope: <新增影响范围>
```

## 8. 完成后输出摘要

```markdown
## Quick 完成

- scope: <实际修改文件/目录>
- ecc_lane: <实际使用的主 lane>
- changed: <1-3 条核心改动>
- verify: <执行过的验证及结果>
- escalation: none / required
```

## 9. 经验法则

### 优先 quick

当任务满足以下特征时，优先 `/opsx-quick`：

- “补一个类型/导出”
- “加一份文档”
- “修一个明确的小问题”
- “不改行为，只补抽象层”

### 优先 OpenSpec

当任务满足以下特征时，优先 `openspec`：

- “设计一个新能力并分阶段推进”
- “会影响运行逻辑或发布契约”
- “要先讨论方案，再决定怎么做”
- “后续还会继续扩展这一改动”
