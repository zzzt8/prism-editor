---
name: _skill-schema
description: Skill 元数据 Schema 定义。所有 .cursor/skills/**/*.md 文件的 frontmatter 必须遵循此 schema。
---

# Skill 元数据 Schema

本文档定义所有 Skill 文件 frontmatter 中 `---` 块内的元数据字段规范。

## 字段总览

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `name` | string | ✓ | — | Skill 唯一标识符，kebab-case |
| `description` | string | ✓ | — | 一句话描述，供 Agent 和用户理解用途 |
| `version` | string | | `"1.0"` | 语义化版本 |
| `category` | string | ✓ | — | 分类，见下方取值 |
| `tags` | string[] | | `[]` | 关键词标签，用于搜索 |
| `aliases` | string[] | | `[]` | 命令别名 |
| `depends_on` | string[] | | `[]` | 前置 Skill 名称 |
| `permissions` | string[] | | `[]` | 所需权限（如 `file-write`, `network`） |
| `risks` | string[] | | `[]` | 风险标签（如 `destructive`, `unreversible`） |
| `verify` | string[] | | `[]` | 验证方式，见下方取值 |

## category 取值

| 值 | 说明 |
|----|---|
| `explore` | 探索模式，分析代码结构 |
| `propose` | 规划模式，创建 change |
| `apply` | 执行模式，实现 tasks |
| `verify` | 验证模式，检查实现一致性 |
| `archive` | 归档模式，完成并关闭 change |
| `debug` | 调试模式，诊断问题 |
| `meta` | 元操作，调度其他 skill |
| `system` | 系统级，Cursor/Agent 配置 |

## verify 取值

| 值 | 说明 |
|----|---|
| `unit-tests` | 运行对应 package 的单元测试 |
| `golden-fixture` | 比对 golden fixture 文件 |
| `api-tests` | 运行 API 集成测试 |
| `smoke-test` | 冒烟测试 |
| `visual-check` | 需要人工视觉检查 |
| `typecheck` | TypeScript 类型检查 |
| `git-status` | 检查 git 工作区状态 |
| `cli-output` | 检查 CLI 命令输出 |

## 示例

### 最小 frontmatter（必填字段）

```yaml
---
name: my-skill
description: 做某事的简短描述
---
```

### 完整 frontmatter

```yaml
---
name: openspec-apply
description: 实现 OpenSpec change 的任务。
version: "3.0"
category: apply
tags:
  - openspec
  - layer:meta
  - workflow
aliases:
  - /opsx-apply
depends_on:
  - openspec-propose
permissions:
  - file-write
risks:
  - modifies-code
verify:
  - unit-tests
  - typecheck
---
```

## 验证规则

1. `name` 必须全局唯一，不可重复
2. `category` 必须是上表中的有效值
3. `depends_on` 中引用的 Skill 必须存在
4. `depends_on` 不允许循环依赖
5. `version` 遵循 semver 格式（Major.Minor.Patch）
6. `tags` 中的 `layer:*` 标签必须与实际改动的文件 layer 一致

---

# Task 静态元数据 Schema

> **v4.0 变更：**
> - 新增 `task_type` 字段，用于驱动 `ecc-openspec-bridge` 的稳定自动路由
> - 删除了 `risk` / `priority` / `estimated_time` 字段（主观判断，无自动化消费方）
> - 风险分层由 proposal 顶部的 `change_class` 推断，不再写在 task 元数据中
> - Task 状态以 tasks.md checkbox（`- [ ]` / `- [x]`）为主，tasks-state.json 为兼容参考

每个 task 必须包含一个 `<!-- opsx-meta -->` 块，紧跟在 task 标题之前。Task 本身以 `- [ ]`（未完成）或 `- [x]`（已完成）开头。

```html
<!-- opsx-meta
id: T1
layer: engine
task_type: feature
verify: unit-tests
dependencies:
  - type: task
    refs: []
  - type: change
    refs: []
    status_required: completed
-->
- [ ] T1: 更新 WorkerPoolConfig 接口
  - layer: engine
  - task_type: feature
  - **验收标准**：新接口向后兼容旧接口
```

## 字段总览

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✓ | 任务唯一标识符，如 T1, T2a |
| `layer` | string | ✓ | 所属 layer，见下方取值 |
| `task_type` | string | ✓ | ECC lane 类型，决定自动路由 |
| `verify` | string[] | ✓ | 验证方式，见下方取值 |
| `dependencies` | array | | 统一依赖模型 |

## layer 取值

