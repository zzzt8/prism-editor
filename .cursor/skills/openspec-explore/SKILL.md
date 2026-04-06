---
name: openspec-explore
description: 探索模式。先结构分析，再深入问题。量化切换标准，安全过渡到 propose。
---

> **前置共享片段：** layer 映射见 [\_shared/SHARED-LAYERS.md](../_shared/SHARED-LAYERS.md)。

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
- 标注影响层（见 [_shared/SHARED-LAYERS.md](../_shared/SHARED-LAYERS.md#layer-映射)）

生成简短的 `## Impact Map`。

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
| 新工作项 | tasks.md |
| 假设推翻 | 相关 artifact |

## 切换到 propose 的量化标准

> 当探索达到以下任一条件时，建议用户切换到 `openspec-propose`。
> 满足条件越多，切换时机越成熟。

**必须满足（全部）：**
- [ ] 核心问题已有**清晰的技术理解**（知道要改什么文件、大致怎么改）
- [ ] 改动范围已标注到 layer 级别（engine / backend / editor / runtime / ui-skin）
- [ ] 用户**明确表示**要开始实现

**强烈建议切换（满足任意一条）：**
- [ ] 有 3 个以上的 unknowns 已被回答
- [ ] 已画出至少 1 个 ASCII 架构图描述现状和目标状态
- [ ] 发现本次改动可能影响其他 active change（需要协调）
- [ ] 涉及数据迁移或 Prisma schema 变更

**可以考虑切换（满足任意一条）：**
- [ ] 有 1-2 个 unknowns，但不影响主流程
- [ ] 用户主动说"差不多清楚了，先跑起来"
- [ ] 实验性想法需要快速验证，但有基本方向

**继续探索（不切换）：**
- [ ] 5 个以上 unknowns，且相互依赖
- [ ] 用户仍在收集需求阶段
- [ ] 需要对比 2 个以上候选方案
- [ ] 涉及跨团队利益相关者讨论

**切换时的沟通话术：**
```
探索已经比较充分了，具备了进入 propose 的条件：
- 技术方向已明确（涉及 X layer）
- 改动范围已界定
- 有 N 个 unknowns 已被解答

建议运行 /opsx-propose 来正式创建 change 并生成 artifacts。
或者你想继续探索 Y 这个方向？
```

## Guardrails

- **禁止**在 explore 阶段实现代码
- **禁止**跳过结构分析直接讨论方案
- **强制**在进入 propose 前完成 repo analysis
- **可用** ASCII diagrams 可视化架构
- **不要**强制产出特定 artifact
- **强制**提供量化标准，帮助判断切换时机
