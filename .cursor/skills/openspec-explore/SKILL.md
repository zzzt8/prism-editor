---
name: openspec-explore
description: 探索模式。先结构分析，再深入问题。量化切换标准，安全过渡到 propose。
version: "3.1"
category: explore
tags:
  - openspec
  - layer:meta
aliases:
  - /opsx-explore
depends_on: []
permissions: []
risks: []
verify:
  - typecheck
---

> **前置共享片段：** layer 映射见 [\_shared/SHARED-LAYERS.md](../_shared/SHARED-LAYERS.md)。

## Code Mutation Gate（硬关卡）

> **边界规则 — 非 apply 阶段禁止代码变更。**

| 阶段 | 允许的操作 | 禁止的操作（一旦发生即为越权） |
|------|-----------|--------------------------|
| `/opsx-explore` | 读取文件、扫描结构、生成 Impact Map、追问用户 | **修改代码**、创建文件、改接口 |
| `/opsx-propose` | 调用 CLI 生成 artifacts | 修改代码 |
| `/opsx-verify` | 检查一致性、读测试输出 | 修改代码 |
| `/opsx-archive` | 确认状态、调用 CLI | 修改代码 |
| `/opsx-apply` | **全部操作（含代码变更）** | — |

**越权处理（强制）：**
- 一旦在非 apply 阶段发现代码变更，立即停止当前动作
- 输出：`[opsx-explore] 越权：代码变更只能发生在 /opsx-apply`
- 记录本次越权内容
- 询问用户：是否切换到 `/opsx-apply` 继续，或撤销本次变更

## 核心职责

- 扫描代码库结构
- 标注影响层
- 探索问题空间
- 捕获决策

## 执行流程

### 1. 快速检查 OpenSpec 状态

```bash
openspec list --json
```

了解当前有哪些 active changes。

### 2. 结构分析优先

不是上来就问问题，而是先读取相关代码：

- 扫描相关目录：`packages/*/src/**`, `apps/*/src/**`, `server/src/**`
- 识别关键模块和数据流
- 标注影响层

生成简短的 `## Impact Map`。

### 2b. Task Anchor 声明（强制输出）

在开始问题空间探索之前，必须先声明原始任务边界：

```markdown
## Task Anchor

- **原始任务**：[用户最初提出的任务描述，回显]
- **本次用户追加内容**：[约束/澄清/非目标/新需求]
- **追加内容类型判定**：约束 / 澄清 / 非目标 / 新需求
- **是否改变任务主题**：是 / 否

判定逻辑：
- 若是"约束"或"非目标" → 只能在当前任务下收紧边界
  - 将约束写入当前任务的 Scope/非目标段
  - **禁止**建议创建新的 change
- 若是"新需求" → 询问用户：纳入当前 change 还是另建新 change
- 若改变了任务主题 → 停止当前任务，建议新建 change，明确告知用户
```

> **为什么需要这个块：**
> 防止"透明背景暂不支持"这样的非目标限制被误升级为新任务。
> 约束只收缩边界，不替换目标。

### 3. 问题空间探索

在完成结构分析后：
- 追问澄清问题
- 可视化现有架构（使用 ASCII diagrams）
- 对比候选方案
- 标注哪些是 unknowns

### 4. 决策捕获

何时结晶 → 建议进入 propose

| 洞察类型 | 捕获到 |
|---------|--------|
| 新需求发现 | specs/ |
| 需求变更 | specs/ |
| 技术决策 | design.md |
| 范围变更 | proposal.md |
| 工作项 | tasks.md |

## 切换到 propose 的量化标准

> 当探索达到以下条件时，建议用户切换到 `openspec-propose` 或执行 change-splitting。

**必须满足（全部）：**
- [ ] 核心问题已有**清晰的技术理解**
- [ ] 改动范围已标注到 layer 级别
- [ ] 用户**明确表示**要开始实现

**强烈建议切换（满足任意一条）：**
- [ ] 有 3 个以上的 unknowns 已被回答
- [ ] 已画出至少 1 个 ASCII 架构图描述现状和目标状态
- [ ] 发现本次改动可能影响其他 active change（需要协调）
- [ ] 涉及数据迁移或 Prisma schema 变更

**可以考虑切换（满足任意一条）：**
- [ ] 有 1-2 个 unknowns，但不影响主流程
- [ ] 用户主动说"差不多清楚了，先跑起来"

**继续探索（不切换）：**
- [ ] 5 个以上 unknowns，且相互依赖
- [ ] 用户仍在收集需求阶段
- [ ] 需要对比 2 个以上候选方案

**切换时的沟通话术：**
```
探索已经比较充分了，具备了进入 propose 的条件：
- 技术方向已明确（涉及 X layer）
- 改动范围已界定
- 有 N 个 unknowns 已被解答

建议运行 /opsx-propose 来正式创建 change 并生成 artifacts。
```

**使用 change-splitting 的判断：**

满足以下任一条件时，建议在 propose 阶段执行 change-splitting（见 openspec-propose SKILL.md）：
- 预期需要 3 个以上子 change
- 存在 change 间依赖
- 专家规划文档已存在

不满足以上条件，直接走 `/opsx-propose`。

## Guardrails

- **禁止**在 explore 阶段实现代码
- **禁止**跳过结构分析直接讨论方案
- **可用** ASCII diagrams 可视化架构
- **不要**强制产出特定 artifact
- **强制**提供量化标准，帮助判断切换时机
- **强制**区分简单需求（/opsx-propose）和复杂重构（/opsx-propose + change-splitting）
- **强制**在结构分析前输出 Task Anchor 声明块
- **强制**识别并声明用户追加内容属于"约束/非目标"还是"新需求"
- **强制**约束类追加内容写入当前任务 Scope，禁止建议新建 change
- **强制**若判定追加内容改变了任务主题，必须明确告知用户并等待确认
- **强制**非 apply 阶段禁止任何代码变更（create/edit/delete）
- **强制**一旦发生越权，立即停止并报告，不得自行继续