| 值 | 说明 |
|----|---|
| `engine` | workflow-core / image-ops / node-definitions |
| `backend` | server / prisma |
| `editor` | dev-tool |
| `runtime` | user-app |
| `ui-skin` | shared-ui |
| `meta` | .cursor/skills/ |

## task_type 取值

> `task_type` 优先于路径和关键词推断；只有缺失时才回退到 bridge 的 fallback 规则。

| 值 | ECC lane | 典型场景 |
|------|----------|---------|
| `api-design` | `ecc-api-design` | route、schema、shared-types、repository、interface contract |
| `tdd` | `ecc-tdd-workflow` | 测试优先、断言修复、fixture 更新 |
| `build-fix` | `ecc-build-error-resolver` | typecheck / lint / build / CI 错误修复 |
| `refactor` | `code-reviewer` | 命名、重复逻辑、一致性清理 |
| `security` | `security-reviewer` | auth / jwt / validation / permission |
| `e2e` | `e2e-runner` | UI 主链路、visual、user flow |
| `architect` | `planner` / `architect` | 跨层高风险架构任务 |
| `feature` | `ecc-tdd-workflow` | 默认功能实现 lane |

> 多 lane 可用 `|` 分隔，如 `task_type: api-design | tdd`
> 第一项视为主 lane，其余项视为辅助 lane。

## verify 取值

| 值 | 说明 |
|----|---|
| `unit-tests` | 运行对应 package 的单元测试 |
| `golden-fixture` | 比对 golden fixture 文件 |
| `api-tests` | 运行 API 集成测试 |
| `smoke-test` | 冒烟测试 |
| `visual-check` | 需要人工视觉检查 |
| `typecheck` | TypeScript 类型检查 |

## 统一依赖模型：dependencies

```yaml
dependencies:
  - type: task
    refs: ["T1", "T2"]
  - type: change
    refs: ["C1-mapper-contract"]
    status_required: completed
```

| type | refs | status_required | 含义 |
|------|------|----------------|------|
| `task` | `["T1", "T2"]` | — | 必须等这些 task done 才能开始 |
| `change` | `["C1"]` | `completed` | 必须等这些 change 完成才能开始 |
| `change` | `["C1"]` | `in-progress` | 必须等这些 change 至少开始才能开始 |

## 状态真相源

> Task 状态以 tasks.md checkbox 为主，tasks-state.json 仅作兼容参考（渐进迁移中）。

**主真相源：tasks.md checkbox**
- `- [ ]` → todo
- `- [x]` → done

**兼容参考：tasks-state.json**
- 如 checkbox 与 JSON 不一致，以 checkbox 为准，输出 warning

## 验证规则

1. `id` 必须在同一 tasks.md 中唯一
2. `layer` 必须是有效的 layer 值
3. `task_type` 必须是有效的 task_type 值（或用 `|` 分隔的组合）
4. `verify` 至少包含一项
5. `dependencies` 中 `type` 必须是 `task` 或 `change`
6. `dependencies` 中 `refs` 必须是数组

## task_type 与 lane 的关系

| task_type | ECC lane | 执行 SOP |
|-----------|----------|---------|
| `api-design` | `ecc-api-design` | 确认 contract → 实现 route/schema → typecheck → api-tests |
| `tdd` | `ecc-tdd-workflow` | 写/改测试 → 最小实现 → 重跑相关测试 → layer smoke |
| `build-fix` | `ecc-build-error-resolver` | 读错误 → 最小修复 → 重跑最小验证 → retry 2 次失败才停 |
| `refactor` | `code-reviewer` | 命名/重复/边界/错误处理检查 → 仅改强相关 → 不修 unrelated |
| `security` | `security-reviewer` | token/权限/校验/泄漏检查 → 避免弱路径 |
| `e2e` | `e2e-runner` | 确认关键路径 → 端到端 smoke → 报告覆盖范围 |
| `architect` | `planner` / `architect` | 定义边界 → 拆 task → commit 按 layer 隔离 |
| `feature` | `ecc-tdd-workflow` | 默认走 TDD，SOP 同 `tdd` |

lane skill 定义见 `.cursor/skills/ecc-api-design/`、`.cursor/skills/ecc-tdd-workflow/`、`.cursor/skills/ecc-build-error-resolver/`。

## 相关文件

- [SHARED-LAYERS.md](./SHARED-LAYERS.md) — Layer 映射和验证命令
- [ecc-openspec-bridge](../ecc-openspec-bridge/SKILL.md) — task_type 路由规则与自动推断 fallback
