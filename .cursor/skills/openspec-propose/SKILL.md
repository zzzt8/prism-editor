---
name: openspec-propose
description: 创建 change，自动生成 artifacts。
version: "3.1"
category: propose
tags:
  - openspec
  - layer:meta
aliases:
  - /opsx-propose
depends_on:
  - openspec-explore
permissions: []
risks: []
verify:
  - typecheck
---

> **前置共享片段：** layer 映射和增量测试策略见 [\_shared/SHARED-LAYERS.md](../_shared/SHARED-LAYERS.md)。

## Schema / Config 一致性 Preflight（硬关卡）

在所有操作之前执行。如果失败，立即停止，不得调用 CLI。

```bash
# 1. 读取 config.yaml 中配置的 schema 名称
SCHEMA_NAME=$(grep -E "^schema:" openspec/config.yaml | sed 's/^schema: *//')

# 2. 检查 schema 目录是否存在
if [ ! -d "openspec/schemas/$SCHEMA_NAME" ]; then
  echo "[opsx-propose] Schema 缺失，硬关卡触发。"
  echo ""
  echo "openspec/config.yaml 引用了 schema '$SCHEMA_NAME'，"
  echo "但 'openspec/schemas/$SCHEMA_NAME/' 目录不存在。"
  echo ""
  echo "可能原因："
  echo "  - Schema 被误删（目录存在但被删除）"
  echo "  - config.yaml 中的 schema 名称过时"
  echo ""
  echo "排查建议："
  echo "  1. 检查 openspec/schemas/ 下有哪些可用 schema：ls openspec/schemas/"
  echo "  2. 检查 openspec/config.yaml 中的 schema 字段是否正确"
  echo "  3. 查看 git log openspec/schemas/ 定位删除提交"
  echo ""
  echo "下一步：输入 /opsx-debug 调试"
  echo "停止执行。"
  exit 1
fi

# 3. 检查 schema.yaml 是否存在
if [ ! -f "openspec/schemas/$SCHEMA_NAME/schema.yaml" ]; then
  echo "[opsx-propose] Schema 定义文件缺失，硬关卡触发。"
  echo ""
  echo "'openspec/schemas/$SCHEMA_NAME/' 目录存在，"
  echo "但 'openspec/schemas/$SCHEMA_NAME/schema.yaml' 文件缺失。"
  echo ""
  echo "Schema 定义不完整，请检查目录内容。"
  echo "下一步：输入 /opsx-debug 调试"
  echo "停止执行。"
  exit 1
fi
```

**硬关卡：Schema 检查失败 → 输出上述信息后立即停止。不得尝试调用 `openspec new change`。**

## 核心职责

- 分析用户需求，推断 change_class
- 生成 proposal、design（含 risk-triggered review checklist）、tasks（含 risk-triggered 测试分层）

## 执行流程

### 1. 获取 change name

从用户输入推断 kebab-case name。

### 2. Task Anchor Echo（前置声明）

在调用 `openspec new change` 之前，必须完成并输出以下声明：

```markdown
## Task Anchor Echo

- **原始任务**：[从上下文回显原始任务描述]
- **本次创建 change 的名称**：`<name>`
- **change 名称是否服务于原始任务**：是 / 否
  - 若否 → **硬关卡**：不得调用 CLI，输出"change 名称与原始任务不一致，请确认后再试"
  - 若是 → 继续执行
- **约束/非目标追加（来自用户）**：
  - [ ] [约束内容 1]
  - [ ] [约束内容 2]
  - → 这些约束**必须**写入 proposal 的 out-of-scope 段
```

> **与 explore 的区别：**
> explore 的 Anchor 声明是"分析前锚定"，propose 的 Anchor Echo 是"行动前确认"。
> 两者形成"锚定 → 确认"的闭环。

### 3. 创建 change

```bash
openspec new change "<name>"
```

**硬关卡：CLI 失败必须停**

