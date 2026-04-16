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
  - openspec-plan
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

> **v3.0 变更：**
> - 删除了 `risk` / `priority` / `estimated_time` 字段（主观判断，无自动化消费方）
> - 风险分层由 proposal 顶部的 `change_class` 推断，不再写在 task 元数据中
> - Task 状态以 tasks.md checkbox（`- [ ]` / `- [x]`）为主，tasks-state.json 为兼容参考

每个 task 必须包含一个 `<!-- opsx-meta -->` 块，紧跟在 task 标题之前。Task 本身以 `- [ ]`（未完成）或 `- [x]`（已完成）开头。

```html
<!-- opsx-meta
id: T1
layer: engine
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
  - **验收标准**：新接口向后兼容旧接口
```

## 字段总览

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✓ | 任务唯一标识符，如 T1, T2a |
| `layer` | string | ✓ | 所属 layer，见下方取值 |
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

## verify 取值

| 值 | 说明 |
|----|---|
| `unit-tests` | 运行对应 package 的单元测试 |
| `golden-fixture` | 比对 golden fixture 文件 |
| `api-tests` | 运行 API 集成测试 |
| `smoke-test` | 冒烟测试 |
| `visual-check` | 需要人工视觉检查 |

## 统一依赖模型：dependencies

```yaml
dependencies:
  - type: task    # 同一 tasks.md 内的前置 task
    refs: ["T1", "T2"]
  - type: change  # 外部 change 的完成状态
    refs: ["C1-mapper-contract"]
    status_required: completed  # 可选，默认 completed
```

| type | refs | status_required | 含义 |
|------|------|----------------|------|
| `task` | `["T1", "T2"]` | — | 必须等这些 task done 才能开始 |
| `change` | `["C1"]` | `completed` | 必须等这些 change 完成才能开始 |
| `change` | `["C1"]` | `in-progress` | 必须等这些 change 至少开始才能开始 |

## 状态真相源

> **v3.0 变更：** Task 状态以 tasks.md checkbox 为主，tasks-state.json 仅作兼容参考（渐进迁移中）。

**主真相源：tasks.md checkbox**
- `- [ ]` → todo
- `- [x]` → done

**兼容参考：tasks-state.json（v3.0 渐进迁移，暂不删除）**
- 如 checkbox 与 JSON 不一致，以 checkbox 为准，输出 warning

## 验证规则

1. `id` 必须在同一 tasks.md 中唯一
2. `layer` 必须是有效的 layer 值
3. `verify` 至少包含一项
4. `dependencies` 中 type 必须是 `task` 或 `change`
5. `dependencies` 中 refs 必须是数组

## 相关文件

- [SHARED-LAYERS.md](./SHARED-LAYERS.md) — Layer 映射和验证命令
