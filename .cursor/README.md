# .cursor 目录说明

> **v3.0 变更：** 减控制层，补模板层。tasks-state.json 从"唯一真相源"降为"兼容参考"；risk/priority/estimated_time 已删除；coherence 降级为 coherence-lite；review checklist 和测试分层模板内置到 artifact 生成阶段。

---

## 目录结构

```
.cursor/
├── skills/                        # Skill 定义文件（AI 执行逻辑）
│   ├── _shared/
│   │   ├── SHARED-LAYERS.md       # 共享层：layer 映射、验证命令
│   │   ├── SKILL-INDEX.md         # 自动生成的 Skill 索引
│   │   └── SKILL-SCHEMA.md        # 元数据 Schema 定义
│   ├── openspec-explore/           # 探索代码库，澄清需求
│   ├── openspec-propose/           # 创建 change，生成 artifacts（含 risk-triggered 模板）
│   ├── openspec-plan/              # 从规划到批量派生（非默认能力）
│   ├── openspec-apply/             # 按 task 实现代码，断点续传基于 checkbox
│   ├── openspec-verify/            # 验证实现一致性（Full + coherence-lite）
│   ├── openspec-archive/           # 归档完成的 change
│   ├── openspec-debug/             # 调试 apply 阶段遇到的问题
│   └── openspec-skill/             # Skill 系统维护（不默认暴露）
│
└── commands/                       # 命令入口（触发对应 Skill）
    └── opsx-*.md                   # 8 个核心命令
```

---

## 命令速查表（v3.0）

| 命令 | Skill | 阶段 | 作用 |
|------|-------|------|------|
| `/opsx-explore` | `openspec-explore` | 探索 | 扫描代码库结构，澄清需求，量化切换标准 |
| `/opsx-propose` | `openspec-propose` | 提案 | 创建 change，生成 artifacts；change_class 推断触发 review/测试模板 |
| `/opsx-plan` | `openspec-plan` | 规划 | 多 change 协同编排（非默认，详见使用门槛） |
| `/opsx-apply` | `openspec-apply` | 实现 | 按 layer 优先级执行 task，断点续传基于 checkbox |
| `/opsx-verify` | `openspec-verify` | 验证 | Full 验证 + coherence-lite checklist |
| `/opsx-archive` | `openspec-archive` | 归档 | 最终确认后归档 change |
| `/opsx-debug` | `openspec-debug` | 调试 | 诊断错误，提供修复方案 |
| `/opsx-skill` | `openspec-skill` | 维护 | Skill 系统维护（不默认暴露） |

---

## v3.0 核心变更

### 1. 状态管理：checkbox 为主，JSON 为兼容参考

> Task 状态以 tasks.md checkbox（`- [ ]` / `- [x]`）为主，tasks-state.json 仅作兼容参考。

```
冲突处理规则（必须写死）：
- tasks.md checkbox 是唯一主真相源
- 冲突时输出 warning：`[opsx-apply] 状态不一致：tasks.md 为准，JSON 已过时`
- 不自动修复 JSON
```

### 2. change_class 推断

> 所有"按风险触发"的规则统一从 proposal 顶部的 `change_class` 推断。

```yaml
---
name: <change-name>
change_class: high  # 推断依据：触及 engine 层
reason: "touches engine layer, modifies canvas API contract"
---
```

| 条件 | change_class | 触发动作 |
|------|-------------|---------|
| 仅样式/文案/UI 布局，不影响逻辑 | `low` | 跳过 review checklist；测试并入 tasks |
| 触及 store / API contract / node schema | `high` | 插入 review checklist + 独立测试章节 |
| 涉及跨包接口、数据迁移、序列化格式 | `high` | 强制 repo-analysis |
| engine/core 层改动（任何 scope） | `high` | 插入 review checklist + 独立测试章节 |
| 无法明确判断 | `high`（默认走保守路径） | — |

### 3. 精简的 Task 元数据