```markdown
if (CLI exit_code !== 0) {
  输出：

  [opsx-propose] CLI 失败，硬关卡触发。

  错误：
  <stderr>

  已执行的操作：
  - [列出已完成的 artifact 写入操作]

  硬关卡规则：
  - 不得手动创建 change 目录或 artifacts
  - 不得尝试重建 schema 或修复 CLI
  - 不得以"近似替代"继续推进

  下一步（强制选择其一）：
  - 输入 /opsx-debug 调试 CLI 问题
  - 手动确认后重新执行

  停止执行。
}
```

### 4. 推断 change_class

> 所有"按风险触发"的规则（review checklist / 独立测试章节）统一从 proposal 顶部的 `change_class` 推断。

| 条件 | change_class | 触发动作 |
|------|-------------|---------|
| 仅样式/文案/UI 布局，不影响逻辑 | `low` | 跳过 review checklist；测试并入 tasks 验证命令 |
| 触及 store / API contract / node schema | `high` | 插入 review checklist + 独立测试章节 |
| 涉及跨包接口、数据迁移、序列化格式 | `high` | 强制 repo-analysis |
| engine/core 层改动（任何 scope） | `high` | 插入 review checklist + 独立测试章节 |
| 无法明确判断 | `high`（默认走保守路径） | — |

### 4. 生成 Artifacts

**proposal** 顶部标注 change_class：

```yaml
---
name: <change-name>
change_class: high  # 推断依据：触及 engine 层
reason: "touches engine layer, modifies canvas API contract"
---
```

**design**：change_class = high 时插入 review checklist；low 时末尾轻量提示。

**tasks**：change_class = high 时插入独立测试章节；low 时测试并入 tasks 验证命令。

## design.md 模板（内置 review checklist）

### change_class = high

```markdown
## 评审清单
> 适用于 change_class = high

- [ ] 方案是否覆盖了 proposal 中的所有 goal 和 acceptance criteria？
- [ ] 是否存在更简单的替代方案？简要对比：
- [ ] 最坏情况的回退路径是什么？
- [ ] 对现有 specs/ 有哪些 ADDED / MODIFIED / REMOVED 语义变化？
- [ ] Layer 间是否有隐式依赖未在设计层面显式声明？
```

### change_class = low

```markdown
> Low-risk change，跳过 formal review checklist。
```

## tasks.md 测试设计模板

### change_class = low

测试并入 tasks：

```markdown
- [ ] T1.1: [任务名]
  - 验证命令：`pnpm test --filter=<package> -- --grep "TC-xxx"`
```

### change_class = high

独立测试章节：

```markdown
## 测试设计
> High-risk change，保留独立测试章节

### TC-1: [场景名]
| 项目 | 内容 |
|------|------|
| Given | [前置条件] |
| When | [操作] |
| Then | [预期结果] |
| 验证命令 | `pnpm test --filter=<package> -- --grep "TC-1"` |
```

## Task 元数据规范

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
- [ ] T1: [任务名]
  - layer: engine
  - **验收标准**：[标准]
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `id` | ✓ | 任务唯一标识 |
| `layer` | ✓ | engine / backend / editor / runtime / ui-skin / meta |
| `verify` | ✓ | unit-tests / golden-fixture / api-tests / smoke-test / visual-check |
| `dependencies` | | 统一依赖模型 |

## Guardrails

- **强制**每个 proposal.md 顶部必须有 change_class 和 reason
- **强制**change_class = high 时，在 design.md 中插入 review checklist
- **强制**change_class = high 时，在 tasks.md 中插入独立测试章节
- **强制**change_class = low 时，测试并入 tasks 验证命令
- **强制**每个 task 必须有 `<!-- opsx-meta -->` 块（含 id、layer、verify）
- **强制**proposal 的 change name 必须与原始任务主题一致，不一致则硬关卡阻断
- **强制**CLI 失败时立即停止，不得手造 artifacts
- **强制**不得尝试重建 schema
- **强制**用户追加的约束必须写入 proposal 的 out-of-scope 段
- **强制**调用 CLI 前必须执行 Schema / Config 一致性 Preflight，检查失败则立即停止
