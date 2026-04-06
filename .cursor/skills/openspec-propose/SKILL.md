---
name: openspec-propose
description: 创建 change，自动生成 artifacts。
---

> **前置共享片段：** layer 映射和增量测试策略见 [\_shared/SHARED-LAYERS.md](../_shared/SHARED-LAYERS.md)。

## 核心职责

- 分析用户需求
- 生成 repo-analysis（结构分析）
- 生成 proposal, design, tasks

## 执行流程

### 1. 获取 change name

从用户输入推断 kebab-case name，如：
- "add user authentication" → `add-user-auth`
- "fix workflow save bug" → `fix-workflow-save-bug`

### 2. 创建 change

```bash
openspec new change "<name>"
```

### 3. 生成 Artifacts

按依赖顺序生成：

**repo-analysis**：
- 扫描相关目录
- 标注 impact layers
- 识别关键模块和数据流
- 生成 `## Impact Map`

**proposal**：
- Why / What Changes / Impact
- 读取 repo-analysis 获取影响层
- 必须包含 impact summary

**design**：
- Architecture Review 章节（当涉及 engine/core、跨 app、数据迁移时）
- 记录技术决策和取舍

**tasks**：
- Test Plan 章节（当涉及 engine/backend 时）
- 每个 task 带元数据（见下方元数据规范）

### 4. 判断是否需要 Architecture Review

**必须包含的情况**：
- 影响 workflow-core / published protocol / node package / server schema
- 跨 app 改动
- 涉及数据迁移或协议兼容

**可以跳过的情况**：
- 纯 UI 美化
- 简单 bug fix
- 单个 app 内的局部改动

### 5. 判断工作流模式

**标准模式（Full Spec）：** 用户有明确需求、有充足时间、从零开始 → 完整走 propose 流程

**MVP Draft 模式（快速验证）：** 用户只想快速验证一个想法、或已有部分代码但想整理成 spec → 允许跳过 Architecture Review 和 Test Plan，先生成简洁的 proposal + 轻量 tasks，后续通过 apply 阶段逐步补充

> **何时用 MVP Draft：**
> - 小型实验性变更（风险低、scope 清晰）
> - 用户明确说"先试试看"
> - 用户已经有部分代码实现，只想补 spec

### 6. 处理已有代码改动的情况

如果用户在工作区已有未提交的代码改动：

1. **先确认改动范围**：`git diff --stat` 扫描改动了哪些文件
2. **标注 layer 归属**：对应到 engine / backend / editor / runtime / ui-skin
3. **反映在 proposal 的 Impact Summary 中**：说明"此 change 已包含部分实现"
4. **在 tasks.md 中标注已完成项**：带 `status: done` 的 task 可以在创建时就标记为完成

### 7. Task 元数据规范

每个 task 必须包含 `<!-- opsx-meta -->` 块：

```html
<!-- opsx-meta
id: T1
layer: engine
risk: high
verify:
  - unit-tests
  - golden-fixture
files:
  - packages/workflow-core/src/executor.ts
  - packages/image-ops/src/ops/resize.ts
-->
```

**layer 取值**：见 [_shared/SHARED-LAYERS.md](../_shared/SHARED-LAYERS.md#layer-映射)

**risk 取值**：`low` | `medium` | `high`

**verify 取值**：`unit-tests` | `golden-fixture` | `api-tests` | `smoke-test` | `visual-check`

**files**：本次 task 会修改的文件列表（用于后续增量验证）

**status 取值**（可选，用于已有代码的情况）：`todo` | `in-progress` | `done`

### 8. 显示状态

```bash
openspec status --change "<name>"
```

## Guardrails

- **强制**先完成 repo-analysis，再生成 proposal
- **禁止**跳过 repo-analysis 直接脑补 proposal
- **强制**在 design 中包含 architecture-review 章节（当需要时）
- **强制**在 tasks 中包含 test-plan 章节（当需要时）
- **强制**每个 task 必须有 `<!-- opsx-meta -->` 块（含 id、layer、risk、verify）
- **强制**处理已有代码改动时，标注 status: done 并反映在 Impact Summary