> v3.0 删除了 risk / priority / estimated_time（主观判断，无自动化消费方）。

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
```

### 4. Coherence 降级为 coherence-lite

> 三阶段（Incremental / Full / Coherence）简化为两阶段 + lite checklist。

```
Incremental verify → Full verify（含 coherence-lite checklist）
```

coherence-lite 结构：
- **问答式 checklist**：task 是否有对应代码、design 决策是否落地、specs 语义是否有实现
- **Traceability Map**：Proposal Goal → Design Decision → Task → Code/Test 可执行核对
- **High-Risk 额外检查**：适用于 change_class = high

---

## Change 生命周期

### 标准路径

```
┌─────────────────────────────────────────────────────────┐
│  /opsx-explore                                          │
│  探索代码库 → 澄清需求                                   │
│  ↓                                                      │
│  /opsx-propose                                          │
│  推断 change_class → 生成 artifacts（含 risk-triggered 模板） │
│  ↓                                                      │
│  /opsx-apply                                            │
│  按 layer 优先级执行 → 增量验证 → 断点续传               │
│  ↓ 遇到问题                                              │
│  /opsx-debug                                            │
│  诊断 → 修复 → 继续 apply                                │
│  ↓ 所有 task 完成                                        │
│  /opsx-verify                                           │
│  Full + coherence-lite                                   │
│  ↓ 全部通过                                              │
│  /opsx-archive                                          │
│  Git 检查 → 最终确认 → 归档                              │
└─────────────────────────────────────────────────────────┘
```

### 规划路径（非默认）

```
┌─────────────────────────────────────────────────────────┐
│  /opsx-plan（满足使用门槛时）                             │
│  解析专家报告 → 全局 repo-analysis → 产出 change-index   │
│  ↓                                                      │
│  /opsx-plan --derive <meta-change>                      │
│  按依赖顺序批量创建子 change                              │
│  ↓                                                      │
│  /opsx-apply --batch                                     │
└─────────────────────────────────────────────────────────┘
```

**/opsx-plan 使用门槛：**

| 建议用 | 不建议用 |
|--------|---------|
| 预期需要 3 个以上子 change | 单个 change，独立范围 |
| 存在 change 间依赖 | 无跨 change 依赖 |
| 涉及共享 contract / migration | 快速验证想法 |
| 需要批量 apply | — |

---

## Layer 映射

| Layer | 路径 | 说明 |
|-------|------|------|
| `engine` | `packages/workflow-core/`, `packages/image-ops/`, `packages/node-definitions/` | 工作流执行引擎、图像操作、节点定义 |
| `backend` | `server/`, `server/prisma/` | Fastify API、Prisma ORM、SQLite |
| `editor` | `apps/dev-tool/` | 开发者工具 UI |
| `runtime` | `apps/user-app/` | 终端用户运行时 |
| `ui-skin` | `packages/shared-ui/` | 设计系统和共享 UI 组件 |

**执行优先级：** engine > backend > editor > runtime > ui-skin > meta

---

## 增量验证策略

> 基于 `git diff --name-only HEAD~1` 获取实际改动文件。

```bash
git diff --name-only HEAD~1  # 获取本次改动的文件
# 按文件路径判断受影响 layers → 执行增量验证
```

**全量验证（保底）：**
```bash
pnpm typecheck
pnpm test
```

---

## OpenSpec 与 Skills 的关系

OpenSpec（`openspec/`）是变更管理的产物系统，记录了每项变更的提案、设计、任务和验证结果。

Cursor Skills（`.cursor/skills/`）是 AI Agent 的执行逻辑，驱动 OpenSpec 工作流各阶段。

两者相辅相成：
- OpenSpec **消费** Skills：`/opsx-apply` 调用 `openspec-apply` skill 执行任务
- Skills **产出** OpenSpec：`/opsx-propose` 调用 `openspec-propose` skill 生成变更提案